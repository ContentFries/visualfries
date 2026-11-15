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
function countingVideo(file: string) {
	ffmpeg([
		'-f',
		'lavfi',
		'-i',
		`color=black:s=${W}x${H}:r=30:d=4`,
		'-vf',
		"geq=lum='30+1.6*N':cb=128:cr=128",
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
			version: 1,
			source: { file: 'talk.mp4', frames: 120, fps: 30 },
			ranges: [
				[20, 39],
				[80, 89]
			],
			provider: 'pass-through'
		});
		expect(file.matte.size).toBe((await fs.stat(output)).size);
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
			cacheDir: path.join(dir, 'cache')
		});
		expect(result).toMatchObject({ matted: 10, covered: 40, written: true });
		expect(provider.calls.every((c) => c.first >= 95)).toBe(true);
		const m = means(output);
		expect(Math.abs(m[105] - source[105])).toBeLessThan(0.9);
		expect(Math.abs(m[30] - source[30])).toBeLessThan(0.9);
		expect(m[95]).toBeLessThan(2);
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
			/Footage "talk": the program reads its matte at 2\.90–4\.00 s.*\n.*Run visualfries matte .*p\.vf\.json again/
		);
	});

	it('fails when the matte changed after its ranges were written', async () => {
		const loaded = await write();
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
			{ shots: [{ id: 'b', shot: 'behind', from: 1, until: 1.5 }] }
		);
		const [first] = await matteProject(loaded, { provider: passThrough(), warmup: 3 });
		expect(first).toMatchObject({ footage: 'talk', frames: 120, written: true });
		expect(first.matted).toBe(first.covered);
		expect(first.covered).toBeLessThan(120);
		expect(first.fullSeconds).toBeGreaterThan(0);
		await expect(fs.readdir(path.join(dir, '.visualfries', 'matte', 'talk'))).resolves.toHaveLength(
			1
		);
		const [again] = await matteProject(loaded, { provider: passThrough(), warmup: 3 });
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
		expect(JSON.parse(v.stdout)).toMatchObject({
			frames: 120,
			covered: 30,
			ranges: [{ first: 30, last: 59 }]
		});
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);
});
