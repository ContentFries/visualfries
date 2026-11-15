// @vitest-environment node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	commandMatte,
	createRangeMatte,
	createSubjectMatte,
	matteLayout,
	matteProviderFromFlags,
	fileFingerprint,
	extractFrames,
	falBiRefNet,
	rvmMatte,
	type MatteChunk,
	type MatteProvider
} from '../../src/lib/motion/matte.js';
import { loadMotionProject, probeVideo } from '../../src/lib/motion/node.js';
import {
	assertMatteCovers,
	blockReadsSubject,
	matteProject,
	matteReportLines,
	parseRangesFlag,
	projectMattePlan
} from '../../src/lib/motion/matte-project.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const W = 64;
const H = 36;

function ffmpeg(args: string[]): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-threads', '2', ...args], {
		maxBuffer: 1 << 26
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** Four seconds at 30 fps (120 frames) whose brightness tells the frame: 30 + 1.6 × n. */
function countingVideo(file: string, filter = "geq=lum='30+1.6*N':cb=128:cr=128") {
	ffmpeg([
		'-f',
		'lavfi',
		'-i',
		`color=black:s=${W}x${H}:r=30:d=4`,
		'-vf',
		filter,
		'-c:v',
		'libx264',
		'-crf',
		'1',
		'-pix_fmt',
		'yuv420p',
		file
	]);
}

/** Mean brightness of every frame of a video. */
function means(file: string): number[] {
	const raw = ffmpeg(['-i', file, '-vf', 'format=gray', '-f', 'rawvideo', '-']);
	const size = W * H;
	const out: number[] = [];
	for (let i = 0; i + size <= raw.length; i += size) {
		let sum = 0;
		for (let k = i; k < i + size; k++) sum += raw[k];
		out.push(sum / size);
	}
	return out;
}

/** A provider that returns the piece itself in grey, and remembers every piece it was given. */
function passThrough(): MatteProvider & { calls: MatteChunk[] } {
	const calls: MatteChunk[] = [];
	return {
		name: 'pass-through',
		id: 'pass-through',
		maxFrames: 8,
		parallel: 1,
		output: 'luma',
		calls,
		async segment(chunk) {
			calls.push(chunk);
			ffmpeg(['-i', chunk.input, '-vf', 'format=gray', '-pix_fmt', 'yuv420p', chunk.output]);
		}
	};
}

describe('matteLayout', () => {
	it('lays the ranges and the black gaps out over the whole video', () => {
		expect(
			matteLayout(
				[
					{ first: 0, last: 9 },
					{ first: 20, last: 29 }
				],
				40
			)
		).toEqual([{ range: 0 }, { gap: 10 }, { range: 1 }, { gap: 10 }]);
		expect(matteLayout([], 5)).toEqual([{ gap: 5 }]);
	});
});

