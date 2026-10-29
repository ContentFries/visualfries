// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** RGB of every pixel of a PNG `width` wide. */
function rgba(png: Buffer, width: number) {
	const raw = ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
	const at = (x: number, y: number) => [
		...raw.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)
	];
	return { at, height: raw.length / 4 / width };
}

const isSpeaker = (rgb: number[]) => rgb.every((v) => v > 170 && v < 210);
const isRoom = (rgb: number[]) => rgb.every((v) => v > 86 && v < 106);
const isFill = (rgb: number[]) => rgb.every((v) => v < 8);
const isWorld = ([r, g, b]: number[]) => r > 200 && g > 170 && b < 60;
const isPanel = ([r, g, b]: number[]) => b > 200 && r < 100 && g < 140;
const solid = (color: string) =>
	`<div style="position:absolute;inset:0;background:${color}"></div>`;

/** Landscape footage of a seated speaker: a head and a torso running into the bottom edge. */
const SW = 640;
const SH = 360;
const BODY = `lt(pow((X-400)/50,2)+pow((Y-150)/60,2),1)+between(X,330,470)*gte(Y,200)`;
const W = 360;
const H = 640;

describe.skipIf(!hasChromium || !hasFfmpeg)('cutout on the stage', () => {
	let dir: string;
	let file: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-cutout-'));
		for (const [name, lum] of [
			['talk.mp4', `if(${BODY},190,96)`],
			['talk.matte.mp4', `if(${BODY},255,0)`]
		])
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				`color=black:s=${SW}x${SH}:r=30:d=3`,
				'-vf',
				`geq=lum='${lum}':cb=128:cr=128`,
				'-g',
				'30',
				'-pix_fmt',
				'yuv420p',
				path.join(dir, name)
			]);
		await fs.writeFile(path.join(dir, 'World.svelte'), solid('#ffd000'));
		await fs.writeFile(path.join(dir, 'Panel.svelte'), solid('#2050ff'));
		file = path.join(dir, 'cutout.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [W, H],
				fps: 30,
				background: '#000000',
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk' }],
				shots: [
					{
						id: 'me',
						shot: 'cutout',
						from: 0.5,
						until: 2.8,
						params: { anchor: 'bottom-left', size: 0.15 }
					}
				],
				clips: [
					{ id: 'world', block: 'World.svelte', from: 2, until: 2.8, layer: 'behind' },
					{ id: 'panel', block: 'Panel.svelte', from: 0.5, until: 2.8, slot: 'panel' }
				]
			})
		);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('draws only the speaker, over the fill and the clips behind it, room gone', async () => {
		const loaded = await loadMotionProject(file);
		const frames = [5, 45, 70];
		const pngs = await captureProgramFrames(loaded, frames);
		const [before, alone, world] = frames.map((f) => rgba(pngs.get(f)!, W));
		// Before the shot: the room fills the frame.
		expect(isRoom(before.at(5, 5))).toBe(true);
		for (const px of [alone, world]) {
			let room = 0;
			let lowest = 0;
			let sumX = 0;
			let n = 0;
			for (let y = 0; y < H; y += 2)
				for (let x = 0; x < W; x += 2) {
					const rgb = px.at(x, y);
					if (isRoom(rgb)) room++;
					if (isSpeaker(rgb)) {
						lowest = Math.max(lowest, y);
						sumX += x;
						n++;
					}
				}
			// No room anywhere: at most the speaker's outline, where the compressed plate blends
			// the room into the speaker (the whole room is over 20 000 of these samples).
			expect(room).toBeLessThan(150);
			// The speaker, on the left, running out of the bottom edge.
			expect(n).toBeGreaterThan(500);
			expect(sumX / n).toBeLessThan(W / 2);
			expect(lowest).toBeGreaterThanOrEqual(H - 2);
		}
		// Above the panel: the fill, then the clip behind the speaker.
		expect(isFill(alone.at(350, 40))).toBe(true);
		expect(isWorld(world.at(350, 40))).toBe(true);
		// The panel above the speaker.
		expect(isPanel(alone.at(180, 110))).toBe(true);
		// Right of the speaker, below the panel: the fill, then the world.
		expect(isFill(alone.at(350, 600))).toBe(true);
		expect(isWorld(world.at(350, 600))).toBe(true);
	}, 120_000);

	it('passes check --determinism without warnings about the speaker', async () => {
		const results = await checkProgram(await loadMotionProject(file), { determinism: true });
		expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([['seg1', true, []]]);
		expect(results.flatMap((r) => r.warnings).filter((w) => /cutout/.test(w.message))).toEqual([]);
	}, 240_000);
});
