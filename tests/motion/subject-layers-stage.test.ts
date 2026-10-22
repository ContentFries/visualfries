// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';
// @ts-expect-error: a plain .mjs helper shared with the subject layer tests
import { SW, SH, headX, pixels, writeFootage } from './fixtures/subject/footage.mjs';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

const isYellow = ([r, g, b]: number[]) => r > 200 && g > 180 && b < 90;
const isBody = ([r, g, b]: number[]) => r < 90 && g < 90 && b < 100 && Math.abs(r - b) < 25;

/** A bar behind the speaker, across the body: shows only where the body is not. */
const BAR = `<div style="position:absolute;left:0;top:440px;width:360px;height:50px;background:#ffd400"></div>`;

/**
 * A custom block: the body below y = 380 slides right as its own layer, leaving a hole with the
 * clean plate (and a rim) in the speaker; a small copy of the clean plate drawn on a canvas
 * from `clip.picture` sits in the top left corner.
 */
const GAG = `<script>
	import { Subject, useClip, useFrame } from 'visualfries/motion';
	const clip = useClip();
	let canvas;
	useFrame(async () => {
		const pic = await clip.picture('clean');
		// At its own size, the canvas scaled with a transform: a scaled drawImage may resample
		// differently depending on what was drawn before.
		canvas.getContext('2d').drawImage(pic.image, 0, 0);
	});
</script>
<Subject region={{ below: { through: [[0, 380], [360, 380]] } }} freeze hole={{ rim: true }} x={clip.t * 100} />
<canvas bind:this={canvas} width="360" height="640" style="position:absolute;left:10px;top:10px;transform-origin:0 0;transform:scale(0.25)"></canvas>
`;

const isSkin = ([r, g, b]: number[]) => r > 190 && g > 140 && g < 215 && b > 110 && b < 190;
const isSky = ([r, g, b]: number[]) => b > 190 && r < 150 && g > 120;

/**
 * The head's top is at y = 150 and its widest row 140 px, so the matte measures a head 196 px
 * tall: `{ above: 0.3 }` cuts at y ≈ 209.
 */
const LID = { above: 0.3 };

async function write(dir: string, name: string, project: object) {
	const file = path.join(dir, name);
	await fs.writeFile(
		file,
		JSON.stringify({ size: [SW, SH], fps: 30, background: '#ff00ff', ...project })
	);
	return loadMotionProject(file);
}

