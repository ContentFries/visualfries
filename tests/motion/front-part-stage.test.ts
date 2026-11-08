// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject, renderStills } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';
import { renderProgramInserts } from '../../src/lib/motion/inserts-node.js';
// @ts-expect-error: a plain .mjs helper shared with the subject layer tests
import { SW, SH, ffmpeg, headX, writeFootage } from './fixtures/subject/footage.mjs';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

/** RGBA pixels of a PNG. */
const rgba = (png: Buffer): Buffer =>
	ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
const at = (raw: Buffer, x: number, y: number) => [
	...raw.subarray((y * SW + x) * 4, (y * SW + x) * 4 + 4)
];
const near = (px: number[], want: number[], tolerance = 24) =>
	want.every((v, i) => Math.abs(px[i] - v) <= tolerance);

const GREEN = [0, 255, 0];
const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const YELLOW = [255, 255, 0];
/** The head's colour in the footage (see `writeFootage`). */
const SKIN = [225, 180, 150];

/** A label sliding in on a timeline that finds it with `q`: in front of the speaker. */
const LABEL = `<div class="label">{clip.props.text}</div>`;
const LABEL_TIMELINE = `useTimeline(({ tl, q }) => {
		tl.fromTo(q('.label'), { x: -60 }, { x: 0, duration: 0.5, ease: 'power2.out' }, 0);
	});`;
const LABEL_STYLE = `.label { position: absolute; left: 150px; top: 220px; width: 100px; height: 40px; background: #00ff00; color: #00ff00; font: 700 20px sans-serif; }`;
/** A wide red band across the face: behind the speaker. */
const BAND_STYLE = `.band { position: absolute; left: -100px; right: -100px; top: 200px; height: 80px; background: #ff0000; }`;

/** One clip, both layers: the label comes first in the markup and still draws over the band. */
const ONE = `<script>
	import { Front, useClip, useTimeline } from 'visualfries/motion';
	const clip = useClip();
	${LABEL_TIMELINE}
</script>

<Front>${LABEL}</Front>
<div class="band"></div>

<style>
	${LABEL_STYLE}
	${BAND_STYLE}
</style>
`;

/** The same picture as two clips: the band behind, the label in front. */
const BAND = `<div class="band"></div>
<style>
	${BAND_STYLE}
</style>
`;
const LABEL_BLOCK = `<script>
	import { useClip, useTimeline } from 'visualfries/motion';
	const clip = useClip();
	${LABEL_TIMELINE}
</script>

${LABEL}

<style>
	${LABEL_STYLE}
</style>
`;

/** A box of colour `c` at `x` (40 px wide), level with the label. */
const box = (c: string) => `<script>
	import { useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
<div style="position:absolute;left:{p.x}px;top:210px;width:40px;height:60px;background:${c}"></div>
`;

/** Text at `x`, `y`: inside `<Front>` with `props.front`, else in the clip's own layer. */
const STICKER = `<script>
	import { Front, useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
{#if p.front}
	<Front><div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:#fff;white-space:nowrap">{p.text}</div></Front>
{:else}
	<div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:#fff;white-space:nowrap">{p.text}</div>
{/if}
`;

/** `ONE` with a band that sets `z-index`: in its own layer it still stays under `<Front>`. */
const STACKED = ONE.replace('.band {', '.band { z-index: 1;');

/** A label that mounts only once the clip has run half a second: a late `<Front>`. */
const LATE = `<script>
	import { Front, useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

{#if clip.t >= 0.5}<Front>${LABEL}</Front>{/if}

<style>
	${LABEL_STYLE}
</style>
`;

/** Two late `<Front>`s on one spot, green first in the markup and blue second. */
const PAIR = `<script>
	import { Front, useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

{#if clip.t < 0.3 || clip.t > 0.9}<Front><div class="spot" style="background:#00ff00"></div></Front>{/if}
{#if clip.t > 0.6}<Front><div class="spot" style="background:#0000ff"></div></Front>{/if}

<style>
	.spot { position: absolute; left: 150px; top: 220px; width: 100px; height: 40px; }
</style>
`;

