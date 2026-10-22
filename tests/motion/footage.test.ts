import { describe, expect, it } from 'vitest';
import { footageFrameRange, footageFrameUrl, subjectBox } from '../../src/lib/motion/footage.js';
import { loadMotionProject, measureSubject, prepareFootage } from '../../src/lib/motion/node.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { planMatteChunks } from '../../src/lib/motion/matte.js';
import { MotionProjectShape } from '../../src/lib/motion/project.js';
import { resolveMotionProject } from '../../src/lib/motion/resolve.js';

const url = 'http://visualfries.local/@fs/p/.visualfries/footage/talk-1/';
const frames = {
	url,
	first: 30,
	last: 120,
	ranges: [{ url, first: 30, last: 120 }],
	total: 121,
	width: 1000,
	height: 1080,
	startFrame: 15,
	subject: true
};

describe('footageFrameUrl', () => {
	it('maps a program frame to the footage frame that plays then', () => {
		expect(footageFrameUrl(frames, 60, 'plate')).toBe(`${frames.url}plate/000045.jpg`);
		expect(footageFrameUrl(frames, 60, 'subject')).toBe(`${frames.url}subject/000045.png`);
	});

	it('holds the last frame after the footage ends', () => {
		expect(footageFrameUrl(frames, 500, 'plate')).toBe(`${frames.url}plate/000120.jpg`);
		expect(footageFrameUrl({ ...frames, ranges: [{ url, first: 0, last: 120 }] }, 0, 'plate')).toBe(
			`${frames.url}plate/000000.jpg`
		);
	});

	it('reads frames without "ranges" from the single range in url, first and last', () => {
		const { ranges: _ranges, ...single } = frames;
		expect(footageFrameUrl(single, 60, 'plate')).toBe(`${url}plate/000045.jpg`);
		expect(() => footageFrameUrl(single, 20, 'plate')).toThrow(/frames 30–120/);
		const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.4, headX: 0.25, headY: 0.2 };
		const boxed = { ...single, first: 30, last: 31, boxes: [box, { ...box, x: 0.3 }] };
		expect(subjectBox(boxed, 15 + 31)?.x).toBe(0.3);
		// Frame 29 was not extracted: the edge frame 30 holds.
		expect(subjectBox(boxed, 15 + 30, 1)?.x).toBeCloseTo((0.1 + 0.1 + 0.3) / 3);
	});

	it('refuses a frame inside the footage that was not extracted', () => {
		expect(() => footageFrameUrl(frames, 20, 'plate')).toThrow(/margin/);
	});
});

describe('footageFrameRange', () => {
	it('covers every clip plus a margin, inside the footage', () => {
		const clips = [
			{ startFrame: 100, frames: 50 },
			{ startFrame: 300, frames: 30 }
		];
		expect(footageFrameRange(clips, 30, 1000, 60)).toEqual({ first: 10, last: 360 });
		expect(footageFrameRange(clips, 0, 200, 60)).toEqual({ first: 40, last: 199 });
	});

	it('returns null when the clips never show the footage', () => {
		expect(footageFrameRange([{ startFrame: 900, frames: 10 }], 0, 100, 0)).toBeNull();
		expect(footageFrameRange([], 0, 100, 0)).toBeNull();
	});
});

describe('planMatteChunks', () => {
	it('splits a video into requests the matte API accepts', () => {
		expect(planMatteChunks(1000, 480)).toEqual([
			{ first: 0, last: 479 },
			{ first: 480, last: 959 },
			{ first: 960, last: 999 }
		]);
		expect(planMatteChunks(510, 512)).toEqual([{ first: 0, last: 509 }]);
	});

	it('rejects chunks above the provider limit', () => {
		expect(() => planMatteChunks(100, 600, 512)).toThrow(/512/);
		expect(planMatteChunks(100, 600)).toEqual([{ first: 0, last: 99 }]);
	});
});

describe('footage in the project file', () => {
	const project = (extra: Record<string, unknown> = {}) =>
		MotionProjectShape.parse({
			size: [1080, 1920],
			fps: 30,
			footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', start: 0.5 } },
			clips: [{ id: 'a', block: 'blocks/A.svelte', from: 1, until: 2, ...extra }]
		});

	it('resolves the clip audio', () => {
		const resolved = resolveMotionProject(project({ audio: 'talk' }), null);
		expect(resolved.diagnostics).toEqual([]);
		expect(resolved.clips[0].audio).toBe('talk');
	});

	it('reports audio that names no footage', () => {
		const resolved = resolveMotionProject(project({ audio: 'voice' }), null);
		expect(resolved.diagnostics).toContainEqual(
			expect.objectContaining({ level: 'error', clip: 'a', field: 'audio' })
		);
	});

	it('rejects footage names that are not identifiers', () => {
		expect(() =>
			MotionProjectShape.parse({
				size: [100, 100],
				fps: 30,
				footage: { 'my talk': { src: 'a.mp4' } },
				clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 1 }]
			})
		).toThrow();
	});
});

