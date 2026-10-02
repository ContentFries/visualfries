import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { commandMatte, createSubjectMatte, falBiRefNet } from '../../src/lib/motion/matte.js';
import { probeVideo } from '../../src/lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

async function tempDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-test-'));
}

function ffmpeg(args: string[]) {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
	if (r.status !== 0) throw new Error(String(r.stderr));
}

describe('commandMatte', () => {
	it('needs input and output placeholders', () => {
		expect(() => commandMatte('rembg {input}')).toThrow(/\{output\}/);
	});

	it.skipIf(!hasFfmpeg)('segments with a local tool and joins pieces frame-exact', async () => {
		const dir = await tempDir();
		const input = path.join(dir, 'in put.mp4');
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'testsrc2=size=160x120:rate=30:duration=2',
			'-pix_fmt',
			'yuv420p',
			input
		]);
		const output = path.join(dir, 'matte.mp4');
		const pieces: string[] = [];
		const result = await createSubjectMatte(input, {
			output,
			chunkFrames: 25,
			provider: commandMatte(
				'ffmpeg -y -loglevel error -i {input} -vf format=gray,negate -frames:v {frames} {output}',
				{ parallel: 2 }
			),
			onProgress: (m) => pieces.push(m)
		});
		expect(result.frames).toBe(60);
		expect(result.chunks).toBe(3);
		expect(result.provider).toMatch(/^command: /);
		expect(pieces).toHaveLength(3);
		const out = await probeVideo(output);
		expect([out.width, out.height, out.frames]).toEqual([160, 120, 60]);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it.skipIf(!hasFfmpeg)('reads the alpha channel of a transparent mask', async () => {
		const dir = await tempDir();
		const input = path.join(dir, 'in.mp4');
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'testsrc2=size=160x120:rate=30:duration=1',
			'-pix_fmt',
			'yuv420p',
			input
		]);
		const output = path.join(dir, 'matte.mp4');
		await createSubjectMatte(input, {
			output,
			provider: commandMatte(
				// Transparent everywhere except an opaque square in the middle.
				"ffmpeg -y -loglevel error -i {input} -vf \"format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(between(X,60,100)*between(Y,40,80),255,0)'\" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le {output}",
				{ output: 'alpha' }
			)
		});
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
		expect(px(80, 60)).toBeGreaterThan(200);
		expect(px(10, 10)).toBeLessThan(40);
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe('commandMatte paths and alpha', () => {
	it('rejects an unknown output mode', () => {
		expect(() => commandMatte('t {input} {output}', { output: 'alhpa' as never })).toThrow(/luma/);
	});

	it.skipIf(!hasFfmpeg)('passes paths with quotes, $ and spaces untouched', async () => {
		const dir = await tempDir();
		const odd = path.join(dir, "it's $HOME `x` a b");
		await fs.mkdir(odd);
		const input = path.join(odd, 'in.mp4');
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'testsrc2=size=160x120:rate=30:duration=1',
			'-pix_fmt',
			'yuv420p',
			input
		]);
		const output = path.join(odd, 'matte.mp4');
		const result = await createSubjectMatte(input, {
			output,
			provider: commandMatte('ffmpeg -y -loglevel error -i {input} -vf format=gray {output}')
		});
		expect(result.frames).toBe(30);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it.skipIf(!hasFfmpeg)('keeps the alpha of a VP9 WebM mask', async () => {
		const dir = await tempDir();
		const input = path.join(dir, 'in.mp4');
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'testsrc2=size=160x120:rate=30:duration=1',
			'-pix_fmt',
			'yuv420p',
			input
		]);
		const output = path.join(dir, 'matte.mp4');
		await createSubjectMatte(input, {
			output,
			provider: commandMatte(
				"ffmpeg -y -loglevel error -i {input} -vf \"format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(between(X,60,100)*between(Y,40,80),255,0)'\" -c:v libvpx-vp9 -pix_fmt yuva420p {output}",
				{ output: 'alpha', extension: '.webm' }
			)
		});
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
		expect(px(80, 60)).toBeGreaterThan(200);
		expect(px(10, 10)).toBeLessThan(40);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it.skipIf(!hasFfmpeg)(
		'maps mask frames by index when the provider writes another rate',
		async () => {
			const dir = await tempDir();
			const input = path.join(dir, 'in.mp4');
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				'testsrc2=size=160x120:rate=30:duration=1',
				'-pix_fmt',
				'yuv420p',
				input
			]);
			const output = path.join(dir, 'matte.mp4');
			await createSubjectMatte(input, {
				output,
				provider: commandMatte(
					// 30 frames at 25 fps; white from frame 15 on.
					'ffmpeg -y -loglevel error -f lavfi -i color=black:s=160x120:r=25:d=1.2 -i {input} -map 0:v -vf "geq=lum=\'if(gte(N,15),255,0)\':cb=128:cr=128" -frames:v {frames} -pix_fmt yuv420p {output}'
				)
			});
			const frame = (n: number) =>
				spawnSync('ffmpeg', [
					'-loglevel',
					'error',
					'-i',
					output,
					'-vf',
					`select=eq(n\\,${n}),crop=2:2:80:60,format=gray`,
					'-frames:v',
					'1',
					'-f',
					'rawvideo',
					'-'
				]).stdout[0];
			expect(frame(14)).toBeLessThan(40);
			expect(frame(15)).toBeGreaterThan(200);
			await fs.rm(dir, { recursive: true, force: true });
		}
	);

	it.skipIf(!hasFfmpeg)('refuses an alpha mask without transparency', async () => {
		const dir = await tempDir();
		const input = path.join(dir, 'in.mp4');
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'testsrc2=size=160x120:rate=30:duration=1',
			'-pix_fmt',
			'yuv420p',
			input
		]);
		await expect(
			createSubjectMatte(input, {
				output: path.join(dir, 'matte.mp4'),
				provider: commandMatte('ffmpeg -y -loglevel error -i {input} -c:v libx264 {output}', {
					output: 'alpha',
					extension: '.mp4'
				})
			})
		).rejects.toThrow(/no alpha channel/);
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe('falBiRefNet', () => {
	it('uploads the piece, waits for the queue and saves the mask', async () => {
		const dir = await tempDir();
		const input = path.join(dir, 'piece.mp4');
		const output = path.join(dir, 'mask.mp4');
		await fs.writeFile(input, 'video-bytes');
		const calls: { url: string; method: string; auth?: string; body?: string }[] = [];
		let polls = 0;
		const fakeFetch = (async (url: string, init: RequestInit = {}) => {
			const headers = (init.headers ?? {}) as Record<string, string>;
			calls.push({
				url,
				method: init.method ?? 'GET',
				auth: headers.Authorization,
				body: typeof init.body === 'string' ? init.body : undefined
			});
			const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
			if (url.includes('/storage/upload/initiate'))
				return json({
					upload_url: 'https://upload.test/put',
					file_url: 'https://cdn.test/piece.mp4'
				});
			if (url === 'https://upload.test/put') return new Response('', { status: 200 });
			if (url === 'https://queue.fal.run/fal-ai/birefnet/v2/video')
				return json({
					request_id: 'r1',
					status_url: 'https://q.test/status',
					response_url: 'https://q.test/result'
				});
			if (url === 'https://q.test/status')
				return json({ status: ++polls < 2 ? 'IN_PROGRESS' : 'COMPLETED' });
			if (url === 'https://q.test/result')
				return json({ mask_video: { url: 'https://cdn.test/mask.mp4' } });
			if (url === 'https://cdn.test/mask.mp4') return new Response('mask-bytes', { status: 200 });
			return new Response('not found', { status: 404 });
		}) as unknown as typeof fetch;

		const provider = falBiRefNet({ key: 'k', model: 'Portrait', fetch: fakeFetch });
		expect(provider.maxFrames).toBe(512);
		await provider.segment({
			input,
			output,
			index: 0,
			first: 0,
			last: 9,
			frames: 10,
			fps: 30,
			width: 160,
			height: 120
		});
		expect(await fs.readFile(output, 'utf8')).toBe('mask-bytes');
		const submit = calls.find((c) => c.url.endsWith('/birefnet/v2/video'))!;
		expect(submit.auth).toBe('Key k');
		expect(JSON.parse(submit.body!)).toMatchObject({
			video_url: 'https://cdn.test/piece.mp4',
			model: 'Portrait',
			output_mask: true
		});
		await fs.rm(dir, { recursive: true, force: true });
	}, 15000);

	it('needs a key', () => {
		const saved = process.env.FAL_KEY;
		delete process.env.FAL_KEY;
		expect(() => falBiRefNet()).toThrow(/FAL_KEY/);
		if (saved !== undefined) process.env.FAL_KEY = saved;
	});
});
