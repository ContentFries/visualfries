// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram, type ProgramInputs } from '$lib/motion/program.js';
import {
	matteReads,
	planMatteRanges,
	rangesFileProblem,
	toFootageFrames,
	uncovered
} from '$lib/motion/matte-use.js';

/** Ten seconds of landscape footage at 30 fps: 300 frames. */
const source = (w = 1920, h = 1080) => ({
	frames: 300,
	duration: 10,
	width: w,
	height: h,
	fps: 30,
	audio: true
});
const inputs: ProgramInputs = { words: null, sources: { talk: source(), other: source() } };
const base = {
	size: [1920, 1080],
	fps: 30,
	footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
	cuts: [{ source: 'talk', in: 0, out: 10 }],
	clips: []
};
const program = (more: object) => {
	const p = resolveProgram(parseMotionProject({ ...base, ...more }), inputs);
	expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
	return p;
};
const reads = (more: object, readsSubject: (block: string) => boolean = () => false) =>
	matteReads(program(more), { readsSubject, margins: { talk: 60 } });
/** Whether the ranges hold every frame of `first`–`last`. */
const holds = (ranges: { first: number; last: number }[] = [], first: number, last: number) =>
	ranges.some((r) => r.first <= first && r.last >= last);
const reads1 = (ranges: { first: number; last: number }[] = [], f: number) => holds(ranges, f, f);

describe('matteReads: where a program reads a matte', () => {
	it('reads nothing of footage framed full at its own aspect ratio', () => {
		expect(reads({})).toEqual({});
		expect(reads({ shots: [{ id: 'a', shot: 'full', from: 1, until: 3 }] })).toEqual({});
	});

	it('reads nothing of footage without a matte', () => {
		const p = resolveProgram(
			parseMotionProject({
				...base,
				footage: { talk: { src: 'talk.mp4' } },
				shots: [{ id: 'p', shot: 'punch', from: 2, until: 4 }]
			}),
			inputs
		);
		expect(matteReads(p, { readsSubject: () => true })).toEqual({});
	});

	it('reads a behind shot, with the smoothing window around it, and not the rest', () => {
		const { talk } = reads({ shots: [{ id: 'b', shot: 'behind', from: 2, until: 4 }] });
		// Shot frames 60–119, half a second (15 frames) of smoothing on each side.
		expect(holds(talk, 45, 134)).toBe(true);
		expect(reads1(talk, 20)).toBe(false);
		expect(reads1(talk, 250)).toBe(false);
	});

	it('reads a clip behind the speaker while it is on screen', () => {
		const { talk } = reads({
			clips: [{ id: 'w', block: 'World.svelte', from: 5, until: 6, layer: 'behind' }]
		});
		expect(talk).toEqual([{ first: 135, last: 194 }]);
	});

	it('reads a clip whose block reads the subject, with the footage margin', () => {
		const { talk } = reads(
			{ clips: [{ id: 'd', block: 'Depth.svelte', from: 7, until: 7.5 }] },
			(block) => block === 'Depth.svelte'
		);
		expect(talk).toEqual([{ first: 150, last: 284 }]);
		expect(
			reads({ clips: [{ id: 'd', block: 'Depth.svelte', from: 7, until: 7.5 }] }, () => false)
		).toEqual({});
	});

	it('reads the whole of a shot the head frames (a punch-in centres the face)', () => {
		const { talk } = reads({ shots: [{ id: 'p', shot: 'punch', from: 2, until: 4 }] });
		expect(holds(talk, 60, 119)).toBe(true);
		expect(reads1(talk, 250)).toBe(false);
	});

	it('reads the morph out of a shot the head frames, past the shot', () => {
		const p = program({
			shots: [
				{ id: 'p', shot: 'punch', from: 2, until: 4 },
				{ id: 'f', shot: 'full', from: 4, until: 6, morph: 1.5 }
			]
		});
		const after = p.shots.find((s) => s.id === 'f')!;
		expect(after.morphFrames).toBe(45);
		const { talk } = matteReads(p, { readsSubject: () => false });
		expect(holds(talk, 60, 120 + after.morphFrames - 1 + 15)).toBe(true);
	});

	it('reads every frame where a narrower frame follows the head', () => {
		expect(reads({ size: [1080, 1920] })).toEqual({ talk: [{ first: 0, last: 299 }] });
	});

	it('maps reads through the cut list to source frames', () => {
		const { talk } = reads({
			cuts: [{ source: 'talk', in: 4, out: 8 }],
			shots: [{ id: 'b', shot: 'behind', from: 1, until: 2 }]
		});
		// Program 1–2 s is source 5–6 s: frames 150–179.
		expect(holds(talk, 150, 179)).toBe(true);
		expect(reads1(talk, 40)).toBe(false);
	});

	it('reads only the footage with a matte', () => {
		const p = resolveProgram(
			parseMotionProject({
				...base,
				footage: { ...base.footage, other: { src: 'other.mp4' } },
				cuts: [
					{ source: 'talk', in: 0, out: 2 },
					{ source: 'other', in: 0, out: 2 }
				],
				clips: [{ id: 'w', block: 'World.svelte', from: 0, until: 'end', layer: 'behind' }]
			}),
			inputs
		);
		expect(Object.keys(matteReads(p, { readsSubject: () => false }))).toEqual(['talk']);
	});
});

