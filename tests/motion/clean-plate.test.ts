// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cleanPlate, defaultGrow, holeMask } from '../../src/lib/motion/clean-plate.js';
import { loadMotionProject, prepareFootage } from '../../src/lib/motion/node.js';
import { resolveMotionProject } from '../../src/lib/motion/resolve.js';
// @ts-expect-error: a plain .mjs helper shared with the subject layer tests
import { SW, SH, ffmpeg, writeFootage } from './fixtures/subject/footage.mjs';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** A w × h picture of `bg` with a square of `fg` (and matte 255) from `x0,y0` to `x1,y1`. */
function scene(w: number, h: number, bg: (x: number, y: number) => number[], box: number[]) {
	const rgb = new Uint8Array(w * h * 3);
	const matte = new Uint8Array(w * h);
	const [x0, y0, x1, y1] = box;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			const inside = x >= x0 && x < x1 && y >= y0 && y < y1;
			const c = inside ? [250, 20, 20] : bg(x, y);
			rgb.set(c, 3 * i);
			matte[i] = inside ? 255 : 0;
		}
	return { rgb, matte };
}

describe('clean plate (fill)', () => {
	it('grows the hole by a square of `grow` px around every pixel at the threshold', () => {
		const m = new Uint8Array(9 * 9);
		m[4 * 9 + 4] = 200;
		m[0] = 3; // under the threshold: background
		const hole = holeMask(m, 9, 9, 6, 2);
		const at = (x: number, y: number) => hole[y * 9 + x];
		expect(at(4, 4)).toBe(1);
		expect(at(2, 2)).toBe(1);
		expect(at(6, 6)).toBe(1);
		expect(at(1, 4)).toBe(0);
		expect(at(4, 7)).toBe(0);
		expect(at(0, 0)).toBe(0);
		expect(hole.reduce((a, b) => a + b, 0)).toBe(25);
	});

	it('fills the subject with the flat background around it and keeps every other pixel', () => {
		const { rgb, matte } = scene(64, 48, () => [40, 120, 230], [20, 10, 44, 38]);
		const out = cleanPlate(rgb, matte, 64, 48, { grow: 3 });
		for (let i = 0; i < 64 * 48; i++)
			expect([...out.subarray(3 * i, 3 * i + 3)]).toEqual([40, 120, 230]);
	});

	it('continues a vertical gradient into the hole, with no trace of the subject', () => {
		const sky = (_x: number, y: number) => [60, 100 + y, 240 - y];
		const { rgb, matte } = scene(80, 120, sky, [25, 30, 55, 90]);
		const out = cleanPlate(rgb, matte, 80, 120, { grow: 4 });
		const px = (x: number, y: number) => [...out.subarray(3 * (y * 80 + x), 3 * (y * 80 + x) + 3)];
		// Outside the grown hole: the picture itself.
		expect(px(5, 50)).toEqual(sky(5, 50));
		expect(px(70, 100)).toEqual(sky(70, 100));
		// Inside: the gradient's colour at about that height, never the subject's red.
		for (const y of [32, 45, 60, 75, 88]) {
			const [r, g, b] = px(40, y);
			expect(r).toBeLessThan(80);
			expect(Math.abs(g - (100 + y))).toBeLessThan(14);
			expect(Math.abs(b - (240 - y))).toBeLessThan(14);
		}
	});

	it('is deterministic: the same frame gives the same bytes', () => {
		const { rgb, matte } = scene(
			50,
			70,
			(x, y) => [(x * 7) % 255, (y * 3) % 255, 99],
			[10, 10, 40, 60]
		);
		const a = cleanPlate(rgb, matte, 50, 70);
		const b = cleanPlate(new Uint8Array(rgb), new Uint8Array(matte), 50, 70);
		expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
	});

	it('shows a supplied picture where the subject was', () => {
		const { rgb, matte } = scene(30, 30, () => [10, 10, 10], [10, 10, 20, 20]);
		const image = new Uint8Array(30 * 30 * 3).fill(77);
		const out = cleanPlate(rgb, matte, 30, 30, { grow: 1, image });
		expect([...out.subarray(3 * (15 * 30 + 15), 3 * (15 * 30 + 15) + 3)]).toEqual([77, 77, 77]);
		expect([...out.subarray(3 * (9 * 30 + 9), 3 * (9 * 30 + 9) + 3)]).toEqual([77, 77, 77]);
		expect([...out.subarray(0, 3)]).toEqual([10, 10, 10]);
	});

	it('keeps the picture where nothing is left to fill from', () => {
		const { rgb, matte } = scene(8, 8, () => [1, 2, 3], [0, 0, 8, 8]);
		expect(Buffer.from(cleanPlate(rgb, matte, 8, 8)).equals(Buffer.from(rgb))).toBe(true);
	});

	it('grows about 1.1 % of the short side by default', () => {
		expect(defaultGrow(1080, 1920)).toBe(12);
		expect(defaultGrow(360, 640)).toBe(4);
	});
});