describe.skipIf(!hasChromium || !hasFfmpeg)('subject layers on the stage', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-subject-layers-'));
		writeFootage(dir);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const footage = { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', clean: true } };

	it('lifts the top of the head off in JSON, leaving sky where it was', async () => {
		const loaded = await write(dir, 'lid.vf.json', {
			footage,
			cuts: [{ source: 'talk', in: 0, out: 3 }],
			clips: [
				{
					id: 'lid',
					block: '@visualfries/subject',
					from: 1,
					until: 2.5,
					props: { region: LID },
					keys: [
						{ at: 0, y: 0 },
						{ at: 1, y: -120 }
					]
				}
			]
		});
		const frames = await captureProgramFrames(loaded, [15, 30, 60]);
		const before = pixels(frames.get(15)!, SW);
		const start = pixels(frames.get(30)!, SW);
		const flown = pixels(frames.get(60)!, SW);
		const hx = Math.round(headX(30));
		// Before the clip, and on its first frame (the piece still in place), the head is whole.
		for (const y of [170, 200, 260]) {
			expect(isSkin(before(Math.round(headX(15)), y)), `before ${y}`).toBe(true);
			expect(isSkin(start(hx, y)), `start ${y}`).toBe(true);
		}
		// A second later: sky where the top of the head was, across its whole width, and the rest
		// of the head below the cut.
		const hx60 = Math.round(headX(60));
		for (const x of [hx60 - 60, hx60 - 30, hx60, hx60 + 30, hx60 + 60])
			for (const y of [160, 185, 203]) expect(isSky(flown(x, y)), `hole ${x},${y}`).toBe(true);
		for (const y of [220, 260, 320]) expect(isSkin(flown(hx60, y)), `face ${y}`).toBe(true);
		// The piece, 120 px higher, with the frame it was taken from (the head was at x = hx).
		for (const y of [50, 70, 85]) expect(isSkin(flown(hx, y)), `piece ${y}`).toBe(true);
		expect(isSky(flown(hx, 20))).toBe(true);
	}, 300_000);

	it('lines the hole and the piece up with a zoomed camera', async () => {
		// Shot keys zoom 1.3× about the face (the head's column, 64 px below its top at y = 150),
		// so source y maps to 214 + (y − 214) × 1.3 on screen; a slight turn goes through the
		// rotated path of the camera.
		const loaded = await write(dir, 'zoom.vf.json', {
			footage,
			cuts: [{ source: 'talk', in: 0, out: 3 }],
			shots: [
				{
					id: 'close',
					shot: 'full',
					from: 0,
					until: 3,
					keys: [{ at: 0, scale: 1.3, rotation: 0.01 }]
				}
			],
			clips: [
				{
					id: 'lid',
					block: '@visualfries/subject',
					from: 1,
					until: 2.5,
					props: { region: LID, rim: { opening: 0.2 } },
					keys: [
						{ at: 0, y: 0 },
						{ at: 0.5, y: -400 }
					]
				}
			]
		});
		const at = pixels((await captureProgramFrames(loaded, [60])).get(60)!, SW);
		const hx = Math.round(headX(60));
		const screen = (y: number) => Math.round(214 + (y - 214) * 1.3);
		// Above the cut and the opening (source y 165–185): sky across the head's width.
		for (const y of [165, 185])
			for (const dx of [-70, -40, 0, 40, 70])
				expect(isSky(at(hx + dx, screen(y))), `hole ${dx},${y}`).toBe(true);
		// Below the cut and the opening (source y 250), the head across its zoomed width.
		for (const dx of [-80, -40, 0, 40, 80])
			expect(isSkin(at(hx + dx, screen(250))), `face ${dx}`).toBe(true);
		// The opening lies on the cut, as wide as the zoomed head there: dark at its middle.
		const mid = at(hx, screen(209) + 2);
		expect(mid[0]).toBeLessThan(120);
		expect(isSky(at(hx + 110, screen(209)))).toBe(true);
	}, 300_000);

	it('keeps the hole on the side on screen through a cut transition', async () => {
		const loaded = await write(dir, 'wipe.vf.json', {
			footage,
			cuts: [
				{ source: 'talk', in: 0, out: 1.5 },
				{ source: 'talk', in: 1.5, out: 3, transition: { type: 'wipe', duration: 0.6 } }
			],
			clips: [
				{
					id: 'lid',
					block: '@visualfries/subject',
					from: 0.8,
					until: 2.5,
					props: { region: LID },
					keys: [
						{ at: 0, y: 0 },
						{ at: 0.2, y: -400 }
					]
				}
			]
		});
		const { resolveProgram } = await import('../../src/lib/motion/program.js');
		const wipe = resolveProgram(loaded.project, loaded.inputs).transitions[0];
		// Late in the window, past the cut: the incoming side covers nearly the whole frame.
		const late = wipe.startFrame + wipe.frames - 2;
		expect(late).toBeGreaterThan(wipe.cutFrame);
		const at = pixels((await captureProgramFrames(loaded, [late])).get(late)!, SW);
		const hx = Math.round(headX(late));
		for (const y of [165, 185]) expect(isSky(at(hx, y)), `hole at ${y}`).toBe(true);
		expect(isSkin(at(hx, 260))).toBe(true);
	}, 300_000);

	it('cuts everything but the region with `outside`, for a line and for a path', async () => {
		// Region: the body (below y = 380); `outside` lifts everything else, the head included.
		await fs.writeFile(
			path.join(dir, 'Outside.svelte'),
			`<script>
	import { Subject, useClip } from 'visualfries/motion';
	const clip = useClip();
	const region = clip.props.path
		? { path: 'M -10 380 L 370 380 L 370 700 L -10 700 Z' }
		: { below: { through: [[0, 380], [360, 380]] } };
</script>
<Subject {region} outside freeze hole y={-clip.t * 300} />
`
		);
		for (const variant of [{}, { path: true }]) {
			const loaded = await write(dir, 'outside.vf.json', {
				footage,
				cuts: [{ source: 'talk', in: 0, out: 3 }],
				clips: [{ id: 'up', block: 'Outside.svelte', from: 1, until: 2.5, props: variant }]
			});
			const at = pixels((await captureProgramFrames(loaded, [60])).get(60)!, SW);
			const hx = Math.round(headX(60));
			const label = variant.path ? 'path' : 'line';
			// The head flew up 300 px: sky where it was; the body (the region) stays.
			for (const y of [200, 260, 320]) expect(isSky(at(hx, y)), `${label} head ${y}`).toBe(true);
			expect(isBody(at(hx, 450)), `${label} body`).toBe(true);
		}
	}, 300_000);

	it('keeps the rim of one hole out of another', async () => {
		// A lid with a cartoon opening, and a strip through the head (x 170–190) as a second hole.
		const loaded = await write(dir, 'two.vf.json', {
			footage,
			cuts: [{ source: 'talk', in: 0, out: 3 }],
			clips: [
				{
					id: 'lid',
					block: '@visualfries/subject',
					from: 1,
					until: 2.5,
					props: { region: LID, freeze: false, rim: { opening: 0.2 } },
					keys: [{ at: 0, y: -400 }]
				},
				{
					id: 'strip',
					block: '@visualfries/subject',
					from: 1,
					until: 2.5,
					props: {
						region: { path: 'M -10 0 L 10 0 L 10 400 L -10 400 Z', origin: 'head' },
						freeze: false
					},
					keys: [{ at: 0, x: 500 }]
				}
			]
		});
		const at = pixels((await captureProgramFrames(loaded, [60])).get(60)!, SW);
		const hx = Math.round(headX(60));
		// In the strip just under the cut, where the opening's dark lower half would be: the plate
		// shows through (the sky filled in where the head was), not the opening.
		expect(isSky(at(hx, 214))).toBe(true);
		// Beside the strip the opening is there.
		expect(at(hx - 30, 214)[0]).toBeLessThan(120);
	}, 300_000);

	it('cuts a hole in the body from a block, with the clean plate and a behind clip showing through', async () => {
		await fs.writeFile(path.join(dir, 'Gag.svelte'), GAG);
		await fs.writeFile(path.join(dir, 'Bar.svelte'), BAR);
		const loaded = await write(dir, 'gag.vf.json', {
			footage,
			cuts: [{ source: 'talk', in: 0, out: 3 }],
			clips: [
				{ id: 'bar', block: 'Bar.svelte', from: 0, until: 3, layer: 'behind' },
				{ id: 'gag', block: 'Gag.svelte', from: 1, until: 2.5 }
			]
		});
		const frames = await captureProgramFrames(loaded, [20, 60]);
		const before = pixels(frames.get(20)!, SW);
		const after = pixels(frames.get(60)!, SW);
		const hx = Math.round(headX(20));
		// Before: the body covers the bar.
		expect(isBody(before(hx - 80, 465))).toBe(true);
		expect(isYellow(before(10, 465))).toBe(true);
		// A second into the gag the body piece has moved 100 px right: where it was, the bar
		// shows through the hole; the head above the cut stays.
		const h60 = Math.round(headX(60));
		expect(isYellow(after(h60 - 80, 465)), 'bar through the hole').toBe(true);
		expect(isSkin(after(h60, 240))).toBe(true);
		// The piece (taken at the clip's first frame, the body then at x 60–300) moved right to
		// 160–400: its left end is a hole now (the field shows), its right end is body.
		expect(isBody(after(100, 600))).toBe(false);
		expect(after(100, 600)[1]).toBeGreaterThan(120);
		expect(isBody(after(340, 600))).toBe(true);
		// The rim: a dark band on the speaker just above the cut, nowhere outside the body.
		const rim = after(h60, 376);
		expect(rim[0]).toBeLessThan(isBody(rim) ? 90 : 60);
		expect(isSky(after(10, 376))).toBe(true);
		// The clean plate in the corner (a quarter size): sky where the head is, the field
		// below, and the stage's picture past the corner's edge.
		expect(isSky(after(10 + 45, 10 + 60))).toBe(true);
		expect(after(10 + 45, 10 + 150)[1]).toBeGreaterThan(120);
		expect(isBody(after(10 + 45, 10 + 150))).toBe(false);
		expect(isSkin(after(h60, 240))).toBe(true);
		expect(isSkin(after(h60, 240))).toBe(true);
	}, 300_000);

	it('checks clean across a hard cut, in any seek order, and warns about an empty region', async () => {
		await fs.writeFile(path.join(dir, 'Gag.svelte'), GAG);
		await fs.writeFile(path.join(dir, 'Bar.svelte'), BAR);
		const loaded = await write(dir, 'check.vf.json', {
			footage,
			// A hard cut at frame 45 splits the program into two segments.
			cuts: [
				{ source: 'talk', in: 0, out: 1.5 },
				{ source: 'talk', in: 1.6, out: 3 }
			],
			shots: [
				{
					id: 'push',
					shot: 'full',
					from: 0,
					until: 1.5,
					keys: [
						{ at: 0, scale: 1 },
						{ at: 1.5, scale: 1.15 }
					]
				},
				{ id: 'close', shot: 'punch', from: 1.5, until: 2.9 }
			],
			clips: [
				{ id: 'bar', block: 'Bar.svelte', from: 0, until: 2.9, layer: 'behind' },
				{
					id: 'lid',
					block: '@visualfries/subject',
					from: 0.8,
					until: 2.6,
					props: { region: { above: { head: 0.3, tilt: -8 } }, rim: { opening: 0.2 } },
					keys: [
						{ at: 0, x: 0, y: 0, rotation: 0 },
						{ at: 1.2, x: -80, y: -300, rotation: -300, ease: 'power1.in' }
					]
				},
				{ id: 'gag', block: 'Gag.svelte', from: 0.3, until: 1.2 },
				{
					id: 'nothing',
					block: '@visualfries/subject',
					from: 0.2,
					until: 1.4,
					props: { region: { above: -1 }, hole: false }
				}
			]
		});
		const results = await checkProgram(loaded, { determinism: true });
		expect(results.map((r) => [r.id, r.errors])).toEqual([
			['seg1', []],
			['seg2', []]
		]);
		const warnings = results.flatMap((r) => r.warnings.map((w) => w.message));
		const empty = warnings.filter((m) => m.includes('holds none of the speaker'));
		expect(empty).toHaveLength(1);
		expect(empty[0]).toMatch(
			/^Clip "nothing": its region holds none of the speaker in the frames checked from 0\.2\d s/
		);
		expect(warnings.some((m) => m.includes('"lid"'))).toBe(false);
	}, 600_000);

	it('draws from the footage on screen, whatever other footage lacks', async () => {
		await fs.writeFile(path.join(dir, 'Gag.svelte'), GAG);
		// "broll" has no matte; the gag only runs while "talk" is on screen.
		const loaded = await write(dir, 'broll.vf.json', {
			footage: { ...footage, broll: { src: 'talk.mp4' } },
			cuts: [
				{ source: 'talk', in: 0, out: 1.5 },
				{ source: 'broll', in: 0, out: 1 }
			],
			clips: [{ id: 'gag', block: 'Gag.svelte', from: 0.5, until: 1.4 }]
		});
		const results = await checkProgram(loaded);
		expect(results.flatMap((r) => r.errors.map((e) => e.message))).toEqual([]);
	}, 300_000);

	it('tells what is missing: a matte, a clean plate', async () => {
		const clip = {
			id: 'lid',
			block: '@visualfries/subject',
			from: 0.5,
			until: 1,
			props: { region: LID }
		};
		const noClean = await write(dir, 'noclean.vf.json', {
			footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
			cuts: [{ source: 'talk', in: 0, out: 2 }],
			clips: [clip]
		});
		const errors = (await checkProgram(noClean)).flatMap((r) => r.errors.map((e) => e.message));
		expect(errors).toEqual(['The program has errors (listed above), so it was not drawn.']);
		const { resolveProgram } = await import('../../src/lib/motion/program.js');
		const said = (l: typeof noClean) =>
			resolveProgram(l.project, l.inputs)
				.diagnostics.filter((d) => d.level === 'error')
				.map((d) => d.message);
		expect(said(noClean)).toEqual([
			expect.stringContaining('has no clean plate to show there. Add "clean": true')
		]);
		const noMatte = await write(dir, 'nomatte.vf.json', {
			footage: { talk: { src: 'talk.mp4' } },
			cuts: [{ source: 'talk', in: 0, out: 2 }],
			clips: [clip]
		});
		expect(said(noMatte)).toEqual([expect.stringContaining('"talk" has none (visualfries matte)')]);
		// Kept whole (no hole), it needs no clean plate.
		const whole = await write(dir, 'whole.vf.json', {
			footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
			cuts: [{ source: 'talk', in: 0, out: 2 }],
			clips: [{ ...clip, props: { region: LID, hole: false } }]
		});
		expect(said(whole)).toEqual([]);
		// A block that asks the stage for a hole on footage without a clean plate fails its frames.
		await fs.writeFile(path.join(dir, 'Gag.svelte'), GAG);
		const custom = await write(dir, 'custom.vf.json', {
			footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
			cuts: [{ source: 'talk', in: 0, out: 2 }],
			clips: [{ id: 'gag', block: 'Gag.svelte', from: 0.5, until: 1 }]
		});
		const failed = (await checkProgram(custom)).flatMap((r) => r.errors.map((e) => e.message));
		expect(failed.join('\n')).toMatch(/no clean plate|needs a clean plate/);
	}, 300_000);
});
