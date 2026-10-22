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

/** Landscape footage: a grey room with a light grey "head" swaying around x = 400. */
const SW = 640;
const SH = 360;
const HEAD = `(pow((X-(400+30*sin(2*PI*N/60)))/50,2)+pow((Y-200)/110,2))`;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** RGBA pixels of a PNG, with its width. */
function rgba(png: Buffer, width: number) {
	const raw = ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
	const at = (x: number, y: number) => [
		...raw.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)
	];
	return { raw, at, height: raw.length / 4 / width };
}
const isHead = (rgb: number[]) => rgb.every((v) => v > 150 && v < 230);
const isPanel = ([r, g, b]: number[]) => b > 200 && r < 100 && g < 140;
const isWord = ([r, g, b]: number[]) => r > 200 && g > 170 && b < 60;
const isCard = ([r, g, b]: number[]) => g > 180 && r < 80 && b < 80;
/** The neutral brand's primary (#f43f5e): the window's ring. */
const isRing = ([r, g, b]: number[]) => r > 200 && g < 110 && b > 60 && b < 140;
/** The fill around a window: without a brand, the project background (black here). */
const isFill = (rgb: number[]) => rgb.every((v) => v < 8);
const grey = (rgb: number[]) => Math.round((rgb[0] + rgb[1] + rgb[2]) / 3);
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

/** The widest run of head pixels in any row inside `x0`–`x1`. */
function headWidth(px: ReturnType<typeof rgba>, x0: number, x1: number): number {
	let best = 0;
	for (let y = 0; y < px.height; y += 2) {
		let run = 0;
		for (let x = x0; x < x1; x++) {
			run = isHead(px.at(x, y)) ? run + 1 : 0;
			best = Math.max(best, run);
		}
	}
	return best;
}

const solid = (color: string) =>
	`<div style="position:absolute;inset:0;background:${color}"></div>`;