describe.skipIf(!hasFfmpeg)('createRangeMatte', () => {
	let dir: string;
	let input: string;
	let source: number[];
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-ranges-'));
		input = path.join(dir, 'talk.mp4');
		countingVideo(input);
		source = means(input);
	}, 60_000);
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const ranges = [
		{ first: 20, last: 39 },
		{ first: 80, last: 89 }
	];

	it('mattes only the ranges, black elsewhere, frame-exact, full length', async () => {
		const provider = passThrough();
		const output = path.join(dir, 'talk.matte.mp4');
		const result = await createRangeMatte(input, {
			output,
			provider,
			ranges,
			warmup: 5,
			blockFrames: 10,
			cacheDir: path.join(dir, 'cache')
		});
		expect(result).toMatchObject({ frames: 120, covered: 30, matted: 30, written: true });
		expect((await probeVideo(output)).frames).toBe(120);
		const m = means(output);
		expect(m).toHaveLength(120);
		for (let f = 0; f < 120; f++) {
			const inside = ranges.some((r) => f >= r.first && f <= r.last);
			if (inside) expect(Math.abs(m[f] - source[f]), `frame ${f}`).toBeLessThan(0.9);
			else expect(m[f], `frame ${f}`).toBeLessThan(2);
		}
		// Warm-up: the first range starts matting 5 frames early, in pieces of at most 8 frames.
		expect(provider.calls[0].first).toBe(15);
		expect(provider.calls.every((c) => c.frames <= 8)).toBe(true);
		expect(provider.calls.some((c) => c.first <= 0)).toBe(false);
		const file = JSON.parse(await fs.readFile(`${output}.ranges.json`, 'utf8'));
		expect(file).toMatchObject({
			version: 2,
			source: { file: 'talk.mp4', frames: 120, fps: 30 },
			ranges: [
				[20, 39],
				[80, 89]
			],
			provider: 'pass-through'
		});
		expect(file.matte.fingerprint).toBe(await fileFingerprint(output));
		expect(file.source.fingerprint).toBe(await fileFingerprint(input));
		// Published by rename: no temporary files are left next to the matte.
		expect((await fs.readdir(dir)).filter((f) => f.includes('.tmp'))).toEqual([]);
	}, 120_000);

	it('mattes nothing again, and leaves the matte alone, when nothing changed', async () => {
		const provider = passThrough();
		const output = path.join(dir, 'talk.matte.mp4');
		const before = await fs.stat(output);
		const result = await createRangeMatte(input, {
			output,
			provider,
			ranges,
			warmup: 5,
			blockFrames: 10,
			cacheDir: path.join(dir, 'cache')
		});
		expect(result).toMatchObject({ matted: 0, written: false });
		expect(provider.calls).toEqual([]);
		expect((await fs.stat(output)).mtimeMs).toBe(before.mtimeMs);
	});

	it('mattes only a new range after an edit', async () => {
		const provider = passThrough();
		const output = path.join(dir, 'talk.matte.mp4');
		const more = [...ranges, { first: 100, last: 109 }];
		const result = await createRangeMatte(input, {
			output,
			provider,
			ranges: more,
			warmup: 5,
			blockFrames: 10,
			cacheDir: path.join(dir, 'cache')
		});
		expect(result).toMatchObject({ matted: 10, covered: 40, written: true });
		expect(provider.calls.every((c) => c.first >= 95)).toBe(true);
		const m = means(output);
		expect(Math.abs(m[105] - source[105])).toBeLessThan(0.9);
		expect(Math.abs(m[30] - source[30])).toBeLessThan(0.9);
		expect(m[95]).toBeLessThan(2);
	}, 120_000);

	it('mattes only the new blocks of a range that grew', async () => {
		const provider = passThrough();
		const output = path.join(dir, 'talk.matte.mp4');
		const grown = [
			{ first: 20, last: 45 },
			{ first: 80, last: 89 },
			{ first: 100, last: 109 }
		];
		const result = await createRangeMatte(input, {
			output,
			provider,
			ranges: grown,
			warmup: 5,
			blockFrames: 10,
			cacheDir: path.join(dir, 'cache')
		});
		// Blocks of 10 frames: only 40–49 is new; the matte covers whole blocks.
		expect(result).toMatchObject({ matted: 10, covered: 50, written: true });
		expect(provider.calls.every((c) => c.first >= 35 && c.last <= 49)).toBe(true);
		const m = means(output);
		expect(Math.abs(m[44] - source[44])).toBeLessThan(0.9);
		expect(Math.abs(m[49] - source[49])).toBeLessThan(0.9);
		expect(m[50]).toBeLessThan(2);
	}, 120_000);

	it('never writes the matte over its own video', async () => {
		await expect(
			createRangeMatte(input, {
				output: input,
				ranges,
				provider: passThrough(),
				cacheDir: path.join(dir, 'cache')
			})
		).rejects.toThrow(/would overwrite the video/);
		await expect(
			createSubjectMatte(input, { output: input, provider: passThrough() })
		).rejects.toThrow(/would overwrite the video/);
		// Through a symlinked folder too.
		const link = path.join(dir, 'linked');
		await fs.symlink(dir, link);
		await expect(
			createRangeMatte(input, {
				output: path.join(link, 'talk.mp4'),
				ranges,
				provider: passThrough(),
				cacheDir: path.join(dir, 'cache')
			})
		).rejects.toThrow(/would overwrite the video/);
	});

	it('rejects a block size that is not a positive whole number', async () => {
		for (const blockFrames of [0, -5, 2.5])
			await expect(
				createRangeMatte(input, {
					output: path.join(dir, 'x.mp4'),
					ranges,
					blockFrames,
					provider: passThrough(),
					cacheDir: path.join(dir, 'cache')
				})
			).rejects.toThrow(/block size/);
	});

	it('mattes a block the same whatever was matted around it before', async () => {
		// A recurrent model that needs 3 frames to settle (black until then) in pieces of 8.
		const settling = (): MatteProvider => ({
			...passThrough(),
			id: 'settling',
			async segment(chunk) {
				ffmpeg([
					'-i',
					chunk.input,
					'-vf',
					"format=gray,geq=lum='if(lt(N,3),0,lum(X,Y))'",
					'-pix_fmt',
					'yuv420p',
					chunk.output
				]);
			}
		});
		const run = (cache: string, output: string, last: number) =>
			createRangeMatte(input, {
				output: path.join(dir, output),
				ranges: [{ first: 0, last }],
				provider: settling(),
				warmup: 5,
				blockFrames: 10,
				chunkFrames: 8,
				cacheDir: path.join(dir, cache)
			});
		await run('grow', 'grown.mp4', 19);
		await run('grow', 'grown.mp4', 39);
		await run('fresh', 'fresh.mp4', 39);
		const grown = means(path.join(dir, 'grown.mp4'));
		const fresh = means(path.join(dir, 'fresh.mp4'));
		for (let f = 0; f < 40; f++)
			expect(Math.abs(grown[f] - fresh[f]), `frame ${f}`).toBeLessThan(0.9);
	}, 120_000);

	it('rejects ranges out of order or past the end', async () => {
		const opts = { output: path.join(dir, 'x.mp4'), cacheDir: dir, provider: passThrough() };
		await expect(
			createRangeMatte(input, { ...opts, ranges: [{ first: 100, last: 130 }] })
		).rejects.toThrow(/inside the video's 120 frames/);
		await expect(
			createRangeMatte(input, {
				...opts,
				ranges: [
					{ first: 50, last: 60 },
					{ first: 10, last: 20 }
				]
			})
		).rejects.toThrow(/sorted/);
	});

	it('a full matte made over it removes the ranges file', async () => {
		const output = path.join(dir, 'talk.matte.mp4');
		await createSubjectMatte(input, {
			output,
			provider: commandMatte(
				'ffmpeg -y -loglevel error -i {input} -vf format=gray -frames:v {frames} {output}'
			)
		});
		await expect(fs.access(`${output}.ranges.json`)).rejects.toThrow();
	}, 120_000);

	it('segments every block in one provider run when the provider takes several', async () => {
		const many: MatteChunk[][] = [];
		const single: MatteChunk[] = [];
		const base = passThrough();
		const provider: MatteProvider = {
			...base,
			id: 'batch',
			async segment(chunk) {
				single.push(chunk);
				await base.segment(chunk);
			},
			async segmentMany(chunks) {
				many.push(chunks);
				for (const c of chunks) await base.segment(c);
			}
		};
		const output = path.join(dir, 'batch.mp4');
		const result = await createRangeMatte(input, {
			output,
			provider,
			ranges,
			warmup: 5,
			blockFrames: 10,
			cacheDir: path.join(dir, 'batch-cache')
		});
		expect(result).toMatchObject({ matted: 30, covered: 30 });
		expect(single).toEqual([]);
		expect(many).toHaveLength(1);
		// Blocks 20-29, 30-39 and 80-89, each from 5 frames before it, in pieces of at most 8.
		expect(many[0].map((c) => c.first)).toEqual([15, 23, 25, 33, 75, 83]);
		const m = means(output);
		for (const f of [20, 29, 30, 39, 80, 89])
			expect(Math.abs(m[f] - source[f]), `frame ${f}`).toBeLessThan(0.9);
		expect(m[19]).toBeLessThan(2);
	}, 120_000);

	it.skipIf(process.platform === 'win32')(
		'runs rvm once for every block of a partial matte (the model loads once)',
		async () => {
			const uv = path.join(dir, 'fake-uv');
			const log = path.join(dir, 'fake-uv.log');
			await fs.writeFile(
				uv,
				[
					'#!/bin/sh',
					`echo run >> "${log}"`,
					'while [ "$1" != "--batch" ]; do shift; done',
					'shift 2',
					'while [ $# -gt 0 ]; do',
					'  ffmpeg -y -loglevel error -i "$1" -vf format=gray -pix_fmt yuv420p "$2" || exit 1',
					'  shift 2',
					'done',
					''
				].join('\n'),
				{ mode: 0o755 }
			);
			const result = await createRangeMatte(input, {
				output: path.join(dir, 'rvm-batch.mp4'),
				provider: rvmMatte({ uv, threads: 2, maxFrames: 8 }),
				ranges,
				warmup: 5,
				blockFrames: 10,
				cacheDir: path.join(dir, 'rvm-batch-cache')
			});
			expect(result.matted).toBe(30);
			expect((await fs.readFile(log, 'utf8')).trim().split('\n')).toEqual(['run']);
		},
		120_000
	);

	it('keeps the blocks that finished when a later one fails, and redoes only the rest', async () => {
		const failing: MatteProvider = {
			...passThrough(),
			id: 'flaky',
			async segment(chunk) {
				if (chunk.first >= 75) throw new Error('provider down');
				await passThrough().segment(chunk);
			}
		};
		const opts = {
			output: path.join(dir, 'flaky.mp4'),
			ranges,
			warmup: 5,
			blockFrames: 10,
			cacheDir: path.join(dir, 'flaky-cache')
		};
		await expect(createRangeMatte(input, { ...opts, provider: failing })).rejects.toThrow(
			/provider down/
		);
		const retry = { ...passThrough(), id: 'flaky' };
		const result = await createRangeMatte(input, { ...opts, provider: retry });
		expect(result.matted).toBe(10);
		expect(retry.calls.every((c) => c.first >= 75)).toBe(true);
	}, 120_000);

	it('adds no warm-up for a provider that segments every frame on its own', async () => {
		const provider = { ...passThrough(), id: 'per-frame', recurrent: false };
		await createRangeMatte(input, {
			output: path.join(dir, 'per-frame.mp4'),
			provider,
			ranges,
			blockFrames: 10,
			cacheDir: path.join(dir, 'per-frame-cache')
		});
		expect(provider.calls.map((c) => c.first)).toEqual([20, 28, 30, 38, 80, 88]);
		expect(falBiRefNet({ key: 'k' }).recurrent).toBe(false);
		expect(rvmMatte().recurrent).toBe(true);
	}, 120_000);

	it('makes a black matte again when the recording of an unread footage is replaced', async () => {
		const src = path.join(dir, 'unread.mp4');
		const output = path.join(dir, 'unread.matte.mp4');
		countingVideo(src);
		const opts = { output, ranges: [], provider: passThrough(), cacheDir: path.join(dir, 'u') };
		await createRangeMatte(src, opts);
		countingVideo(src, "geq=lum='200-N':cb=128:cr=128");
		const again = await createRangeMatte(src, opts);
		expect(again.written).toBe(true);
		const file = JSON.parse(await fs.readFile(`${output}.ranges.json`, 'utf8'));
		expect(file.source.fingerprint).toBe(await fileFingerprint(src));
	}, 120_000);
});

