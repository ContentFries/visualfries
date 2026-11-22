import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	assignLocalBootstrapFrames,
	collectLocalDeterministicMediaComponents,
	normalizeDeterministicPublicBasePath,
	prepareLocalDeterministicMedia,
	resolveLocalDeterministicActiveWindow,
	resolveLocalPredecodedExtractionPlan,
	toLocalDeterministicFrameIndex,
	toLocalSceneStartFrameIndex
} from '$lib/agent';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
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

	it('finds the frame a component shows at the scene in-point', () => {
		const [media] = collectLocalDeterministicMediaComponents(scene);

		// Timeline 2-8 s, source from 4 s: at scene second 5 the component shows source second 7.
		expect(toLocalSceneStartFrameIndex(media, 5, 30)).toBe(210);
		expect(toLocalSceneStartFrameIndex(media, 2, 30)).toBe(120);
		// A scene that starts at 0 builds on the component's own first frame.
		expect(toLocalSceneStartFrameIndex(media, undefined, 30)).toBeNull();
		expect(toLocalSceneStartFrameIndex(media, 0, 30)).toBeNull();
		expect(toLocalSceneStartFrameIndex(media, Number.NaN, 30)).toBeNull();
		// Not on screen at the in-point: before it starts, and from its end on.
		expect(toLocalSceneStartFrameIndex(media, 1.9, 30)).toBeNull();
		expect(toLocalSceneStartFrameIndex(media, 8, 30)).toBeNull();
	});

	it('gives a component outside the frame window its first frame', () => {
		const [media] = collectLocalDeterministicMediaComponents(scene);
		const manifest = {};

		assignLocalBootstrapFrames(manifest, media, {
			fps: 30,
			sceneStartAt: undefined,
			frameUrl: '/first.jpg'
		});

		// Source starts at 4 s: frame 120, with two frames of slack on each side.
		expect(manifest).toEqual({
			clip: {
				'118': '/first.jpg',
				'119': '/first.jpg',
				'120': '/first.jpg',
				'121': '/first.jpg',
				'122': '/first.jpg'
			}
		});
	});

	it('adds the frame at the scene in-point and keeps frames that are already there', () => {
		const [media] = collectLocalDeterministicMediaComponents(scene);
		const manifest = { clip: { '120': '/real-120.jpg', '210': '/real-210.jpg' } };

		assignLocalBootstrapFrames(manifest, media, {
			fps: 30,
			sceneStartAt: 5,
			frameUrl: '/first.jpg'
		});

		expect(manifest.clip).toEqual({
			'118': '/first.jpg',
			'119': '/first.jpg',
			'120': '/real-120.jpg',
			'121': '/first.jpg',
			'122': '/first.jpg',
			'208': '/first.jpg',
			'209': '/first.jpg',
			'210': '/real-210.jpg',
			'211': '/first.jpg',
			'212': '/first.jpg'
		});
	});

	it('names the missing source of a component outside the frame window', async () => {
		const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-det-media-'));
		try {
			await expect(
				prepareLocalDeterministicMedia({ scene, workDir, fromFrame: 0, toFrame: 30 })
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
	let dir: string;
	let sourceUrl: string;

	const clip = (id: string, startAt: number, endAt: number, sourceStartAt: number) => ({
		id,
		type: 'VIDEO',
		source: { url: sourceUrl, startAt: sourceStartAt },
		timeline: { startAt, endAt },
		appearance: { x: 0, y: 0, width: 64, height: 48 },
		muted: true
	});

	const prepareChunk = async (name: string, settings: Record<string, unknown> = {}) => {
		const workDir = path.join(dir, name);
		await fs.mkdir(workDir);
		const result = await prepareLocalDeterministicMedia({
			scene: {
				id: 'chunk',
				settings: { width: 64, height: 48, duration: 100, fps: FPS, ...settings },
				assets: [],
				layers: [
					{
						id: 'media',
						components: [
							clip('ended-before', 0, 40, 0),
							clip('cut-by-chunk-start', 40, 50, 1),
							clip('inside-chunk', 60, 70, 0),
							clip('cut-by-chunk-end', 85, 95, 2),
							clip('starts-after', 96, 99, 3)
						]
					}
				]
			},
			workDir,
			fromFrame: 1351,
			toFrame: 2676
		});
		const frames = (id: string) =>
			Object.keys(result.payload.frameManifest[id] ?? {})
				.map(Number)
				.sort((a, b) => a - b);
		return { result, frames, manifest: result.payload.frameManifest };
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

	it('gives media that ended before the chunk one frame, at its own start', async () => {
		const { result, frames, manifest } = await prepareChunk('ended-before');

		expect(frames('ended-before')).toEqual([0, 1, 2]);
		expect(new Set(Object.values(manifest['ended-before']))).toEqual(
			new Set(['/deterministic-media/predecoded/ended-before/1.jpg'])
		);
		// It is a bootstrap frame only: the component is not part of the chunk's media.
		expect(result.media.map((item) => item.componentId)).toEqual([
			'cut-by-chunk-start',
			'inside-chunk',
			'cut-by-chunk-end'
		]);
	}, 60_000);

	it('gives media that starts after the chunk one frame, at its own start', async () => {
		const { frames, manifest } = await prepareChunk('starts-after');

		// Source starts at 3 s: frame 90, with two frames of slack on each side.
		expect(frames('starts-after')).toEqual([88, 89, 90, 91, 92]);
		expect(new Set(Object.values(manifest['starts-after']))).toEqual(
			new Set(['/deterministic-media/predecoded/starts-after/1.jpg'])
		);
	}, 60_000);

	it('prepares the frames inside the chunk of media the chunk cuts in two', async () => {
		const { result, frames, manifest } = await prepareChunk('cut');
		const prepared = Object.fromEntries(
			result.media.map((item) => [item.componentId, item.framesPrepared])
		);

		// Scene frames 1351-1499 of a clip on 1200-1500 whose source starts at frame 30.
		expect(prepared['cut-by-chunk-start']).toBe(149);
		expect(manifest['cut-by-chunk-start']['181']).toBe(
			'/deterministic-media/predecoded/cut-by-chunk-start/1.jpg'
		);
		expect(manifest['cut-by-chunk-start']['329']).toBe(
			'/deterministic-media/predecoded/cut-by-chunk-start/149.jpg'
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
			'/deterministic-media/predecoded/cut-by-chunk-end/126.jpg'
		);

		expect(prepared['inside-chunk']).toBe(300);
	}, 60_000);

	it('adds the frame at the scene in-point for media that ended before the chunk', async () => {
		const { frames, manifest } = await prepareChunk('in-point', { startAt: 20 });

		// The scene tree builds at second 20, where the clip shows its frame 600.
		expect(frames('ended-before')).toEqual([0, 1, 2, 598, 599, 600, 601, 602]);
		expect(manifest['ended-before']['600']).toBe(
			'/deterministic-media/predecoded/ended-before/1.jpg'
		);
		// Media that is not on screen at second 20 gets no such frame.
		expect(frames('starts-after')).toEqual([88, 89, 90, 91, 92]);
		expect(frames('inside-chunk')).toEqual(Array.from({ length: 302 }, (_, index) => index));
	}, 60_000);
});