describe.skipIf(!hasChromium || !hasFfmpeg)(
	'window, behind and whip on the stage (window → behind → whip → punch)',
	() => {
		let dir: string;
		let portrait: string;
		let landscape: string;

		beforeAll(async () => {
			dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-shots-more-'));
			for (const [file, lum] of [
				['talk.mp4', `if(lt(${HEAD},1),190,96)`],
				['talk.matte.mp4', `if(lt(${HEAD},1),255,0)`]
			])
				ffmpeg([
					'-f',
					'lavfi',
					'-i',
					`color=black:s=${SW}x${SH}:r=30:d=5`,
					'-vf',
					`geq=lum='${lum}':cb=128:cr=128`,
					'-g',
					'30',
					'-pix_fmt',
					'yuv420p',
					path.join(dir, file)
				]);
			await fs.writeFile(path.join(dir, 'Panel.svelte'), solid('#2050ff'));
			await fs.writeFile(path.join(dir, 'Word.svelte'), solid('#ffd000'));
			await fs.writeFile(path.join(dir, 'Card.svelte'), solid('#10d040'));
			const project = (size: [number, number]) => ({
				size,
				fps: 30,
				background: '#000000',
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk' }],
				shots: [
					{
						id: 'win',
						shot: 'window',
						from: 0.3,
						until: 1.4,
						// Keys move the camera inside the window.
						keys: [
							{ at: 0, scale: 1 },
							{ at: { moment: 'end' }, scale: 2, ease: 'none' }
						]
					},
					{ id: 'word', shot: 'behind', from: 2, until: 2.9 },
					{ id: 'away', shot: 'whip', from: 3, until: 3.8 },
					{ id: 'hit', shot: 'punch', from: 4.3, until: 4.8 }
				],
				clips: [
					{ id: 'panel', block: 'Panel.svelte', from: 0.3, until: 2, slot: 'panel' },
					{ id: 'fix', block: 'Word.svelte', from: 2, until: 2.9, slot: 'word', layer: 'behind' },
					{ id: 'card', block: 'Card.svelte', from: 3, until: 4.2, slot: 'card' }
				]
			});
			portrait = path.join(dir, 'portrait.vf.json');
			landscape = path.join(dir, 'landscape.vf.json');
			await fs.writeFile(portrait, JSON.stringify(project([360, 640])));
			await fs.writeFile(landscape, JSON.stringify(project([640, 360])));
		});
		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		it('resolves the shot track and its events', async () => {
			const loaded = await loadMotionProject(landscape);
			const program = resolveProgram(loaded.project, loaded.inputs);
			expect(program.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
			expect(program.shots.map((s) => [s.id, s.startFrame, s.frames, s.morphFrames])).toEqual([
				['full-0', 0, 9, 0],
				['win', 9, 33, 21],
				['full-42', 42, 18, 18],
				['word', 60, 27, 9],
				['full-87', 87, 3, 3],
				['away', 90, 24, 13],
				['full-114', 114, 15, 13],
				['hit', 129, 15, 5],
				['full-144', 144, 6, 6]
			]);
			expect(program.events).toEqual([
				{ kind: 'shot', frame: 19, owner: 'win' },
				{ kind: 'shot', frame: 51, owner: 'full-42' },
				{ kind: 'whip', frame: 96, owner: 'away' },
				{ kind: 'whip', frame: 120, owner: 'full-114' },
				{ kind: 'punch', frame: 129, owner: 'hit' }
			]);
		});

		it('draws the window, the room behind the word and the whip to the card (16:9)', async () => {
			const loaded = await loadMotionProject(landscape);
			const frames = [0, 30, 41, 75, 96, 105, 135];
			const pngs = await captureProgramFrames(loaded, frames);
			const px = new Map(frames.map((f) => [f, rgba(pngs.get(f)!, SW)]));
			const full = px.get(0)!;
			expect(isHead(full.at(400, 200))).toBe(true);

			// Window: 192 × 108 at (430, 234), a 1 px ring around it, the panel on the left
			// (0–412) and the fill between them and above the window.
			const win = px.get(30)!;
			expect(isPanel(win.at(10, 10)) && isPanel(win.at(405, 350))).toBe(true);
			expect(isPanel(win.at(420, 300))).toBe(false);
			expect(isFill(win.at(520, 100)), 'fill above the window').toBe(true);
			expect(isRing(win.at(429, 290)) && isRing(win.at(526, 233)), 'ring').toBe(true);
			expect(isFill(win.at(526, 233))).toBe(false);
			// The head is framed inside the window.
			const inWindow = headWidth(win, 430, 622);
			expect(inWindow).toBeGreaterThan(20);
			expect(headWidth(win, 0, 425)).toBe(0);
			// Keys scale the camera inside the window (1.64 → 1.97 times), the window stays.
			const keyed = px.get(41)!;
			expect(headWidth(keyed, 430, 622) / inWindow).toBeGreaterThan(1.12);
			expect(isRing(keyed.at(429, 290)) && isFill(keyed.at(520, 100))).toBe(true);

			// Behind: the room dims (96 → about 43) and blurs, the word sits in front of it, the head
			// (cut out by the matte) in front of the word.
			const behind = px.get(75)!;
			expect(grey(behind.at(30, 330))).toBeLessThan(60);
			expect(grey(behind.at(30, 330))).toBeGreaterThan(25);
			// The blur keeps the frame's edges and corners filled.
			for (const [x, y] of [
				[0, 0],
				[639, 359],
				[0, 359],
				[639, 180]
			])
				expect(grey(behind.at(x, y)), `room at ${x},${y}`).toBeGreaterThan(25);
			expect(isWord(behind.at(60, 120)), 'word beside the head').toBe(true);
			expect(isHead(behind.at(400, 120)), 'head over the word').toBe(true);
			expect(isHead(behind.at(400, 260)), 'head below the word').toBe(true);
			// The word slot ends below the face; the dimmed room shows under it.
			expect(isWord(behind.at(60, 240))).toBe(false);

			// Whip, halfway: the camera leaves to the left, the card comes in from the right, both
			// smeared along the move.
			const mid = px.get(96)!;
			const row = [...Array(SW).keys()].map((x) => mid.at(x, 300));
			const firstCard = row.findIndex(isCard);
			expect(firstCard).toBeGreaterThan(100);
			expect(firstCard).toBeLessThan(540);
			// Motion blur: a soft edge many pixels wide between the room and the card.
			const soft = row.filter(([r, g, b]) => g > 110 && g < 175 && r < 110 && b < 110).length;
			expect(soft).toBeGreaterThan(8);
			// Settled: the card fills the frame, nothing of the camera is left.
			const card = px.get(105)!;
			expect([5, 320, 634].every((x) => isCard(card.at(x, 180)))).toBe(true);

			// Back from the whip into the punch: about 1.45 times wider than full.
			const ratio = headWidth(px.get(135)!, 0, SW) / headWidth(full, 0, SW);
			expect(ratio).toBeGreaterThan(1.38);
			expect(ratio).toBeLessThan(1.52);
		}, 120_000);

		it('keeps the 9:16 window and panel inside the safe area', async () => {
			const loaded = await loadMotionProject(portrait);
			const pngs = await captureProgramFrames(loaded, [30, 105]);
			const win = rgba(pngs.get(30)!, 360);
			// Safe area 96–416 at 360 × 640: window 158 × 158 at (101, 96), panel 272–416.
			expect(headWidth(win, 101, 259)).toBeGreaterThan(15);
			expect(isRing(win.at(100, 150))).toBe(true);
			expect(isFill(win.at(30, 150)) && isFill(win.at(180, 60))).toBe(true);
			expect(isPanel(win.at(180, 276)) && isPanel(win.at(10, 412))).toBe(true);
			expect(isPanel(win.at(180, 264))).toBe(false);
			// The caption band below the safe area stays clear.
			expect(isFill(win.at(180, 500)) && isFill(win.at(180, 630))).toBe(true);
			const card = rgba(pngs.get(105)!, 360);
			expect([5, 320, 634].every((y) => isCard(card.at(180, y)))).toBe(true);
		}, 120_000);

		it('gives the same pixels in any seek order, on the segment page and a whole-program page', async () => {
			for (const file of [landscape, portrait]) {
				const loaded = await loadMotionProject(file);
				const all = [...Array(150).keys()];
				const forward = await captureProgramFrames(loaded, all);
				const backward = await captureProgramFrames(loaded, [...all].reverse(), { whole: true });
				const shuffled = await captureProgramFrames(loaded, scrambled(all));
				const differ = all.filter(
					(f) =>
						sha1(forward.get(f)!) !== sha1(backward.get(f)!) ||
						sha1(forward.get(f)!) !== sha1(shuffled.get(f)!)
				);
				expect(differ, file).toEqual([]);
				// The morphs move: consecutive frames inside them differ.
				for (const f of [12, 45, 62, 92, 99, 116, 125])
					expect(sha1(forward.get(f)!), `frame ${f}`).not.toBe(sha1(forward.get(f + 1)!));
			}
		}, 600_000);

		it('passes check --determinism in both formats', async () => {
			for (const file of [portrait, landscape]) {
				const results = await checkProgram(await loadMotionProject(file), { determinism: true });
				expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([['seg1', true, []]]);
			}
		}, 240_000);
	}
);

/** A uniform footage file (and a matte) of `W`×`H` with `lum` drawn by `geq`. */
function makeVideo(file: string, size: [number, number], lum: string) {
	ffmpeg([
		'-f',
		'lavfi',
		'-i',
		`color=black:s=${size[0]}x${size[1]}:r=30:d=3`,
		'-vf',
		`geq=lum='${lum}':cb=128:cr=128`,
		'-g',
		'30',
		'-pix_fmt',
		'yuv420p',
		file
	]);
}

describe.skipIf(!hasChromium || !hasFfmpeg)('edges and seams of behind and whip', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-shots-edges-'));
		// A head and a torso that reaches the bottom edge of the footage.
		const body = `lt(${HEAD},1)+(between(X,300,500)*gte(Y,250))`;
		makeVideo(path.join(dir, 'talk.mp4'), [SW, SH], `if(${body},190,96)`);
		makeVideo(path.join(dir, 'talk.matte.mp4'), [SW, SH], `if(${body},255,0)`);
		makeVideo(path.join(dir, 'grey.mp4'), [SW, SH], '200');
		await fs.writeFile(path.join(dir, 'White.svelte'), solid('#ffffff'));
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const write = async (name: string, json: object) => {
		const file = path.join(dir, `${name}.vf.json`);
		await fs.writeFile(file, JSON.stringify({ fps: 30, background: '#000000', ...json }));
		return loadMotionProject(file);
	};

	it('keeps the speaker solid where it touches the frame edge in a dimmed room', async () => {
		for (const size of [
			[640, 360],
			[360, 640]
		] as [number, number][]) {
			const loaded = await write(`behind-${size[0]}`, {
				size,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk' }],
				shots: [{ id: 'word', shot: 'behind', from: 0.5, until: 2.5 }]
			});
			const px = rgba((await captureProgramFrames(loaded, [45])).get(45)!, size[0]);
			const x = size[0] / 2;
			const inside = grey(px.at(x, size[1] - 20));
			expect(inside, `torso at ${size}`).toBeGreaterThan(170);
			// The last rows stay the torso's colour: no dark band where the matte meets the edge.
			for (let y = size[1] - 8; y < size[1]; y++)
				expect(Math.abs(grey(px.at(x, y)) - inside), `row ${y} at ${size}`).toBeLessThan(6);
			// The room around it is dimmed.
			expect(grey(px.at(10, size[1] - 4))).toBeLessThan(60);
		}
	}, 120_000);

	it('never lets the fill show through the seam between the footage and the card', async () => {
		for (const size of [
			[640, 360],
			[360, 640]
		] as [number, number][]) {
			const loaded = await write(`whip-${size[0]}`, {
				size,
				footage: { grey: { src: 'grey.mp4' } },
				cuts: [{ source: 'grey' }],
				shots: [{ id: 'away', shot: 'whip', from: 0.5, until: 1.5 }],
				clips: [{ id: 'card', block: 'White.svelte', from: 0.5, until: 2, slot: 'card' }]
			});
			// The whip out (15–28) and the whip back (45–58), every frame.
			const frames = [...Array(14).keys()].flatMap((k) => [15 + k, 45 + k]);
			const pngs = await captureProgramFrames(loaded, frames);
			let blurred = 0;
			for (const f of frames) {
				const px = rgba(pngs.get(f)!, size[0]);
				const line =
					size[0] > size[1]
						? [...Array(size[0]).keys()].map((x) => grey(px.at(x, size[1] / 2)))
						: [...Array(size[1]).keys()].map((y) => grey(px.at(size[0] / 2, y)));
				// Footage 200, card 255, fill 0: nothing under the lighter of the two minus noise.
				expect(Math.min(...line), `frame ${f} at ${size}`).toBeGreaterThanOrEqual(196);
				if (line.some((v) => v > 205 && v < 250)) blurred++;
			}
			// The card smears over the footage while it moves.
			expect(blurred, `${size}`).toBeGreaterThan(8);
		}
	}, 240_000);
});
