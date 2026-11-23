import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SceneShape, type Scene } from '../schemas/scene/index.js';
import { frameIndexAtTime } from '../utils/frameTime.js';
import { mediaFrameIndexAtSceneTime, shownSceneTimes } from './sceneTime.js';

export type LocalDeterministicMediaStrategy = 'predecoded-image-sequence';
export type LocalDeterministicFrameExtension = 'jpg' | 'png';

export type LocalDeterministicMediaComponent = {
	component: Scene['layers'][number]['components'][number];
	id: string;
	type: 'VIDEO' | 'GIF';
	sourceUrl: string;
	sourceStartAt: number;
	sourceEndAt?: number;
	timelineStartAt: number;
	timelineEndAt: number;
};

export type LocalDeterministicActiveWindow = {
	activeStartFrame: number;
	activeEndFrame: number;
	activeStartSec: number;
	activeEndSec: number;
	sourceStartSec: number;
};

export type LocalPredecodedExtractionPlan = {
	sourceStartSec: number;
	extractFrameCount: number;
	outputFrameCount: number;
	sourceEndLimited: boolean;
};

export type LocalDeterministicFrameManifest = Record<string, Record<string, string>>;

export type PrepareLocalDeterministicMediaInput = {
	scene: unknown;
	workDir: string;
	/** The frame window of the render. Only read when `renderTimes` is not given. */
	fromFrame: number;
	toFrame: number;
	/**
	 * Scene times the page seeks to and draws a frame at. Default: every frame of the window,
	 * at the frame rate of the scene.
	 */
	renderTimes?: number[];
	publicBasePath?: string;
	frameExtension?: LocalDeterministicFrameExtension;
	jpegQualityScale?: number;
	strict?: boolean;
	diagnostics?: boolean;
	/** Scene times the page seeks to without drawing a frame (frames to explain). */
	seekTimes?: number[];
	/** Limit for one ffmpeg extraction in ms; 0 switches it off. Default 600000. */
	extractionTimeoutMs?: number;
};

export const DEFAULT_EXTRACTION_TIMEOUT_MS = 600_000;

export type PrepareLocalDeterministicMediaResult = {
	preparedScene: Scene;
	payload: {
		strategy: 'visualfries-provider-predecoded';
		frameManifest: LocalDeterministicFrameManifest;
		diagnosticsEnabled: boolean;
		mediaDeterministicStrict: boolean;
	};
	media: Array<{
		componentId: string;
		type: 'VIDEO' | 'GIF';
		sourceUrl: string;
		framesPrepared: number;
	}>;
	assetsRoot: string;
	strategyUsed: LocalDeterministicMediaStrategy;
};

const cloneScene = (scene: Scene): Scene => JSON.parse(JSON.stringify(scene)) as Scene;

const normalizeUrl = (value: string): string => {
	try {
		const parsed = new URL(value);
		parsed.search = '';
		parsed.hash = '';
		return parsed.toString();
	} catch {
		return value;
	}
};

const safeFilePart = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export const normalizeDeterministicPublicBasePath = (value: string): string => {
	const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
	const segments = normalized.split('/').filter(Boolean);
	if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
		throw new Error('publicBasePath must be a relative URL path without "." or ".." segments.');
	}
	return `/${segments.join('/')}`;
};

const resolveSafeAssetRoot = (workDir: string, publicBasePath: string): string => {
	const root = path.resolve(workDir);
	const target = path.resolve(root, publicBasePath.slice(1));
	const relative = path.relative(root, target);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('publicBasePath must resolve inside workDir.');
	}
	return target;
};

const toInputPath = (sourceUrl: string): string => {
	if (sourceUrl.startsWith('file://')) return fileURLToPath(sourceUrl);
	return sourceUrl;
};

const sourceForComponent = (
	scene: Scene,
	component: Scene['layers'][number]['components'][number]
): string | undefined => {
	if (!('source' in component)) return undefined;
	const directUrl = component.source?.url ?? component.source?.streamUrl;
	if (directUrl) return directUrl;
	const assetId = component.source?.assetId;
	return assetId ? scene.assets.find((asset) => asset.id === assetId)?.url : undefined;
};

