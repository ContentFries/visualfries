// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderSceneLocally } from '../../src/lib/agent/index.js';
import { findChromium } from '../../src/lib/motion/node.js';

// What a render does when the page cannot build the scene, through the real dev server and
// Chromium. The frames are prepared for real and then withheld, so that the strict renderer
// finds none for the clip on screen at the start of the scene.
const withheld = vi.hoisted(() => ({ frames: false }));

vi.mock('../../src/lib/agent/deterministicMedia.js', async (importOriginal) => {
	const original =
		await importOriginal<typeof import('../../src/lib/agent/deterministicMedia.js')>();
	return {
		...original,
		prepareLocalDeterministicMedia: async (
			input: Parameters<typeof original.prepareLocalDeterministicMedia>[0]
		) => {
			const prepared = await original.prepareLocalDeterministicMedia(input);
			if (withheld.frames) prepared.payload.frameManifest = { clip: {} };
			return prepared;
		}
	};
});

const packageRoot = process.cwd();
const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const hasKitConfig = existsSync(path.join(packageRoot, '.svelte-kit/tsconfig.json'));

describe.skipIf(!hasChromium || !hasFfmpeg || !hasKitConfig)(
	'renderSceneLocally when the page cannot build the scene',
	() => {
		let dir: string;
		let sourceUrl: string;

		beforeAll(async () => {
			// Resolved, because the dev server refuses a root reached through a symlink (macOS /var).
			dir = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'vf-init-e2e-'));
			const source = path.join(dir, 'source.mp4');
			const made = spawnSync('ffmpeg', [
				'-y',
				'-f',
				'lavfi',
				'-i',
				'testsrc=size=64x48:rate=30:duration=2',
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

		const render = async (name: string, options: { initTimeoutMs?: number } = {}) => {
			const tmpDir = path.join(dir, `${name}-tmp`);
			await fs.mkdir(tmpDir, { recursive: true });
			return renderSceneLocally({
				scene: {
					id: 'init-e2e',
					settings: { width: 64, height: 48, duration: 2, fps: 30, backgroundColor: '#102030' },
					assets: [],
					layers: [
						{
							id: 'media',
							name: 'media',
							components: [
								{
									id: 'clip',
									type: 'VIDEO',
									source: { url: sourceUrl, startAt: 0 },
									timeline: { startAt: 0, endAt: 2 },
									appearance: { x: 0, y: 0, width: 64, height: 48 },
									muted: true
								}
							]
						}
					]
				},
				output: path.join(dir, name),
				framesOnly: true,
				fps: 30,
				frameIndices: [0, 1, 2],
				imageFormat: 'jpg',
				tmpDir,
				packageRoot,
				chromiumPath: findChromium() ?? undefined,
				...options
			});
		};

		it('rejects with the error thrown inside init', async () => {
			withheld.frames = true;
			try {
				await expect(render('missing-frame')).rejects.toThrow(
					'Deterministic frame provider returned null (component clip, frame 0, scene time 0)'
				);
			} finally {
				withheld.frames = false;
			}
		});

		it('rejects when init takes longer than initTimeoutMs', async () => {
			await expect(render('slow-init', { initTimeoutMs: 1 })).rejects.toThrow(
				'VisualFries local render timed out in phase "init": no result for 1 ms.'
			);
		});

		it('renders the same scene when the frames are there', async () => {
			const result = await render('ok');

			expect(result.frames.count).toBe(3);
			expect(result.runtimeErrors).toEqual([]);
		});
	},
	120_000
);