describe.skipIf(!hasFfmpeg)('extractFrames', () => {
	it('cuts the same frames with a seek as decoding from the start, keyframes or not', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-seek-'));
		const input = path.join(dir, 'long.mp4');
		// 10 s at 30 fps, a keyframe every 15 frames, brightness 20 + 0.7 × frame.
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			`color=black:s=${W}x${H}:r=30:d=10`,
			'-vf',
			"geq=lum='20+0.7*N':cb=128:cr=128",
			'-c:v',
			'libx264',
			'-crf',
			'1',
			'-g',
			'15',
			'-bf',
			'2',
			'-pix_fmt',
			'yuv420p',
			input
		]);
		const source = means(input);
		for (const first of [0, 1, 37, 90, 151, 289]) {
			const out = path.join(dir, `piece-${first}.mp4`);
			await extractFrames(input, 30, first, first + 6, out);
			const m = means(out);
			expect(m, `from ${first}`).toHaveLength(7);
			m.forEach((v, k) =>
				expect(Math.abs(v - source[first + k]), `frame ${first + k}`).toBeLessThan(0.3)
			);
		}
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);
});

describe.skipIf(!hasFfmpeg)('partial mattes of a project', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-project-'));
		countingVideo(path.join(dir, 'talk.mp4'));
		await fs.writeFile(path.join(dir, 'World.svelte'), '<div></div>\n');
	}, 60_000);
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const write = async (more: object = {}) => {
		const file = path.join(dir, 'p.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [W, H],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk', in: 0, out: 4 }],
				shots: [{ id: 'b', shot: 'behind', from: 1, until: 1.5 }],
				clips: [],
				...more
			})
		);
		return loadMotionProject(file);
	};
	const matte = async (loaded: Awaited<ReturnType<typeof write>>) => {
		const [plan] = await projectMattePlan(loaded, { margin: 0.2, gap: 0.5 });
		await createRangeMatte(plan.src, {
			output: plan.matte,
			ranges: plan.ranges,
			provider: passThrough(),
			warmup: 3,
			blockFrames: 6,
			cacheDir: path.join(dir, 'cache')
		});
		return plan;
	};
	const program = async (loaded: Awaited<ReturnType<typeof write>>) =>
		(await import('../../src/lib/motion/program.js')).resolveProgram(loaded.project, loaded.inputs);

	it('plans the frames the program reads, widened', async () => {
		const loaded = await write();
		const [plan] = await projectMattePlan(loaded, { margin: 0.2, gap: 0.5 });
		expect(plan.name).toBe('talk');
		expect(plan.reads[0].first).toBe(15);
		expect(plan.ranges).toEqual([
			{ first: plan.reads[0].first - 6, last: plan.reads[plan.reads.length - 1].last + 6 }
		]);
		expect(plan.ranges[0].last).toBeLessThan(119);
	});

	it('passes when the matte covers what the program reads', async () => {
		const loaded = await write();
		await matte(loaded);
		await expect(assertMatteCovers(loaded, await program(loaded))).resolves.toBeUndefined();
	}, 120_000);

	it('fails clearly when an edit reads the matte where it is black', async () => {
		const edited = await write({
			clips: [{ id: 'w', block: 'World.svelte', from: 3, until: 3.5, layer: 'behind' }]
		});
		await expect(assertMatteCovers(edited, await program(edited))).rejects.toThrow(
			/Footage "talk": the program reads its matte at 3\.00–4\.00 s.*\n.*Run visualfries matte .*p\.vf\.json again: it keeps what it matted before/
		);
	});

	it('fails when the matte changed after its ranges were written', async () => {
		const loaded = await write();
		await matte(loaded);
		await fs.appendFile(path.join(dir, 'talk.matte.mp4'), Buffer.from([0]));
		await expect(assertMatteCovers(loaded, await program(loaded))).rejects.toThrow(
			/talk\.matte\.mp4\.ranges\.json cannot be used: the matte changed/
		);
	});

	it('reads a matte without a ranges file as covering every frame, as before', async () => {
		await fs.rm(path.join(dir, 'talk.matte.mp4.ranges.json'));
		const edited = await write({
			clips: [{ id: 'w', block: 'World.svelte', from: 3, until: 3.5, layer: 'behind' }]
		});
		await expect(assertMatteCovers(edited, await program(edited))).resolves.toBeUndefined();
	});

	it('never certifies a matte its ranges file was not written for (a run killed half way)', async () => {
		const loaded = await write();
		await matte(loaded);
		const old = await fs.readFile(path.join(dir, 'talk.matte.mp4'));
		const edited = await write({
			clips: [{ id: 'w', block: 'World.svelte', from: 3, until: 3.5, layer: 'behind' }]
		});
		await matte(edited);
		// The new ranges file is in place, the old matte is back: as if killed between the two.
		await fs.writeFile(path.join(dir, 'talk.matte.mp4'), old);
		await expect(assertMatteCovers(edited, await program(edited))).rejects.toThrow(
			/the matte changed/
		);
	}, 120_000);

	it('fails when an inserts export draws a behind clip over handles the matte misses', async () => {
		const loaded = await write({
			clips: [{ id: 'w', block: 'World.svelte', from: 1, until: 1.5, layer: 'behind' }]
		});
		await matte(loaded);
		const { renderProgramInserts } = await import('../../src/lib/motion/inserts-node.js');
		await expect(
			renderProgramInserts(loaded, { output: path.join(dir, 'inserts'), handles: 60 })
		).rejects.toThrow(/reads its matte at .*\n.*--handles 60/);
	}, 120_000);

	it('checks a project without cuts (inserts mode) against the whole footage', async () => {
		const file = path.join(dir, 'clips.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [W, H],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				clips: [{ id: 'w', block: 'World.svelte', from: 0, until: 2 }]
			})
		);
		await createRangeMatte(path.join(dir, 'talk.mp4'), {
			output: path.join(dir, 'talk.matte.mp4'),
			ranges: [{ first: 0, last: 9 }],
			provider: passThrough(),
			blockFrames: 10,
			cacheDir: path.join(dir, 'cache')
		});
		const { checkMotionProject } = await import('../../src/lib/motion/node.js');
		await expect(checkMotionProject(await loadMotionProject(file))).rejects.toThrow(
			/the program reads its matte at 0\.33–4\.00 s/
		);
	}, 120_000);
});