export function collectLocalDeterministicMediaComponents(
	input: unknown
): LocalDeterministicMediaComponent[] {
	const scene = SceneShape.parse(input);
	const media: LocalDeterministicMediaComponent[] = [];

	for (const layer of scene.layers ?? []) {
		if (!layer || layer.muted) continue;
		for (const component of layer.components ?? []) {
			if (!component || component.visible === false) continue;
			if (component.type !== 'VIDEO' && component.type !== 'GIF') continue;

			const sourceUrl = sourceForComponent(scene, component);
			if (!sourceUrl) continue;

			media.push({
				component,
				id: component.id || crypto.randomUUID(),
				type: component.type,
				sourceUrl,
				sourceStartAt: 'source' in component ? (component.source?.startAt ?? 0) : 0,
				sourceEndAt:
					'source' in component && typeof component.source?.endAt === 'number'
						? component.source.endAt
						: undefined,
				timelineStartAt: component.timeline?.startAt ?? 0,
				timelineEndAt: component.timeline?.endAt ?? scene.settings.duration
			});
		}
	}

	return media;
}

export function resolveLocalDeterministicActiveWindow(
	component: LocalDeterministicMediaComponent,
	fromFrame: number,
	toFrame: number,
	fps: number
): LocalDeterministicActiveWindow | null {
	const frameBoundaryEpsilon = 1e-6;
	const chunkStartSec = fromFrame / fps;
	const chunkEndSec = toFrame / fps;
	const activeStartSec = Math.max(chunkStartSec, component.timelineStartAt);
	const activeEndSec = Math.min(chunkEndSec, component.timelineEndAt);
	if (activeEndSec <= activeStartSec) return null;

	const activeStartFrame = Math.max(
		fromFrame,
		Math.ceil(activeStartSec * fps - frameBoundaryEpsilon)
	);
	const activeEndFrame = Math.min(toFrame, Math.ceil(activeEndSec * fps - frameBoundaryEpsilon));
	if (activeEndFrame <= activeStartFrame) return null;

	return {
		activeStartSec,
		activeEndSec,
		activeStartFrame,
		activeEndFrame,
		sourceStartSec: component.sourceStartAt + (activeStartFrame / fps - component.timelineStartAt)
	};
}

// Not used by prepareLocalDeterministicMedia any more: sceneTime.ts tells it which frame the
// page asks for. Kept for callers outside.
export function toLocalDeterministicFrameIndex(
	component: LocalDeterministicMediaComponent,
	sceneFrameIndex: number,
	fps: number
): number {
	const timelineStartInFrames = component.timelineStartAt * fps;
	const sourceStartInFrames = component.sourceStartAt * fps;
	return Math.max(0, Math.round(sourceStartInFrames + sceneFrameIndex - timelineStartInFrames));
}

export function resolveLocalPredecodedExtractionPlan(
	sourceStartSec: number,
	sourceEndSec: number | undefined,
	expectedFrameCount: number,
	fps: number
): LocalPredecodedExtractionPlan {
	const outputFrameCount = Math.max(0, Math.floor(expectedFrameCount));
	if (outputFrameCount <= 0) {
		return { sourceStartSec, extractFrameCount: 0, outputFrameCount: 0, sourceEndLimited: false };
	}

	if (
		typeof sourceEndSec !== 'number' ||
		!Number.isFinite(sourceEndSec) ||
		sourceEndSec <= sourceStartSec
	) {
		if (typeof sourceEndSec === 'number' && sourceEndSec <= sourceStartSec) {
			return {
				sourceStartSec: Math.max(0, sourceEndSec - 1 / fps),
				extractFrameCount: 1,
				outputFrameCount,
				sourceEndLimited: true
			};
		}
		return {
			sourceStartSec,
			extractFrameCount: outputFrameCount,
			outputFrameCount,
			sourceEndLimited: false
		};
	}

	const availableFrames = Math.max(1, Math.ceil((sourceEndSec - sourceStartSec) * fps - 1e-6));
	return {
		sourceStartSec,
		extractFrameCount: Math.min(outputFrameCount, availableFrames),
		outputFrameCount,
		sourceEndLimited: availableFrames < outputFrameCount
	};
}

// ffmpeg reads the source before the page loads, so nothing else bounds it: a source that
// never answers would hang the render. ffmpeg prints nothing while it seeks, so the limit is
// on the whole call, not on silence.
const runFfmpeg = async (
	args: string[],
	input: { label: string; timeoutMs: number }
): Promise<void> => {
	const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
	const tag = `[visualfries deterministic media][${input.label}]`;
	await new Promise<void>((resolve, reject) => {
		const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
		let stderr = '';
		let timedOut = false;
		const timer =
			input.timeoutMs > 0
				? setTimeout(() => {
						timedOut = true;
						child.kill('SIGKILL');
					}, input.timeoutMs)
				: undefined;
		child.stderr?.on('data', (chunk) => {
			stderr = (stderr + String(chunk)).slice(-4000);
		});
		child.on('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			if (code === 0) return resolve();
			reject(
				new Error(
					timedOut
						? `${tag} ffmpeg timed out: no result for ${input.timeoutMs} ms.`
						: `${tag} ffmpeg exited ${code}. ${stderr}`
				)
			);
		});
	});
};

