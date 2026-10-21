import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram } from '$lib/motion/program.js';
import {
	footageAt,
	footageMap,
	footageRanges,
	programFootageAt,
	sourceFrameAt,
	type FootageMap
} from '$lib/motion/footage-map.js';
import { footageFrameAt } from '$lib/motion/footage.js';
import type { FootageFrames } from '$lib/motion/resolve.js';

const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1920,
	height: 1080,
	fps: 30,
	audio: false
});

/**
 * Program frames (30 fps):
 *   cut1 a  0–29   source 30–59
 *   cut2 b 30–56   source 3–29, push window 24–35 (b handle needs 6 frames, has 3)
 *   cut3 a 57–86   source 270–299 (the end of a), wipe window 51–62
 *   cut4 b 87–116  source 30–59, push window 81–92 (a runs out: its last frame holds)
 *   shot "insert" frames b from source 15 over program 6–14, hiding cut1.
 */
const project = parseMotionProject({
	size: [1920, 1080],
	fps: 30,
	footage: { a: { src: 'a.mp4' }, b: { src: 'b.mp4' } },
	cuts: [
		{ source: 'a', in: 1, out: 2 },
		{ source: 'b', in: 0.1, out: 1, transition: { type: 'push', duration: 0.4 } },
		{ source: 'a', in: 9, out: 10, transition: { type: 'wipe', duration: 0.4 } },
		{ source: 'b', in: 1, out: 2, transition: { type: 'push', duration: 0.4 } }
	],
	shots: [{ id: 'insert', shot: 'full', from: 0.2, until: 0.5, source: { name: 'b', in: 0.5 } }],
	clips: []
});
const program = resolveProgram(project, {
	words: null,
	sources: { a: source(300), b: source(60) }
});
const map = footageMap(program);
const at = (f: number) => footageAt(map, f).map((v) => `${v.source}${v.frame}${v.held ? '!' : ''}`);

