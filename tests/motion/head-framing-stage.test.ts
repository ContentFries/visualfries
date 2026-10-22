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

/** Portrait selfie footage: a big light "head" near the top over a room that darkens downward. */
const SW = 360;
const SH = 640;
const HEAD = `(pow((X-180)/100,2)+pow((Y-230)/140,2))`;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

function video(file: string, lum: string) {
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
		file
	]);
}

function rgba(png: Buffer, width: number) {
	const raw = ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
	return (x: number, y: number) => [...raw.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)];
}

const isFill = ([r, g, b]: number[]) => r > 200 && g < 60 && b > 200;
const isHead = ([r, g, b]: number[]) => [r, g, b].every((v) => v > 180);

describe.skipIf(!hasChromium || !hasFfmpeg)('head framing on the stage', () => {
	let dir: string;
	let file: string;

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-head-framing-'));
		video(path.join(dir, 'talk.mp4'), `if(lt(${HEAD},1),220,140-Y/8)`);
		video(path.join(dir, 'talk.matte.mp4'), `if(lt(${HEAD},1),255,0)`);
		file = path.join(dir, 'p.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				// A magenta fill: any of it inside the camera window is a hole in the picture.
				background: '#ff00ff',
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk' }],
				shots: [
					{
						id: 'list',
						shot: 'strip',
						from: 0.5,
						until: 1.6,
						params: { size: 0.4, headroom: 0.06 }
					},
					// Pushed up by a key: the head is cut, which check reports.
					{
						id: 'tight',
						shot: 'strip',
						from: 2,
						until: 2.9,
						params: { size: 0.4 },
						keys: [{ at: 0, y: -120 }]
					}
				]
			})
		);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('backs off to keep the head whole and fills the open sides with the blurred footage', async () => {
		const loaded = await loadMotionProject(file);
		const at = rgba((await captureProgramFrames(loaded, [40])).get(40)!, SW);
		// The strip: 256 px on top. No fill anywhere in it, not even at its corners and edges.
		for (const y of [0, 1, 60, 128, 200, 254, 255])
			for (const x of [0, 1, 10, 30, 180, 330, 350, 358, 359])
				expect(isFill(at(x, y)), `fill at ${x},${y}`).toBe(false);
		// The head's top is in, below a little headroom; the room shows above it.
		const column = [...Array(256).keys()].map((y) => isHead(at(180, y)));
		const top = column.indexOf(true);
		expect(top).toBeGreaterThan(8);
		expect(top).toBeLessThan(40);
		expect(isHead(at(180, 2))).toBe(false);
		// The sides are blurred footage: the room's grey, not the head's light and not the fill.
		const side = at(4, 128);
		expect(side[0]).toBeLessThan(180);
		expect(side[0]).toBeGreaterThan(30);
	}, 120_000);

	it('warns where a key cuts the head, and passes check --determinism', async () => {
		const results = await checkProgram(await loadMotionProject(file), { determinism: true });
		expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([['seg1', true, []]]);
		const warnings = results.flatMap((r) => r.warnings.map((w) => w.message));
		const cut = warnings.filter((m) => m.includes("cuts off the top of the speaker's head"));
		expect(cut).toHaveLength(1);
		expect(cut[0]).toMatch(/^Shot "tight" \(strip\) cuts off .* from 2\.\d\d s to 2\.90 s/);
		expect(cut[0]).toContain('"headroom": 0.06');
		expect(cut[0]).toContain('a "y" key further down');
	}, 300_000);
});
