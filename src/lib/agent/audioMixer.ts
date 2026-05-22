import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SceneShape, type Scene } from '../schemas/scene/index.js';

export type AudioMixRange = {
	start: number;
	end: number;
};

export type AudioSourcePlan = {
	id: string;
	kind: 'component' | 'track' | 'scene';
	url: string;
	startInChunkSec: number;
	durationSec: number;
	sourceOffsetSec: number;
	volume: number;
};

export type BuildLocalMixedAudioResult = {
	audioPath: string | null;
	selectedSources: number;
	skippedSources: number;
	plannedSources: AudioSourcePlan[];
};

const REMOTE_AUDIO_INPUT_OPTIONS = [
	'-reconnect',
	'1',
	'-reconnect_streamed',
	'1',
	'-reconnect_on_network_error',
	'1',
	'-http_follow_location',
	'1',
	'-multiple_requests',
	'1',
	'-rw_timeout',
	'15000000'
];

const isRemoteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const toFfmpegInput = (value: string): string => (value.startsWith('file://') ? fileURLToPath(value) : value);

const safeVolume = (input: unknown): number => {
	if (typeof input !== 'number' || Number.isNaN(input)) return 1;
	return Math.max(0, Math.min(1, input));
};

const sourceUrlForComponent = (
	scene: Scene,
	component: Scene['layers'][number]['components'][number]
): string | undefined => {
	if (!('source' in component)) return undefined;
	const directUrl = component.source?.url ?? component.source?.streamUrl;
	if (directUrl) return directUrl;
	const assetId = component.source?.assetId;
	return assetId ? scene.assets.find((asset) => asset.id === assetId)?.url : undefined;
};

const clampRange = (range: AudioMixRange, boundary: AudioMixRange): AudioMixRange | null => {
	const start = Math.max(range.start, boundary.start);
	const end = Math.min(range.end, boundary.end);
	return end > start ? { start, end } : null;
};

export function resolveAudioMixRanges(sceneInput: unknown, chunkStartSec: number, chunkEndSec: number): AudioMixRange[] {
	const scene = SceneShape.parse(sceneInput);
	const fps = Math.max(1, Number(scene.settings.fps || 30));
	const oneFrameSec = 1 / fps;
	const sceneDuration = Math.max(0, Number(scene.settings.duration || 0));
	const boundary = {
		start: Math.max(0, Math.min(chunkStartSec, sceneDuration)),
		end: Math.max(0, Math.min(chunkEndSec, sceneDuration))
	};
	if (boundary.end <= boundary.start) return [];

	let ranges: AudioMixRange[] = [boundary];
	if (typeof scene.settings.startAt === 'number' && scene.settings.startAt > 0) {
		const startAt = Math.max(0, scene.settings.startAt - oneFrameSec);
		ranges = ranges.flatMap((range) =>
			range.end <= startAt ? [] : [{ start: Math.max(range.start, startAt), end: range.end }]
		);
	}
	const sceneEndAt = scene.settings.endAt;
	if (typeof sceneEndAt === 'number') {
		ranges = ranges.flatMap((range) =>
			range.start >= sceneEndAt
				? []
				: [{ start: range.start, end: Math.min(range.end, sceneEndAt) }]
		);
	}

	// Keep this local-first module conservative: if trim zones exist, split around them.
	for (const trim of scene.settings.trimZones ?? []) {
		ranges = ranges.flatMap((range) => {
			if (trim.end <= range.start || trim.start >= range.end) return [range];
			const parts: AudioMixRange[] = [];
			if (trim.start > range.start) parts.push({ start: range.start, end: trim.start });
			if (trim.end < range.end) parts.push({ start: trim.end, end: range.end });
			return parts;
		});
	}

	return ranges.filter((range) => range.end > range.start);
}