describe('footage map', () => {
	it('resolves the fixture without errors', () => {
		expect(program.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(program.frames).toBe(117);
	});

	it('maps a program frame inside a cut to srcIn plus the offset into the cut', () => {
		expect(at(0)).toEqual(['a30']);
		expect(at(5)).toEqual(['a35']);
		expect(at(15)).toEqual(['a45']);
		expect(at(23)).toEqual(['a53']);
		expect(at(40)).toEqual(['b13']);
		expect(at(70)).toEqual(['a283']);
		expect(at(100)).toEqual(['b43']);
	});

	it('shows both sides inside a transition window, running into the handles', () => {
		// Before the cut the outgoing cut is the picture; the incoming one shows its handle.
		expect(at(28)).toEqual(['a58', 'b1']);
		expect(at(29)).toEqual(['a59', 'b2']);
		// From the cut on the incoming cut is the picture; the outgoing one runs past its out.
		expect(at(30)).toEqual(['b3', 'a60']);
		expect(at(35)).toEqual(['b8', 'a65']);
		expect(at(36)).toEqual(['b9']);
		expect(at(51)).toEqual(['b24', 'a264']);
		expect(at(62)).toEqual(['a275', 'b35']);
	});

	it('holds the edge frame where the source runs out', () => {
		// cut2 has 3 frames of handle before its in, the push wants 6.
		expect(at(24)).toEqual(['a54', 'b0!']);
		expect(at(26)).toEqual(['a56', 'b0!']);
		expect(at(27)).toEqual(['a57', 'b0']);
		// cut3 ends on the last frame of a; the push into cut4 wants 6 more.
		expect(at(86)).toEqual(['a299', 'b29']);
		expect(at(87)).toEqual(['b30', 'a299!']);
		expect(at(92)).toEqual(['b35', 'a299!']);
		expect(at(93)).toEqual(['b36']);
		// Outside the program the nearest program frame holds.
		expect(at(-10)).toEqual(['a30']);
		expect(at(500)).toEqual(['b59']);
	});

	it('lets a shot with a source cover the cut list', () => {
		expect(at(6)).toEqual(['b15']);
		expect(at(14)).toEqual(['b23']);
		expect(sourceFrameAt(map, 'a', 10)).toBeNull();
		expect(sourceFrameAt(map, 'b', 10)).toMatchObject({ frame: 19, owner: 'insert' });
		expect(programFootageAt(map, 10)).toMatchObject({ source: 'b', frame: 19 });
	});

	it('finds a named source on screen, or nothing', () => {
		expect(sourceFrameAt(map, 'b', 29)).toMatchObject({ frame: 2, owner: 'cut2' });
		expect(sourceFrameAt(map, 'a', 31)).toMatchObject({ frame: 61, owner: 'cut1' });
		expect(sourceFrameAt(map, 'b', 0)).toBeNull();
		expect(programFootageAt(map, 31)).toMatchObject({ source: 'b', frame: 4, owner: 'cut2' });
	});

	it('is the same map as JSON (it travels to the page)', () => {
		const copy = JSON.parse(JSON.stringify(map)) as FootageMap;
		for (let f = -2; f < 120; f++) expect(footageAt(copy, f)).toEqual(footageAt(map, f));
	});
});

describe('footage ranges', () => {
	it('covers cuts, needed handles, shot sources and held edges', () => {
		expect(footageRanges(map, [])).toEqual({
			// The shot hides a 36–44.
			a: [
				{ first: 30, last: 35 },
				{ first: 45, last: 65 },
				{ first: 264, last: 299 }
			],
			b: [{ first: 0, last: 59 }]
		});
	});

	it('adds the margin around what clips show, in source frames', () => {
		const ranges = footageRanges(map, [{ startFrame: 15, frames: 5 }], { a: 5 });
		expect(ranges.a).toEqual([
			{ first: 30, last: 35 },
			{ first: 40, last: 65 },
			{ first: 264, last: 299 }
		]);
	});

	it('merges ranges closer than the gap', () => {
		expect(footageRanges(map, [], {}, 30).a).toEqual([
			{ first: 30, last: 65 },
			{ first: 264, last: 299 }
		]);
	});
});

describe('footageFrameAt', () => {
	const frames = (name: string, ranges: [number, number][], total: number): FootageFrames => {
		const r = ranges.map(([first, last], i) => ({ url: `/${name}${i}/`, first, last }));
		return {
			...r[0],
			ranges: r,
			total,
			width: 1920,
			height: 1080,
			startFrame: 0,
			subject: false
		};
	};
	const footage = {
		a: frames(
			'a',
			[
				[30, 65],
				[264, 299]
			],
			300
		),
		b: frames('b', [[0, 59]], 60)
	};

	it('draws a named source from the range that holds its frame', () => {
		expect(footageFrameAt(footage, map, 'a', 70, 'plate').url).toBe('/a1/plate/000283.jpg');
		expect(footageFrameAt(footage, map, 'a', 5, 'plate').url).toBe('/a0/plate/000035.jpg');
		expect(footageFrameAt(footage, map, 'b', 29, 'plate').url).toBe('/b0/plate/000002.jpg');
	});

	it('draws whatever the program shows', () => {
		expect(footageFrameAt(footage, map, null, 10, 'plate')).toMatchObject({
			source: 'b',
			url: '/b0/plate/000019.jpg'
		});
		expect(footageFrameAt(footage, map, null, 87, 'plate').url).toBe('/b0/plate/000030.jpg');
	});

	it('refuses a source that is not on screen', () => {
		expect(() => footageFrameAt(footage, map, 'a', 10, 'plate')).toThrow(
			/"a" is not on screen at program frame 10 \(insert shows "b"\)/
		);
	});

	it('shifts by the offset inside the source and asks for margin outside the ranges', () => {
		expect(footageFrameAt(footage, map, 'a', 70, 'plate', -5).url).toBe('/a1/plate/000278.jpg');
		expect(footageFrameAt(footage, map, 'a', 86, 'plate', 9).url).toBe('/a1/plate/000299.jpg');
		expect(() => footageFrameAt(footage, map, 'a', 70, 'plate', -30)).toThrow(
			/frame 253 was not extracted \(frames 30–65, 264–299\).*margin/
		);
	});

	it('keeps inserts mode as before: footage placed by its start', () => {
		const one = { talk: { ...frames('talk', [[0, 99]], 100), startFrame: 15 } };
		expect(footageFrameAt(one, null, 'talk', 60, 'plate').url).toBe('/talk0/plate/000045.jpg');
		expect(footageFrameAt(one, null, null, 60, 'plate', 3).url).toBe('/talk0/plate/000048.jpg');
		expect(() => footageFrameAt(footage, null, null, 0, 'plate')).toThrow(/needs a cut list/);
	});
});
