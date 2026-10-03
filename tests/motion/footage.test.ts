import { describe, expect, it } from 'vitest';
import { footageFrameRange, footageFrameUrl, subjectBox } from '../../src/lib/motion/footage.js';
import { measureSubject } from '../../src/lib/motion/node.js';
import { planMatteChunks } from '../../src/lib/motion/matte.js';
import { MotionProjectShape } from '../../src/lib/motion/project.js';
import { resolveMotionProject } from '../../src/lib/motion/resolve.js';

const frames = {
	url: 'http://visualfries.local/@fs/p/.visualfries/footage/talk-1/',
	first: 30,
	last: 120,
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
		expect(footageFrameUrl({ ...frames, first: 0 }, 0, 'plate')).toBe(
			`${frames.url}plate/000000.jpg`
		);
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
			headY: 0.2
		});
		expect(measureSubject(new Uint8Array(w * h), w, h)).toBeNull();
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
		const withBoxes = {
			...frames,
			first: 30,
			last: 33,
			boxes: [box(0.1), box(0.2), null, box(0.3)]
		};
		expect(subjectBox(withBoxes, 15 + 31)?.x).toBe(0.2);
		expect(subjectBox(withBoxes, 15 + 31, 1)?.x).toBeCloseTo(0.15);
		// Missing frames are skipped; frames outside the extracted range hold the edge.
		expect(subjectBox(withBoxes, 15 + 32)).toBeNull();
		expect(subjectBox(withBoxes, 15 + 32, 1)?.x).toBeCloseTo(0.25);
		expect(subjectBox(withBoxes, 15 + 200)?.x).toBe(0.3);
		expect(subjectBox(frames, 60)).toBeNull();
	});
});