describe.skipIf(!hasFfmpeg)('matteProject edge cases', () => {
	const setup = async (footage: object, more: object = {}) => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-edge-'));
		countingVideo(path.join(dir, 'talk.mp4'));
		await fs.writeFile(path.join(dir, 'World.svelte'), '<div></div>\n');
		const file = path.join(dir, 'p.vf.json');
		const write = async (extra: object = {}) => {
			await fs.writeFile(
				file,
				JSON.stringify({
					size: [W, H],
					fps: 30,
					footage: { talk: { src: 'talk.mp4', ...footage } },
					cuts: [{ source: 'talk', in: 0, out: 4 }],
					clips: [],
					...more,
					...extra
				})
			);
			return loadMotionProject(file);
		};
		return { dir, write };
	};
	const run = (loaded: Awaited<ReturnType<typeof loadMotionProject>>) =>
		matteProject(loaded, { provider: passThrough(), warmup: 3, blockFrames: 6 });

	it('refuses a matte path that is the recording itself', async () => {
		const { dir, write } = await setup({ matte: 'talk.mp4' });
		await expect(projectMattePlan(await write())).rejects.toThrow(
			/its matte talk\.mp4 would overwrite the video of footage "talk"/
		);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('refuses a matte path that reaches the recording through a symlinked folder', async () => {
		const { dir, write } = await setup({ matte: 'linked/talk.mp4' });
		await fs.symlink(dir, path.join(dir, 'linked'));
		await expect(projectMattePlan(await write())).rejects.toThrow(/would overwrite the video/);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('recovers a stale matte when the program no longer reads it', async () => {
		const { dir, write } = await setup(
			{ matte: 'talk.matte.mp4' },
			{ shots: [{ id: 'b', shot: 'behind', from: 1, until: 1.5 }] }
		);
		await run(await write());
		// The recording is replaced and the last shot that read the matte is gone.
		countingVideo(path.join(dir, 'talk.mp4'), "geq=lum='200-N':cb=128:cr=128");
		const loaded = await write({ shots: [] });
		const [fixed] = await run(loaded);
		expect(fixed).toMatchObject({ covered: 0, written: true, ranges: [] });
		const { resolveProgram } = await import('../../src/lib/motion/program.js');
		await expect(
			assertMatteCovers(loaded, resolveProgram(loaded.project, loaded.inputs))
		).resolves.toBeUndefined();
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);

	it('writes a black matte when the program reads none of it, and leaves an existing one alone', async () => {
		const { dir, write } = await setup({ matte: 'talk.matte.mp4' });
		const [first] = await run(await write());
		expect(first).toMatchObject({ covered: 0, matted: 0, written: true, ranges: [] });
		expect(means(path.join(dir, 'talk.matte.mp4')).every((m) => m < 2)).toBe(true);
		await fs.writeFile(path.join(dir, 'talk.matte.mp4'), 'mine');
		await fs.rm(path.join(dir, 'talk.matte.mp4.ranges.json'));
		const [again] = await run(await write());
		expect(again).toMatchObject({ covered: 0, matted: 0, written: false });
		expect(await fs.readFile(path.join(dir, 'talk.matte.mp4'), 'utf8')).toBe('mine');
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);

	it('keeps the frames it covered before (another format or an earlier edit)', async () => {
		const { dir, write } = await setup(
			{ matte: 'talk.matte.mp4' },
			{ shots: [{ id: 'b', shot: 'behind', from: 0.5, until: 1 }] }
		);
		const [first] = await run(await write());
		const [moved] = await run(
			await write({ shots: [{ id: 'b', shot: 'behind', from: 3, until: 3.5 }] })
		);
		for (const r of first.ranges)
			expect(moved.ranges.some((m) => m.first <= r.first && m.last >= r.last)).toBe(true);
		expect(moved.ranges.some((m) => m.first <= 95 && m.last >= 100)).toBe(true);
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);
});

describe('matteProviderFromFlags', () => {
	it('builds the provider the flags name', () => {
		expect(matteProviderFromFlags({ threads: 2 }).name).toBe('rvm (local CPU, 2 threads)');
		expect(matteProviderFromFlags({ command: 't {input} {output}' }).id).toBe(
			'command:luma::t {input} {output}'
		);
		expect(() => matteProviderFromFlags({ provider: 'command' })).toThrow(/needs --command/);
		expect(() => matteProviderFromFlags({ provider: 'nope' })).toThrow(/Unknown matte provider/);
	});
	it('keeps the cache identity of rvm apart from its speed', () => {
		expect(matteProviderFromFlags({ threads: 2 }).id).toBe(
			matteProviderFromFlags({ threads: 8 }).id
		);
	});
});

describe('parseRangesFlag', () => {
	it('turns seconds into sorted, joined frame ranges', () => {
		expect(parseRangesFlag('3-4, 0.5-1,3.5-5', 30, 300)).toEqual([
			{ first: 15, last: 29 },
			{ first: 90, last: 149 }
		]);
		expect(parseRangesFlag('9-12', 30, 300)).toEqual([{ first: 270, last: 299 }]);
	});
	it('rejects what is not a from-to pair', () => {
		expect(() => parseRangesFlag('4-3', 30, 300)).toThrow(/from-to pairs/);
		expect(() => parseRangesFlag('abc', 30, 300)).toThrow(/from-to pairs/);
	});
});

describe('matteReportLines', () => {
	it('tells frames covered, matted and the time a full matte would take', () => {
		const base = {
			footage: 'talk',
			matte: 'talk.matte.mp4',
			frames: 27000,
			covered: 900,
			ranges: [],
			fps: 30,
			seconds: 60
		};
		expect(
			matteReportLines([
				{ ...base, matted: 900, fullSeconds: 1800, written: true },
				{ ...base, matted: 0, fullSeconds: null, written: false }
			])
		).toEqual([
			'talk: 900 of 27000 frames covered (3 %), 900 matted now in 60 s; every frame would take about 30.0 min at this pace. Wrote talk.matte.mp4',
			'talk: 900 of 27000 frames covered (3 %), 0 matted now in 60 s. talk.matte.mp4 is up to date'
		]);
	});
});

describe('blockReadsSubject', () => {
	it('finds the subject in a block or a project file it imports, not in VisualFries files', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-blocks-'));
		await fs.writeFile(path.join(dir, 'Plain.svelte'), '<div>words</div>\n');
		await fs.writeFile(
			path.join(dir, 'Deep.svelte'),
			"<script>import Part from './parts/Part.svelte';</script><Part />\n"
		);
		await fs.mkdir(path.join(dir, 'parts'));
		await fs.writeFile(
			path.join(dir, 'parts', 'Part.svelte'),
			'<script>import { Subject } from "visualfries/motion";</script><Subject />\n'
		);
		await fs.writeFile(path.join(dir, 'Hole.svelte'), '<Footage name="talk" layer="clean" />\n');
		await fs.writeFile(
			path.join(dir, 'Canvas.svelte'),
			"<script>const p = clip.picture('clean');</script>\n"
		);
		expect(await blockReadsSubject(dir, 'Hole.svelte')).toBe(true);
		expect(await blockReadsSubject(dir, 'Canvas.svelte')).toBe(true);
		expect(await blockReadsSubject(dir, 'Plain.svelte')).toBe(false);
		expect(await blockReadsSubject(dir, 'Deep.svelte')).toBe(true);
		expect(await blockReadsSubject(dir, 'Missing.svelte')).toBe(false);
		expect(await blockReadsSubject(dir, '@visualfries/subject')).toBe(true);
		expect(await blockReadsSubject(dir, '@visualfries/speaker-depth')).toBe(true);
		expect(await blockReadsSubject(dir, '@visualfries/captions')).toBe(false);
		expect(await blockReadsSubject(dir, '@visualfries/end-card')).toBe(false);
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe.skipIf(!hasFfmpeg)('matteProject', () => {
	const project = async (footage: object, more: object = {}) => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-run-'));
		countingVideo(path.join(dir, 'talk.mp4'));
		const file = path.join(dir, 'p.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [W, H],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', ...footage } },
				cuts: [{ source: 'talk', in: 0, out: 4 }],
				clips: [],
				...more
			})
		);
		return { dir, loaded: await loadMotionProject(file) };
	};

	it('mattes each footage with a matte where the program reads it, then nothing new', async () => {
		const { dir, loaded } = await project(
			{ matte: 'talk.matte.mp4' },
			{ shots: [{ id: 'b', shot: 'behind', from: 0.2, until: 0.4 }] }
		);
		const settings = { provider: passThrough(), warmup: 3, blockFrames: 30 };
		const [first] = await matteProject(loaded, settings);
		expect(first).toMatchObject({ footage: 'talk', frames: 120, written: true });
		expect(first.matted).toBe(first.covered);
		expect(first.covered).toBeLessThan(120);
		expect(first.fullSeconds).toBeGreaterThan(0);
		// One cached mask per block of 30 frames covered.
		await expect(fs.readdir(path.join(dir, '.visualfries', 'matte', 'talk'))).resolves.toHaveLength(
			first.covered / 30
		);
		const [again] = await matteProject(loaded, { ...settings, provider: passThrough() });
		expect(again).toMatchObject({ matted: 0, written: false, fullSeconds: null });
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);

	it('says so when no footage has a matte', async () => {
		const { dir, loaded } = await project({});
		await expect(matteProject(loaded, {})).rejects.toThrow(
			/No footage of this project has a "matte"/
		);
		await fs.rm(dir, { recursive: true, force: true });
	}, 60_000);

	it('runs as `visualfries matte <project>` and `matte <video> --ranges`', async () => {
		const { dir } = await project(
			{ matte: 'talk.matte.mp4' },
			{ shots: [{ id: 'b', shot: 'behind', from: 1, until: 1.5 }] }
		);
		const cli = (args: string[]) =>
			spawnSync(process.execPath, [path.resolve('bin/visualfries.js'), 'matte', ...args], {
				encoding: 'utf8',
				cwd: dir
			});
		const command = [
			'--command',
			'ffmpeg -y -loglevel error -i {input} -vf format=gray -frames:v {frames} {output}'
		];
		const r = cli(['p.vf.json', ...command]);
		expect(r.status, r.stderr).toBe(0);
		expect(r.stdout).toMatch(/^talk: \d+ of 120 frames covered \(\d+ %\), \d+ matted now/);
		expect(existsSync(path.join(dir, 'talk.matte.mp4.ranges.json'))).toBe(true);
		const v = cli(['talk.mp4', '--output', 'part.mp4', '--ranges', '1-2', ...command]);
		expect(v.status, v.stderr).toBe(0);
		// Seconds 1-2 are frames 30-59; the matte covers the whole four-second block holding them.
		expect(JSON.parse(v.stdout)).toMatchObject({
			frames: 120,
			covered: 120,
			ranges: [{ first: 0, last: 119 }]
		});
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);
});
