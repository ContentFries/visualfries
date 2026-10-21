// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';
import { resolveProgram } from '../../src/lib/motion/program.js';
import { scrambled } from '../../src/lib/motion/segments.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/**
 * Portrait footage, 300 frames: grey, with the frame number in binary (24 px columns, white = 1)
 * on a row repeated every 40 px, so either side of a vertical push shows a readable row.
 */
const W = 360;
const H = 640;
const BIT = 24;
const BITS = 10;
const ROW = 40;
const GREY = 96;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

function rgba(png: Buffer): Buffer {
	return ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
}
const at = (raw: Buffer, x: number, y: number) => [
	...raw.subarray((y * W + x) * 4, (y * W + x) * 4 + 3)
];
const near = (rgb: number[], want: number[], tolerance = 24) =>
	rgb.every((v, i) => Math.abs(v - want[i]) <= tolerance);
/** The frame number on the bit row through screen row `y`. */
function frameNumber(raw: Buffer, y: number): number {
	let n = 0;
	for (let bit = 0; bit < BITS; bit++) if (at(raw, bit * BIT + BIT / 2, y)[0] > 128) n += 1 << bit;
	return n;
}
/** The frame number a side shows when its top edge is at screen row `top`. */
function sideNumber(raw: Buffer, top: number): number {
	const y = top + Math.max(0, Math.ceil(-top / ROW)) * ROW + BIT / 2;
	if (y >= H || y >= top + H) throw new Error(`No bit row of a side at ${top} is on screen.`);
	return frameNumber(raw, y);
}
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

/** A box at (x, y) in the colour given. */
const TAG = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<div class="tag" style="left: {clip.props.x}px; top: {clip.props.y}px; background: {clip.props.color}"></div>

<style>
	.tag { position: absolute; width: 60px; height: 40px; }
</style>
`;
/** A green band behind the speaker. */
const BAND = `<div class="band"></div>

