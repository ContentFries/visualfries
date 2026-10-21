// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';
import { resolveProgram, type ResolvedProgram } from '../../src/lib/motion/program.js';
import { scrambled } from '../../src/lib/motion/segments.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/**
 * Zoom-through, shape mask, blinds and card on the program stage, in three formats: frames
 * outside their windows are the hard cut's, byte for byte; inside them the stage never shows (a
 * magenta background) and the zoom blur never darkens the frame edges; every frame comes out the
 * same in any seek order.
 */

const FORMATS = {
	wide: { size: [640, 360], footage: 'wide' },
	tall: { size: [360, 640], footage: 'tall' },
	square: { size: [480, 480], footage: 'wide' }
} as const;
type FormatName = keyof typeof FORMATS;
const GREY = 0x80;
const BIT = 24;
const ROW = 40;
/** The stage: magenta, a colour no side, slat, ring or shadow has. */
const STAGE = '#ff00ff';

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}
const rgba = (png: Buffer) =>
	ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');
/** A pixel the magenta stage shows through, even blended. */
const stageShows = ([r, g, b]: number[]) => r - g > 40 && b - g > 40;

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

const tag = (id: string, from: number, until: number, color: string) => ({
	id,
	block: 'Tag.svelte',
	from,
	until,
	props: { x: 100, y: 100, color }
});

const TRANSITIONS = [
	'zoom-through',
	'shape-mask',
	'blinds',
	'card',
	{ type: 'card', params: { side: 'out', motion: 'flip' } },
	{ type: 'shape-mask', params: { shape: 'rect' } }
];

/**
 * Seven cuts of 1.2 s (36 frames) with plenty of handle, each after the first brought in by the
 * next transition (or cut hard). A tag leaves on cut 3, one arrives on cut 5, one leaves on cut 6.
 */
function project(format: FormatName, look: 'num' | 'flat', transitions: boolean) {
	const { size, footage } = FORMATS[format];
	const name = `${look}-${footage}`;
	return {
		size: [...size],
		fps: 30,
		background: STAGE,
		footage: { src: { src: `${name}.mp4`, matte: `${footage}.matte.mp4` } },
		cuts: [...Array(7).keys()].map((i) => ({
			id: `c${i + 1}`,
			source: 'src',
			in: 0.2 + 1.4 * i,
			out: 1.4 + 1.4 * i,
			...(i && transitions ? { transition: TRANSITIONS[i - 1] } : {})
		})),
		clips: [
			tag('leaves', 1.6, 2.4, '#ff0000'),
			tag('arrives', 4.8, 5.6, '#0000ff'),
			tag('flips', 5.2, 6, '#00ff00')
		]
	};
}