const listFrameFiles = async (
	dir: string,
	extension: LocalDeterministicFrameExtension
): Promise<string[]> => {
	const files = (await fs.readdir(dir))
		.filter((file) => file.toLowerCase().endsWith(`.${extension}`))
		.sort(
			(a, b) =>
				Number(path.basename(a, `.${extension}`)) - Number(path.basename(b, `.${extension}`))
		)
		.map((file) => path.join(dir, file));
	return files;
};

const extractFrameSequence = async (options: {
	inputPath: string;
	outputDir: string;
	sourceStartSec: number;
	expectedFrameCount: number;
	fps: number;
	extension: LocalDeterministicFrameExtension;
	jpegQualityScale: number;
	seekMode?: 'fast' | 'accurate';
	label?: string;
	timeoutMs: number;
}): Promise<string[]> => {
	await fs.mkdir(options.outputDir, { recursive: true });
	const outputPattern = path.join(options.outputDir, `%d.${options.extension}`);
	const seekMode = options.seekMode ?? 'fast';
	const paddedDurationSec = options.expectedFrameCount / options.fps + 0.5 / options.fps;
	const args = ['-y'];

	if (seekMode === 'fast') {
		args.push('-ss', options.sourceStartSec.toFixed(6));
	}
	args.push('-i', options.inputPath);
	if (seekMode === 'accurate') {
		args.push('-ss', options.sourceStartSec.toFixed(6));
	}
	args.push(
		'-t',
		paddedDurationSec.toFixed(6),
		'-vf',
		`fps=${options.fps}:round=near:start_time=0`,
		'-frames:v',
		String(options.expectedFrameCount),
		'-vsync',
		'cfr',
		'-start_number',
		'1'
	);
	if (options.extension === 'jpg') {
		args.push('-q:v', String(options.jpegQualityScale), '-pix_fmt', 'yuvj420p');
	} else {
		args.push('-compression_level', '3');
	}
	args.push(outputPattern);

	await runFfmpeg(args, {
		label: options.label ?? 'extract-frame-sequence',
		timeoutMs: options.timeoutMs
	});
	return listFrameFiles(options.outputDir, options.extension);
};

const padTrailingFrames = async (
	outputDir: string,
	extension: LocalDeterministicFrameExtension,
	frames: string[],
	expectedFrameCount: number
): Promise<string[]> => {
	if (
		frames.length === expectedFrameCount ||
		frames.length === 0 ||
		frames.length > expectedFrameCount
	) {
		return frames;
	}
	const lastFrame = frames[frames.length - 1];
	for (let index = frames.length + 1; index <= expectedFrameCount; index += 1) {
		await fs.copyFile(lastFrame, path.join(outputDir, `${index}.${extension}`));
	}
	return listFrameFiles(outputDir, extension);
};

const assignBoundaryFrames = (
	manifest: LocalDeterministicFrameManifest,
	componentId: string,
	frameIndex: number,
	frameUrl: string,
	radius = 2
): void => {
	manifest[componentId] = manifest[componentId] ?? {};
	for (let index = Math.max(0, frameIndex - radius); index <= frameIndex + radius; index += 1) {
		manifest[componentId][String(index)] ??= frameUrl;
	}
};

type FrameExtractionContext = {
	fps: number;
	frameExtension: LocalDeterministicFrameExtension;
	jpegQualityScale: number;
	predecodedRoot: string;
	publicBasePath: string;
	timeoutMs: number;
};

type MediaFramesTarget = {
	media: LocalDeterministicMediaComponent;
	/** The component's own folder below `predecoded`. */
	folder: string;
};

/** The page asks a component for `mediaFrame` while it shows scene frame `sceneFrame`. */
type FrameNeed = { sceneFrame: number; mediaFrame: number };

// Ids differ in characters a file name cannot hold (`clip/a`, `clip_a`), or only in case on a
// file system that ignores it. The position in the scene makes every folder its own, so a
// long id can be cut to fit the 255 bytes of a file name.
const componentFolder = (media: LocalDeterministicMediaComponent, position: number): string =>
	`${position}-${safeFilePart(media.id).slice(0, 80)}`;

