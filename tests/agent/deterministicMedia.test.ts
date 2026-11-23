import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	collectLocalDeterministicMediaComponents,
	normalizeDeterministicPublicBasePath,
	prepareLocalDeterministicMedia,
	resolveLocalDeterministicActiveWindow,
	resolveLocalPredecodedExtractionPlan,
	toLocalDeterministicFrameIndex
} from '$lib/agent';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const scene = {
	id: 'det-media-test',
	settings: {
		width: 1080,
		height: 1920,
		duration: 10,
		fps: 30,
		backgroundColor: '#000000'
	},
	assets: [{ id: 'source-video', type: 'VIDEO', url: 'file:///tmp/source.mp4' }],
	layers: [
		{
			id: 'video-layer',
			components: [
				{
					id: 'clip',
					type: 'VIDEO',
					source: { assetId: 'source-video', startAt: 4, endAt: 12 },
					timeline: { startAt: 2, endAt: 8 },
					appearance: { x: 0, y: 0, width: 1080, height: 1920 },
					muted: true
				}
			]
		}
	]
};

describe('agent deterministic media helpers', () => {
	it('collects VIDEO components through asset references', () => {
		const media = collectLocalDeterministicMediaComponents(scene);

		expect(media).toEqual([
			expect.objectContaining({
				id: 'clip',
				type: 'VIDEO',
				sourceUrl: 'file:///tmp/source.mp4',
				sourceStartAt: 4,
				sourceEndAt: 12,
				timelineStartAt: 2,
				timelineEndAt: 8
			})
		]);
	});

	it('resolves the active render window and deterministic frame index space', () => {
		const [media] = collectLocalDeterministicMediaComponents(scene);
		const activeWindow = resolveLocalDeterministicActiveWindow(media, 90, 180, 30);

		expect(activeWindow).toEqual({
			activeStartSec: 3,
			activeEndSec: 6,
			activeStartFrame: 90,
			activeEndFrame: 180,
			sourceStartSec: 5
		});
		expect(toLocalDeterministicFrameIndex(media, 90, 30)).toBe(150);
		expect(toLocalDeterministicFrameIndex(media, 179, 30)).toBe(239);
	});

	it('limits extraction when a source end cuts the requested output short', () => {
		const plan = resolveLocalPredecodedExtractionPlan(10, 10.1, 10, 30);

		expect(plan).toEqual({
			sourceStartSec: 10,
			extractFrameCount: 3,
			outputFrameCount: 10,
			sourceEndLimited: true
		});
	});

	it('rejects deterministic public base paths that can escape the work directory', () => {
		expect(normalizeDeterministicPublicBasePath('/deterministic-media')).toBe(
			'/deterministic-media'
		);
		expect(() => normalizeDeterministicPublicBasePath('../escape')).toThrow(/publicBasePath/);
		expect(() => normalizeDeterministicPublicBasePath('/safe/../escape')).toThrow(/publicBasePath/);
	});

	it('skips deterministic media outside the requested frame window without probing sources', async () => {
		const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-det-media-'));
		try {
			// The clip is on screen from second 2: not in frames 0-30, not where the scene tree builds.
			const result = await prepareLocalDeterministicMedia({
				scene,
				workDir,
				fromFrame: 0,
				toFrame: 30
			});

			expect(result.media).toEqual([]);
			expect(result.payload.frameManifest).toEqual({});
		} finally {
			await fs.rm(workDir, { recursive: true, force: true });
		}
	});

	it('names the missing source of media that is on screen where the scene tree builds', async () => {
		const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-det-media-'));
		try {
			// Frames 90-120 do not show the clip, but the scene tree is built at second 2.
			await expect(
				prepareLocalDeterministicMedia({
					scene: { ...scene, settings: { ...scene.settings, startAt: 2 } },
					workDir,
					fromFrame: 270,
					toFrame: 300
				})
			).rejects.toThrow('deterministic media source does not exist: file:///tmp/source.mp4');
		} finally {
			await fs.rm(workDir, { recursive: true, force: true });
		}
	});
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

// A 30 fps scene of 100 s, prepared for the chunk of frames 1351-2676 (45.03 s - 89.2 s).
describe.skipIf(!hasFfmpeg)('frames prepared for a chunk from the middle of a scene', () => {
	const FPS = 30;
	const MISSING_SOURCE = 'file:///tmp/visualfries-no-such-source.mp4';
	let dir: string;
	let sourceUrl: string;

	type Clip = ReturnType<typeof clip>;
	const clip = (
		id: string,
		startAt: number,
		endAt: number,
		sourceStartAt: number,
		overrides: Record<string, unknown> = {}
	) => ({
		id,
		type: 'VIDEO',
		source: { url: sourceUrl, startAt: sourceStartAt },
		timeline: { startAt, endAt },
		appearance: { x: 0, y: 0, width: 64, height: 48 },
		muted: true,
		...overrides
	});

	const chunkClips = (): Clip[] => [
		clip('ended-before', 0, 40, 0),
		clip('cut-by-chunk-start', 40, 50, 1),
		clip('inside-chunk', 60, 70, 0),
		clip('cut-by-chunk-end', 85, 95, 2),
		clip('starts-after', 96, 99, 3)
	];

	const prepare = async (
		name: string,
		input: {
			settings?: Record<string, unknown>;
			layers?: Array<Record<string, unknown>>;
			fromFrame?: number;
			toFrame?: number;
			renderTimes?: number[];
			seekTimes?: number[];
			extractionTimeoutMs?: number;
		} = {}
	) => {
		const workDir = path.join(dir, name);
		await fs.mkdir(workDir);
		const result = await prepareLocalDeterministicMedia({
			scene: {
				id: 'chunk',
				settings: { width: 64, height: 48, duration: 100, fps: FPS, ...input.settings },
				assets: [],
				layers: input.layers ?? [{ id: 'media', components: chunkClips() }]
			},
			workDir,
			fromFrame: input.fromFrame ?? 1351,
			toFrame: input.toFrame ?? 2676,
			renderTimes: input.renderTimes,
			seekTimes: input.seekTimes,
			extractionTimeoutMs: input.extractionTimeoutMs
		});
		const frames = (id: string) =>
			Object.keys(result.payload.frameManifest[id] ?? {})
				.map(Number)
				.sort((a, b) => a - b);
		const folders = async () =>
			(await fs.readdir(path.join(workDir, 'deterministic-media/predecoded'))).sort();
		const picture = (id: string, frame: number) =>
			fs.readFile(path.join(workDir, result.payload.frameManifest[id][String(frame)]));
		return { result, frames, folders, picture, workDir, manifest: result.payload.frameManifest };
	};

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-det-chunk-'));
		const source = path.join(dir, 'source.mp4');
		const made = spawnSync('ffmpeg', [
			'-y',
			'-f',
			'lavfi',
			'-i',
			`testsrc=size=64x48:rate=${FPS}:duration=12`,
			'-pix_fmt',
			'yuv420p',
			source
		]);
		expect(made.status).toBe(0);
		sourceUrl = pathToFileURL(source).href;
	}, 60_000);

	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('gives media that ended before the chunk one frame, because the scene tree builds on it', async () => {
		const { result, frames, manifest } = await prepare('ended-before');

		// The scene tree is built at second 0, where the clip shows its frame 0.
		expect(frames('ended-before')).toEqual([0]);
		expect(new Set(Object.values(manifest['ended-before']))).toEqual(
			new Set(['/deterministic-media/predecoded/0-ended-before/1.jpg'])
		);
		// It is a bootstrap frame only: the component is not part of the chunk's media.
		expect(result.media.map((item) => item.componentId)).toEqual([
			'cut-by-chunk-start',
			'inside-chunk',
			'cut-by-chunk-end'
		]);
	}, 60_000);

	it('extracts nothing for media that starts after the chunk, so its missing source does not fail the chunk', async () => {
		const clips = chunkClips();
		clips[4] = clip('starts-after', 96, 99, 3, { source: { url: MISSING_SOURCE, startAt: 3 } });
		const { manifest, folders } = await prepare('starts-after', {
			layers: [{ id: 'media', components: clips }]
		});

		expect(manifest['starts-after']).toBeUndefined();
		expect(await folders()).toEqual([
			'0-ended-before',
			'1-cut-by-chunk-start',
			'2-inside-chunk',
			'3-cut-by-chunk-end'
		]);
	}, 60_000);

	it('prepares the frames inside the chunk of media the chunk cuts in two', async () => {
		const { result, frames, manifest } = await prepare('cut');
		const prepared = Object.fromEntries(
			result.media.map((item) => [item.componentId, item.framesPrepared])
		);

		// Scene frames 1351-1499 of a clip on 1200-1500 whose source starts at frame 30.
		expect(prepared['cut-by-chunk-start']).toBe(149);
		expect(manifest['cut-by-chunk-start']['181']).toBe(
			'/deterministic-media/predecoded/1-cut-by-chunk-start/1.jpg'
		);
		expect(manifest['cut-by-chunk-start']['329']).toBe(
			'/deterministic-media/predecoded/1-cut-by-chunk-start/149.jpg'
		);
		// Its first frame (30) with slack, the 149 frames, and two frames of slack after the last.
		expect(frames('cut-by-chunk-start')).toEqual([
			28,
			29,
			30,
			31,
			32,
			...Array.from({ length: 151 }, (_, index) => 181 + index)
		]);

		// Scene frames 2550-2675 of a clip on 2550-2850 whose source starts at frame 60.
		expect(prepared['cut-by-chunk-end']).toBe(126);
		expect(frames('cut-by-chunk-end')).toEqual(
			Array.from({ length: 130 }, (_, index) => 58 + index)
		);
		expect(manifest['cut-by-chunk-end']['185']).toBe(
			'/deterministic-media/predecoded/3-cut-by-chunk-end/126.jpg'
		);

		expect(prepared['inside-chunk']).toBe(300);
	}, 60_000);

	it('prepares the frame at the scene in-point for media that ended before the chunk', async () => {
		const { frames, manifest } = await prepare('in-point', { settings: { startAt: 20 } });

		// The scene tree builds at second 20, where the clip shows its frame 600. Its frame 0
		// is never asked for.
		expect(frames('ended-before')).toEqual([600]);
		expect(manifest['ended-before']['600']).toBe(
			'/deterministic-media/predecoded/0-ended-before/1.jpg'
		);
		// Media that is not on screen at second 20 gets no such frame.
		expect(frames('starts-after')).toEqual([]);
		expect(frames('inside-chunk')).toEqual(Array.from({ length: 302 }, (_, index) => index));
	}, 60_000);

	it('prepares frame 600 for media that ends at an in-point of 20.015 s', async () => {
		// The runtime shows an in-point of 20.015 s on its frame, 600 (second 20.0), and there
		// a clip on 0-20.015 is still on screen.
		const { frames } = await prepare('fractional-in-point', {
			settings: { startAt: 20.015 },
			layers: [{ id: 'media', components: [clip('ends-at-in-point', 0, 20.015, 0)] }]
		});

		expect(frames('ends-at-in-point')).toEqual([600]);
	}, 60_000);

	it('prepares the frame of a seek outside the chunk', async () => {
		// A frame to explain: the page seeks to second 97, where the clip (source from 3 s)
		// shows its frame 120.
		const { frames } = await prepare('seek-time', { seekTimes: [97] });

		expect(frames('starts-after')).toEqual([120]);
	}, 60_000);

	it('keeps the frames of two components whose ids map to the same file name', async () => {
		const { result, manifest, workDir, folders } = await prepare('same-file-name', {
			layers: [
				{
					id: 'media',
					components: [
						clip('clip/a', 0, 1, 0),
						clip('clip_a', 0, 1, 2),
						// Not on screen in the window, but where the scene tree builds.
						clip('CLIP_A', 0, 0.1, 4)
					]
				}
			],
			fromFrame: 6,
			toFrame: 16
		});

		expect(await folders()).toEqual(['0-clip_a', '1-clip_a', '2-CLIP_A']);
		expect(result.media.map((item) => item.framesPrepared)).toEqual([10, 10]);
		expect(manifest['clip/a']['6']).toBe('/deterministic-media/predecoded/0-clip_a/1.jpg');
		expect(manifest['clip_a']['66']).toBe('/deterministic-media/predecoded/1-clip_a/1.jpg');
		expect(manifest['CLIP_A']['120']).toBe('/deterministic-media/predecoded/2-CLIP_A/1.jpg');
		// Every frame the manifest names is still on disk, and the two clips show different
		// pictures (their sources start 2 s apart).
		const urls = Object.values(manifest).flatMap((frames) => Object.values(frames));
		expect(urls.filter((url) => !existsSync(path.join(workDir, url)))).toEqual([]);
		const first = await fs.readFile(path.join(workDir, manifest['clip/a']['6']));
		const second = await fs.readFile(path.join(workDir, manifest['clip_a']['66']));
		expect(first.equals(second)).toBe(false);
	}, 60_000);

	it('prepares no frames for media of a muted layer, and leaves the scene as it is', async () => {
		const { result, manifest } = await prepare('muted-layer', {
			layers: [
				{ id: 'shown', components: [clip('shown', 0, 100, 0)] },
				{ id: 'muted', muted: true, components: [clip('in-muted-layer', 0, 100, 0)] }
			],
			fromFrame: 0,
			toFrame: 5
		});
		const visible = Object.fromEntries(
			result.preparedScene.layers.flatMap((layer) =>
				layer.components.map((component) => [component.id, component.visible])
			)
		);

		expect(Object.keys(manifest)).toEqual(['shown']);
		// The client environment draws this video, so the scene must not hide it. The server
		// render asks for no frame of it (DeterministicMediaManager.expectsFrames).
		expect(visible).toEqual({ shown: true, 'in-muted-layer': true });
	}, 60_000);

	it('prepares the one frame of a clip that starts and ends at the same time', async () => {
		// The runtime shows a clip of no length on the frame of its time: frame 60.
		const { result, frames, manifest } = await prepare('zero-length', {
			layers: [{ id: 'media', components: [clip('zero-length', 2, 2, 1)] }],
			fromFrame: 60,
			toFrame: 62
		});

		expect(result.media.map((item) => item.framesPrepared)).toEqual([1]);
		expect(frames('zero-length')).toEqual([30]);
		expect(manifest['zero-length']['30']).toBe(
			'/deterministic-media/predecoded/0-zero-length/1.jpg'
		);
	}, 60_000);

	it('adds the frame the page asks for first to a clip whose times lie between two frames', async () => {
		// The page puts both starts on their frames (0 and 0), so scene frame 300 asks for
		// frame 300. The window keys that scene frame as 301 (it rounds the distance of the two
		// starts): those keys stay, and frame 300 gets its picture from a run of its own.
		const { frames, manifest, picture } = await prepare('between-frames', {
			layers: [{ id: 'media', components: [clip('between-frames', 0.003, 20, 0.03)] }],
			fromFrame: 300,
			toFrame: 310
		});
		const whole = await prepare('between-frames-whole', {
			layers: [{ id: 'media', components: [clip('between-frames', 0.003, 20, 0.03)] }],
			fromFrame: 0,
			toFrame: 310
		});
		const file = (frame: number) => manifest['between-frames'][String(frame)];

		expect(frames('between-frames').slice(-13)).toEqual(
			Array.from({ length: 13 }, (_, index) => 300 + index)
		);
		expect(file(300)).toBe('/deterministic-media/predecoded/0-between-frames-outside/1.jpg');
		expect(file(301)).toBe('/deterministic-media/predecoded/0-between-frames/1.jpg');
		expect(file(309)).toBe('/deterministic-media/predecoded/0-between-frames/9.jpg');
		// It is the picture frame 300 has in a render of the whole clip.
		expect(
			(await picture('between-frames', 300)).equals(await whole.picture('between-frames', 300))
		).toBe(true);
	}, 60_000);

	it('adds that frame with the picture before the window when the two starts lie half a frame apart', async () => {
		// The starts are 1.5 frames apart: the page asks for frame 298 on scene frame 300, the
		// window keys that scene frame as 299, and rounding the distance alone falls to the other
		// side. The added frame is counted from the run of the window, one frame before its
		// first file. Every file of such a clip lies between two source frames, and a run that
		// starts there takes the later one: the same picture a render of the whole clip has one
		// frame further on.
		const components = () => [clip('half-apart', 0.083, 20, 0.033)];
		const { manifest, picture } = await prepare('half-apart', {
			layers: [{ id: 'media', components: components() }],
			fromFrame: 300,
			toFrame: 310
		});
		const whole = await prepare('half-apart-whole', {
			layers: [{ id: 'media', components: components() }],
			fromFrame: 0,
			toFrame: 310
		});
		const added = await picture('half-apart', 298);

		expect(manifest['half-apart']['298']).toBe(
			'/deterministic-media/predecoded/0-half-apart-outside/1.jpg'
		);
		expect(manifest['half-apart']['299']).toBe(
			'/deterministic-media/predecoded/0-half-apart/1.jpg'
		);
		expect(added.equals(await picture('half-apart', 299))).toBe(false);
		expect(added.equals(await whole.picture('half-apart', 299))).toBe(true);
	}, 60_000);

	it('repeats the first picture of a clip whose source starts between two frames, as it always did', async () => {
		// Source start 0.02 s is frame 0.6: the window keys scene frame 0 as frame 1, the page
		// asks for frame 0 there, and the slack around the source start gives it the first file.
		const { manifest } = await prepare('source-between-frames', {
			layers: [{ id: 'media', components: [clip('video', 0, 3, 0.02)] }],
			fromFrame: 0,
			toFrame: 5
		});

		expect([0, 1, 2, 3, 4].map((frame) => manifest['video'][String(frame)])).toEqual(
			[1, 1, 2, 3, 4].map((file) => `/deterministic-media/predecoded/0-video/${file}.jpg`)
		);
	}, 60_000);

	describe('a GIF', () => {
		const gif = (startAt: number, endAt: number, sourceStartAt: number) => ({
			id: 'gif',
			type: 'GIF',
			source: { url: sourceUrl, startAt: sourceStartAt },
			timeline: { startAt, endAt },
			appearance: { x: 0, y: 0, width: 64, height: 48 }
		});

		it('repeats its first picture when it has a source start, as it always did', async () => {
			// 10 fps, source start 0.1 s: the window keys scene frame 0 as frame 1. The page
			// leaves the source start of a GIF out and asks for frame 0 there.
			const { manifest, picture } = await prepare('gif-from-0', {
				settings: { fps: 10 },
				layers: [{ id: 'media', components: [gif(0, 2, 0.1), clip('video', 0, 2, 0.1)] }],
				fromFrame: 0,
				toFrame: 5
			});

			expect([0, 1, 2, 3, 4].map((frame) => manifest['gif'][String(frame)])).toEqual(
				[1, 1, 2, 3, 4].map((file) => `/deterministic-media/predecoded/0-gif/${file}.jpg`)
			);
			expect((await picture('gif', 0)).equals(await picture('video', 1))).toBe(true);
		}, 60_000);

		it('gets the frames the page asks for when it starts later on the timeline', async () => {
			// Scene frames 60 and 61 are keyed 30 and 31 (source start 1 s); the page asks for
			// frames 0 and 1, and those are the first pictures of the GIF.
			const { frames, manifest, picture } = await prepare('gif-from-2', {
				layers: [{ id: 'media', components: [gif(2, 4, 1), clip('video', 2, 4, 0)] }],
				fromFrame: 60,
				toFrame: 62
			});

			expect(frames('gif')).toEqual([0, 1, 28, 29, 30, 31, 32, 33]);
			expect(manifest['gif']['1']).toBe('/deterministic-media/predecoded/0-gif-outside/2.jpg');
			expect((await picture('gif', 0)).equals(await picture('video', 0))).toBe(true);
		}, 60_000);
	});

	it('gives a frame the page only looks at its own picture when a run holds it', async () => {
		// 10 fps, frames 1 and 4 are drawn and frame 2 is explained: frame 2 has its own file
		// in the run, and no neighbour's picture takes its place.
		const { manifest } = await prepare('looked-at', {
			settings: { fps: 10 },
			layers: [{ id: 'media', components: [clip('video', 0, 3, 0)] }],
			fromFrame: 1,
			toFrame: 5,
			renderTimes: [0.1, 0.4],
			seekTimes: [0.2]
		});

		expect(manifest['video']['2']).toBe('/deterministic-media/predecoded/0-video/2.jpg');
	}, 60_000);

	it('prepares the picture of the out-point for frames after it', async () => {
		const layers = [{ id: 'media', components: [clip('long', 0, 25, 0)] }];
		const atOutPoint = await prepare('out-point-wanted', { layers, fromFrame: 150, toFrame: 151 });
		// Frames 180 and 181 lie after the out-point: the page shows second 5 on both, and
		// asks the clip for its frame 150.
		const afterOutPoint = await prepare('out-point', {
			settings: { endAt: 5 },
			layers,
			fromFrame: 180,
			toFrame: 182
		});

		// The two frames of the window, as before, and a run of one frame for the out-point.
		expect(afterOutPoint.result.media.map((item) => item.framesPrepared)).toEqual([3]);
		expect(afterOutPoint.manifest['long']['150']).toBe(
			'/deterministic-media/predecoded/0-long-outside/1.jpg'
		);
		expect(
			(await afterOutPoint.picture('long', 150)).equals(await atOutPoint.picture('long', 150))
		).toBe(true);
	}, 60_000);

	it('starts the run at the first frame of the clip in the window, also before the in-point', async () => {
		// Frames 0-60 all show the in-point (frame 60), where the clip is asked for frame 90.
		// The run still starts at scene frame 15, where the clip starts, as it did before:
		// with a source time between two frames, another start gives another picture.
		const { result, manifest } = await prepare('run-start', {
			settings: { startAt: 2.02 },
			layers: [{ id: 'media', components: [clip('early', 0.5, 9, 1.51)] }],
			fromFrame: 0,
			toFrame: 90
		});

		expect(result.media.map((item) => item.framesPrepared)).toEqual([75]);
		expect(manifest['early']['90']).toBe('/deterministic-media/predecoded/0-early/46.jpg');
		expect(manifest['early']['119']).toBe('/deterministic-media/predecoded/0-early/75.jpg');
	}, 60_000);

	it('does not look at media the render times never show', async () => {
		// A range render leaves out the frames in a trim zone (4-9 s), so the page never
		// shows the clip that lives only there. Its missing source does not matter.
		const { manifest, frames } = await prepare('trimmed-out', {
			settings: { trimZones: [{ start: 4, end: 9 }] },
			layers: [
				{
					id: 'media',
					components: [
						clip('in-trim-zone', 4, 5, 0, { source: { url: MISSING_SOURCE, startAt: 0 } }),
						clip('after-trim-zone', 9, 20, 0)
					]
				}
			],
			fromFrame: 150,
			toFrame: 273,
			renderTimes: [9, 271 / 30, 272 / 30]
		});

		expect(manifest['in-trim-zone']).toBeUndefined();
		expect(frames('after-trim-zone')).toEqual([0, 1, 2, 3, 4]);
	}, 60_000);

	it('prepares a window that reaches far past the end of the scene without walking it', async () => {
		const { result, frames } = await prepare('past-the-end', {
			settings: { duration: 2 },
			layers: [{ id: 'media', components: [clip('short', 0, 2, 0)] }],
			fromFrame: 0,
			toFrame: 1_000_000_001
		});

		// Frames 0-59 show the clip; every later frame shows second 2, where it is over.
		expect(result.media.map((item) => item.framesPrepared)).toEqual([60]);
		expect(frames('short')).toEqual(Array.from({ length: 62 }, (_, index) => index));
	}, 10_000);

	it('cuts a long id so that its folder name fits a file system', async () => {
		const id = 'x'.repeat(254);
		const { folders, manifest } = await prepare('long-id', {
			layers: [{ id: 'media', components: [clip(id, 0, 1, 0)] }],
			fromFrame: 0,
			toFrame: 2
		});

		expect(await folders()).toEqual([`0-${'x'.repeat(80)}`]);
		expect(manifest[id]['0']).toBe(`/deterministic-media/predecoded/0-${'x'.repeat(80)}/1.jpg`);
	}, 60_000);

	it('stops an extraction whose source never answers', async () => {
		const server = http.createServer(() => {
			// Accepts the request and never answers it.
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const { port } = server.address() as { port: number };
		try {
			await expect(
				prepare('stuck-source', {
					layers: [
						{
							id: 'media',
							components: [
								clip('stuck', 0, 100, 0, {
									source: { url: `http://127.0.0.1:${port}/stuck.mp4`, startAt: 0 }
								})
							]
						}
					],
					fromFrame: 0,
					toFrame: 5,
					extractionTimeoutMs: 500
				})
			).rejects.toThrow(
				'[visualfries deterministic media][stuck:fast] ffmpeg timed out: no result for 500 ms.'
			);
		} finally {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
		}
	}, 60_000);
});