describe.skipIf(!hasChromium || !hasFfmpeg)(
	'zoom-through, shape mask, blinds and card on the stage',
	() => {
		let dir: string;
		const file = (format: FormatName, look: 'num' | 'flat', transitions = true) =>
			path.join(dir, `${format}-${look}${transitions ? '' : '-cut'}.vf.json`);
		const load = (format: FormatName, look: 'num' | 'flat', transitions = true) =>
			loadMotionProject(file(format, look, transitions));
		const windows = (p: ResolvedProgram) =>
			p.transitions.flatMap((t) => [...Array(t.frames).keys()].map((k) => t.startFrame + k));

		beforeAll(async () => {
			dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-transitions-more-'));
			for (const [footage, [w, h]] of [
				['wide', [640, 360]],
				['tall', [360, 640]]
			] as const) {
				// Grey with the frame number in binary on a row every 40 px; and flat grey.
				ffmpeg([
					'-f',
					'lavfi',
					'-i',
					`color=black:s=${w}x${h}:r=30:d=11`,
					'-vf',
					`geq=lum='if(lt(mod(Y,${ROW}),${BIT}),mod(floor(N/pow(2,floor(X/${BIT}))),2)*255,${GREY})':cb=128:cr=128`,
					'-g',
					'30',
					'-pix_fmt',
					'yuv420p',
					path.join(dir, `num-${footage}.mp4`)
				]);
				ffmpeg([
					'-f',
					'lavfi',
					'-i',
					`color=c=0x808080:s=${w}x${h}:r=30:d=11`,
					'-pix_fmt',
					'yuv420p',
					path.join(dir, `flat-${footage}.mp4`)
				]);
				// The speaker: a white ellipse, its head a third down the frame.
				ffmpeg([
					'-f',
					'lavfi',
					'-i',
					`color=black:s=${w}x${h}:r=30:d=11`,
					'-vf',
					`geq=lum='if(lt(pow((X-${w / 2})/${w / 6},2)+pow((Y-${h * 0.6})/${h * 0.3},2),1),255,0)':cb=128:cr=128`,
					'-pix_fmt',
					'yuv420p',
					path.join(dir, `${footage}.matte.mp4`)
				]);
			}
			await fs.writeFile(path.join(dir, 'Tag.svelte'), TAG);
			for (const format of Object.keys(FORMATS) as FormatName[])
				for (const look of ['num', 'flat'] as const)
					for (const transitions of [true, false])
						await fs.writeFile(
							file(format, look, transitions),
							JSON.stringify(project(format, look, transitions))
						);
		}, 120_000);
		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		it('resolves every window inside its cuts, without errors or held frames', async () => {
			const loaded = await load('wide', 'num');
			const program = resolveProgram(loaded.project, loaded.inputs);
			expect(program.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
			expect(
				program.transitions.map((t) => [t.type, t.startFrame, t.frames, t.direction, t.held])
			).toEqual([
				['zoom-through', 27, 18, null, { out: 0, in: 0 }],
				['shape-mask', 62, 21, null, { out: 0, in: 0 }],
				['blinds', 96, 24, 'left', { out: 0, in: 0 }],
				['card', 131, 27, 'left', { out: 0, in: 0 }],
				['card', 167, 27, 'left', { out: 0, in: 0 }],
				['shape-mask', 206, 21, null, { out: 0, in: 0 }]
			]);
			// One segment: no hard cut outside a window.
			expect(program.segments).toHaveLength(1);
		});

		it('draws every frame outside the windows like the same program cut hard', async () => {
			for (const format of Object.keys(FORMATS) as FormatName[]) {
				const loaded = await load(format, 'num');
				const program = resolveProgram(loaded.project, loaded.inputs);
				const inside = new Set(windows(program));
				const outside = [...Array(program.frames).keys()].filter((f) => !inside.has(f));
				expect(outside.length).toBe(252 - 138);
				const a = await captureProgramFrames(loaded, outside);
				const b = await captureProgramFrames(await load(format, 'num', false), outside);
				expect(
					outside.filter((f) => sha1(a.get(f)!) !== sha1(b.get(f)!)),
					format
				).toEqual([]);
				// Inside the windows the picture is not the hard cut's.
				const mid = program.transitions.map((t) => t.cutFrame - 1);
				const a2 = await captureProgramFrames(loaded, mid);
				const b2 = await captureProgramFrames(await load(format, 'num', false), mid);
				for (const f of mid) expect(sha1(a2.get(f)!), `${format} ${f}`).not.toBe(sha1(b2.get(f)!));
			}
		}, 600_000);

		it('never shows the stage in a window, at the corners, the edges or inside', async () => {
			for (const format of Object.keys(FORMATS) as FormatName[]) {
				const loaded = await load(format, 'flat');
				const program = resolveProgram(loaded.project, loaded.inputs);
				const frames = windows(program);
				const pngs = await captureProgramFrames(loaded, frames);
				const [w, h] = FORMATS[format].size;
				const leaks: string[] = [];
				const darkEdges: string[] = [];
				const zoom = program.transitions.find((t) => t.type === 'zoom-through')!;
				for (const f of frames) {
					const px = rgba(pngs.get(f)!);
					const at = (x: number, y: number) => [
						...px.subarray((y * w + x) * 4, (y * w + x) * 4 + 3)
					];
					const points: [number, number][] = [];
					// Every pixel of the four edges, and a grid inside.
					for (let x = 0; x < w; x++) points.push([x, 0], [x, h - 1]);
					for (let y = 0; y < h; y++) points.push([0, y], [w - 1, y]);
					for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) points.push([x, y]);
					for (const [x, y] of points)
						if (stageShows(at(x, y))) {
							leaks.push(`f${f} ${x},${y} ${at(x, y)}`);
							break;
						}
					// The zoom blur and its flash never darken the flat grey frame, edges included.
					if (f >= zoom.startFrame && f < zoom.startFrame + zoom.frames)
						for (const [x, y] of points.slice(0, 2 * (w + h))) {
							const [r, g, b] = at(x, y);
							if (Math.min(r, g, b) < GREY - 6) {
								darkEdges.push(`f${f} ${x},${y} ${[r, g, b]}`);
								break;
							}
						}
				}
				expect(leaks, format).toEqual([]);
				expect(darkEdges, format).toEqual([]);
			}
		}, 600_000);

		it('closes the blinds without a seam: on the cut only the first slat to open shows', async () => {
			for (const format of Object.keys(FORMATS) as FormatName[]) {
				const loaded = await load(format, 'flat');
				const program = resolveProgram(loaded.project, loaded.inputs);
				const blinds = program.transitions.find((t) => t.type === 'blinds')!;
				const pngs = await captureProgramFrames(loaded, [blinds.cutFrame]);
				const px = rgba(pngs.get(blinds.cutFrame)!);
				const [w, h] = FORMATS[format].size;
				// Travelling left (columns) or up (rows): the slat at the far right or bottom opens
				// first; every other slat, and every seam between them, still covers the picture.
				const n = format === 'wide' ? 8 : format === 'tall' ? 7 : 6;
				const columns = blinds.direction === 'left';
				expect(blinds.direction).toBe(format === 'tall' ? 'up' : 'left');
				const open = Math.round(((n - 1) * (columns ? w : h)) / n);
				let grey = 0;
				for (let y = 0; y < (columns ? h : open); y++)
					for (let x = 0; x < (columns ? open : w); x++) {
						const [r, g, b] = px.subarray((y * w + x) * 4, (y * w + x) * 4 + 3);
						if (Math.abs(r - GREY) < 16 && Math.abs(g - GREY) < 16 && Math.abs(b - GREY) < 16)
							grey++;
					}
				expect(grey, format).toBe(0);
			}
		}, 120_000);

		it('gives the same pixels in any seek order, on the segment page and a whole-program page', async () => {
			const loaded = await load('square', 'num');
			const program = resolveProgram(loaded.project, loaded.inputs);
			const frames = windows(program);
			const forward = await captureProgramFrames(loaded, frames);
			const backward = await captureProgramFrames(loaded, [...frames].reverse(), { whole: true });
			const shuffled = await captureProgramFrames(loaded, scrambled(frames));
			const differ = frames.filter(
				(f) =>
					sha1(forward.get(f)!) !== sha1(backward.get(f)!) ||
					sha1(forward.get(f)!) !== sha1(shuffled.get(f)!)
			);
			expect(differ).toEqual([]);
		}, 600_000);

		it('passes check --determinism in landscape and portrait', async () => {
			for (const format of ['wide', 'tall'] as const) {
				const results = await checkProgram(await load(format, 'num'), { determinism: true });
				expect(
					results.map((r) => [r.id, r.ok, r.errors]),
					format
				).toEqual([['seg1', true, []]]);
			}
		}, 600_000);
	}
);
