import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { footageCacheKey, loadMotionProject, prepareFootage } from '../../src/lib/motion/node.js';
import { footageFrameAt, sourceFrameUrl } from '../../src/lib/motion/footage.js';
import { footageAt, sourceFrameAt } from '../../src/lib/motion/footage-map.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** Bits of the frame number, one 8 px column each, white = 1. */
const BITS = 10;
const W = BITS * 8;
const H = 16;

function run(args: string[]): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		maxBuffer: 1 << 26
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** The frame number written into an extracted frame (a jpg or png file). */
function frameNumber(file: string): number {
	const gray = run(['-i', file, '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1']);
	let n = 0;
	for (let bit = 0; bit < BITS; bit++) if (gray[(H / 2) * W + bit * 8 + 4] > 128) n += 1 << bit;
	return n;
}

const fromUrl = (url: string) => fileURLToPath('file://' + url.replace(/^http:\/\/[^/]+\/@fs/, ''));

describe.skipIf(!hasFfmpeg)('footage by source range (numbered frames)', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-ranges-'));
		// 300 frames at 30 fps; every frame shows its own number in binary.
		run([
			'-f',
			'lavfi',
			'-i',
			`color=black:s=${W}x${H}:r=30:d=10`,
			'-vf',
			`geq=lum='mod(floor(N/pow(2,floor(X/8))),2)*255':cb=128:cr=128`,
			'-g',
			'60',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'num.mp4')
		]);
		// The matte: everything is subject.
		run([
			'-f',
			'lavfi',
			'-i',
			`color=white:s=${W}x${H}:r=30:d=10`,
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'num.matte.mp4')
		]);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const write = (name: string, project: object) =>
		fs.writeFile(path.join(dir, name), JSON.stringify(project));

	it('extracts two disjoint ranges frame-exact and maps program frames into them', async () => {
		await write('cuts.vf.json', {
			size: [W, H],
			fps: 30,
			footage: { num: { src: 'num.mp4', matte: 'num.matte.mp4', margin: 0 } },
			cuts: [
				{ source: 'num', in: 1, out: 2 },
				{ source: 'num', in: 8, out: 9 }
			],
			clips: [{ id: 'a', block: 'b.svelte', from: 0.5, until: 1.5 }]
		});
		const loaded = await loadMotionProject(path.join(dir, 'cuts.vf.json'));
		const roots = await prepareFootage(loaded, loaded.resolved.clips);
		const clip = loaded.resolved.clips[0];
		const frames = clip.footage!.num;
		expect(frames.ranges.map(({ first, last }) => ({ first, last }))).toEqual([
			{ first: 30, last: 59 },
			{ first: 240, last: 269 }
		]);
		expect(roots).toHaveLength(2);
		for (const range of frames.ranges) {
			const folder = fromUrl(range.url);
			const plates = (await fs.readdir(path.join(folder, 'plate'))).sort();
			expect(plates).toHaveLength(range.last - range.first + 1);
			expect(range.boxes).toHaveLength(plates.length);
			// Every extracted file holds the frame its name says, picture and cut-out alike.
			for (const file of plates) {
				const n = Number(file.slice(0, 6));
				expect(frameNumber(path.join(folder, 'plate', file))).toBe(n);
				expect(frameNumber(path.join(folder, 'subject', file.replace('.jpg', '.png')))).toBe(n);
			}
		}
		// Program frame → the file <Footage> loads → the number in its pixels.
		const shown = (programFrame: number) =>
			frameNumber(
				fromUrl(footageFrameAt(clip.footage!, clip.footageMap!, 'num', programFrame, 'plate').url)
			);
		expect(shown(0)).toBe(30);
		expect(shown(29)).toBe(59);
		expect(shown(30)).toBe(240);
		expect(shown(59)).toBe(269);
		expect(sourceFrameAt(clip.footageMap!, 'num', 45)?.frame).toBe(255);
	});

	it('runs into handles and holds the edge frame where the source runs out', async () => {
		await write('handles.vf.json', {
			size: [W, H],
			fps: 30,
			footage: { num: { src: 'num.mp4', margin: 0 } },
			cuts: [
				// The end of the file, then a push into a cut with 3 frames of handle (it needs 6).
				{ source: 'num', in: 9, out: 10 },
				{ source: 'num', in: 0.1, out: 1, transition: { type: 'push', duration: 0.4 } }
			],
			clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 2 }]
		});
		const loaded = await loadMotionProject(path.join(dir, 'handles.vf.json'));
		await prepareFootage(loaded, loaded.resolved.clips);
		const clip = loaded.resolved.clips[0];
		const map = clip.footageMap!;
		const num = clip.footage!.num;
		const views = (f: number) =>
			footageAt(map, f).map((v) => `${v.source}${v.frame}${v.held ? '!' : ''}`);
		expect(views(23)).toEqual(['num293']);
		expect(views(24)).toEqual(['num294', 'num0!']);
		expect(views(27)).toEqual(['num297', 'num0']);
		expect(views(29)).toEqual(['num299', 'num2']);
		expect(views(30)).toEqual(['num3', 'num299!']);
		expect(views(35)).toEqual(['num8', 'num299!']);
		expect(views(36)).toEqual(['num9']);
		expect(num.ranges.map(({ first, last }) => ({ first, last }))).toEqual([
			{ first: 0, last: 29 },
			{ first: 270, last: 299 }
		]);
		// Every side of every window frame is extracted and shows the frame the map names.
		for (let f = 20; f < 40; f++)
			for (const v of footageAt(map, f))
				expect(frameNumber(fromUrl(sourceFrameUrl(num, v.frame, 'plate')))).toBe(v.frame);
		const picture = (f: number) =>
			frameNumber(fromUrl(footageFrameAt(clip.footage!, map, null, f, 'plate').url));
		expect([0, 29, 30, 56].map(picture)).toEqual([270, 299, 3, 29]);
	});

	it('maps frame-exact through a frame rate conversion', async () => {
		await write('half.vf.json', {
			size: [W, H],
			fps: 15,
			footage: { num: { src: 'num.mp4', margin: 0 } },
			cuts: [
				{ source: 'num', in: 1, out: 2 },
				{ source: 'num', in: 8, out: 9 }
			],
			clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 2 }]
		});
		const loaded = await loadMotionProject(path.join(dir, 'half.vf.json'));
		await prepareFootage(loaded, loaded.resolved.clips);
		const clip = loaded.resolved.clips[0];
		expect(clip.footage!.num.ranges.map(({ first, last }) => [first, last])).toEqual([
			[15, 29],
			[120, 134]
		]);
		for (const f of [0, 7, 14, 15, 29]) {
			const url = footageFrameAt(clip.footage!, clip.footageMap!, null, f, 'plate').url;
			const projectFrame = f < 15 ? 15 + f : 120 + f - 15;
			// Frame k at 15 fps is frame 2k of the 30 fps file.
			expect(frameNumber(fromUrl(url))).toBe(2 * projectFrame);
		}
	});
});

describe('legacy footage cache key', () => {
	it('is unchanged for inserts mode', () => {
		// Values computed by the key before ranges existed; a change invalidates every cache.
		const sizes: ([number, number] | null)[] = [
			[1000, 1700000000000.5],
			[200, 1700000000001]
		];
		expect(
			footageCacheKey({
				src: '/p/talk.mp4',
				matte: '/p/talk.matte.mp4',
				sizes,
				fps: 30,
				range: { first: 12, last: 345 }
			})
		).toBe('eb1add80b514');
		expect(
			footageCacheKey({
				src: '/p/talk.mp4',
				matte: null,
				sizes: [[1000, 1700000000000.5], null],
				fps: 30,
				range: { first: 0, last: 0 }
			})
		).toBe('3ac801e86780');
	});
});
