// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderSceneLocally, type LocalRenderOptions } from '../../src/lib/agent/index.js';
import { findChromium } from '../../src/lib/motion/node.js';

// Renders a tiny scene through the real dev server and Chromium, so the browser path of
// renderSceneLocally has an automated check. It needs the synced SvelteKit tsconfig because
// the dev server resolves the renderer sources through it.
const packageRoot = process.cwd();
const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const hasKitConfig = existsSync(path.join(packageRoot, '.svelte-kit/tsconfig.json'));

const scene = {
	id: 'e2e-smoke',
	settings: { width: 64, height: 48, duration: 1, fps: 10, backgroundColor: '#102030' },
	assets: [],
	layers: [{ id: 'l1', name: 'layer', components: [] }]
};

const SCENE_INFO = { id: 'e2e-smoke', width: 64, height: 48, duration: 1, fps: 10 };

describe.skipIf(!hasChromium || !hasFfmpeg || !hasKitConfig)(
	'renderSceneLocally in Chromium',
	() => {
		let dir: string;
		let runs = 0;

		beforeAll(async () => {
			dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-local-e2e-'));
		});

		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		const render = async (overrides: Partial<LocalRenderOptions>) => {
			runs += 1;
			const output = path.join(dir, `run-${runs}`);
			const tmpDir = path.join(dir, `tmp-${runs}`);
			await fs.mkdir(tmpDir, { recursive: true });
			const result = await renderSceneLocally({
				scene,
				output,
				fps: 10,
				frameIndices: [0, 1, 2, 3],
				tmpDir,
				packageRoot,
				chromiumPath: findChromium() ?? undefined,
				...overrides
			});
			return { result, output, tmpDir };
		};

		const isPng = async (file: string) =>
			(await fs.readFile(file)).subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

		it('writes a contiguous range as numbered frames through the range binding', async () => {
			const { result, output, tmpDir } = await render({ framesOnly: true, mediaDiagnostics: true });
			expect(result).toMatchObject({
				ok: true,
				scene: SCENE_INFO,
				output,
				encoded: false,
				encoding: { mode: 'none' },
				audio: { mode: 'none', selectedSources: 0, skippedSources: 0, plannedSources: 0 },
				runtimeErrors: [],
				frames: { count: 4, dir: output, transport: 'range-binding', skippedDuplicates: 0 }
			});
			expect(result.frames.items.map((item) => [item.frame, item.time, item.isDuplicate])).toEqual([
				[0, 0, false],
				[1, 0.1, false],
				[2, 0.2, false],
				[3, 0.3, false]
			]);
			for (const [index, item] of result.frames.items.entries()) {
				expect(item.path).toBe(
					path.join(output, `frame-${String(index + 1).padStart(6, '0')}.png`)
				);
				expect(await isPng(item.path!)).toBe(true);
			}
			expect(result.mediaDiagnosticsPath).toBe(path.join(output, 'media-diagnostics.json'));
			const written = JSON.parse(await fs.readFile(result.mediaDiagnosticsPath!, 'utf8'));
			expect(written).toEqual(result.mediaDiagnostics);
			expect(written[0]).toMatchObject({
				kind: 'visualfries-local-render',
				frameCount: 4,
				requestedFrameCount: 4,
				serverRendererMode: 'canvas',
				transport: 'range-binding'
			});
			expect(await fs.readdir(tmpDir)).toEqual([]);
		});

		it('repeats unchanged frames and counts them as skipped when duplicates are skipped', async () => {
			const { result } = await render({ framesOnly: true, skipDuplicates: true });
			expect(result.frames.count).toBe(4);
			expect(result.frames.skippedDuplicates).toBe(3);
			expect(result.frames.items.map((item) => item.isDuplicate)).toEqual([
				false,
				true,
				true,
				true
			]);
			const sizes = await Promise.all(
				result.frames.items.map(async (item) => (await fs.readFile(item.path!)).length)
			);
			expect(new Set(sizes).size).toBe(1);
		});

		it('renders non-contiguous frames one by one through the sparse path', async () => {
			const { result, output } = await render({ framesOnly: true, frameIndices: [0, 2, 5] });
			expect(result.frames).toMatchObject({
				count: 3,
				dir: output,
				transport: 'sparse-evaluate',
				skippedDuplicates: 0
			});
			expect(result.frames.items.map((item) => [item.frame, item.time])).toEqual([
				[0, 0],
				[2, 0.2],
				[5, 0.5]
			]);
			for (const item of result.frames.items) expect(await isPng(item.path!)).toBe(true);
		});

		it('screenshots the live page in the client environment', async () => {
			const { result } = await render({
				framesOnly: true,
				environment: 'client',
				frameIndices: [0, 1],
				imageFormat: 'jpeg'
			});
			expect(result.frames.transport).toBe('sparse-evaluate');
			expect(result.frames.items.map((item) => path.basename(item.path!))).toEqual([
				'frame-000001.jpg',
				'frame-000002.jpg'
			]);
			const head = (await fs.readFile(result.frames.items[0].path!)).subarray(0, 2);
			expect(head.equals(Buffer.from([0xff, 0xd8]))).toBe(true);
		});

		it('pipes frames straight into the encoder when stream encoding is on', async () => {
			const { result, output, tmpDir } = await render({
				output: path.join(dir, 'stream.mp4'),
				streamEncode: true,
				frameIndices: [0, 1, 2, 3, 4, 5]
			});
			expect(result).toMatchObject({
				ok: true,
				scene: SCENE_INFO,
				output: path.join(dir, 'stream.mp4'),
				encoded: true,
				encoding: { mode: 'image2pipe', audioMuxed: false },
				frames: { count: 6, transport: 'range-binding-stream-encode' },
				mediaDiagnosticsPath: null,
				mediaDiagnostics: [],
				runtimeErrors: []
			});
			expect(result.encoding).toEqual({
				mode: 'image2pipe',
				elapsedMs: expect.any(Number),
				audioMuxed: false
			});
			expect(result.frames.items.every((item) => item.path === null)).toBe(true);
			expect((await fs.stat(path.join(dir, 'stream.mp4'))).size).toBeGreaterThan(0);
			expect(existsSync(output)).toBe(false);
			expect(await fs.readdir(tmpDir)).toEqual([]);
		});

		it('encodes the frame sequence to a video when stream encoding is off', async () => {
			// The frame files are removed with the temp folder once the video exists, so the
			// result still lists their paths but they no longer resolve.
			const video = path.join(dir, 'sequence.mp4');
			const { result, tmpDir } = await render({ output: video });
			expect(result).toMatchObject({
				ok: true,
				output: video,
				encoded: true,
				encoding: { mode: 'frame-sequence' },
				frames: { count: 4, transport: 'range-binding' }
			});
			expect((await fs.stat(video)).size).toBeGreaterThan(0);
			expect(existsSync(result.frames.items[0].path!)).toBe(false);
			expect(await fs.readdir(tmpDir)).toEqual([]);
		});

		it('keeps the temp folder with its frames when keepFrames is set', async () => {
			const { result, tmpDir } = await render({
				output: path.join(dir, 'kept.mp4'),
				keepFrames: true
			});
			expect(await isPng(result.frames.items[0].path!)).toBe(true);
			expect(await fs.readdir(tmpDir)).toHaveLength(1);
		});

		it('explains component state at a frame without rendering extra frames', async () => {
			const { result } = await render({
				framesOnly: true,
				frameIndices: [0],
				explain: [{ componentId: 'missing', frame: 0 }]
			});
			expect(result.explanations).toHaveLength(1);
			expect(result.frames.count).toBe(1);
		});

		it('refuses to stream-encode a request that is not one contiguous range', async () => {
			await expect(render({ streamEncode: true, frameIndices: [0, 2] })).rejects.toThrow(
				'streamEncode requires a contiguous frame range.'
			);
		});
	},
	120_000
);
