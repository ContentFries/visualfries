import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { previewChunks, renderPreview } from '../../src/lib/motion/preview.js';
import type { Placed } from '../../src/lib/motion/placement.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const placed = (id: string, programStart: number, programEnd: number, alpha = false): Placed & { file: string } => ({
	id,
	file: `${id}.${alpha ? 'mov' : 'mp4'}`,
	programStart,
	programEnd,
	alpha,
	in: programStart + 0.4,
	out: programEnd - 0.4,
	track: alpha ? 'V4' : 'V2'
});

describe('previewChunks', () => {
	it('opens only the clips that show inside each chunk', () => {
		const chunks = previewChunks([placed('a', 0, 5), placed('b', 58, 63), placed('c', 130, 131)], 150, 60);
		expect(chunks.map((c) => c.clips.map((p) => p.id))).toEqual([['a', 'b'], ['b'], ['c']]);
		expect(chunks.map((c) => [c.t0, c.t1])).toEqual([[0, 60], [60, 120], [120, 150]]);
	});
});

describe('renderPreview', () => {
	it.skipIf(!hasFfmpeg)('lays clips over the base in their windows, frame-exact across chunks', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-preview-'));
		const ff = (a: string[]) => {
			const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
			if (r.status !== 0) throw new Error(String(r.stderr));
			return r.stdout;
		};
		ff(['-f', 'lavfi', '-i', 'color=blue:s=64x36:r=25:d=6', '-f', 'lavfi', '-i', 'sine=d=6', '-shortest', '-pix_fmt', 'yuv420p', path.join(dir, 'base.mp4')]);
		ff(['-f', 'lavfi', '-i', 'color=red:s=64x36:r=25:d=2', '-pix_fmt', 'yuv420p', path.join(dir, 'a.mp4')]);
		// alpha clip: green square in the middle, transparent around
		ff(['-f', 'lavfi', '-i', 'color=black:s=64x36:r=25:d=2', '-vf', "format=rgba,geq=r='0':g='200':b='0':a='if(between(X,22,41)*between(Y,8,27),255,0)'", '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', path.join(dir, 'b.mov')]);
		const out = path.join(dir, 'p.mp4');
		const res = await renderPreview({
			base: path.join(dir, 'base.mp4'),
			placed: [placed('a', 0.6, 2.6), placed('b', 2.8, 4.8, true)],
			clipsDir: dir,
			output: out,
			fps: 25,
			size: [64, 36],
			chunkSeconds: 2 // chunk borders at 2 s and 4 s cut through both clips
		});
		expect(res.chunks).toBe(3);
		const pixel = (t: number, x: number, y: number) => {
			// 2×2 (yuv420p chroma is subsampled), first pixel
			const raw = ff(['-ss', String(t), '-i', out, '-frames:v', '1', '-vf', `crop=2:2:${x}:${y},format=rgb24`, '-f', 'rawvideo', '-']);
			return [...raw.subarray(0, 3)];
		};
		const red = (p: number[]) => p[0] > 180 && p[2] < 80;
		const blue = (p: number[]) => p[2] > 180 && p[0] < 80;
		const green = (p: number[]) => p[1] > 90 && p[0] < 80 && p[2] < 80;
		expect(blue(pixel(0.5, 5, 5))).toBe(true); // before a's window (0.6 + 0.4 handle)
		expect(red(pixel(1.5, 5, 5))).toBe(true); // a, first chunk
		expect(red(pixel(2.1, 5, 5))).toBe(true); // a, second chunk (window ends at 2.2)
		expect(blue(pixel(2.3, 5, 5))).toBe(true); // after a's window
		expect(green(pixel(4.1, 32, 18))).toBe(true); // b over the base, third chunk
		expect(blue(pixel(4.1, 5, 5))).toBe(true); // b is transparent around the square
		const frames = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out]).stdout.toString().trim();
		expect(Number(frames)).toBe(150);
		await fs.rm(dir, { recursive: true, force: true });
	}, 120_000);
});
