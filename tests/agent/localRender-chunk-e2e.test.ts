// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderSceneLocally } from '../../src/lib/agent/index.js';
import { findChromium } from '../../src/lib/motion/node.js';

// A long scene is rendered in chunks. A chunk from the middle holds media that already
// ended, media that is cut by the chunk edge and media that has not started yet; the scene
// tree still asks the first of those for a frame while it builds. This renders such a chunk
// through the real dev server, Chromium and ffmpeg. So do the other cases here where the page
// and the prepared frames have to agree: an in-point between two frames, and hidden media.
//
// Only the first and the last frames of the chunk are drawn: Chrome in its full headless mode
// (the browser of CI) draws about one frame a second. tests/agent/deterministicMedia.test.ts
// prepares the frames of the whole chunk.
const packageRoot = process.cwd();
const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const hasKitConfig = existsSync(path.join(packageRoot, '.svelte-kit/tsconfig.json'));

const FPS = 30;
const FROM_FRAME = 1351;
const TO_FRAME = 2676;
const EDGE_FRAMES = 8;

const MISSING_SOURCE = 'file:///tmp/visualfries-no-such-source.mp4';

type Layer = { id: string; muted?: boolean; components: Array<Record<string, unknown>> };

const clip = (
	id: string,
	startAt: number,
	endAt: number,
	sourceStartAt: number,
	url: string,
	overrides: Record<string, unknown> = {}
) => ({
	id,
	type: 'VIDEO',
	source: { url, startAt: sourceStartAt },
	timeline: { startAt, endAt },
	appearance: { x: 0, y: 0, width: 64, height: 48 },
	muted: true,
	...overrides
});

const sceneOf = (layers: Layer[], settings: Record<string, unknown> = {}) => ({
	id: 'chunk-e2e',
	settings: {
		width: 64,
		height: 48,
		duration: 100,
		fps: FPS,
		backgroundColor: '#102030',
		...settings
	},
	assets: [],
	layers: layers.map((layer) => ({ name: layer.id, ...layer }))
});

const chunkLayers = (url: string): Layer[] => [
	{
		id: 'media',
		components: [
			// Frames 0-1200: over before the chunk, but on screen where the scene tree builds.
			clip('ended-before', 0, 40, 0, url),
			// Frames 1200-1500: the chunk starts in the middle of it.
			clip('cut-by-chunk-start', 40, 50, 1, url),
			// Frames 1800-2100: starts and ends inside the chunk.
			clip('inside-chunk', 60, 70, 0, url),
			// Frames 2550-2850: the chunk ends in the middle of it.
			clip('cut-by-chunk-end', 85, 95, 2, url),
			// Frames 2880-2970: starts after the chunk. The chunk never shows it, so its
			// source is not needed.
			clip('starts-after', 96, 99, 0, MISSING_SOURCE)
		]
	}
];

