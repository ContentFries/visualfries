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

/** Landscape footage: a dark grey room with a light grey "head" swaying around x = 400. */
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
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

/** The widest run of head pixels in any row. */
function headWidth(px: ReturnType<typeof rgba>, width: number): number {
	let best = 0;
	for (let y = 0; y < px.height; y += 2) {
		let run = 0;
		for (let x = 0; x < width; x++) {
			run = isHead(px.at(x, y)) ? run + 1 : 0;
			best = Math.max(best, run);
		}
	}
	return best;
}

/** A panel that fills its slot: blue, with a bar growing over half a second. */
const PANEL = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<div class="panel"><div class="bar" style="width: {Math.min(1, clip.t / 0.5) * 100}%"></div></div>

<style>
	.panel { position: absolute; inset: 0; background: #2050ff; }
	.bar { position: absolute; left: 20px; top: 40px; height: 24px; background: #ffffff; }
</style>
`;

/**
 * A panel that lays out in the safe part of its slot: red where `--slot-safe-*` leave it, and a
 * green bar at its left edge as tall as `clip.slotArea.safe.bottom`.
 */
const SAFE_PANEL = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<div class="panel">
	<div class="safe"></div>
	<div class="bar" style="height: {clip.slotArea?.safe.bottom ?? 0}px"></div>
</div>

<style>
	.panel { position: absolute; inset: 0; background: #2050ff; }
	.safe {
		position: absolute; background: #ff2020;
		inset: var(--slot-safe-top) var(--slot-safe-right) var(--slot-safe-bottom) var(--slot-safe-left);
	}
	.bar { position: absolute; left: 0; bottom: 0; width: 10px; background: #20ff20; }
</style>
`;
const isSafe = ([r, g, b]: number[]) => r > 200 && g < 80 && b < 80;
const isBar = ([r, g, b]: number[]) => g > 200 && r < 80 && b < 80;

describe.skipIf(!hasChromium || !hasFfmpeg)(
	'shots on the stage (full → punch → strip → full)',
	() => {
		let dir: string;
		let portrait: string;
		let landscape: string;
		let safe: string;

		beforeAll(async () => {
			dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-shots-stage-'));
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				`color=black:s=${SW}x${SH}:r=30:d=5`,
				'-vf',
				`geq=lum='if(lt(${HEAD},1),190,96)':cb=128:cr=128`,
				'-g',
				'30',
				'-pix_fmt',
				'yuv420p',
				path.join(dir, 'talk.mp4')
			]);
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				`color=black:s=${SW}x${SH}:r=30:d=5`,
				'-vf',
				`geq=lum='if(lt(${HEAD},1),255,0)':cb=128:cr=128`,
				'-pix_fmt',
				'yuv420p',
				path.join(dir, 'talk.matte.mp4')
			]);
			await fs.writeFile(path.join(dir, 'Panel.svelte'), PANEL);
			await fs.writeFile(path.join(dir, 'SafePanel.svelte'), SAFE_PANEL);
			const project = (size: [number, number]) => ({
				size,
				fps: 30,
				background: '#000000',
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk' }],
				shots: [
					{ id: 'hit', shot: 'punch', from: 1, until: 1.9 },
					{ id: 'list', shot: 'strip', from: 2, until: 3.4 }
				],
				// On until the panel has slid out with the morph back to full.
				clips: [{ id: 'panel', block: 'Panel.svelte', from: 2, until: 4.1, slot: 'panel' }]
			});
			portrait = path.join(dir, 'portrait.vf.json');
			landscape = path.join(dir, 'landscape.vf.json');
			await fs.writeFile(portrait, JSON.stringify(project([360, 640])));
			await fs.writeFile(landscape, JSON.stringify(project([640, 360])));
			safe = path.join(dir, 'safe.vf.json');
			const withSafe = project([360, 640]);
			withSafe.clips[0].block = 'SafePanel.svelte';
			// The same block without a slot, before the strip: its insets are 0, it fills the frame.
			withSafe.clips.push({ id: 'plain', block: 'SafePanel.svelte', from: 0, until: 0.5 } as never);
			await fs.writeFile(safe, JSON.stringify(withSafe));
		});
		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		it('resolves the shot track', async () => {
			const loaded = await loadMotionProject(portrait);
			const program = resolveProgram(loaded.project, loaded.inputs);
			expect(program.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
			expect(program.shots.map((s) => [s.id, s.startFrame, s.frames, s.morphFrames])).toEqual([
				['full-0', 0, 30, 0],
				['hit', 30, 27, 5],
				['full-57', 57, 3, 3],
				['list', 60, 42, 21],
				['full-102', 102, 48, 21]
			]);
			expect(program.segments).toHaveLength(1);
		});

		it('frames the head, punches in, opens the panel below and closes it again (9:16)', async () => {
			const loaded = await loadMotionProject(portrait);
			const frames = [0, 40, 70, 90, 140];
			const pngs = await captureProgramFrames(loaded, frames);
			const px = new Map(frames.map((f) => [f, rgba(pngs.get(f)!, 360)]));
			// Full: the head sits in the middle of the frame, not where a centre crop puts it.
			expect(isHead(px.get(0)!.at(180, 355)), 'head centred').toBe(true);
			expect(isPanel(px.get(0)!.at(180, 600))).toBe(false);
			// Punch: about 1.45 times wider.
			const ratio = headWidth(px.get(40)!, 360) / headWidth(px.get(0)!, 360);
			expect(ratio).toBeGreaterThan(1.38);
			expect(ratio).toBeLessThan(1.52);
			// Halfway into the strip: the panel has risen part of the way.
			expect(isPanel(px.get(70)!.at(180, 620)), 'panel rising').toBe(true);
			expect(isPanel(px.get(70)!.at(180, 400)), 'panel not there yet').toBe(false);
			// Strip: camera on top (head in it), the panel below from y = 288.
			const strip = px.get(90)!;
			expect(isHead(strip.at(180, 160)), 'head in the camera strip').toBe(true);
			expect(isPanel(strip.at(180, 280))).toBe(false);
			expect(isPanel(strip.at(10, 300)) && isPanel(strip.at(350, 630))).toBe(true);
			// Back to full.
			expect(isHead(px.get(140)!.at(180, 355))).toBe(true);
			expect(isPanel(px.get(140)!.at(180, 600))).toBe(false);
		}, 120_000);

		it('opens the panel on the right of a left camera strip (16:9)', async () => {
			const loaded = await loadMotionProject(landscape);
			const pngs = await captureProgramFrames(loaded, [0, 90]);
			const full = rgba(pngs.get(0)!, 640);
			const strip = rgba(pngs.get(90)!, 640);
			// Same aspect: the footage fills the frame as it is; the head at x ≈ 400.
			expect(isHead(full.at(400, 200))).toBe(true);
			// Camera strip 0–213, panel from 213 to the right edge, the head centred in the strip.
			expect(isHead(strip.at(106, 200))).toBe(true);
			expect(isPanel(strip.at(220, 300)) && isPanel(strip.at(630, 10))).toBe(true);
			expect(isPanel(strip.at(205, 300))).toBe(false);
		}, 120_000);

		it('tells a panel block the safe part of its slot as the strip opens (9:16)', async () => {
			// 360×640: safe insets top 96, right 100, bottom 224, left 40; the panel from y = 288.
			const loaded = await loadMotionProject(safe);
			const pngs = await captureProgramFrames(loaded, [5, 72, 90]);
			const plain = rgba(pngs.get(5)!, 360);
			for (const [x, y] of [
				[2, 2],
				[357, 2],
				[180, 320],
				[2, 637],
				[357, 637]
			])
				expect(isSafe(plain.at(x, y)), `no slot: ${x},${y}`).toBe(true);
			const open = rgba(pngs.get(90)!, 360);
			expect(isSafe(open.at(150, 300)) && isSafe(open.at(255, 410)), 'safe part').toBe(true);
			expect(isPanel(open.at(150, 425)), 'under the bottom inset').toBe(true);
			expect(isPanel(open.at(30, 350)) && isPanel(open.at(265, 350)), 'side insets').toBe(true);
			// clip.slotArea: the bar is 224 px tall, from the frame's bottom edge.
			expect(isBar(open.at(5, 420)) && isBar(open.at(5, 635))).toBe(true);
			expect(isBar(open.at(5, 410))).toBe(false);
			// On the way up (the panel's top at y 354) the safe part runs from it to the bottom
			// inset, and the bar is the panel's share below that inset.
			const rising = rgba(pngs.get(72)!, 360);
			expect(isSafe(rising.at(150, 345)), 'above the panel').toBe(false);
			expect(isSafe(rising.at(150, 360)) && isSafe(rising.at(150, 410))).toBe(true);
			expect(isPanel(rising.at(150, 420)), 'under the bottom inset').toBe(true);
			expect(isBar(rising.at(5, 420)) && isBar(rising.at(5, 635))).toBe(true);
			expect(isBar(rising.at(5, 410))).toBe(false);
		}, 120_000);

		it('gives the same pixels in any seek order, on the segment page and a whole-program page', async () => {
			const loaded = await loadMotionProject(portrait);
			const all = [...Array(150).keys()];
			const forward = await captureProgramFrames(loaded, all);
			const backward = await captureProgramFrames(loaded, [...all].reverse(), { whole: true });
			const shuffled = await captureProgramFrames(loaded, scrambled(all));
			const differ = all.filter(
				(f) =>
					sha1(forward.get(f)!) !== sha1(backward.get(f)!) ||
					sha1(forward.get(f)!) !== sha1(shuffled.get(f)!)
			);
			expect(differ).toEqual([]);
			// The morphs move: consecutive frames inside them differ.
			for (const f of [31, 61, 70, 80, 103, 115])
				expect(sha1(forward.get(f)!), `frame ${f}`).not.toBe(sha1(forward.get(f + 1)!));
		}, 400_000);

		it('passes check --determinism in both formats', async () => {
			for (const file of [portrait, landscape]) {
				const results = await checkProgram(await loadMotionProject(file), { determinism: true });
				expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([['seg1', true, []]]);
			}
		}, 240_000);
	}
);