<style>
	.band { position: absolute; left: 0; right: 0; top: 300px; height: 60px; background: #00ff00; }
</style>
`;

const tag = (id: string, from: number, until: number, color: string, y = 100) => ({
	id,
	block: 'Tag.svelte',
	from,
	until,
	props: { x: 300, y, color }
});

/**
 * Program frames 0–44 show source 30–74, 45–89 source 3–47 (pushed in, 0.1 s of handle for
 * 0.23 s needed: 4 held frames), 90–134 source 180–224 (wiped in). A punch at 120 pushes in, a
 * title at 96 pushes in over everything below it.
 */
function project(size: [number, number], transitions: boolean) {
	const push = { type: 'push', duration: 0.5, ease: 'none', params: { blur: 0 } };
	return {
		size,
		fps: 30,
		background: '#000000',
		footage: { num: { src: 'num.mp4', matte: 'num.matte.mp4' } },
		cuts: [
			{ id: 'c1', source: 'num', in: 1, out: 2.5 },
			{ id: 'c2', source: 'num', in: 0.1, out: 1.6, ...(transitions ? { transition: push } : {}) },
			{ id: 'c3', source: 'num', in: 6, out: 7.5, ...(transitions ? { transition: 'wipe' } : {}) }
		],
		shots: [
			{
				id: 'hit',
				shot: 'punch',
				from: 4,
				until: 4.4,
				...(transitions ? { transition: { ...push, duration: 0.3 } } : { morph: 0 })
			}
		],
		clips: [
			tag('before', 0, 1.5, '#ff0000'),
			tag('after', 1.5, 3, '#0000ff'),
			{ id: 'band', block: 'Band.svelte', from: 1.5, until: 2, layer: 'behind' },
			{
				...tag('title', 3.2, 3.9, '#ffff00', 200),
				...(transitions ? { transition: 'push' } : {})
			}
		]
	};
}

describe.skipIf(!hasChromium || !hasFfmpeg)('transitions on the program stage', () => {
	let dir: string;
	const file = (name: string) => path.join(dir, `${name}.vf.json`);

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-transitions-stage-'));
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			`color=black:s=${W}x${H}:r=30:d=10`,
			'-vf',
			`geq=lum='if(lt(mod(Y,${ROW}),${BIT}),mod(floor(N/pow(2,floor(X/${BIT}))),2)*255,${GREY})':cb=128:cr=128`,
			'-g',
			'30',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'num.mp4')
		]);
		// The speaker: a white ellipse in the middle of the frame.
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			`color=black:s=${W}x${H}:r=30:d=10`,
			'-vf',
			`geq=lum='if(lt(pow((X-180)/80,2)+pow((Y-400)/180,2),1),255,0)':cb=128:cr=128`,
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'num.matte.mp4')
		]);
		await fs.writeFile(path.join(dir, 'Tag.svelte'), TAG);
		await fs.writeFile(path.join(dir, 'Band.svelte'), BAND);
		for (const [name, size] of [
			['tall', [W, H]],
			['wide', [H, W]]
		] as const) {
			await fs.writeFile(file(name), JSON.stringify(project([...size], true)));
			await fs.writeFile(file(`${name}-cut`), JSON.stringify(project([...size], false)));
		}
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('resolves the windows, the held frames and the warning', async () => {
		const loaded = await loadMotionProject(file('tall'));
		const program = resolveProgram(loaded.project, loaded.inputs);
		expect(program.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(
			program.transitions.map((t) => [t.id, t.startFrame, t.frames, t.direction, t.held])
		).toEqual([
			['c2.transition', 38, 15, 'up', { out: 0, in: 4 }],
			['c3.transition', 78, 24, 'up', { out: 0, in: 0 }],
			['title.transition', 88, 17, 'up', { out: 0, in: 8 }],
			['hit.transition', 116, 9, 'up', { out: 0, in: 0 }]
		]);
		expect(program.diagnostics).toContainEqual({
			level: 'warning',
			item: 'c2',
			field: 'cuts[1].transition',
			message:
				'cut 2: push needs 0.23 s of incoming handle, 0.10 s available; the first frame holds 4 frames.'
		});
		// One segment: no hard cut outside a window.
		expect(program.segments.map((s) => [s.startFrame, s.frames])).toEqual([[0, 135]]);
	});

	it('shows both sides on the first and last frames of a push, holding the edge frame', async () => {
		const loaded = await loadMotionProject(file('tall'));
		const frames = [37, 38, 39, 41, 42, 43, 45, 52, 53];
		const pngs = await captureProgramFrames(loaded, frames);
		const raw = new Map(frames.map((f) => [f, rgba(pngs.get(f)!)]));
		// Linear push up, 15 frames: side a moves up 40 px a frame, side b follows 640 px below it.
		const top = (f: number) => -40 * (f - 37);
		const sides = (f: number) => [
			sideNumber(raw.get(f)!, top(f)),
			sideNumber(raw.get(f)!, top(f) + H)
		];
		// The outgoing cut runs on into its handle (source 30 + f); the incoming holds source
		// frame 0 until its handle starts (3 + f − 45).
		expect(sides(38)).toEqual([68, 0]);
		expect(sides(39)).toEqual([69, 0]);
		expect(sides(41)).toEqual([71, 0]);
		expect(sides(42)).toEqual([72, 0]);
		expect(sides(43)).toEqual([73, 1]);
		expect(sides(45)).toEqual([75, 3]);
		expect(sides(52)).toEqual([82, 10]);
		// Just outside: one side, in place.
		expect(frameNumber(raw.get(37)!, BIT / 2)).toBe(67);
		expect(frameNumber(raw.get(53)!, BIT / 2)).toBe(11);
		// The clip ending on the cut leaves with side a, the one starting on it arrives with b.
		expect(near(at(raw.get(37)!, 330, 120), [255, 0, 0])).toBe(true);
		expect(near(at(raw.get(38)!, 330, 80), [255, 0, 0])).toBe(true);
		expect(near(at(raw.get(38)!, 330, 120), [255, 0, 0])).toBe(false);
		expect(near(at(raw.get(52)!, 330, 160), [0, 0, 255])).toBe(true);
		expect(near(at(raw.get(53)!, 330, 120), [0, 0, 255])).toBe(true);
		// The band behind the speaker starts on the cut: it rides side b, behind b's subject.
		expect(near(at(raw.get(38)!, 20, 290), [0, 255, 0])).toBe(false);
		expect(near(at(raw.get(52)!, 20, 390), [0, 255, 0])).toBe(true);
		expect(near(at(raw.get(52)!, 180, 390), [GREY, GREY, GREY])).toBe(true);
	}, 120_000);

	it('covers the cut of a wipe with the bars, the incoming side hidden before it', async () => {
		const loaded = await loadMotionProject(file('tall'));
		const frames = [78, 86, 89, 90];
		const pngs = await captureProgramFrames(loaded, frames);
		const raw = new Map(frames.map((f) => [f, rgba(pngs.get(f)!)]));
		// The neutral brand's primary and accent, then the third bar's own blue.
		const BARS = { rose: [0xf4, 0x3f, 0x5e], yellow: [0xfb, 0xc4, 0x2d], blue: [0x5b, 0x8c, 0xff] };
		/** Share of sampled pixels per bar colour; anything else is "picture". */
		const colours = (px: Buffer) => {
			const found: Record<string, number> = {};
			const samples = (W / 8) * (H / 8);
			for (let y = 0; y < H; y += 8)
				for (let x = 0; x < W; x += 8) {
					const name = Object.entries(BARS).find(([, c]) => near(at(px, x, y), c, 6))?.[0];
					found[name ?? 'picture'] = (found[name ?? 'picture'] ?? 0) + 1 / samples;
				}
			return found;
		};
		// First frame: the outgoing side, its clip in place, no bar on screen yet.
		expect(frameNumber(raw.get(78)!, BIT / 2)).toBe(3 + 78 - 45);
		expect(near(at(raw.get(78)!, 330, 120), [0, 0, 255])).toBe(true);
		expect(Object.keys(colours(raw.get(78)!))).toEqual(['picture']);
		// Two bars rising over the outgoing side (the title's push starts at 88).
		expect(Object.keys(colours(raw.get(86)!)).sort()).toEqual(['picture', 'rose', 'yellow']);
		expect(frameNumber(raw.get(86)!, BIT / 2)).toBe(3 + 86 - 45);
		// Around the cut the bars cover the whole frame (only their slanted edges blend), the last
		// one (on top) in the middle.
		for (const f of [89, 90]) {
			expect(colours(raw.get(f)!).picture ?? 0, `frame ${f}`).toBeLessThan(0.02);
			expect(near(at(raw.get(f)!, 180, 320), BARS.blue, 6), `frame ${f}`).toBe(true);
		}
	}, 120_000);

	it('draws every frame outside the windows like the same program cut hard', async () => {
		for (const name of ['tall', 'wide']) {
			const with_ = await loadMotionProject(file(name));
			const program = resolveProgram(with_.project, with_.inputs);
			const outside = [...Array(program.frames).keys()].filter(
				(f) => !program.transitions.some((t) => f >= t.startFrame && f < t.startFrame + t.frames)
			);
			expect(outside.length).toBe(135 - 15 - (105 - 78) - 9);
			const a = await captureProgramFrames(with_, outside);
			const b = await captureProgramFrames(await loadMotionProject(file(`${name}-cut`)), outside);
			expect(
				outside.filter((f) => sha1(a.get(f)!) !== sha1(b.get(f)!)),
				name
			).toEqual([]);
			// Inside the windows the picture is not the hard cut's.
			const inside = program.transitions.map((t) => t.cutFrame - 1);
			const a2 = await captureProgramFrames(with_, inside);
			const b2 = await captureProgramFrames(await loadMotionProject(file(`${name}-cut`)), inside);
			for (const f of inside) expect(sha1(a2.get(f)!), `${name} ${f}`).not.toBe(sha1(b2.get(f)!));
		}
	}, 400_000);

	it('gives the same pixels in any seek order, on the segment page and a whole-program page', async () => {
		for (const name of ['tall', 'wide']) {
			const loaded = await loadMotionProject(file(name));
			const all = [...Array(135).keys()];
			const forward = await captureProgramFrames(loaded, all);
			const backward = await captureProgramFrames(loaded, [...all].reverse(), { whole: true });
			const shuffled = await captureProgramFrames(loaded, scrambled(all));
			const differ = all.filter(
				(f) =>
					sha1(forward.get(f)!) !== sha1(backward.get(f)!) ||
					sha1(forward.get(f)!) !== sha1(shuffled.get(f)!)
			);
			expect(differ, name).toEqual([]);
		}
	}, 600_000);

	it('passes check --determinism in both formats', async () => {
		for (const name of ['tall', 'wide']) {
			const results = await checkProgram(await loadMotionProject(file(name)), {
				determinism: true
			});
			expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([['seg1', true, []]]);
		}
	}, 240_000);
});