function collectAudioSourcesForBoundary(
	scene: Scene,
	boundary: AudioMixRange,
	outputOffsetSec: number
): AudioSourcePlan[] {
	const plans: AudioSourcePlan[] = [];

	for (const layer of scene.layers ?? []) {
		if (layer.muted) continue;

		for (const component of layer.components ?? []) {
			if (component.type !== 'VIDEO' && component.type !== 'AUDIO') continue;
			const muted = 'muted' in component ? component.muted === true : false;
			const volume = safeVolume('volume' in component ? component.volume : 1);
			if (muted || volume <= 0) continue;

			const url = sourceUrlForComponent(scene, component);
			if (!url) continue;

			const timelineStart = component.timeline?.startAt ?? 0;
			const timelineEnd = component.timeline?.endAt ?? scene.settings.duration;
			const active = clampRange({ start: timelineStart, end: timelineEnd }, boundary);
			if (!active) continue;

			const source = 'source' in component ? component.source : undefined;
			const sourceStart = source?.startAt ?? 0;
			const sourceEnd = source?.endAt;
			const sourceOffsetSec = sourceStart + (active.start - timelineStart);
			let durationSec = active.end - active.start;

			if (typeof sourceEnd === 'number') {
				durationSec = Math.min(durationSec, sourceEnd - sourceOffsetSec);
			}
			if (durationSec <= 0) continue;

			plans.push({
				id: component.id || `component-${plans.length}`,
				kind: 'component',
				url,
				startInChunkSec: outputOffsetSec + (active.start - boundary.start),
				durationSec,
				sourceOffsetSec,
				volume
			});
		}
	}

	for (const track of scene.audioTracks ?? []) {
		if (!track || track.muted) continue;
		const volume = safeVolume(track.volume);
		if (volume <= 0 || !track.url) continue;

		const startAt = track.startAt ?? 0;
		const endAt = typeof track.endAt === 'number' ? track.endAt : scene.settings.duration;
		const active = clampRange({ start: startAt, end: endAt }, boundary);
		if (!active) continue;

		plans.push({
			id: track.id || `track-${plans.length}`,
			kind: 'track',
			url: track.url,
			startInChunkSec: outputOffsetSec + (active.start - boundary.start),
			durationSec: active.end - active.start,
			sourceOffsetSec: active.start - startAt,
			volume
		});
	}

	const sceneAudio = scene.settings.audio;
	if (sceneAudio?.src && sceneAudio.muted !== true && safeVolume(sceneAudio.volume) > 0) {
		plans.push({
			id: 'scene-audio',
			kind: 'scene',
			url: sceneAudio.src,
			startInChunkSec: outputOffsetSec,
			durationSec: boundary.end - boundary.start,
			sourceOffsetSec: boundary.start,
			volume: safeVolume(sceneAudio.volume)
		});
	}

	return plans;
}

export function collectAudioSourcesForRanges(sceneInput: unknown, ranges: AudioMixRange[]): AudioSourcePlan[] {
	const scene = SceneShape.parse(sceneInput);
	const plans: AudioSourcePlan[] = [];
	let outputOffsetSec = 0;

	for (const range of ranges) {
		if (range.end <= range.start) continue;
		plans.push(...collectAudioSourcesForBoundary(scene, range, outputOffsetSec));
		outputOffsetSec += range.end - range.start;
	}

	return plans;
}

const runProcess = async (
	command: string,
	args: string[],
	label: string,
	options: { debug?: boolean } = {}
): Promise<{ stdout: string }> => {
	return await new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		child.stdout?.on('data', (chunk) => {
			stdout += String(chunk);
		});
		child.stderr?.on('data', (chunk) => {
			const text = String(chunk);
			if (options.debug) process.stderr.write(`[${label}] ${text}`);
			stderr = (stderr + text).slice(-4000);
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) {
				resolve({ stdout });
			} else {
				reject(new Error(`${label} failed with exit code ${code}. ${stderr}`));
			}
		});
	});
};

export async function sourceHasAudio(url: string): Promise<boolean> {
	try {
		const input = toFfmpegInput(url);
		const { stdout } = await runProcess(
			process.env.FFPROBE_PATH || 'ffprobe',
			[
				'-v',
				'error',
				'-select_streams',
				'a',
				'-show_entries',
				'stream=index',
				'-of',
				'csv=p=0',
				input
			],
			'ffprobe-audio'
		);
		return stdout.trim().length > 0;
	} catch {
		return false;
	}
}

export function createPrepareSourceAudioArgs(source: AudioSourcePlan, outputPath: string): string[] {
	const input = toFfmpegInput(source.url);
	return [
		'-y',
		...(isRemoteUrl(source.url) ? REMOTE_AUDIO_INPUT_OPTIONS : []),
		'-ss',
		source.sourceOffsetSec.toFixed(3),
		'-i',
		input,
		'-t',
		source.durationSec.toFixed(3),
		'-vn',
		'-ac',
		'2',
		'-ar',
		'48000',
		'-acodec',
		'flac',
		outputPath
	];
}