const resolveSourceInput = (media: LocalDeterministicMediaComponent): string => {
	const sourceInput = toInputPath(media.sourceUrl);
	if (!/^https?:\/\//.test(sourceInput) && !existsSync(sourceInput)) {
		throw new Error(`VisualFries deterministic media source does not exist: ${media.sourceUrl}`);
	}
	return sourceInput;
};

// A fast seek can come back short near the end of a source; the accurate seek is the retry.
const extractComponentFrames = async (
	target: MediaFramesTarget,
	context: FrameExtractionContext,
	plan: LocalPredecodedExtractionPlan
): Promise<{ outputDir: string; frames: string[] }> => {
	const outputDir = path.join(context.predecodedRoot, target.folder);
	await fs.rm(outputDir, { recursive: true, force: true });
	await fs.mkdir(outputDir, { recursive: true });
	const extract = (seekMode: 'fast' | 'accurate', label: string) =>
		extractFrameSequence({
			inputPath: resolveSourceInput(target.media),
			outputDir,
			sourceStartSec: plan.sourceStartSec,
			expectedFrameCount: plan.extractFrameCount,
			fps: context.fps,
			extension: context.frameExtension,
			jpegQualityScale: context.jpegQualityScale,
			seekMode,
			label: `${target.media.id}:${label}`,
			timeoutMs: context.timeoutMs
		});

	let frames = await extract('fast', 'fast');
	if (frames.length < plan.extractFrameCount) {
		for (const framePath of frames) await fs.rm(framePath, { force: true });
		frames = await extract('accurate', 'accurate-retry');
	}
	return { outputDir, frames };
};

// The frames the page asks a component for at the given scene times, by the arithmetic of the
// runtime itself. Nothing else decides which keys the manifest holds.
const frameNeedsAt = (
	media: LocalDeterministicMediaComponent,
	sceneTimes: number[],
	settings: Scene['settings']
): FrameNeed[] =>
	sceneTimes.flatMap((time) => {
		const mediaFrame = mediaFrameIndexAtSceneTime(media, time, settings);
		if (mediaFrame === null) return [];
		return [{ sceneFrame: frameIndexAtTime(time, settings.fps), mediaFrame }];
	});

// Prepares the frames of one component and returns how many scene frames they cover.
//
// One ffmpeg run gives a file for every scene frame from the first to the last one the render
// draws the component on; each drawn frame is keyed by the frame the page asks for there. A
// time the page only looks at is never drawn: it takes its file from the run when it lies
// inside, and the first file otherwise. A component the page never shows gets no extraction,
// and its source is not even looked at.
//
// The run starts at `windowStartFrame`, the component's first frame in the frame window, when
// that lies before the first drawn frame (an in-point or a trim zone moved it). Where a run
// starts decides which picture ffmpeg picks for a source time between two frames, and this
// keeps the pictures of renders that worked before.
const prepareMediaFrames = async (
	target: MediaFramesTarget,
	context: FrameExtractionContext,
	manifest: LocalDeterministicFrameManifest,
	needs: { rendered: FrameNeed[]; other: FrameNeed[]; windowStartFrame?: number }
): Promise<number> => {
	if (needs.rendered.length + needs.other.length === 0) return 0;
	const { media } = target;
	const rendered = [...needs.rendered].sort((a, b) => a.sceneFrame - b.sceneFrame);
	const firstSceneFrame = Math.min(
		rendered[0]?.sceneFrame ?? 0,
		needs.windowStartFrame ?? Infinity
	);
	const frameCount = rendered.length
		? rendered[rendered.length - 1].sceneFrame - firstSceneFrame + 1
		: 1;
	// A GIF plays from its first frame whatever its source says (ComponentContext).
	const sourceStartAt = media.type === 'VIDEO' ? media.sourceStartAt : 0;
	const extractionPlan = resolveLocalPredecodedExtractionPlan(
		rendered.length
			? sourceStartAt + (firstSceneFrame / context.fps - media.timelineStartAt)
			: sourceStartAt,
		media.sourceEndAt,
		frameCount,
		context.fps
	);

	const extracted = await extractComponentFrames(target, context, extractionPlan);
	const frames = await padTrailingFrames(
		extracted.outputDir,
		context.frameExtension,
		extracted.frames,
		frameCount
	);
	if (frames.length < frameCount) {
		throw new Error(
			`VisualFries deterministic media missing frames for ${media.id}: expected ${frameCount}, got ${frames.length}`
		);
	}

	const frameUrlAt = (sceneFrame: number): string => {
		const fileIndex = rendered.length ? sceneFrame - firstSceneFrame : 0;
		const fileNumber = fileIndex >= 0 && fileIndex < frameCount ? fileIndex + 1 : 1;
		return `${context.publicBasePath}/predecoded/${target.folder}/${fileNumber}.${context.frameExtension}`;
	};
	const componentFrames = (manifest[media.id] ??= {});
	for (const need of rendered) {
		componentFrames[String(need.mediaFrame)] = frameUrlAt(need.sceneFrame);
	}
	for (const need of needs.other) {
		assignBoundaryFrames(manifest, media.id, need.mediaFrame, frameUrlAt(need.sceneFrame));
	}
	// A net below the frames above, as before: the first and the last frame of the run also
	// stand for the two indices next to them. It only fills indices that have no frame.
	if (rendered.length) {
		const last = rendered[rendered.length - 1];
		assignBoundaryFrames(
			manifest,
			media.id,
			Math.round(sourceStartAt * context.fps),
			frameUrlAt(firstSceneFrame)
		);
		assignBoundaryFrames(manifest, media.id, last.mediaFrame, frameUrlAt(last.sceneFrame));
	}
	return rendered.length ? frameCount : 0;
};

