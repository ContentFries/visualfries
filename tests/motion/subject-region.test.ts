import { describe, expect, it } from 'vitest';
import {
	insideHalf,
	placeRegion,
	regionPivot,
	type RegionShape
} from '../../src/lib/motion/subject-region.js';
import { Clip } from '../../src/lib/motion/runtime.svelte.js';
import type { FootageMap } from '../../src/lib/motion/footage-map.js';
import type { ResolvedClip, SubjectBox } from '../../src/lib/motion/resolve.js';

/** 1000 × 2000 footage, the head's top at (500, 400), 400 px tall. */
const box: SubjectBox = {
	x: 0.2,
	y: 0.2,
	width: 0.6,
	height: 0.8,
	headX: 0.5,
	headY: 0.2,
	headHeight: 0.2
};
const frame = { width: 1000, height: 2000, box };
const half = (s: RegionShape | null) => s as Extract<RegionShape, { kind: 'half' }>;

describe('subject regions', () => {
	it('places a line head heights below the top of the head, through its column', () => {
		const s = half(placeRegion({ above: 0.3 }, frame));
		expect(s.kind).toBe('half');
		expect(s.at).toEqual({ x: 500, y: 520 });
		expect(s.dir).toEqual({ x: 1, y: 0 });
		expect(insideHalf(s, { x: 500, y: 500 })).toBe(true);
		expect(insideHalf(s, { x: 0, y: 519 })).toBe(true);
		expect(insideHalf(s, { x: 500, y: 540 })).toBe(false);
		// The number is shorthand for { head }.
		expect(placeRegion({ above: { head: 0.3 } }, frame)).toEqual(s);
	});

	it('tilts a head line clockwise and keeps "above" above it', () => {
		const s = half(placeRegion({ above: { head: 0.3, tilt: 20 } }, frame));
		expect(s.dir.x).toBeCloseTo(Math.cos((20 * Math.PI) / 180));
		expect(s.dir.y).toBeCloseTo(Math.sin((20 * Math.PI) / 180));
		// Right of the head the line is lower: a point there at the line's height is above it.
		expect(insideHalf(s, { x: 800, y: 540 })).toBe(true);
		expect(insideHalf(s, { x: 200, y: 500 })).toBe(false);
	});

	it('keeps "above" above for a tilt past 90°', () => {
		const level = half(placeRegion({ above: { head: 0.3, tilt: 0 } }, frame));
		const turned = half(placeRegion({ above: { head: 0.3, tilt: 180 } }, frame));
		expect(turned.dir.x).toBeCloseTo(1);
		expect(turned.dir.y).toBeCloseTo(0);
		for (const p of [
			{ x: 500, y: 500 },
			{ x: 500, y: 540 }
		])
			expect(insideHalf(turned, p)).toBe(insideHalf(level, p));
		const steep = half(placeRegion({ above: { head: 0.3, tilt: 200 } }, frame));
		const mild = half(placeRegion({ above: { head: 0.3, tilt: 20 } }, frame));
		expect(steep.dir.x).toBeCloseTo(mild.dir.x);
		expect(steep.dir.y).toBeCloseTo(mild.dir.y);
	});

	it('takes a line through two points either way round, and "below" as the other side', () => {
		const a = half(
			placeRegion(
				{
					below: {
						through: [
							[100, 300],
							[900, 500]
						]
					}
				},
				frame
			)
		);
		const b = half(
			placeRegion(
				{
					below: {
						through: [
							[900, 500],
							[100, 300]
						]
					}
				},
				frame
			)
		);
		expect(b.dir.x).toBeCloseTo(a.dir.x);
		expect(b.dir.y).toBeCloseTo(a.dir.y);
		expect(insideHalf(a, { x: 500, y: 1000 })).toBe(true);
		expect(insideHalf(a, { x: 500, y: 100 })).toBe(false);
		expect(() =>
			placeRegion(
				{
					above: {
						through: [
							[1, 1],
							[1, 1]
						]
					}
				},
				frame
			)
		).toThrow(/two different points/);
	});

	it('follows the head: the same region moves with the subject box', () => {
		const moved = { ...frame, box: { ...box, headX: 0.6, headY: 0.25 } };
		expect(half(placeRegion({ above: 0.3 }, moved)).at).toEqual({ x: 600, y: 620 });
		const path = placeRegion({ path: 'M 0 0 L 10 0 L 10 10 Z', origin: 'head' }, moved);
		expect(path).toEqual({ kind: 'path', d: 'M 0 0 L 10 0 L 10 10 Z', dx: 600, dy: 500 });
		const mask = placeRegion(
			{ mask: 'm.png', origin: 'head', x: -50, width: 100, height: 80 },
			moved
		);
		expect(mask).toEqual({ kind: 'mask', src: 'm.png', x: 550, y: 500, width: 100, height: 80 });
	});

	it('places nothing that follows a head when the matte finds no subject', () => {
		const empty = { ...frame, box: null };
		expect(placeRegion({ above: 0.3 }, empty)).toBeNull();
		expect(placeRegion({ path: 'M0 0Z', origin: 'head' }, empty)).toBeNull();
		expect(
			placeRegion(
				{
					above: {
						through: [
							[0, 1],
							[5, 1]
						]
					}
				},
				empty
			)
		).not.toBeNull();
		expect(placeRegion('all', empty)).toEqual({ kind: 'all' });
	});

	it('rejects what is not a region, saying what is', () => {
		expect(() => placeRegion({ inside: 1 } as never, frame)).toThrow(/A region is "all"/);
		expect(() => placeRegion({ path: 'M0 0Z', origin: 'face' } as never, frame)).toThrow(
			/origin must be/
		);
	});

	it('turns a lid about its middle: halfway between the cut and the top of the head', () => {
		const s = placeRegion({ above: 0.3 }, frame)!;
		expect(regionPivot(s, frame)).toEqual({ x: 500, y: 460 });
		const all = regionPivot({ kind: 'all' }, frame)!;
		expect(all.x).toBeCloseTo(500);
		expect(all.y).toBeCloseTo(1200);
		expect(regionPivot(s, { ...frame, box: null })).toBeNull();
	});
});

