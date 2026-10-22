// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cleanFrame, cleanPlate, defaultGrow, holeMask } from '../../src/lib/motion/clean-plate.js';
import {
	cleanPlateWarnings,
	findChromium,
	loadMotionProject,
	prepareFootage
} from '../../src/lib/motion/node.js';
import { checkProgram } from '../../src/lib/motion/program-node.js';
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

	it('runs a sky gradient straight through a head-shaped hole (the relaxation)', () => {
		// Push-pull alone takes the average of a wide area into the middle of a big hole, 5 or
		// 6 levels off a sky gradient; relaxed, the fill stays within 3 of the sky behind.
		const W = 160;
		const H = 320;
		const sky = (y: number) => [60, 100 + y / 3, 250 - y / 2];
		const head = (x: number, y: number) => ((x - 80) / 55) ** 2 + ((y - 150) / 110) ** 2 < 1;
		const rgb = new Uint8Array(W * H * 3);
		const matte = new Uint8Array(W * H);
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				rgb.set(head(x, y) ? [250, 20, 20] : sky(y), 3 * (y * W + x));
				matte[y * W + x] = head(x, y) ? 255 : 0;
			}
		const out = cleanPlate(rgb, matte, W, H, { grow: 2 });
		for (let y = 41; y < 260; y++) {
			const i = 3 * (y * W + 80);
			expect(Math.abs(out[i + 1] - sky(y)[1]), `green at ${y}`).toBeLessThan(3);
			expect(Math.abs(out[i + 2] - sky(y)[2]), `blue at ${y}`).toBeLessThan(3);
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

	it('keeps the picture where nothing is left to fill from, and says so', () => {
		const { rgb, matte } = scene(8, 8, () => [1, 2, 3], [0, 0, 8, 8]);
		expect(Buffer.from(cleanPlate(rgb, matte, 8, 8)).equals(Buffer.from(rgb))).toBe(true);
		expect(cleanFrame(rgb, matte, 8, 8).full).toBe(true);
		// The matte leaves a border, but the grown hole covers it: nothing to fill from either.
		const grown = scene(20, 20, () => [1, 2, 3], [2, 2, 18, 18]);
		expect(cleanFrame(grown.rgb, grown.matte, 20, 20, { grow: 3 }).full).toBe(true);
		expect(cleanFrame(grown.rgb, grown.matte, 20, 20, { grow: 1 }).full).toBe(false);
		// A picture of the empty scene fills any frame.
		const image = new Uint8Array(8 * 8 * 3);
		expect(cleanFrame(rgb, matte, 8, 8, { image }).full).toBe(false);
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

	it('clears plates a killed run left half built', async () => {
		const loaded = await project(true);
		const got = (await cleanFrames(loaded))!;
		// A process id far above any running one: that run is gone.
		const orphan = path.join(got.range, `${got.folder}.tmp-99999999-0123abcd`);
		await fs.mkdir(orphan);
		await fs.writeFile(path.join(orphan, '000000.jpg'), 'half');
		await fs.rm(path.join(got.range, got.folder), { recursive: true });
		await cleanFrames(loaded);
		expect((await fs.readdir(got.range)).filter((f) => f.includes('.tmp-'))).toEqual([]);
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

	it('has the colours of the plates, also for footage tagged BT.709', async () => {
		const tagged = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-clean-709-'));
		try {
			writeFootage(tagged, 1, true);
			const file = path.join(tagged, 'p.vf.json');
			await fs.writeFile(
				file,
				JSON.stringify({
					size: [SW, SH],
					fps: 30,
					footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', clean: true } },
					cuts: [{ source: 'talk', in: 0, out: 1 }],
					clips: []
				})
			);
			const loaded = await loadMotionProject(file);
			const [range] = await prepareFootage(loaded, []);
			const folder = (await fs.readdir(range)).find((f) => f.startsWith('clean-'))!;
			const rgb = (jpg: string) =>
				ffmpeg(['-i', jpg, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
			const plate = rgb(path.join(range, 'plate', '000010.jpg'));
			const clean = rgb(path.join(range, folder, '000010.jpg'));
			// The sky left of the speaker and the saturated field below: the plate's colours to a
			// level on the sky, two on the field (a JPEG round trip of a saturated green), where
			// a BT.709 decode of the footage puts red about 5 levels off.
			for (const [x0, y0, most] of [
				[10, 40, 1],
				[10, 500, 2.01]
			]) {
				const mean = (b: Buffer, c: number) => {
					let sum = 0;
					for (let y = y0; y < y0 + 30; y++)
						for (let x = x0; x < x0 + 30; x++) sum += b[3 * (y * SW + x) + c];
					return sum / 900;
				};
				for (const c of [0, 1, 2])
					expect(
						Math.abs(mean(clean, c) - mean(plate, c)),
						`${x0},${y0} channel ${c}`
					).toBeLessThan(most);
			}
		} finally {
			await fs.rm(tagged, { recursive: true, force: true });
		}
	}, 120_000);

	it.skipIf(!findChromium())(
		'tells check and program about frames the matte covers whole',
		async () => {
			const covered = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-clean-full-'));
			try {
				writeFootage(covered, 1);
				// The matte covers the whole picture for the first 10 frames.
				ffmpeg([
					'-f',
					'lavfi',
					'-i',
					`color=black:s=${SW}x${SH}:r=30:d=1`,
					'-vf',
					`geq=lum='if(lt(N,10),255,if(lt(pow((X-180)/70,2)+pow((Y-240)/90,2),1),255,0))':cb=128:cr=128`,
					'-pix_fmt',
					'yuv420p',
					path.join(covered, 'talk.matte.mp4')
				]);
				const file = path.join(covered, 'p.vf.json');
				await fs.writeFile(
					file,
					JSON.stringify({
						size: [SW, SH],
						fps: 30,
						footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', clean: true } },
						cuts: [{ source: 'talk', in: 0, out: 1 }],
						clips: []
					})
				);
				const loaded = await loadMotionProject(file);
				expect(await cleanPlateWarnings(loaded)).toEqual([]);
				const results = await checkProgram(loaded);
				const told = results.flatMap((r) => r.warnings.map((w) => w.message));
				const expected =
					'Footage "talk": the clean plate cannot be built for 10 frames (0.00–0.30 s of the source)';
				expect(told.filter((m) => m.startsWith(expected))).toHaveLength(1);
				// `program` reads the same from the plates check built.
				const cached = await cleanPlateWarnings(loaded);
				expect(cached).toHaveLength(1);
				expect(cached[0].startsWith(expected)).toBe(true);
			} finally {
				await fs.rm(covered, { recursive: true, force: true });
			}
		},
		180_000
	);

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
