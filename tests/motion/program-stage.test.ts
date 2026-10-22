// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import {
	captureProgramFrames,
	checkProgram,
	renderProgramStills
} from '../../src/lib/motion/program-node.js';
import { resolveProgram, type ProgramTransition } from '../../src/lib/motion/program.js';
import {
	clipFrameAt,
	clipShowRange,
	scrambled,
	segmentStage,
	type StageClip
} from '../../src/lib/motion/segments.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

const transition = (t: Partial<ProgramTransition>): ProgramTransition => ({
	id: 'x.transition',
	owner: 'x',
	kind: 'cut',
	outgoing: null,
	type: 'push',
	startFrame: 0,
	frames: 10,
	cutFrame: 5,
	align: 'center',
	direction: null,
	ease: null,
	params: {},
	sound: null,
	native: null,
	held: { out: 0, in: 0 },
	...t
});

describe('segment data (pure)', () => {
	const clip = { id: 'c', startFrame: 20, frames: 10 };

	it('shows a clip inside its window and hides it outside', () => {
		const show = clipShowRange(clip, []);
		expect(show).toEqual({ from: 20, until: 30 });
		const data = { ...clip, show } as StageClip;
		expect([19, 20, 25, 29, 30].map((f) => clipFrameAt(data, f))).toEqual([null, 0, 5, 9, null]);
	});

	it('holds the first frame of an incoming and the last of an outgoing clip in a window', () => {
		// A cut transition into frame 20 (the clip's first) and one out of it at frame 30.
		const into = transition({ startFrame: 16, frames: 8, cutFrame: 20 });
		const out = transition({ id: 'y.transition', startFrame: 27, frames: 6, cutFrame: 30 });
		const show = clipShowRange(clip, [into, out]);
		expect(show).toEqual({ from: 16, until: 33 });
		const data = { ...clip, show } as StageClip;
		expect([15, 16, 19, 20, 29, 30, 32, 33].map((f) => clipFrameAt(data, f))).toEqual([
			null,
			0,
			0,
			0,
			9,
			9,
			9,
			null
		]);
		// The clip's own transition starts before its first frame, which holds.
		const own = transition({ kind: 'clip', owner: 'c', startFrame: 14, frames: 12, cutFrame: 20 });
		expect(clipShowRange(clip, [own])).toEqual({ from: 14, until: 30 });
		// Someone else's clip transition does not touch it.
		expect(clipShowRange(clip, [{ ...own, owner: 'd' }])).toEqual({ from: 20, until: 30 });
	});

	it('scrambles a list into a fixed permutation', () => {
		const list = [...Array(17).keys()];
		const once = scrambled(list);
		expect(once).toEqual(scrambled(list));
		expect([...once].sort((a, b) => a - b)).toEqual(list);
		expect(once).not.toEqual(list);
		expect(once).not.toEqual([...list].reverse());
	});
});

// ---------------------------------------------------------------- the fixture program

/** Frame number bits: one 24 px column each along the top, white = 1. */
const W = 360;
const H = 640;
const BIT = 24;
const BITS = 10;
const GREY = 96;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** RGBA pixels of a PNG. */
function rgba(png: Buffer): Buffer {
	return ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
}
const at = (raw: Buffer, x: number, y: number) => [
	...raw.subarray((y * W + x) * 4, (y * W + x) * 4 + 3)
];
/** The source frame number the plate shows. */
function frameNumber(raw: Buffer): number {
	let n = 0;
	for (let bit = 0; bit < BITS; bit++)
		if (raw[((BIT / 2) * W + bit * BIT + BIT / 2) * 4] > 128) n += 1 << bit;
	return n;
}
const near = (rgb: number[], want: number[], tolerance = 24) =>
	rgb.every((v, i) => Math.abs(v - want[i]) <= tolerance);
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