/** A card fading in on a timeline that staggers over every `div` that `q` finds. */
const STAGGER = `<script>
	import { Front, useTimeline } from 'visualfries/motion';
	useTimeline(({ tl, q }) => {
		tl.from(q('div'), { opacity: 0, duration: 1, ease: 'none', stagger: 0.5 }, 0);
	});
</script>

<Front><div class="spot" style="background:#00ff00"></div></Front>

<style>
	.spot { position: absolute; left: 150px; top: 220px; width: 100px; height: 40px; }
</style>
`;

/** A `<Front>` inside another one (blue), then a third (yellow) on the same spot. */
const NESTED = `<script>
	import { Front } from 'visualfries/motion';
</script>

<Front><div class="spot" style="background:#00ff00"></div><Front><div class="spot" style="background:#0000ff"></div></Front></Front>
<Front><div class="spot" style="background:#ffff00"></div></Front>

<style>
	.spot { position: absolute; left: 150px; top: 220px; width: 100px; height: 40px; }
</style>
`;

describe.skipIf(!hasChromium || !hasFfmpeg)('<Front>: one clip drawing behind and in front', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-front-part-'));
		writeFootage(dir, 4);
		for (const [name, source] of Object.entries({
			One: ONE,
			Band: BAND,
			Label: LABEL_BLOCK,
			Under: box('#0000ff'),
			Over: box('#ffff00'),
			Sticker: STICKER,
			Stacked: STACKED,
			Late: LATE,
			Pair: PAIR,
			Stagger: STAGGER,
			Nested: NESTED
		}))
			await fs.writeFile(path.join(dir, `${name}.svelte`), source);
	}, 120_000);
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const project = async (name: string, clips: object[], extra = {}) => {
		const file = path.join(dir, `${name}.vf.json`);
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				background: '#000000',
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				// Program frames 0–44 show source 0–44; a push hands over to source 60– at frame 45.
				cuts: [
					{ id: 'a', source: 'talk', in: 0, out: 1.5 },
					{ id: 'b', source: 'talk', in: 2, out: 3.5, transition: { type: 'push', duration: 0.4 } }
				],
				clips,
				...extra
			})
		);
		return loadMotionProject(file);
	};

	/** Placement keys: the clip moves 20 px right in its first 0.6 s. */
	const keys = [
		{ at: 0, x: 0 },
		{ at: 0.6, x: 20 }
	];
	const under = { id: 'under', block: 'Under.svelte', from: 0, until: 3, props: { x: 130 } };
	const over = { id: 'over', block: 'Over.svelte', from: 0, until: 3, props: { x: 230 } };
	// Ends on the cut: rides the outgoing side of the push.
	const span = { from: 0.2, until: 1.5, layer: 'behind', keys, props: { text: 'HI' } };
	const merged = [under, { id: 'one', block: 'One.svelte', ...span }, over];
	const split = [
		under,
		{ id: 'band', block: 'Band.svelte', ...span },
		{ id: 'label', block: 'Label.svelte', ...span, layer: 'front' },
		over
	];

	it('draws the front part over the speaker, stacked by the clip, as two clips would', async () => {
		const frames = [0, 5, 6, 9, 14, 20, 24, 30, 38, 39, 42, 44, 45, 47, 50, 51, 60];
		const one = await captureProgramFrames(await project('merged', merged), frames);
		const two = await captureProgramFrames(await project('split', split), frames);
		expect(frames.filter((f) => sha1(one.get(f)!) !== sha1(two.get(f)!))).toEqual([]);
		// Settled (timeline done, keys at x 20): the label spans x 170–270 at y 220–260.
		const px = rgba(one.get(30)!);
		expect(at(px, 200, 240), 'the label over the face').toSatisfy((p: number[]) => near(p, GREEN));
		// Over the clip before it (blue at 130–170 under the label's left edge), under the one after.
		expect(at(px, 150, 240)).toSatisfy((p: number[]) => near(p, BLUE));
		expect(at(px, 175, 240)).toSatisfy((p: number[]) => near(p, GREEN));
		expect(at(px, 250, 240)).toSatisfy((p: number[]) => near(p, YELLOW));
		// The band beside the speaker; on the speaker below the label, the speaker covers it.
		expect(at(px, 20, 240)).toSatisfy((p: number[]) => near(p, RED));
		expect(at(px, Math.round(headX(30)), 272)).toSatisfy((p: number[]) => near(p, SKIN));
		// Hidden with the clip: after it, the face shows.
		expect(at(rgba(one.get(60)!), 200, 240)).toSatisfy((p: number[]) => near(p, SKIN));
		// The timeline moves the label: it is not settled at the clip's start.
		expect(sha1(one.get(9)!)).not.toBe(sha1(one.get(14)!));
	}, 300_000);

	it('appears with the clip in its own transition', async () => {
		// A wipe into the clip: before halfway the clip is hidden, the label with it.
		const loaded = await project('wipe', [
			{
				id: 'one',
				block: 'One.svelte',
				from: 2.2,
				until: 3.2,
				layer: 'behind',
				transition: 'wipe',
				props: { text: 'HI' }
			}
		]);
		// The window (0.8 s, centred) runs from frame 54; the clip's first frame is 66.
		const shots = await captureProgramFrames(loaded, [55, 80]);
		const before = rgba(shots.get(55)!);
		expect(at(before, 200, 240)).toSatisfy((p: number[]) => near(p, SKIN));
		expect(at(rgba(shots.get(80)!), 200, 240)).toSatisfy((p: number[]) => near(p, GREEN));
	}, 300_000);

	it('keeps the front part over the subject in a holdout insert', async () => {
		const loaded = await project('insert', [{ id: 'one', block: 'One.svelte', ...span }]);
		const out = path.join(dir, 'inserts');
		await renderProgramInserts(loaded, { output: out, jobs: 1, clips: ['one'] });
		const raw = ffmpeg([
			'-i',
			path.join(out, 'one.mov'),
			'-f',
			'rawvideo',
			'-pix_fmt',
			'rgba',
			'pipe:1'
		]);
		// File frame i is program frame i (the handle before the clip starts at 0).
		const frame = raw.subarray(30 * SW * SH * 4, 31 * SW * SH * 4);
		expect(at(frame, 200, 240), 'the label, opaque over the head').toSatisfy((p: number[]) =>
			near(p, [...GREEN, 255], 2)
		);
		expect(at(frame, 20, 240), 'the band beside the head').toSatisfy((p: number[]) =>
			near(p, [...RED, 255], 2)
		);
		expect(at(frame, Math.round(headX(30)), 272)[3], 'the band behind the head').toBe(0);
	}, 300_000);

	it('draws the front part over the block in a clip rendered alone', async () => {
		const file = path.join(dir, 'alone.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				background: '#000000',
				clips: [{ id: 'one', block: 'One.svelte', from: 0, until: 1, props: { text: 'HI' } }]
			})
		);
		const [still] = await renderStills(await loadMotionProject(file), [{ clip: 'one', at: '0.8' }]);
		expect(at(rgba(still.png), 180, 240)).toSatisfy((p: number[]) => near(p, GREEN));
	}, 300_000);

	/** A still of block `block` rendered alone (no program) at `t` seconds. */
	const alone = async (block: string, t: string) => {
		const file = path.join(dir, `${block}.alone.vf.json`);
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				background: '#000000',
				clips: [{ id: 'one', block: `${block}.svelte`, from: 0, until: 1 }]
			})
		);
		const [still] = await renderStills(await loadMotionProject(file), [{ clip: 'one', at: t }]);
		return rgba(still.png);
	};

	it("keeps what useTimeline's q finds inside <Front> to the block's own elements", async () => {
		// The card is the only div: halfway through its fade at 0.5 s, not waiting for a stagger.
		expect(at(await alone('Stagger', '0.5'), 200, 240)).toSatisfy((p: number[]) =>
			near(p, [0, 128, 0])
		);
	}, 300_000);

	it('stacks a <Front> inside another one in markup order', async () => {
		// Green, blue inside it, then yellow: yellow comes last in the markup, so it is on top.
		expect(at(await alone('Nested', '0.5'), 200, 240)).toSatisfy((p: number[]) => near(p, YELLOW));
	}, 300_000);

	it('draws the front part over a block whose own layer sets z-index, in a clip rendered alone', async () => {
		const file = path.join(dir, 'stacked.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				background: '#000000',
				clips: [{ id: 'one', block: 'Stacked.svelte', from: 0, until: 1, props: { text: 'HI' } }]
			})
		);
		const [still] = await renderStills(await loadMotionProject(file), [{ clip: 'one', at: '0.8' }]);
		const px = rgba(still.png);
		expect(at(px, 180, 240), 'the label over the band').toSatisfy((p: number[]) => near(p, GREEN));
		expect(at(px, 20, 240), 'the band beside it').toSatisfy((p: number[]) => near(p, RED));
	}, 300_000);

	it('draws a late <Front> the same whatever frames were seeked before', async () => {
		// A wipe into the clip (window from frame 54, first frame 66); the label mounts at 0.5 s.
		const loaded = await project('late', [
			{
				id: 'late',
				block: 'Late.svelte',
				from: 2.2,
				until: 3.2,
				layer: 'behind',
				transition: 'wipe'
			}
		]);
		// Frame 55 leaves the clip hidden by the wipe; at frame 85 the label mounts.
		const after = await captureProgramFrames(loaded, [55, 85]);
		const fresh = await captureProgramFrames(loaded, [85]);
		expect(at(rgba(fresh.get(85)!), 200, 240)).toSatisfy((p: number[]) => near(p, GREEN));
		expect(sha1(after.get(85)!)).toBe(sha1(fresh.get(85)!));
	}, 300_000);

	it('stacks late <Front>s in markup order whatever frames were seeked before', async () => {
		const loaded = await project('pair', [
			{ id: 'pair', block: 'Pair.svelte', from: 0, until: 1.4, layer: 'behind' }
		]);
		// Green alone at 5, blue alone at 24, both at 33: blue comes second, so it is on top.
		const after = await captureProgramFrames(loaded, [5, 24, 33]);
		const fresh = await captureProgramFrames(loaded, [33]);
		expect(at(rgba(fresh.get(33)!), 200, 240)).toSatisfy((p: number[]) => near(p, BLUE));
		expect(at(rgba(after.get(33)!), 200, 240)).toSatisfy((p: number[]) => near(p, BLUE));
	}, 300_000);

	it('checks front text as front text and the rest as text behind the speaker', async () => {
		const face = { x: 110, y: 220, text: 'ON THE FACE' };
		const loaded = await project('check', [
			{
				id: 'front-face',
				block: 'Sticker.svelte',
				from: 0.2,
				until: 1.4,
				layer: 'behind',
				props: { ...face, front: true }
			},
			{
				id: 'behind-face',
				block: 'Sticker.svelte',
				from: 2.2,
				until: 3.4,
				layer: 'behind',
				props: { ...face, front: false }
			}
		]);
		const results = await checkProgram(loaded);
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		const messages = results.flatMap((r) => r.warnings.map((w) => w.message));
		const ids = (part: string) =>
			messages.filter((m) => m.includes(part)).map((m) => /^Clip "(.*?)"/.exec(m)![1]);
		expect(ids("covers the speaker's face")).toEqual(['front-face']);
		expect(ids('the speaker covers its text behind them')).toEqual(['behind-face']);
	}, 300_000);
});