describe('clip.shown', () => {
	/** A clip from program frame 100, over a cut showing source frames 50… that holds 70 on. */
	const map: FootageMap = {
		frames: 200,
		totals: { talk: 300 },
		spans: [
			{ owner: 'c1', kind: 'cut', source: 'talk', startFrame: 0, frames: 200, srcIn: -50, last: 70 }
		],
		windows: []
	};
	const data = {
		id: 'x',
		block: 'b',
		start: 100 / 30,
		startFrame: 100,
		duration: 2,
		frames: 60,
		fps: 30,
		size: [100, 100],
		cues: {},
		words: {},
		props: {},
		footage: {
			talk: {
				url: '',
				first: 0,
				last: 299,
				total: 300,
				width: 100,
				height: 100,
				startFrame: 0,
				subject: true
			}
		},
		footageMap: map
	} as unknown as ResolvedClip;

	it('gives the source frame on screen through the cut list, holds included', () => {
		const clip = new Clip(data);
		expect(clip.shown()).toEqual({ source: 'talk', frame: 50 });
		expect(clip.shown('talk', 15)).toEqual({ source: 'talk', frame: 65 });
		// Past the cut's last source frame the hold shows it.
		expect(clip.shown(undefined, 40)).toEqual({ source: 'talk', frame: 70 });
		expect(clip.shown('other')).toBeNull();
	});

	it('plays footage from its start without a cut list', () => {
		const clip = new Clip({ ...data, footageMap: undefined } as ResolvedClip);
		expect(clip.shown()).toEqual({ source: 'talk', frame: 100 });
		expect(clip.shown('talk', 10)).toEqual({ source: 'talk', frame: 110 });
	});
});
