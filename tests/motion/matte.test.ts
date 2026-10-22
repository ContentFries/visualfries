import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
	commandMatte,
	createSubjectMatte,
	falBiRefNet,
	rvmMatte
} from '../../src/lib/motion/matte.js';
import { probeVideo } from '../../src/lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

async function tempDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-test-'));
}

function ffmpeg(args: string[]) {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
	if (r.status !== 0) throw new Error(String(r.stderr));
}

describe('rvmMatte', () => {
	it('is a local provider running the bundled script through uv', () => {
		const p = rvmMatte({ threads: 4 });
		expect(p.name).toBe('rvm (local CPU, 4 threads)');
		expect(p.maxFrames).toBe(480);
		expect(p.parallel).toBe(1);
		expect(p.output).toBe('luma');
	});

	it('ships the script', async () => {
		await expect(fs.access(path.resolve('scripts/rvm-matte.py'))).resolves.toBeUndefined();
	});

	it.skipIf(!hasFfmpeg || process.platform === 'win32')(
		'`visualfries matte --provider rvm` runs the bundled script through uv',
		async () => {
			const dir = await tempDir();
			const input = path.join(dir, 'talk.mp4');
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				'testsrc2=size=160x90:rate=25:duration=1',
				'-pix_fmt',
				'yuv420p',
				input
			]);
			// A stand-in `uv` on PATH: logs its arguments and writes a grey matte of the piece.
			const bin = path.join(dir, 'bin');
			await fs.mkdir(bin);
			await fs.writeFile(
				path.join(bin, 'uv'),
				[
					'#!/bin/sh',
					'for a; do printf \'%s\\n\' "$a"; done >> "$VF_FAKE_UV_LOG"',
					'shift $(($# - 3))',
					'exec ffmpeg -y -loglevel error -i "$1" -vf format=gray -pix_fmt yuv420p "$2"',
					''
				].join('\n'),
				{ mode: 0o755 }
			);
			const log = path.join(dir, 'uv.log');
			const output = path.join(dir, 'talk.matte.mp4');
			const r = spawnSync(
				process.execPath,
				[
					path.resolve('bin/visualfries.js'),
					'matte',
					input,
					'--output',
					output,
					'--provider',
					'rvm',
					'--threads',
					'3'
				],
				{
					encoding: 'utf8',
					env: {
						...process.env,
						PATH: `${bin}${path.delimiter}${process.env.PATH}`,
						VF_FAKE_UV_LOG: log
					}
				}
			);
			expect(r.status, r.stderr).toBe(0);
			expect(JSON.parse(r.stdout)).toMatchObject({
				frames: 25,
				provider: 'rvm (local CPU, 3 threads)'
			});
			const args = (await fs.readFile(log, 'utf8')).trim().split('\n');
			const script = args[args.indexOf('python') + 1];
			expect(args.slice(0, 2)).toEqual(['run', '-q']);
			expect(args).toEqual(expect.arrayContaining(['--with', 'torch', 'torchvision', 'numpy']));
			expect(path.basename(script)).toBe('rvm-matte.py');
			await expect(fs.access(script)).resolves.toBeUndefined();
			expect(args.at(-1)).toBe('3');
			await fs.rm(dir, { recursive: true, force: true });
		},
		60_000
	);

	// Slow: the real model run needs uv, and network on first use for torch, the model code and
	// the weights (a few hundred MB, cached afterwards). Opt in with VF_TEST_RVM=1.
	it.skipIf(!hasFfmpeg || !process.env.VF_TEST_RVM)(
		'mattes a short clip locally',
		async () => {
			const dir = await tempDir();
			const input = path.join(dir, 'talk.mp4');
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				'testsrc2=size=320x180:rate=25:duration=1',
				'-pix_fmt',
				'yuv420p',
				input
			]);
			const output = path.join(dir, 'matte.mp4');
			const result = await createSubjectMatte(input, {
				output,
				provider: rvmMatte({ threads: 2 })
			});
			expect(result.frames).toBe(25);
			const out = await probeVideo(output);
			expect([out.width, out.height, out.frames]).toEqual([320, 180, 25]);
			await fs.rm(dir, { recursive: true, force: true });
		},
		600_000
	);
});

const python = ['python3', 'python'].find((cmd) => spawnSync(cmd, ['--version']).status === 0);

/**
 * Runs scripts/rvm-matte.py's helpers against stand-in torch and torchvision packages, so the
 * torchvision compatibility and the weight checks are tested without installing torch.
 */
