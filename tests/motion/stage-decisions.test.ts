import { describe, expect, it } from 'vitest';
import {
	backdropLook,
	behindMeasurable,
	coveredShare,
	extendRun,
	measuredRecently,
	roomShown,
	runLongEnough,
	subjectDrawn
} from '$lib/motion/stage-decisions.js';

describe('roomShown', () => {
	it('needs a room with dim or blur from the minimum up', () => {
		expect(roomShown(undefined, 0.4)).toBe(false);
		expect(roomShown({ dim: 0, blur: 0.39 }, 0.4)).toBe(false);
		expect(roomShown({ dim: 0, blur: 0.4 }, 0.4)).toBe(true);
		expect(roomShown({ dim: 0.1, blur: 0 }, 0.4)).toBe(true);
	});
});

describe('backdropLook', () => {
	it('keeps the backdrop alone without a room', () => {
		expect(backdropLook({ dim: 0.3, blur: 12 }, undefined)).toEqual({ dim: 0.3, blur: 12 });
	});
	it('multiplies the transparencies and adds the blurs in quadrature, rounded to 2 places', () => {
		expect(backdropLook({ dim: 0.5, blur: 3 }, { dim: 0.5, blur: 4 })).toEqual({
			dim: 0.75,
			blur: 5
		});
		expect(backdropLook({ dim: 0.333, blur: 1 }, { dim: 0.111, blur: 0 })).toEqual({
			dim: 0.41,
			blur: 1
		});
	});
});

describe('subjectDrawn', () => {
	const base = { insert: null, behind: false, room: false, cutAway: false, hasSubject: true };
	it('draws for behind clips, a room or a room cut away, when a matte exists', () => {
		expect(subjectDrawn(base)).toBe(false);
		expect(subjectDrawn({ ...base, behind: true })).toBe(true);
		expect(subjectDrawn({ ...base, room: true })).toBe(true);
		expect(subjectDrawn({ ...base, cutAway: true })).toBe(true);
		expect(subjectDrawn({ ...base, cutAway: true, hasSubject: false })).toBe(false);
		expect(subjectDrawn({ ...base, behind: true, hasSubject: false })).toBe(false);
	});
	it('in an insert only a holdout over behind clips draws it; a room does not', () => {
		expect(subjectDrawn({ ...base, insert: { holdout: true }, behind: true })).toBe(true);
		expect(subjectDrawn({ ...base, insert: { holdout: true }, room: true })).toBe(false);
		expect(subjectDrawn({ ...base, insert: { holdout: true }, cutAway: true })).toBe(false);
		expect(subjectDrawn({ ...base, insert: { holdout: false }, behind: true })).toBe(false);
	});
});

describe('behindMeasurable', () => {
	const ok = { planned: true, hasView: true, hasSubject: true, holes: false, faded: false };
	it('needs every condition', () => {
		expect(behindMeasurable(ok)).toBe(true);
		for (const k of ['planned', 'hasView', 'hasSubject'] as const)
			expect(behindMeasurable({ ...ok, [k]: false })).toBe(false);
		for (const k of ['holes', 'faded'] as const)
			expect(behindMeasurable({ ...ok, [k]: true })).toBe(false);
	});
});

describe('measuredRecently', () => {
	it('is true only inside the stride after a measurement', () => {
		expect(measuredRecently(undefined, 10, 5)).toBe(false);
		expect(measuredRecently(8, 10, 5)).toBe(true);
		expect(measuredRecently(5, 10, 5)).toBe(false);
	});
});

describe('coveredShare', () => {
	it('counts hits over points, zero without a reading', () => {
		expect(coveredShare(null, 4)).toBe(0);
		expect(coveredShare([true, false, true, true], 4)).toBe(0.75);
	});
});

describe('runs', () => {
	it('starts at the frame and keeps the peak share', () => {
		const run = extendRun(undefined, 10, 0.6);
		expect(run).toEqual({ from: 10, share: 0.6 });
		expect(extendRun(run, 12, 0.9)).toEqual({ from: 10, share: 0.9 });
		expect(extendRun(run, 14, 0.7)).toEqual({ from: 10, share: 0.9 });
	});
	it('is long enough from the duration in frames', () => {
		const run = { from: 10, share: 0.6 };
		expect(runLongEnough(run, 24, 0.5, 30)).toBe(false);
		expect(runLongEnough(run, 25, 0.5, 30)).toBe(true);
	});
});
