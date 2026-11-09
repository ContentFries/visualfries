import { describe, expect, it } from 'vitest';
import { checkExport, checkResultLines } from '$lib/motion/check-report.js';

describe('checkExport', () => {
	it('takes video, inserts or nothing', () => {
		expect(checkExport(undefined, undefined)).toBeUndefined();
		expect(checkExport('video', undefined)).toBe('video');
		expect(checkExport('inserts', undefined)).toBe('inserts');
		expect(checkExport('video', '0:10-0:20')).toBe('video');
	});
	it('rejects anything else, and inserts of an excerpt', () => {
		expect(() => checkExport('gif', undefined)).toThrow(
			'--export must be video or inserts, got "gif".'
		);
		expect(() => checkExport('inserts', '0:10-0:20')).toThrow(
			'--excerpt renders a video; inserts come from the whole program.'
		);
	});
});

describe('checkResultLines', () => {
	const ok = { id: 'intro', ok: true, errors: [], warnings: [] };
	const failing = {
		id: 'quote',
		ok: false,
		mode: 'determinism',
		errors: [
			{ message: 'text overflows', frame: 12 },
			{ message: 'no frame', frame: -1 },
			{ message: 'whole clip' }
		],
		warnings: [{ message: 'late cue' }]
	};

	it('lists clips with their errors, warnings and a summary', () => {
		expect(checkResultLines({ segments: [] }, false, [ok, failing])).toEqual([
			'ok   intro',
			'FAIL quote  (determinism)',
			'  error @f12: text overflows',
			'  error: no frame',
			'  error: whole clip',
			'  warning: late cue',
			'1 of 2 clips need attention.'
		]);
	});

	it('shows each segment frame span in a program, and none for a segment it does not know', () => {
		const program = { segments: [{ id: 'intro', startFrame: 30, frames: 60 }] };
		expect(checkResultLines(program, true, [ok, { ...ok, id: 'gone' }])).toEqual([
			'ok   intro  frames 30–89',
			'ok   gone',
			'All 2 segments pass.'
		]);
	});

	it('ignores segment spans outside program mode, and says so when nothing was checked', () => {
		const program = { segments: [{ id: 'intro', startFrame: 30, frames: 60 }] };
		expect(checkResultLines(program, false, [ok])).toEqual(['ok   intro', 'All 1 clips pass.']);
		expect(checkResultLines(program, true, [])).toEqual(['All 0 segments pass.']);
	});
});