export function createMixAudioArgs(
	inputs: Array<{ plan: AudioSourcePlan; path: string }>,
	outputPath: string,
	chunkDurationSec: number
): string[] {
	const args = ['-y'];
	for (const input of inputs) {
		args.push('-i', input.path);
	}

	const filterSegments: string[] = [];
	const mixInputs: string[] = [];
	for (let index = 0; index < inputs.length; index += 1) {
		const source = inputs[index].plan;
		const delayMs = Math.max(0, Math.round(source.startInChunkSec * 1000));
		const label = `a${index}`;
		filterSegments.push(
			`[${index}:a]adelay=${delayMs}|${delayMs},volume=${source.volume.toFixed(6)}[${label}]`
		);
		mixInputs.push(`[${label}]`);
	}

	filterSegments.push(
		`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:normalize=false[mixraw]`
	);
	filterSegments.push(`[mixraw]atrim=0:${chunkDurationSec.toFixed(3)},asetpts=PTS-STARTPTS[mixtrim]`);

	args.push(
		'-filter_complex',
		filterSegments.join(';'),
		'-map',
		'[mixtrim]',
		'-ac',
		'2',
		'-ar',
		'48000',
		'-acodec',
		'flac',
		outputPath
	);
	return args;
}

export async function buildLocalMixedAudioTrack(input: {
	scene: unknown;
	ranges: AudioMixRange[];
	workDir: string;
	renderId?: string;
	debug?: boolean;
}): Promise<BuildLocalMixedAudioResult> {
	const scene = SceneShape.parse(input.scene);
	const chunkDurationSec = input.ranges.reduce((sum, range) => sum + Math.max(0, range.end - range.start), 0);
	if (chunkDurationSec <= 0) {
		return { audioPath: null, selectedSources: 0, skippedSources: 0, plannedSources: [] };
	}

	const plannedSources = collectAudioSourcesForRanges(scene, input.ranges);
	if (plannedSources.length === 0) {
		return { audioPath: null, selectedSources: 0, skippedSources: 0, plannedSources };
	}

	await fs.mkdir(input.workDir, { recursive: true });
	const preparedInputs: Array<{ plan: AudioSourcePlan; path: string }> = [];
	let skippedSources = 0;

	for (let index = 0; index < plannedSources.length; index += 1) {
		const source = plannedSources[index];
		if (!(await sourceHasAudio(source.url))) {
			skippedSources += 1;
			continue;
		}

		const hash = crypto
			.createHash('sha1')
			.update(
				JSON.stringify({
					url: source.url,
					offset: source.sourceOffsetSec.toFixed(3),
					duration: source.durationSec.toFixed(3),
					volume: source.volume.toFixed(3)
				})
			)
			.digest('hex');
		const preparedPath = path.join(input.workDir, `prepared-${index}-${hash}.flac`);

		if (!existsSync(preparedPath)) {
			await runProcess(
				process.env.FFMPEG_PATH || 'ffmpeg',
				createPrepareSourceAudioArgs(source, preparedPath),
				'visualfries-audio-prepare',
				{ debug: input.debug }
			);
		}

		preparedInputs.push({ plan: source, path: preparedPath });
	}

	if (preparedInputs.length === 0) {
		return { audioPath: null, selectedSources: 0, skippedSources, plannedSources };
	}

	const checksum = crypto
		.createHash('sha1')
		.update(
			JSON.stringify({
				renderId: input.renderId ?? 'local',
				chunkDurationSec: chunkDurationSec.toFixed(3),
				inputs: preparedInputs.map((entry) => ({
					id: entry.plan.id,
					path: entry.path,
					delay: entry.plan.startInChunkSec.toFixed(3),
					volume: entry.plan.volume.toFixed(3)
				}))
			})
		)
		.digest('hex');
	const mixedPath = path.join(input.workDir, `mixed-${checksum}.flac`);

	if (!existsSync(mixedPath)) {
		await runProcess(
			process.env.FFMPEG_PATH || 'ffmpeg',
			createMixAudioArgs(preparedInputs, mixedPath, chunkDurationSec),
			'visualfries-audio-mix',
			{ debug: input.debug }
		);
	}

	return {
		audioPath: mixedPath,
		selectedSources: preparedInputs.length,
		skippedSources,
		plannedSources
	};
}