// Every frame of the window, at the frame rate of the scene. Seeks past the end of the scene
// all land on its last frame, so one of them stands for the rest.
const windowRenderTimes = (
	window: { fromFrame: number; toFrame: number },
	settings: Scene['settings']
): number[] => {
	const sceneEndFrame = Math.ceil(settings.duration * settings.fps);
	const toFrame = Math.min(window.toFrame, Math.max(window.fromFrame, sceneEndFrame) + 1);
	return Array.from(
		{ length: Math.max(0, toFrame - window.fromFrame) },
		(_, index) => (window.fromFrame + index) / settings.fps
	);
};

export async function prepareLocalDeterministicMedia(
	input: PrepareLocalDeterministicMediaInput
): Promise<PrepareLocalDeterministicMediaResult> {
	const scene = cloneScene(SceneShape.parse(input.scene));
	const fps = scene.settings.fps || 30;
	const publicBasePath = normalizeDeterministicPublicBasePath(
		input.publicBasePath ?? '/deterministic-media'
	);
	const assetsRoot = resolveSafeAssetRoot(input.workDir, publicBasePath);
	const context: FrameExtractionContext = {
		fps,
		frameExtension: input.frameExtension ?? 'jpg',
		jpegQualityScale: Math.max(1, Math.min(31, Math.floor(input.jpegQualityScale ?? 2))),
		predecodedRoot: path.join(assetsRoot, 'predecoded'),
		publicBasePath,
		timeoutMs: input.extractionTimeoutMs ?? DEFAULT_EXTRACTION_TIMEOUT_MS
	};
	await fs.mkdir(context.predecodedRoot, { recursive: true });

	const shown = shownSceneTimes({
		settings: scene.settings,
		renderTimes: input.renderTimes ?? windowRenderTimes(input, scene.settings),
		seekTimes: input.seekTimes
	});
	const frameManifest: LocalDeterministicFrameManifest = {};
	const preparedMedia: PrepareLocalDeterministicMediaResult['media'] = [];

	for (const [position, media] of collectLocalDeterministicMediaComponents(scene).entries()) {
		const framesPrepared = await prepareMediaFrames(
			{ media, folder: componentFolder(media, position) },
			context,
			frameManifest,
			{
				rendered: frameNeedsAt(media, shown.rendered, scene.settings),
				other: frameNeedsAt(media, shown.other, scene.settings),
				windowStartFrame: resolveLocalDeterministicActiveWindow(
					media,
					input.fromFrame,
					input.toFrame,
					fps
				)?.activeStartFrame
			}
		);
		if (framesPrepared === 0) continue;
		preparedMedia.push({
			componentId: media.id,
			type: media.type,
			sourceUrl: normalizeUrl(media.sourceUrl),
			framesPrepared
		});
	}

	return {
		preparedScene: scene,
		payload: {
			strategy: 'visualfries-provider-predecoded',
			frameManifest,
			diagnosticsEnabled: input.diagnostics ?? false,
			mediaDeterministicStrict: input.strict ?? true
		},
		media: preparedMedia,
		assetsRoot,
		strategyUsed: 'predecoded-image-sequence'
	};
}