describe('subject boxes', () => {
	it('measures the box and the top of the head on a matte frame', () => {
		const w = 10,
			h = 10;
		const gray = new Uint8Array(w * h);
		// Shoulders across rows 6–9, head at columns 4–5 from row 2.
		for (let y = 2; y < 10; y++)
			for (let x = 0; x < w; x++) if (y >= 6 || x === 4 || x === 5) gray[y * w + x] = 255;
		expect(measureSubject(gray, w, h)).toEqual({
			x: 0,
			y: 0.2,
			width: 1,
			height: 0.8,
			headX: 0.5,
			headY: 0.2,
			// The head is two columns wide: about 1.4 times that from the top to the chin.
			headHeight: 0.28
		});
		expect(measureSubject(new Uint8Array(w * h), w, h)).toBeNull();
	});

	it('measures the head size by its widest row above the shoulders', () => {
		// A 40 × 80 matte: an ellipse head 16 wide and 22 tall from row 10, shoulders from row 36.
		const w = 40,
			h = 80;
		const gray = new Uint8Array(w * h);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++) {
				const head = ((x + 0.5 - 20) / 8) ** 2 + ((y + 0.5 - 21) / 11) ** 2 <= 1;
				if (head || y >= 36) gray[y * w + x] = 255;
			}
		const box = measureSubject(gray, w, h)!;
		expect(box.headY).toBeCloseTo(10 / 80, 3);
		// 1.4 × 16 px of 80: the shoulders never count, however wide.
		expect(box.headHeight).toBeCloseTo((1.4 * 16) / 80, 3);
	});

	it('looks up and smooths the box for a program frame', () => {
		const box = (x: number) => ({
			x,
			y: 0.2,
			width: 0.5,
			height: 0.8,
			headX: x + 0.25,
			headY: 0.2
		});
		const boxes = [box(0.1), box(0.2), null, box(0.3)];
		const withBoxes = { ...frames, ranges: [{ url, first: 30, last: 33, boxes }] };
		expect(subjectBox(withBoxes, 15 + 31)?.x).toBe(0.2);
		expect(subjectBox(withBoxes, 15 + 31, 1)?.x).toBeCloseTo(0.15);
		// Missing frames are skipped; frames outside the extracted range hold the edge.
		expect(subjectBox(withBoxes, 15 + 32)).toBeNull();
		expect(subjectBox(withBoxes, 15 + 32, 1)?.x).toBeCloseTo(0.25);
		expect(subjectBox(withBoxes, 15 + 200)?.x).toBe(0.3);
		expect(subjectBox(frames, 60)).toBeNull();
		// The head's height averages over the boxes that have one (older extractions lack it).
		const sized = [{ ...box(0.1), headHeight: 0.3 }, { ...box(0.1), headHeight: 0.5 }, box(0.1)];
		const withSizes = { ...frames, ranges: [{ url, first: 30, last: 32, boxes: sized }] };
		expect(subjectBox(withSizes, 15 + 31, 1)?.headHeight).toBeCloseTo(0.4);
		expect(subjectBox(withSizes, 15 + 32)?.headHeight).toBeUndefined();
	});
});

describe('prepareFootage subject boxes', () => {
	const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
	it.skipIf(!hasFfmpeg)('measures the subject in every extracted frame', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-boxes-'));
		const run = (args: string[]) => {
			const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
			if (r.status !== 0) throw new Error(String(r.stderr));
		};
		run([
			'-f',
			'lavfi',
			'-i',
			'testsrc2=size=160x160:rate=30:duration=1',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'talk.mp4')
		]);
		// White square from x 40–119, y 60–159: the "subject".
		run([
			'-f',
			'lavfi',
			'-i',
			'color=black:s=160x160:r=30:d=1',
			'-vf',
			"geq=lum='if(between(X,40,119)*gte(Y,60),255,0)':cb=128:cr=128",
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'talk.matte.mp4')
		]);
		await fs.writeFile(
			path.join(dir, 'p.vf.json'),
			JSON.stringify({
				size: [160, 160],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 0.5 }]
			})
		);
		const loaded = await loadMotionProject(path.join(dir, 'p.vf.json'));
		await prepareFootage(loaded, loaded.resolved.clips);
		const frames = loaded.resolved.clips[0].footage!.talk;
		expect(frames.boxes).toHaveLength(frames.last - frames.first + 1);
		expect(frames.ranges).toEqual([
			{ url: frames.url, first: frames.first, last: frames.last, boxes: frames.boxes }
		]);
		const box = subjectBox(frames, 5)!;
		expect(box.x).toBeCloseTo(0.25, 1);
		expect(box.width).toBeCloseTo(0.5, 1);
		expect(box.headY).toBeCloseTo(0.375, 1);
		expect(box.headHeight).toBeGreaterThan(0);
		// A cache from before heads had a size is measured again in place, its frames kept.
		const cache = path.join(dir, '.visualfries', 'footage');
		const [folder] = await fs.readdir(cache);
		const donePath = path.join(cache, folder, 'done.json');
		const done = JSON.parse(await fs.readFile(donePath, 'utf8'));
		const old = done.boxes.map((b: Record<string, unknown> | null) => {
			if (!b) return b;
			const { headHeight: _, ...rest } = b;
			return rest;
		});
		await fs.writeFile(donePath, JSON.stringify({ ...done, boxes: old }));
		const again = await loadMotionProject(path.join(dir, 'p.vf.json'));
		await prepareFootage(again, again.resolved.clips);
		expect(await fs.readdir(cache)).toEqual([folder]);
		expect(again.resolved.clips[0].footage!.talk.boxes).toEqual(done.boxes);
		await fs.rm(dir, { recursive: true, force: true });
	});
});
