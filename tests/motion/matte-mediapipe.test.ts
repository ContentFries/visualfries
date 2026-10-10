import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
	ensureModelFile,
	mediapipeMatte,
	pickMediaPipeModel,
	visualfriesCacheDir
} from '../../src/lib/motion/matte-mediapipe.js';
import { createSubjectMatte } from '../../src/lib/motion/matte.js';
import { findChromium, probeVideo } from '../../src/lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const hasPlaywright = (() => {
	try {
		createRequire(import.meta.url).resolve('playwright');
		return true;
	} catch {
		return false;
	}
})();
// Vitest runs from the repository root.
const ROOT = process.cwd();

const tempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'vf-mediapipe-test-'));
const sha = (data: string) => createHash('sha256').update(data).digest('hex');

describe('ensureModelFile', () => {
	const entry = {
		file: 'tiny.tflite',
		url: 'https://models.test/tiny.tflite',
		sha256: sha('model-bytes')
	};

	it('downloads once, checks the hash and reuses the cached file', async () => {
		const dir = await tempDir();
		let calls = 0;
		const fakeFetch = (async () => {
			calls++;
			return new Response('model-bytes', { status: 200 });
		}) as unknown as typeof fetch;
		const file = await ensureModelFile(entry, dir, fakeFetch);
		expect(file).toBe(path.join(dir, 'tiny.tflite'));
		expect(await fs.readFile(file, 'utf8')).toBe('model-bytes');
		await ensureModelFile(entry, dir, fakeFetch);
		expect(calls).toBe(1);
		expect(await fs.readdir(dir)).toEqual(['tiny.tflite']);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('replaces a damaged cached file', async () => {
		const dir = await tempDir();
		await fs.writeFile(path.join(dir, 'tiny.tflite'), 'truncated');
		const fakeFetch = (async () =>
			new Response('model-bytes', { status: 200 })) as unknown as typeof fetch;
		const file = await ensureModelFile(entry, dir, fakeFetch);
		expect(await fs.readFile(file, 'utf8')).toBe('model-bytes');
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('refuses a download with the wrong hash and keeps nothing', async () => {
		const dir = await tempDir();
		const fakeFetch = (async () =>
			new Response('something else', { status: 200 })) as unknown as typeof fetch;
		await expect(ensureModelFile(entry, dir, fakeFetch)).rejects.toThrow(/SHA-256/);
		expect(await fs.readdir(dir)).toEqual([]);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('explains what to do offline', async () => {
		const dir = await tempDir();
		const offline = (async () => {
			throw new Error('getaddrinfo ENOTFOUND models.test');
		}) as unknown as typeof fetch;
		const error = await ensureModelFile(entry, dir, offline).catch((e: Error) => e);
		expect(String(error)).toContain(entry.url);
		expect(String(error)).toContain(path.join(dir, 'tiny.tflite'));
		expect(String(error)).toContain('ENOTFOUND');
		const notFound = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
		await expect(ensureModelFile(entry, dir, notFound)).rejects.toThrow(/HTTP 404/);
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe('mediapipeMatte', () => {
	it('checks its options', () => {
		expect(() => mediapipeMatte({ model: 'multiclass' as never })).toThrow(/Unknown MediaPipe/);
		expect(() => mediapipeMatte({ smoothing: 1 })).toThrow(/smoothing/);
		expect(() => mediapipeMatte({ smoothing: -0.1 })).toThrow(/smoothing/);
		const provider = mediapipeMatte({ model: 'selfie', parallel: 2 });
		expect(provider.output).toBe('luma');
		expect(provider.parallel).toBe(2);
		expect(provider.maxFrames).toBe(Number.POSITIVE_INFINITY);
		expect(provider.name).toMatch(/MediaPipe/);
	});

	it('picks the network by the shape of the video', () => {
		expect(pickMediaPipeModel(1080, 1920)).toBe('selfie');
		expect(pickMediaPipeModel(1000, 1080)).toBe('selfie');
		expect(pickMediaPipeModel(1440, 1080)).toBe('selfie');
		expect(pickMediaPipeModel(1920, 1080)).toBe('selfie-landscape');
	});

	it('keeps models in VISUALFRIES_CACHE_DIR when it is set', () => {
		const saved = process.env.VISUALFRIES_CACHE_DIR;
		process.env.VISUALFRIES_CACHE_DIR = '/somewhere/cache';
		expect(visualfriesCacheDir()).toBe('/somewhere/cache');
		delete process.env.VISUALFRIES_CACHE_DIR;
		expect(visualfriesCacheDir()).toMatch(/visualfries$/);
		if (saved !== undefined) process.env.VISUALFRIES_CACHE_DIR = saved;
	});

	it('fails a piece with a clear message when the model cannot be downloaded', async () => {
		const dir = await tempDir();
		const provider = mediapipeMatte({
			cacheDir: dir,
			fetch: (async () => {
				throw new Error('offline');
			}) as unknown as typeof fetch
		});
		await expect(
			provider.segment({
				input: path.join(dir, 'in.mp4'),
				output: path.join(dir, 'out.mp4'),
				index: 0,
				first: 0,
				last: 9,
				frames: 10,
				fps: 30,
				width: 160,
				height: 120
			})
		).rejects.toThrow(/Could not download the MediaPipe model.*offline/s);
		await fs.rm(dir, { recursive: true, force: true });
	});

	// Real run: headless Chromium, the WASM build and the model from Google's storage.
	it.skipIf(!hasFfmpeg || !hasPlaywright || !findChromium())(
		'cuts the speaker out of a real frame, frame-exact',
		async () => {
			const dir = await tempDir();
			const input = path.join(dir, 'talk.mp4');
			// The homepage plate (1000×1080 talking head) as a 1-second clip at a quarter size.
			const made = spawnSync('ffmpeg', [
				'-y',
				'-loglevel',
				'error',
				'-loop',
				'1',
				'-i',
				path.join(ROOT, 'static/media/v2/layers/plate.jpg'),
				'-vf',
				'scale=250:270,format=yuv420p',
				'-r',
				'30',
				'-t',
				'1',
				input
			]);
			expect(made.status).toBe(0);
			const output = path.join(dir, 'talk.matte.mp4');
			const result = await createSubjectMatte(input, {
				output,
				chunkFrames: 20,
				// The test environment's AbortSignal is jsdom's, which Node's fetch rejects.
				provider: mediapipeMatte({
					parallel: 2,
					fetch: ((url: string) => fetch(url)) as typeof fetch
				})
			});
			expect(result.frames).toBe(30);
			expect(result.chunks).toBe(2);
			const out = await probeVideo(output);
			expect([out.width, out.height, out.frames]).toEqual([250, 270, 30]);
			const px = (x: number, y: number) =>
				spawnSync('ffmpeg', [
					'-loglevel',
					'error',
					'-i',
					output,
					'-frames:v',
					'1',
					'-vf',
					`crop=2:2:${x}:${y},format=gray`,
					'-f',
					'rawvideo',
					'-'
				]).stdout[0];
			expect(px(130, 90)).toBeGreaterThan(200); // face
			expect(px(130, 200)).toBeGreaterThan(200); // shirt
			expect(px(20, 20)).toBeLessThan(40); // wall
			expect(px(230, 60)).toBeLessThan(40);
			await fs.rm(dir, { recursive: true, force: true });
		},
		120_000
	);
});

describe('visualfries matte (CLI)', () => {
	const cli = (args: string[], env: Record<string, string | undefined> = {}) => {
		const merged: NodeJS.ProcessEnv = { ...process.env, ...env };
		for (const [key, value] of Object.entries(env)) if (value === undefined) delete merged[key];
		const r = spawnSync(
			process.execPath,
			[path.join(ROOT, 'bin/visualfries.js'), 'matte', ...args],
			{ env: merged, encoding: 'utf8' }
		);
		return { code: r.status, stderr: r.stderr };
	};
	const missing = ['/nonexistent/talk.mp4', '--output', '/nonexistent/talk.matte.mp4'];

	it('runs MediaPipe and says so when FAL_KEY is not set', () => {
		const r = cli(missing, { FAL_KEY: undefined });
		expect(r.stderr).toMatch(/FAL_KEY is not set, so the free local MediaPipe matte runs/);
		expect(r.stderr).toMatch(/matte: provider MediaPipe/);
		expect(r.code).not.toBe(0); // the input does not exist
	});

	it('keeps BiRefNet on fal.ai as the default with FAL_KEY', () => {
		const r = cli(missing, { FAL_KEY: 'test-key' });
		expect(r.stderr).toMatch(/matte: provider fal\.ai BiRefNet/);
		expect(r.stderr).not.toMatch(/MediaPipe/);
	});

	it('follows --provider and --command', () => {
		expect(cli([...missing, '--provider', 'mediapipe'], { FAL_KEY: 'k' }).stderr).toMatch(
			/provider MediaPipe/
		);
		expect(cli([...missing, '--model', 'selfie-landscape'], { FAL_KEY: 'k' }).stderr).toMatch(
			/provider MediaPipe selfie segmenter \(selfie-landscape/
		);
		expect(
			cli([...missing, '--command', 'tool {input} {output}'], { FAL_KEY: undefined }).stderr
		).toMatch(/provider command: tool/);
		expect(cli([...missing, '--provider', 'nope']).stderr).toMatch(/Use fal, mediapipe or command/);
	});

	it('asks for FAL_KEY instead of switching when BiRefNet options are given', () => {
		const r = cli([...missing, '--model', 'Matting'], { FAL_KEY: undefined });
		expect(r.stderr).toMatch(/FAL_KEY is not set\. Get a key/);
		expect(r.code).toBe(1);
		expect(cli([...missing, '--provider', 'fal'], { FAL_KEY: undefined }).stderr).toMatch(
			/FAL_KEY is not set\. Get a key/
		);
	});
});
