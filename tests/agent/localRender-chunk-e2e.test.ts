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
const packageRoot = process.cwd();
const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const hasKitConfig = existsSync(path.join(packageRoot, '.svelte-kit/tsconfig.json'));

const FPS = 30;
const FROM_FRAME = 1351;
const TO_FRAME = 2676;

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
		});

		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		const render = async (
			name: string,
			scene: ReturnType<typeof sceneOf>,
			frames: { fromFrame: number; toFrame: number; skipDuplicates?: boolean }
		) => {
			const output = path.join(dir, name);
			const tmpDir = path.join(dir, `${name}-tmp`);
			await fs.mkdir(tmpDir, { recursive: true });
			return renderSceneLocally({
				scene,
				output,
				framesOnly: true,
				fps: FPS,
				frameIndices: Array.from(
					{ length: frames.toFrame - frames.fromFrame },
					(_, index) => frames.fromFrame + index
				),
				imageFormat: 'jpg',
				skipDuplicates: frames.skipDuplicates ?? true,
				tmpDir,
				packageRoot,
				chromiumPath: findChromium() ?? undefined
			});
		};

		const renderChunk = (name: string, settings?: Record<string, unknown>) =>
			render(name, sceneOf(chunkLayers(sourceUrl), settings), {
				fromFrame: FROM_FRAME,
				toFrame: TO_FRAME
			});

		// The first 12 frames, every one written, as bytes.
		const renderStart = async (name: string, layers: Layer[]) => {
			const result = await render(name, sceneOf(layers), {
				fromFrame: 0,
				toFrame: 12,
				skipDuplicates: false
			});
			expect(result.runtimeErrors).toEqual([]);
			expect(result.frames.count).toBe(12);
			return Promise.all(result.frames.items.map((item) => fs.readFile(item.path as string)));
		};

		it('renders frames 1351-2676 although media ended before and starts after the chunk', async () => {
			const result = await renderChunk('chunk');

			expect(result.frames.transport).toBe('range-binding');
			expect(result.frames.count).toBe(TO_FRAME - FROM_FRAME);
			expect(result.frames.items[0].frame).toBe(FROM_FRAME);
			expect(result.frames.items.at(-1)?.frame).toBe(TO_FRAME - 1);
			expect(result.runtimeErrors).toEqual([]);
			// Only the three clips on screen in the chunk change the picture: their frames
			// (149 + 300 + 126) are drawn, the gaps between them repeat the background.
			expect(result.frames.items.filter((item) => !item.isDuplicate).length).toBeGreaterThan(500);
		});

		it('renders the same chunk when the scene starts inside media that ended before it', async () => {
			const result = await renderChunk('chunk-with-start', { startAt: 20 });

			expect(result.frames.count).toBe(TO_FRAME - FROM_FRAME);
			expect(result.runtimeErrors).toEqual([]);
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

			const result = await render('fractional-in-point', scene, {
				fromFrame: FROM_FRAME,
				toFrame: FROM_FRAME + 30
			});

			expect(result.frames.count).toBe(30);
			expect(result.runtimeErrors).toEqual([]);
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
	},
	240_000
);
