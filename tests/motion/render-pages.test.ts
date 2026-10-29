// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * How many pages a render keeps open, with pages that draw a plain frame instead of a stage:
 * opening, reusing and closing is all the render's own scheduling.
 */
const pages = { live: 0, peak: 0, opened: 0 };
/** Milliseconds a frame takes to draw, by the first program frame of its 40-frame chunk. */
const slow = new Map<number, number>();
/** Milliseconds closing a page of these segments takes: it is open until then. */
const slowClose = new Map<string, number>();
const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
let png: Buffer;

vi.mock('../../src/lib/motion/program-node.js', async (actual) => ({
	...(await actual<typeof import('../../src/lib/motion/program-node.js')>()),
	openSegment: async (_b: unknown, _u: unknown, _p: unknown, segment: { id: string }) => {
		pages.live++;
		pages.opened++;
		pages.peak = Math.max(pages.peak, pages.live);
		return {
			mode: 'test',
			capture: async (f: number) => {
				const ms = slow.get(f - (f % 40));
				if (ms) await wait(ms);
				return png;
			},
			close: async () => {
				await wait(slowClose.get(segment.id));
				pages.live--;
			}
		};
	}
}));
vi.mock('../../src/lib/motion/node.js', async (actual) => {
	const real = await actual<typeof import('../../src/lib/motion/node.js')>();
	return {
		...real,
		launch: async () => ({ close: async () => {} }),
		bundleMotionProject: async () => ({
			dir: await fs.mkdtemp(path.join(os.tmpdir(), 'vf-bundle-')),
			footage: { frames: {}, map: null }
		})
	};
});

const { loadMotionProject } = await import('../../src/lib/motion/node.js');
const { renderProgramVideo } = await import('../../src/lib/motion/program-render.js');

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const ffmpeg = (args: string[]) => {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 26 });
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
};

describe.skipIf(!hasFfmpeg)('render pages', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-pages-'));
		png = ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'color=black:s=64x36',
			'-frames:v',
			'1',
			'-c:v',
			'png',
			'-f',
			'image2pipe',
			'pipe:1'
		]);
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'color=gray:s=64x36:r=10:d=16',
			'-c:v',
			'libx264',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'num.mp4')
		]);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('keeps no more pages open than --jobs, closing an idle page before opening another', async () => {
		// Two hard cuts, two segments of 80 frames, each two chunks of 40. Chunk two of the first
		// segment is slow: the page done with chunk one waits idle for it while its worker goes
		// on to the second segment.
		const file = path.join(dir, 'pages.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [64, 36],
				fps: 10,
				background: '#000000',
				footage: { num: { src: 'num.mp4' } },
				cuts: [
					{ id: 'a', source: 'num', in: 0, out: 8 },
					{ id: 'b', source: 'num', in: 8, out: 16 }
				]
			})
		);
		slow.set(40, 25);
		const r = await renderProgramVideo(await loadMotionProject(file), {
			output: path.join(dir, 'pages.mp4'),
			jobs: 2,
			schedule: 'segments'
		});
		expect(r.segments.map((s) => [s.id, s.startFrame, s.frames])).toEqual([
			['seg1.1', 0, 40],
			['seg1.2', 40, 40],
			['seg2.1', 80, 40],
			['seg2.2', 120, 40]
		]);
		expect(pages.peak).toBeLessThanOrEqual(2);
		expect(pages.live).toBe(0);
	}, 60_000);

	it('counts a page as open until it has closed', async () => {
		// Segments of one, two and one chunk with --jobs 3. The first segment's page closes
		// slowly; meanwhile the page done with chunk one of the second segment waits idle and
		// its worker goes on to the third segment.
		const file = path.join(dir, 'closing.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [64, 36],
				fps: 10,
				background: '#000000',
				footage: { num: { src: 'num.mp4' } },
				cuts: [
					{ id: 'a', source: 'num', in: 0, out: 4 },
					{ id: 'b', source: 'num', in: 4, out: 12 },
					{ id: 'c', source: 'num', in: 12, out: 16 }
				]
			})
		);
		Object.assign(pages, { live: 0, peak: 0, opened: 0 });
		slow.clear();
		slow.set(40, 5);
		slow.set(80, 25);
		slowClose.set('seg1', 1500);
		const r = await renderProgramVideo(await loadMotionProject(file), {
			output: path.join(dir, 'closing.mp4'),
			jobs: 3,
			schedule: 'segments'
		});
		expect(r.segments.map((s) => [s.id, s.startFrame, s.frames])).toEqual([
			['seg1', 0, 40],
			['seg2.1', 40, 40],
			['seg2.2', 80, 40],
			['seg3', 120, 40]
		]);
		expect(pages.peak).toBeLessThanOrEqual(3);
		expect(pages.live).toBe(0);
	}, 60_000);
});