const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

describe.skipIf(!hasFfmpeg)('clean plates in the footage cache', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-clean-plate-'));
		writeFootage(dir, 1);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	async function project(clean: unknown, matte = 'talk.matte.mp4') {
		const file = path.join(dir, 'p.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte, ...(clean === undefined ? {} : { clean }) } },
				cuts: [{ source: 'talk', in: 0, out: 1 }],
				clips: []
			})
		);
		return loadMotionProject(file);
	}

	/** The clean frames folder of the one range, and its JPEG bytes by name. */
	async function cleanFrames(loaded: Awaited<ReturnType<typeof project>>) {
		const roots = await prepareFootage(loaded, resolveMotionProject(loaded.project, null).clips);
		const range = roots[0];
		const folder = (await fs.readdir(range)).find((f) => /^clean-[0-9a-f]{12}$/.test(f));
		if (!folder) return null;
		const names = (await fs.readdir(path.join(range, folder)))
			.filter((f) => f.endsWith('.jpg'))
			.sort();
		const bytes = await Promise.all(names.map((n) => fs.readFile(path.join(range, folder, n))));
		return { range, folder, names, hashes: bytes.map(sha1) };
	}

	it('makes no clean plate unless asked, and keeps the source hash', async () => {
		const plain = await project(undefined);
		expect(await cleanFrames(plain)).toBeNull();
		const asked = await project(true);
		expect(asked.hashes.sources.talk).not.toBe(plain.hashes.sources.talk);
	});

	it('writes one clean frame per extracted frame, with the subject gone', async () => {
		const loaded = await project(true);
		const got = (await cleanFrames(loaded))!;
		expect(got.names.length).toBe(30);
		expect(got.names[0]).toBe('000000.jpg');
		// Frame 15: the head's centre shows the sky, not the head.
		const raw = ffmpeg([
			'-i',
			path.join(got.range, got.folder, '000015.jpg'),
			'-f',
			'rawvideo',
			'-pix_fmt',
			'rgb24',
			'pipe:1'
		]);
		const at = (x: number, y: number) => [...raw.subarray(3 * (y * SW + x), 3 * (y * SW + x) + 3)];
		const [r, , b] = at(180, 240);
		expect(b).toBeGreaterThan(200);
		expect(r).toBeLessThan(140);
		// Far from the subject: the plate's sky.
		expect(at(10, 40)[2]).toBeGreaterThan(200);
	}, 120_000);

	it('is byte-identical when built again from scratch', async () => {
		const loaded = await project(true);
		const first = (await cleanFrames(loaded))!;
		await fs.rm(path.join(first.range, first.folder), { recursive: true });
		const again = (await cleanFrames(loaded))!;
		expect(again.folder).toBe(first.folder);
		expect(again.hashes).toEqual(first.hashes);
	}, 120_000);

	it('builds again when the settings, the image or the matte change', async () => {
		const base = (await cleanFrames(await project(true)))!;
		const grown = (await cleanFrames(await project({ grow: 10 })))!;
		expect(grown.folder).not.toBe(base.folder);
		expect(grown.hashes).not.toEqual(base.hashes);
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			`color=c=0x336699:s=${SW}x${SH}`,
			'-frames:v',
			'1',
			path.join(dir, 'empty.png')
		]);
		const image = (await cleanFrames(await project({ image: 'empty.png' })))!;
		expect(image.folder).not.toBe(base.folder);
		// Another matte is another range folder altogether, with its own plates.
		await fs.copyFile(path.join(dir, 'talk.matte.mp4'), path.join(dir, 'other.matte.mp4'));
		const other = (await cleanFrames(await project(true, 'other.matte.mp4')))!;
		expect(other.range).not.toBe(base.range);
		expect(other.hashes).toEqual(base.hashes);
	}, 240_000);

	it('refuses a clean plate without a matte', async () => {
		const file = path.join(dir, 'nomatte.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', clean: true } },
				cuts: [{ source: 'talk', in: 0, out: 1 }],
				clips: []
			})
		);
		const loaded = await loadMotionProject(file);
		await expect(prepareFootage(loaded, [])).rejects.toThrow(/"clean" needs a matte/);
	});
});
