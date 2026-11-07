// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveProgram, type ProgramInputs } from '$lib/motion/program.js';

const DIR = path.join(__dirname, 'fixtures/program');
const take1 = parseTranscriptWords(
	JSON.parse(fs.readFileSync(path.join(DIR, 'take1.transcript.json'), 'utf8'))
);
const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1080,
	height: 1920,
	fps: 30,
	audio: true
});
const inputs: ProgramInputs = {
	words: null,
	transcripts: { talk: take1 },
	sources: { talk: source(400), other: source(200) }
};
/** One cut of take1 at 30 fps: source 90-150, program frames 0-59 (a 2 s program). */
const base = {
	size: [1080, 1920],
	fps: 30,
	footage: { talk: { src: 'talk.mp4' }, other: { src: 'other.mp4' } },
	cuts: [{ source: 'talk', in: 'today we fix', out: 'slow export' }],
	clips: []
};
const run = (shot: object) => {
	const p = resolveProgram(parseMotionProject({ ...base, shots: [shot] }), inputs);
	return {
		diagnostics: p.diagnostics,
		shots: p.shots.filter((s) => !s.implicit).map((s) => [s.id, s.startFrame, s.frames, s.source])
	};
};
const diag = (level: string, field: string, message: string) => ({
	level,
	item: 'a',
	field,
	message
});

describe('shots as written in a program', () => {
	it('reports an unknown shot kind and drops the shot', () => {
		expect(run({ id: 'a', shot: 'nope', from: 0, until: 1 })).toEqual({
			diagnostics: [
				diag(
					'error',
					'shots[0].shot',
					'Unknown shot "nope". Built in: full, punch, strip, window, behind, whip; or a file such as "shots/My.ts".'
				)
			],
			shots: []
		});
	});

	it('reports bad params but keeps the shot', () => {
		expect(run({ id: 'a', shot: 'punch', params: { bogus: 1 }, from: 0, until: 1 })).toEqual({
			diagnostics: [
				diag('error', 'shots[0].params', 'Unknown param "bogus". Known: scale, headroom.')
			],
			shots: [['a', 0, 30, null]]
		});
	});

	it('warns that a custom shot file is framed full, and keeps the shot', () => {
		expect(run({ id: 'a', shot: 'shots/My.ts', from: 0, until: 1 })).toEqual({
			diagnostics: [
				diag(
					'warning',
					'shots[0].shot',
					'Custom shot files are not drawn yet; "shots/My.ts" is framed full.'
				)
			],
			shots: [['a', 0, 30, null]]
		});
	});

	it('names a shot without an id after its position', () => {
		expect(run({ shot: 'punch', from: 0, until: 1 })).toEqual({
			diagnostics: [],
			shots: [['shot1', 0, 30, null]]
		});
	});

	it('reports a "from" that does not resolve', () => {
		expect(run({ id: 'a', shot: 'punch', from: 'no such words', until: 1 })).toEqual({
			diagnostics: [diag('error', 'shots[0].from', 'Phrase "no such words" not found.')],
			shots: []
		});
	});

	it('reports an "until" that does not resolve', () => {
		expect(run({ id: 'a', shot: 'punch', from: 0, until: 'no such words' })).toEqual({
			diagnostics: [
				diag(
					'error',
					'shots[0].until',
					'Phrase "no such words" not found inside the clip. Words in the clip start: today@0.00 we@0.35 fix@0.50 the@0.85 slow@1.00 export@1.45'
				)
			],
			shots: []
		});
	});

	it('reports a shot that ends before it starts', () => {
		expect(run({ id: 'a', shot: 'punch', from: 1, until: 0.5 })).toEqual({
			diagnostics: [
				diag('error', 'shots[0].until', 'Shot ends (0.50 s) before it starts (1.00 s).')
			],
			shots: []
		});
	});

	it('reports a shot that starts after the program ends', () => {
		expect(run({ id: 'a', shot: 'punch', from: 5, until: 6 })).toEqual({
			diagnostics: [
				diag('error', 'shots[0].from', 'Shot starts at 5.00 s, after the program ends (2.00 s).')
			],
			shots: []
		});
	});

	it('cuts a shot that runs past the program end there, with a warning', () => {
		expect(run({ id: 'a', shot: 'punch', from: 1, until: 5 })).toEqual({
			diagnostics: [
				diag(
					'warning',
					'shots[0].until',
					'Shot ends at 5.00 s, after the program (2.00 s); it is cut there.'
				)
			],
			shots: [['a', 30, 30, null]]
		});
	});

	it('reports unknown footage', () => {
		expect(run({ id: 'a', shot: 'punch', source: 'nowhere', from: 0, until: 1 })).toEqual({
			diagnostics: [
				diag('error', 'shots[0].source', 'Unknown footage "nowhere". Footage: talk, other')
			],
			shots: []
		});
	});

	it('shows named footage from its start', () => {
		expect(run({ id: 'a', shot: 'punch', source: 'other', from: 0, until: 1 })).toEqual({
			diagnostics: [],
			shots: [['a', 0, 30, { name: 'other', srcIn: 0 }]]
		});
	});

	it('starts footage at the frame of a phrase in its transcript', () => {
		const source = { name: 'talk', in: 'first open' };
		expect(run({ id: 'a', shot: 'punch', source, from: 0, until: 1 })).toEqual({
			diagnostics: [],
			shots: [['a', 0, 30, { name: 'talk', srcIn: 180 }]]
		});
	});

	it('reports a "source.in" on footage without a transcript', () => {
		const source = { name: 'other', in: 'nothing here' };
		expect(run({ id: 'a', shot: 'punch', source, from: 0, until: 1 })).toEqual({
			diagnostics: [
				diag(
					'error',
					'shots[0].source.in',
					'"nothing here" needs a transcript; set "transcript" on footage "other".'
				)
			],
			shots: []
		});
	});

	it('reports a "source.in" phrase the transcript does not contain', () => {
		const source = { name: 'talk', in: 'no such words' };
		const { diagnostics, shots } = run({ id: 'a', shot: 'punch', source, from: 0, until: 1 });
		expect(shots).toEqual([]);
		expect(diagnostics).toEqual([
			expect.objectContaining({
				level: 'error',
				item: 'a',
				field: 'shots[0].source.in',
				message: expect.stringContaining('"no such words"')
			})
		]);
	});
});

describe('phrase order across shots that fail', () => {
	// The whole of take1 (0–12.5 s). "the" is said at 3.85 s and again at 6.65 s.
	const whole = { ...base, cuts: [{ source: 'talk', in: 0, out: 12.5 }] };
	const shotsOf = (shots: object[]) =>
		resolveProgram(parseMotionProject({ ...whole, shots }), inputs)
			.shots.filter((s) => !s.implicit)
			.map((s) => [s.id, s.startFrame, s.frames]);

	it('searches a phrase after the start of a shot whose "until" fails', () => {
		expect(
			shotsOf([
				{ id: 'a', shot: 'full', from: 0, until: 1 },
				{ id: 'b', shot: 'full', from: 'First open', until: 'zzz nothing' },
				{ id: 'c', shot: 'full', from: 'the', until: 'settings.' }
			])
		).toEqual([
			['a', 0, 30],
			['c', 200, 22]
		]);
	});

	it('searches a phrase after the start of a shot that ends before it starts', () => {
		expect(
			shotsOf([
				{ id: 'b', shot: 'full', from: 5, until: 4 },
				{ id: 'c', shot: 'full', from: 'the', until: 'settings.' }
			])
		).toEqual([['c', 200, 22]]);
	});
});