describe.skipIf(!hasChromium || !hasFfmpeg || !hasKitConfig)(
	'renderSceneLocally for a chunk from the middle of a scene',
	() => {
		let dir: string;
		let sourceUrl: string;
		let gifUrl: string;

		beforeAll(async () => {
			// Resolved, because the dev server refuses a root reached through a symlink (macOS /var).
			dir = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'vf-chunk-e2e-'));
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
			const gif = path.join(dir, 'source.gif');
			expect(
				spawnSync('ffmpeg', ['-y', '-t', '3', '-i', source, '-vf', 'fps=10', gif]).status
			).toBe(0);
			gifUrl = pathToFileURL(gif).href;
		});

		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		// Renders the frames and gives every one that was drawn, as bytes.
		const render = async (
			name: string,
			scene: ReturnType<typeof sceneOf>,
			frameIndices: number[],
			fps = FPS
		) => {
			const tmpDir = path.join(dir, `${name}-tmp`);
			await fs.mkdir(tmpDir, { recursive: true });
			const result = await renderSceneLocally({
				scene,
				output: path.join(dir, name),
				framesOnly: true,
				fps,
				frameIndices,
				imageFormat: 'jpg',
				skipDuplicates: false,
				tmpDir,
				packageRoot,
				chromiumPath: findChromium() ?? undefined
			});

			expect(result.runtimeErrors).toEqual([]);
			const frames = await Promise.all(
				result.frames.items.map((item) => fs.readFile(item.path as string))
			);
			return { result, frames, drawn: result.frames.items.map((item) => item.frame) };
		};

		// Renders EDGE_FRAMES frames in a row.
		const renderFrames = async (name: string, scene: ReturnType<typeof sceneOf>, fromFrame = 0) => {
			const frameIndices = Array.from({ length: EDGE_FRAMES }, (_, index) => fromFrame + index);
			const { result, frames, drawn } = await render(name, scene, frameIndices);

			expect(result.frames.transport).toBe('range-binding');
			expect(drawn).toEqual(frameIndices);
			return frames;
		};

		const renderChunkFrames = (
			name: string,
			fromFrame: number,
			settings?: Record<string, unknown>
		) => renderFrames(name, sceneOf(chunkLayers(sourceUrl), settings), fromFrame);

		const renderStart = (name: string, layers: Layer[]) => renderFrames(name, sceneOf(layers));

		const differentFrames = (frames: Buffer[]) =>
			new Set(frames.map((frame) => frame.toString('base64'))).size;

		it('renders both ends of frames 1351-2676 although media ended before and starts after them', async () => {
			// The clip cut by the chunk start plays in the first frames, the one cut by the
			// chunk end in the last ones: every frame shows another picture of the source.
			const first = await renderChunkFrames('chunk-first', FROM_FRAME);
			expect(differentFrames(first)).toBe(EDGE_FRAMES);

			const last = await renderChunkFrames('chunk-last', TO_FRAME - EDGE_FRAMES);
			expect(differentFrames(last)).toBe(EDGE_FRAMES);
		});

		it('renders the same frames when the scene starts inside media that ended before them', async () => {
			const plain = await renderChunkFrames('chunk-plain', FROM_FRAME);
			const withStart = await renderChunkFrames('chunk-with-start', FROM_FRAME, { startAt: 20 });

			expect(withStart.map((frame, index) => frame.equals(plain[index]))).toEqual(
				plain.map(() => true)
			);
		});

		it('renders when the scene starts at 20.015 s, on the last frame of a clip that ends there', async () => {
			// The runtime shows an in-point of 20.015 s on its frame at 20.0 s, where the first
			// clip is still on screen, so the scene tree asks it for frame 600.
			const scene = sceneOf(
				[
					{
						id: 'media',
						components: [
							clip('ends-at-in-point', 0, 20.015, 0, sourceUrl),
							clip('inside-chunk', 45, 50, 0, sourceUrl)
						]
					}
				],
				{ startAt: 20.015 }
			);

			const frames = await renderFrames('fractional-in-point', scene, FROM_FRAME);

			expect(frames).toHaveLength(EDGE_FRAMES);
		});

		it('renders a visible video next to hidden ones, with the frames of the visible one alone', async () => {
			const visible = clip('visible', 0, 10, 0, sourceUrl);
			const alone = await renderStart('visible-alone', [{ id: 'media', components: [visible] }]);

			// Hidden media gets no frames, so its source is not needed either. One is on screen
			// where the scene tree builds, the other one comes on screen inside the window.
			const withHidden = await renderStart('visible-and-hidden', [
				{
					id: 'media',
					components: [
						visible,
						clip('hidden-from-start', 0, 10, 0, MISSING_SOURCE, { visible: false }),
						clip('hidden-later', 0.2, 10, 0, MISSING_SOURCE, { visible: false })
					]
				}
			]);
			expect(withHidden.map((frame, index) => frame.equals(alone[index]))).toEqual(
				alone.map(() => true)
			);

			const withMutedLayer = await renderStart('visible-and-muted-layer', [
				{ id: 'media', components: [visible] },
				{
					id: 'muted',
					muted: true,
					components: [
						clip('in-muted-layer-from-start', 0, 10, 0, MISSING_SOURCE),
						clip('in-muted-layer-later', 0.2, 10, 0, MISSING_SOURCE)
					]
				}
			]);
			expect(withMutedLayer.map((frame, index) => frame.equals(alone[index]))).toEqual(
				alone.map(() => true)
			);
		});

		const oneLayer = (...components: Array<Record<string, unknown>>): Layer[] => [
			{ id: 'media', components }
		];

		it('renders the one frame of a clip that starts and ends at the same time', async () => {
			// Frame 60 shows the clip, frame 61 the background alone.
			const scene = sceneOf(oneLayer(clip('zero-length', 2, 2, 1, sourceUrl)));

			const { frames, drawn } = await render('zero-length', scene, [60, 61]);

			expect(drawn).toEqual([60, 61]);
			expect(differentFrames(frames)).toBe(2);
		});

		it('renders media whose times lie between two frames, and a GIF with a source start', async () => {
			const video = sceneOf(oneLayer(clip('between-frames', 0.003, 20, 0.03, sourceUrl)));
			const videoFrames = await render('between-frames', video, [300, 301, 302]);
			expect(differentFrames(videoFrames.frames)).toBe(3);

			const gif = sceneOf(
				oneLayer({
					id: 'gif',
					type: 'GIF',
					source: { url: gifUrl, startAt: 1 },
					timeline: { startAt: 2, endAt: 4 },
					appearance: { x: 0, y: 0, width: 64, height: 48 }
				})
			);
			const gifFrames = await render('gif-source-start', gif, [60, 61]);
			expect(gifFrames.drawn).toEqual([60, 61]);
		});

		it('renders single frames asked at another frame rate than the scene has', async () => {
			// Frames 120 and 122 at 60 frames a second are seconds 2 and 2.033 of the scene, and
			// the clip is on screen only there.
			const scene = sceneOf(oneLayer(clip('one-second', 2, 3, 0, sourceUrl)));

			const { result, frames } = await render('other-frame-rate', scene, [120, 122], 60);

			expect(result.frames.transport).toBe('sparse-evaluate');
			expect(differentFrames(frames)).toBe(2);
		});

		it('renders the picture of the out-point on frames after it', async () => {
			const layers = oneLayer(clip('long', 0, 25, 0, sourceUrl));
			const atOutPoint = await render('out-point-wanted', sceneOf(layers), [150]);

			const afterOutPoint = await render('out-point', sceneOf(layers, { endAt: 5 }), [180, 181]);

			expect(afterOutPoint.frames.map((frame) => frame.equals(atOutPoint.frames[0]))).toEqual([
				true,
				true
			]);
		});

		it('renders past a trim zone without the source of media that lives only inside it', async () => {
			const scene = sceneOf(
				oneLayer(
					clip('in-trim-zone', 4, 5, 0, MISSING_SOURCE),
					clip('after-trim-zone', 9, 20, 0, sourceUrl)
				),
				{ trimZones: [{ start: 4, end: 9 }] }
			);

			// Frames 150-269 lie in the zone and are left out.
			const frameIndices = Array.from({ length: 123 }, (_, index) => 150 + index);
			const { frames, drawn } = await render('trim-zone', scene, frameIndices);

			expect(drawn).toEqual([270, 271, 272]);
			expect(differentFrames(frames)).toBe(3);
		});
	},
	240_000
);