async function rvmScript(torchvision: 'current' | 'old' | 'missing', body: string) {
	const dir = await tempDir();
	const write = async (file: string, text: string) => {
		await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true });
		await fs.writeFile(path.join(dir, file), text);
	};
	await write('stubs/torch/__init__.py', 'from . import hub\n');
	await write(
		'stubs/torch/hub.py',
		[
			'import os',
			'calls = []',
			'def load_state_dict_from_url(url, **kwargs): return {}',
			'def get_dir(): return os.environ["VF_STUB_HUB"]',
			'def download_url_to_file(url, dst, hash_prefix=None, progress=True):',
			'    calls.append((url, dst, hash_prefix))',
			'    open(dst, "wb").write(b"weights")',
			''
		].join('\n')
	);
	if (torchvision !== 'missing') {
		await write('stubs/torchvision/__init__.py', '');
		await write('stubs/torchvision/models/__init__.py', '');
		if (torchvision === 'old')
			await write(
				'stubs/torchvision/models/utils.py',
				'def load_state_dict_from_url(url): return "old"\n'
			);
	}
	await write(
		'probe.py',
		[
			'import importlib.util, json, sys',
			'sys.path.insert(0, sys.argv[1])',
			'spec = importlib.util.spec_from_file_location("rvm_matte", sys.argv[2])',
			'rvm = importlib.util.module_from_spec(spec)',
			'spec.loader.exec_module(rvm)',
			'loaded = sorted(m for m in ("torch", "numpy") if m in sys.modules)',
			'import torch',
			body,
			''
		].join('\n')
	);
	const r = spawnSync(
		python!,
		[path.join(dir, 'probe.py'), path.join(dir, 'stubs'), path.resolve('scripts/rvm-matte.py')],
		{
			encoding: 'utf8',
			env: { ...process.env, VF_STUB_HUB: path.join(dir, 'hub'), PYTHONDONTWRITEBYTECODE: '1' }
		}
	);
	await fs.rm(dir, { recursive: true, force: true });
	return r;
}

describe.skipIf(!python)('scripts/rvm-matte.py', () => {
	it('adds torchvision.models.utils when torchvision no longer has it', async () => {
		const r = await rvmScript(
			'current',
			[
				'added = rvm.install_torchvision_compat(torch)',
				'from torchvision.models.utils import load_state_dict_from_url',
				'import torchvision.models',
				'print(json.dumps({"loaded": loaded, "added": added,',
				'  "same": load_state_dict_from_url is torch.hub.load_state_dict_from_url,',
				'  "attr": torchvision.models.utils.load_state_dict_from_url is torch.hub.load_state_dict_from_url}))'
			].join('\n')
		);
		expect(r.status, r.stderr).toBe(0);
		// Importing the script loads neither torch nor numpy; only main() does.
		expect(JSON.parse(r.stdout)).toEqual({ loaded: [], added: true, same: true, attr: true });
	});

	it('leaves a torchvision that still has the module alone', async () => {
		const r = await rvmScript(
			'old',
			[
				'added = rvm.install_torchvision_compat(torch)',
				'from torchvision.models.utils import load_state_dict_from_url',
				'print(json.dumps([added, load_state_dict_from_url("x")]))'
			].join('\n')
		);
		expect(r.status, r.stderr).toBe(0);
		expect(JSON.parse(r.stdout)).toEqual([false, 'old']);
	});

	it('does not hide a missing torchvision', async () => {
		const r = await rvmScript(
			'missing',
			[
				'try:',
				'    rvm.install_torchvision_compat(torch)',
				'except ModuleNotFoundError as e:',
				'    print(e.name)'
			].join('\n')
		);
		expect(r.stdout.trim()).toBe('torchvision');
	});

	it('pins the model code to v1.0.0 and downloads the official weights verified', async () => {
		const r = await rvmScript(
			'current',
			[
				'import os',
				'path = rvm.fetch_weights(torch)',
				'try:',
				'    rvm.fetch_weights(torch)',
				'    again = "accepted"',
				'except SystemExit as e:',
				'    again = str(e)',
				'print(json.dumps({"repo": rvm.HUB_REPO, "calls": torch.hub.calls, "again": again,',
				'  "path": os.path.relpath(path, os.environ["VF_STUB_HUB"])}))'
			].join('\n')
		);
		expect(r.status, r.stderr).toBe(0);
		const out = JSON.parse(r.stdout);
		const url =
			'https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3.pth';
		const sha = '3c7c1d92033f7c38d6577c481d13a195d7d80a159b960f4f3119ac7b534cf4f8';
		expect(out.repo).toBe('PeterL1n/RobustVideoMatting:v1.0.0');
		expect(out.path).toBe(path.join('checkpoints', 'rvm_mobilenetv3.pth'));
		// Downloaded from the GitHub release with its SHA-256 checked before it is kept.
		expect(out.calls).toEqual([[url, expect.stringContaining('rvm_mobilenetv3.pth'), sha]]);
		// A cached file that is not the release file (here the stand-in's bytes) is refused.
		expect(out.again).toMatch(/SHA-256 mismatch.*Delete it/);
	});
});

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

			// A coarse time base (AVI at 15 fps) must not shift the masks either.
			await createSubjectMatte(input, {
				output,
				provider: commandMatte(
					'ffmpeg -y -loglevel error -f lavfi -i color=black:s=160x120:r=15:d=2 -i {input} -map 0:v -vf "geq=lum=\'if(gte(N,15),255,0)\':cb=128:cr=128" -frames:v {frames} -c:v mjpeg {output}',
					{ extension: '.avi' }
				)
			});
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