/** A word on a red band behind the speaker, sliding in from the left on a timeline. */
const BEHIND = `<script>
	import { useClip, useTimeline } from 'visualfries/motion';
	const clip = useClip();
	useTimeline(({ tl, q }) => {
		tl.fromTo(q('.word'), { x: -120 }, { x: 0, duration: 0.5, ease: 'power2.out' }, 0);
	});
</script>

<div class="band"><span class="word">{clip.props.text}</span></div>

<style>
	.band { position: absolute; left: 0; right: 0; top: 300px; height: 60px; background: #ff0000; }
	.word { display: inline-block; font: 900 48px sans-serif; color: #ffffff; padding-left: 280px; }
</style>
`;

describe.skipIf(!hasChromium || !hasFfmpeg)(
	'program stage (2 cuts, captions, a word behind)',
	() => {
		let dir: string;
		let file: string;

		beforeAll(async () => {
			dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-program-stage-'));
			file = path.join(dir, 'program.vf.json');
			// 300 frames; a grey picture with the frame number in binary along the top.
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				`color=black:s=${W}x${H}:r=30:d=10`,
				'-vf',
				`geq=lum='if(lt(Y,${BIT}),mod(floor(N/pow(2,floor(X/${BIT}))),2)*255,${GREY})':cb=128:cr=128`,
				'-g',
				'30',
				'-pix_fmt',
				'yuv420p',
				path.join(dir, 'num.mp4')
			]);
			// The matte: a white ellipse (the "speaker") in the middle of the frame.
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
			const words = [
				['First', 1.1, 1.5],
				['cut', 1.6, 2.0],
				['second', 6.1, 6.6],
				['take', 6.8, 7.2]
			].map(([text, start, end]) => ({ text, start, end }));
			await fs.writeFile(path.join(dir, 'num.transcript.json'), JSON.stringify({ words }));
			await fs.writeFile(path.join(dir, 'Behind.svelte'), BEHIND);
			await fs.writeFile(
				file,
				JSON.stringify({
					size: [W, H],
					fps: 30,
					background: '#000000',
					footage: {
						num: { src: 'num.mp4', matte: 'num.matte.mp4', transcript: 'num.transcript.json' }
					},
					// Program frames 0–44 show source 30–74, 45–89 show source 180–224.
					cuts: [
						{ source: 'num', in: 1, out: 2.5 },
						{ source: 'num', in: 6, out: 7.5 }
					],
					clips: [
						{
							id: 'captions',
							block: '@visualfries/captions',
							from: 0,
							until: 3,
							words: { captions: 'clip' },
							props: { preset: 'bold', y: 0.88, size: 36 }
						},
						// Frames 30–59: across the hard cut, so both segments mount it.
						{
							id: 'word',
							block: 'Behind.svelte',
							from: 1,
							until: 2,
							layer: 'behind',
							props: { text: 'BEHIND' }
						}
					]
				})
			);
		});
		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		it('resolves into two segments split at the hard cut', async () => {
			const loaded = await loadMotionProject(file);
			const program = resolveProgram(loaded.project, loaded.inputs);
			expect(program.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
			expect(program.segments.map((s) => [s.startFrame, s.frames])).toEqual([
				[0, 45],
				[45, 45]
			]);
			const stage = segmentStage(program, program.segments[0], { frames: {}, map: null });
			expect(stage.clips.map((c) => [c.id, c.show])).toEqual([
				['captions', { from: 0, until: 90 }],
				['word', { from: 30, until: 60 }]
			]);
			expect(stage.clips[0]).not.toHaveProperty('footage');
		});

		it('draws the cut list, the word behind the speaker and the captions', async () => {
			const loaded = await loadMotionProject(file);
			const frames = [0, 10, 29, 30, 44, 45, 59, 60, 89];
			const pngs = await captureProgramFrames(loaded, frames);
			const raw = new Map(frames.map((f) => [f, rgba(pngs.get(f)!)]));
			// Program frame → source frame through the cut list.
			expect(frames.map((f) => frameNumber(raw.get(f)!))).toEqual(
				frames.map((f) => (f < 45 ? 30 + f : 180 + f - 45))
			);
			for (const f of frames) {
				const px = raw.get(f)!;
				const on = f >= 30 && f < 60;
				// Beside the speaker: the band while the word clip is on screen, the footage otherwise.
				expect(
					near(at(px, 20, 330), on ? [255, 0, 0] : [GREY, GREY, GREY]),
					`frame ${f} beside`
				).toBe(true);
				// On the speaker the subject covers the band.
				expect(near(at(px, 180, 330), [GREY, GREY, GREY]), `frame ${f} on the speaker`).toBe(true);
			}
			// Captions while a word is said (program 0.1–0.5 s "First"), none in the silence before.
			const captionRows = (px: Buffer) => {
				let lit = 0;
				for (let y = 520; y < 600; y++)
					for (let x = 0; x < W; x += 2) if (at(px, x, y)[0] > 200 && at(px, x, y)[2] > 200) lit++;
				return lit;
			};
			expect(captionRows(raw.get(10)!)).toBeGreaterThan(50);
		}, 120_000);

		it('gives the same pixels in any seek order, on segment pages and a whole-program page', async () => {
			const loaded = await loadMotionProject(file);
			const all = [...Array(90).keys()];
			const forward = await captureProgramFrames(loaded, all);
			const backward = await captureProgramFrames(loaded, [...all].reverse(), { whole: true });
			const shuffled = await captureProgramFrames(loaded, scrambled(all));
			const differ = all.filter(
				(f) =>
					sha1(forward.get(f)!) !== sha1(backward.get(f)!) ||
					sha1(forward.get(f)!) !== sha1(shuffled.get(f)!)
			);
			expect(differ).toEqual([]);
			// The word slides: frames inside its window are not all the same picture.
			expect(new Set([30, 35, 40].map((f) => sha1(forward.get(f)!))).size).toBe(3);
		}, 240_000);

		it('passes check --determinism, one result per segment', async () => {
			const loaded = await loadMotionProject(file);
			const results = await checkProgram(loaded, { determinism: true });
			expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([
				['seg1', true, []],
				['seg2', true, []]
			]);
			const only = await checkProgram(loaded, { clips: ['word'] });
			expect(only.map((r) => r.id)).toEqual(['seg1', 'seg2']);
		}, 240_000);

		it('takes stills at program moments and clip moments', async () => {
			const loaded = await loadMotionProject(file);
			const stills = await renderProgramStills(loaded, [
				{ at: 'f50' },
				{ at: '1.5s' },
				{ clip: 'word', at: 'start' },
				{ at: 'end' }
			]);
			expect(stills.map((s) => s.frame)).toEqual([50, 45, 30, 89]);
			expect(stills.every((s) => s.png.length > 1000)).toBe(true);
		}, 120_000);

		it('holds the last frame of a cut with a hold, deterministically', async () => {
			const held = path.join(dir, 'held.vf.json');
			const project = JSON.parse(await fs.readFile(file, 'utf8'));
			// Program frames 0–44 show source 30–74, 45–59 hold source 74, 60–104 show 180–224.
			project.cuts[0].hold = 0.5;
			project.clips[0].until = 'end';
			await fs.writeFile(held, JSON.stringify(project));
			const loaded = await loadMotionProject(held);
			const program = resolveProgram(loaded.project, loaded.inputs);
			expect(program.frames).toBe(105);
			expect(program.clips[0].frames).toBe(105);
			const frames = [44, 45, 52, 59, 60];
			const pngs = await captureProgramFrames(loaded, frames);
			expect(frames.map((f) => frameNumber(rgba(pngs.get(f)!)))).toEqual([74, 74, 74, 74, 180]);
			const results = await checkProgram(loaded, { determinism: true });
			expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([
				['seg1', true, []],
				['seg2', true, []]
			]);
		}, 240_000);
	}
);
