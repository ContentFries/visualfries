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
import {
	cardOutline,
	cardPose,
	transitionProgress
} from '../../src/lib/motion/transitions/index.js';

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
/** Where a 60 × 40 tag sits in the middle of each format. */
const MIDDLE: Record<FormatName, [number, number]> = {
	wide: [290, 160],
	tall: [150, 300],
	square: [210, 220]
};
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
/** Whether (x, y) is inside `polygon` or within `slack` pixels of its edge. */
function nearPolygon(x: number, y: number, polygon: [number, number][], slack: number): boolean {
	let inside = false;
	let near = Infinity;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
		const dx = xj - xi;
		const dy = yj - yi;
		const t = Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / (dx * dx + dy * dy || 1)));
		near = Math.min(near, Math.hypot(x - xi - t * dx, y - yi - t * dy));
	}
	return inside || near <= slack;
}
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

/** Fills its root (a slot) in green. */
const PANEL = `<div class="panel"></div>

<style>
	.panel { position: absolute; inset: 0; background: #00ff00; }
</style>
`;

const tag = (id: string, from: number, until: number, color: string, x = 100, y = 100) => ({
	id,
	block: 'Tag.svelte',
	from,
	until,
	props: { x, y, color }
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
			tag('flips', 5.2, 6, '#00ff00'),
			// In the middle of the frame, under the card while it lands (cut 5 in, cut 6 out).
			tag('under', 4, 4.8, '#ffff00', MIDDLE[format][0], MIDDLE[format][1]),
			tag('over', 6, 6.8, '#00ffff', MIDDLE[format][0], MIDDLE[format][1]),
			// A caption riding neither side, just under the landed outgoing card: in its shadow.
			tag(
				'caption',
				5.5,
				6.5,
				'#ffffff',
				MIDDLE[format][0],
				Math.round(FORMATS[format].size[1] * 0.81) + 4
			)
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
			// A speaker near the right edge of the frame.
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				'color=black:s=640x360:r=30:d=11',
				'-vf',
				`geq=lum='if(lt(pow((X-600)/60,2)+pow((Y-230)/120,2),1),255,0)':cb=128:cr=128`,
				'-pix_fmt',
				'yuv420p',
				path.join(dir, 'edge.matte.mp4')
			]);
			await fs.writeFile(path.join(dir, 'Tag.svelte'), TAG);
			await fs.writeFile(path.join(dir, 'Panel.svelte'), PANEL);
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

		it('closes the blinds without a seam, and changes the picture behind them whole', async () => {
			for (const format of Object.keys(FORMATS) as FormatName[]) {
				const loaded = await load(format, 'flat');
				const program = resolveProgram(loaded.project, loaded.inputs);
				const blinds = program.transitions.find((t) => t.type === 'blinds')!;
				expect(blinds.direction).toBe(format === 'tall' ? 'up' : 'left');
				// The frames either side of the change: every slat closed, no seam, no picture.
				const frames = [blinds.cutFrame - 1, blinds.cutFrame];
				const pngs = await captureProgramFrames(loaded, frames);
				const [w, h] = FORMATS[format].size;
				for (const f of frames) {
					const px = rgba(pngs.get(f)!);
					let picture = 0;
					for (let y = 0; y < h; y++)
						for (let x = 0; x < w; x++) {
							const [r, g, b] = px.subarray((y * w + x) * 4, (y * w + x) * 4 + 3);
							if (Math.abs(r - g) < 24 && Math.abs(g - b) < 24) picture++;
						}
					expect(picture, `${format} f${f}`).toBe(0);
				}
			}
		}, 120_000);

		it('keeps the clips riding the side under a shape or card off it', async () => {
			for (const format of Object.keys(FORMATS) as FormatName[]) {
				const loaded = await load(format, 'flat');
				const program = resolveProgram(loaded.project, loaded.inputs);
				const [, mask, , cardIn, cardOut] = program.transitions;
				expect([mask.type, cardIn.type, cardOut.type]).toEqual(['shape-mask', 'card', 'card']);
				// The red tag leaves with the outgoing side of the shape mask: on its last frame the
				// shape covers the frame, and the tag with it. The yellow one leaves as the card lands
				// over it; the cyan one arrives under the outgoing card. Hues, as the sides dim.
				const red = ([r, g, b]: number[]) => r > 120 && g < 50 && b < 50;
				const yellow = ([r, g, b]: number[]) => r > 90 && g > 90 && b < 40 && Math.abs(r - g) < 30;
				const cyan = ([r, g, b]: number[]) => g > 90 && b > 90 && r < 40;
				const checks: [number, (p: number[]) => boolean, string][] = [
					[mask.startFrame + mask.frames - 1, red, 'red'],
					[cardIn.cutFrame, yellow, 'yellow'],
					[cardOut.cutFrame, cyan, 'cyan']
				];
				const pngs = await captureProgramFrames(
					loaded,
					checks.map(([f]) => f)
				);
				const [w, h] = FORMATS[format].size;
				for (const [f, hue, colour] of checks) {
					const px = rgba(pngs.get(f)!);
					let seen = 0;
					for (let i = 0; i < w * h; i++) if (hue([...px.subarray(i * 4, i * 4 + 3)])) seen++;
					expect(seen, `${format} f${f} ${colour}`).toBe(0);
				}
			}
		}, 300_000);

		it('lays the shadow of an outgoing card right up to it and under the captions', async () => {
			for (const format of Object.keys(FORMATS) as FormatName[]) {
				const loaded = await load(format, 'flat');
				const program = resolveProgram(loaded.project, loaded.inputs);
				const cardOut = program.transitions[4];
				expect(cardOut.params).toEqual({ side: 'out', motion: 'flip' });
				const pngs = await captureProgramFrames(loaded, [cardOut.cutFrame]);
				const px = rgba(pngs.get(cardOut.cutFrame)!);
				const [w, h] = FORMATS[format].size;
				// Landed: 62 % of the frame, centred. Down a column through its middle, out of its
				// bottom edge into its shadow: no pixel just outside the edge is lighter than the
				// shadow a few pixels further out.
				const bottom = Math.round(h / 2 + (0.62 * h) / 2);
				const x = Math.round(w / 2) + 7;
				const at = (y: number) => px[(y * w + x) * 4 + 1];
				const edge = Math.max(at(bottom), at(bottom + 1));
				expect(
					edge,
					`${format}: ${[...Array(10).keys()].map((k) => at(bottom - 2 + k))}`
				).toBeLessThanOrEqual(at(bottom + 5) + 3);
				// The caption is above the shadow: as white as ever.
				const [cx, cy] = [MIDDLE[format][0] + 30, Math.round(h * 0.81) + 24];
				expect([...px.subarray((cy * w + cx) * 4, (cy * w + cx) * 4 + 3)], format).toEqual([
					255, 255, 255
				]);
			}
		}, 120_000);

		it('keeps a slotted clip on the card, in and out, sliding and flipping', async () => {
			// A strip shot all through; a panel clip in its slot arrives on cuts 2 and 4 and leaves
			// on cuts 3 and 5, each a card: in, out, in flipping, out flipping.
			const cards = [
				{ type: 'card' },
				{ type: 'card', params: { side: 'out' } },
				{ type: 'card', params: { motion: 'flip' } },
				{ type: 'card', params: { side: 'out', motion: 'flip' } }
			];
			const json = {
				...project('wide', 'num', false),
				cuts: [...Array(5).keys()].map((i) => ({
					source: 'src',
					in: 0.2 + 1.4 * i,
					out: 1.4 + 1.4 * i,
					...(i ? { transition: cards[i - 1] } : {})
				})),
				shots: [{ shot: 'strip', from: 0, until: 6, morph: 0 }],
				clips: [
					{ id: 'p2', block: 'Panel.svelte', from: 1.2, until: 1.9, slot: 'panel' },
					{ id: 'p3', block: 'Panel.svelte', from: 1.9, until: 2.4, slot: 'panel' },
					{ id: 'p4', block: 'Panel.svelte', from: 3.6, until: 4.2, slot: 'panel' },
					{ id: 'p5', block: 'Panel.svelte', from: 4.2, until: 4.8, slot: 'panel' }
				]
			};
			const where = path.join(dir, 'slot-card.vf.json');
			await fs.writeFile(where, JSON.stringify(json));
			const loaded = await loadMotionProject(where);
			const program = resolveProgram(loaded.project, loaded.inputs);
			expect(program.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
			const [w, h] = [640, 360];
			const unit = Math.min(w, h) / 1080;
			for (const t of program.transitions) {
				const frames = [...Array(t.frames).keys()].map((k) => t.startFrame + k);
				const pngs = await captureProgramFrames(loaded, frames);
				const backwards = t.params.side === 'out';
				for (const f of frames) {
					const p = transitionProgress(t, f);
					const options = {
						motion: (t.params.motion ?? 'slide') as 'slide' | 'flip',
						direction: t.direction as 'left',
						size: [w, h] as [number, number],
						scale: 0.62,
						radius: 44 * unit
					};
					const pose = cardPose(backwards ? 1 - p : p, options);
					if (backwards) Object.assign(pose, { x: -pose.x, y: -pose.y, turn: -pose.turn });
					const outline = cardOutline(pose, t.direction as 'left', [w, h], unit);
					const px = rgba(pngs.get(f)!);
					let green = 0;
					const loose: string[] = [];
					for (let y = 0; y < h; y++)
						for (let x = 0; x < w; x++) {
							const [r, g, b] = px.subarray((y * w + x) * 4, (y * w + x) * 4 + 3);
							if (!(g > 180 && r < 80 && b < 80)) continue;
							green++;
							if (!nearPolygon(x + 0.5, y + 0.5, outline, 2)) loose.push(`${x},${y}`);
						}
					expect(loose.slice(0, 3), `${t.id} ${JSON.stringify(t.params)} f${f}`).toEqual([]);
					// Once the card is on the frame and facing the camera, the panel shows on it.
					if (!pose.x && !pose.y && Math.abs(pose.turn) < 60)
						expect(green, `${t.id} f${f}`).toBeGreaterThan(0);
				}
			}
		}, 600_000);

		it('never shows the stage around a zoom-through toward a point near an edge or corner', async () => {
			const points = [
				[0.02, 0.97],
				[0.98, 0.03],
				[0.02, 0.03],
				[0.98, 0.97],
				[0.5, 0.02]
			];
			for (const size of [
				[640, 360],
				[1001, 563],
				[563, 1001]
			] as const) {
				const footage = size[0] > size[1] ? 'wide' : 'tall';
				const json = {
					size: [...size],
					fps: 30,
					background: STAGE,
					footage: {
						src: { src: `flat-${footage}.mp4`, matte: `${footage}.matte.mp4` },
						// The speaker at the right edge, for "face".
						edge: { src: 'flat-wide.mp4', matte: 'edge.matte.mp4' }
					},
					cuts: [...Array(7).keys()].map((i) => ({
						source: i === 6 ? 'edge' : 'src',
						in: 0.2 + 1.4 * i,
						out: 1.4 + 1.4 * i,
						...(i
							? {
									transition: {
										type: 'zoom-through',
										params: { at: i <= points.length ? points[i - 1] : 'face' }
									}
								}
							: {})
					}))
				};
				const where = path.join(dir, `zoom-edges-${size.join('x')}.vf.json`);
				await fs.writeFile(where, JSON.stringify(json));
				const loaded = await loadMotionProject(where);
				const program = resolveProgram(loaded.project, loaded.inputs);
				expect(program.transitions).toHaveLength(6);
				const frames = windows(program);
				const pngs = await captureProgramFrames(loaded, frames);
				const [w, h] = size;
				const leaks: string[] = [];
				for (const f of frames) {
					const px = rgba(pngs.get(f)!);
					for (let i = 0; i < w * h; i++)
						if (stageShows([...px.subarray(i * 4, i * 4 + 3)])) {
							leaks.push(`f${f} ${i % w},${Math.floor(i / w)}`);
							break;
						}
				}
				expect(leaks, size.join('x')).toEqual([]);
			}
		}, 600_000);

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
