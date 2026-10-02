import { describe, expect, it } from 'vitest';
import { footageFrameRange, footageFrameUrl } from '../../src/lib/motion/footage.js';
import { planMatteChunks } from '../../src/lib/motion/matte.js';
import { MotionProjectShape } from '../../src/lib/motion/project.js';
import { resolveMotionProject } from '../../src/lib/motion/resolve.js';

const frames = {
	url: 'http://visualfries.local/@fs/p/.visualfries/footage/talk-1/',
	first: 30,
	last: 120,
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

	it('holds the nearest extracted frame outside the range', () => {
		expect(footageFrameUrl(frames, 0, 'plate')).toBe(`${frames.url}plate/000030.jpg`);
		expect(footageFrameUrl(frames, 500, 'plate')).toBe(`${frames.url}plate/000120.jpg`);
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

	it('rejects chunks above the API limit', () => {
		expect(() => planMatteChunks(100, 600)).toThrow(/512/);
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
