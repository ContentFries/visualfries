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
/** Frames of these chunks (by their first program frame) take a while to draw. */
const slow = new Set<number>();
let png: Buffer;

vi.mock('../../src/lib/motion/program-node.js', async (actual) => ({
	...(await actual<typeof import('../../src/lib/motion/program-node.js')>()),
	openSegment: async () => {
		pages.live++;
		pages.opened++;
		pages.peak = Math.max(pages.peak, pages.live);
		return {
			mode: 'test',
			capture: async (f: number) => {
				if ([...slow].some((from) => f >= from && f < from + 40))
					await new Promise((r) => setTimeout(r, 25));
				return png;
			},
			close: async () => {
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
		slow.add(40);
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
});
