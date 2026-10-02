import { describe, expect, it } from 'vitest';
import { footageFrameRange, footageFrameUrl } from '../../src/lib/motion/footage.js';
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