describe('planMatteRanges', () => {
	const words = [
		{ start: 1.0, end: 1.5 },
		{ start: 1.7, end: 2.4 },
		{ start: 6.0, end: 6.4 },
		{ start: 6.6, end: 7.2 }
	];

	it('widens each read by the margin and keeps it inside the footage', () => {
		expect(
			planMatteRanges([{ first: 10, last: 20 }], { total: 300, fps: 30, margin: 1, gap: 0 })
		).toEqual([{ first: 0, last: 50 }]);
		expect(
			planMatteRanges([{ first: 280, last: 299 }], { total: 300, fps: 30, margin: 1, gap: 0 })
		).toEqual([{ first: 250, last: 299 }]);
	});

	it('joins ranges closer than the gap', () => {
		const two = [
			{ first: 60, last: 70 },
			{ first: 150, last: 160 }
		];
		expect(planMatteRanges(two, { total: 300, fps: 30, margin: 0, gap: 3 })).toEqual([
			{ first: 60, last: 160 }
		]);
		expect(planMatteRanges(two, { total: 300, fps: 30, margin: 0, gap: 2 })).toEqual(two);
	});

	it('moves bounds out of words into the pause before or after, never inward', () => {
		// 2.0 s starts inside "1.7–2.4": the start moves to the pause before it (1.6 s).
		// 6.8 s ends inside "6.6–7.2": the end moves into the pause after it.
		const [r] = planMatteRanges([{ first: 60, last: 204 }], {
			total: 300,
			fps: 30,
			margin: 0,
			gap: 0,
			words
		});
		expect(r.first).toBe(48);
		expect(r.last).toBeGreaterThanOrEqual(216);
		for (const bound of [r.first, r.last + 1]) {
			const t = bound / 30;
			expect(
				words.some((w) => w.start < t && t < w.end),
				`bound ${t}s`
			).toBe(false);
		}
	});

	it('leaves bounds in pauses where they are', () => {
		expect(
			planMatteRanges([{ first: 120, last: 150 }], {
				total: 300,
				fps: 30,
				margin: 0,
				gap: 0,
				words
			})
		).toEqual([{ first: 120, last: 150 }]);
	});
});

describe('toFootageFrames', () => {
	it('keeps frames when the rates match', () => {
		expect(toFootageFrames([{ first: 3, last: 9 }], 30, 30, 100)).toEqual([{ first: 3, last: 9 }]);
	});
	it('rounds outward to the footage rate', () => {
		// Project frames 30–59 at 30 fps are 1–2 s: footage frames 25–49 at 25 fps, plus a frame.
		expect(toFootageFrames([{ first: 30, last: 59 }], 30, 25, 250)).toEqual([
			{ first: 24, last: 51 }
		]);
	});
});

describe('uncovered', () => {
	it('lists what the covered ranges miss', () => {
		expect(
			uncovered(
				[
					{ first: 0, last: 10 },
					{ first: 40, last: 60 }
				],
				[
					{ first: 5, last: 8 },
					{ first: 45, last: 70 }
				]
			)
		).toEqual([
			{ first: 0, last: 4 },
			{ first: 9, last: 10 },
			{ first: 40, last: 44 }
		]);
		expect(uncovered([{ first: 3, last: 7 }], [{ first: 0, last: 9 }])).toEqual([]);
	});
});

describe('rangesFileProblem', () => {
	const now = { source: { size: 100, frames: 30 }, matte: { size: 50 } };
	const file = {
		version: 1,
		source: { file: 'talk.mp4', size: 100, frames: 30, fps: 30 },
		matte: { size: 50 },
		ranges: [[0, 9]],
		provider: 'x',
		key: 'k'
	};
	it('accepts a file that matches', () => {
		expect(rangesFileProblem(file, now)).toBeNull();
	});
	it('rejects a changed matte, another video and an unknown file', () => {
		expect(rangesFileProblem({ ...file, matte: { size: 51 } }, now)).toMatch(/matte changed/);
		expect(rangesFileProblem({ ...file, source: { ...file.source, frames: 31 } }, now)).toMatch(
			/another video/
		);
		expect(rangesFileProblem({ version: 2 }, now)).toMatch(/not a ranges file/);
	});
});
