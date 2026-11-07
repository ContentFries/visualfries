import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { BeatsFileShape } from '$lib/motion/beat-grid.js';
import { musicTrack } from '$lib/motion/music.js';
import { resolveCutList, type ProgramInputs } from '$lib/motion/cutlist.js';
import { resolveProgram } from '$lib/motion/program.js';

// Pins what a written cut reports when its range cannot be placed, and how music placement
// reports a `from` or `until` that fails, so those paths can be split without changing a word.

const DIR = path.join(__dirname, 'fixtures/program');
const take1 = parseTranscriptWords(
	JSON.parse(fs.readFileSync(path.join(DIR, 'take1.transcript.json'), 'utf8'))
);

const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1920,
	height: 1080,
	fps: 30,
	audio: true
});

const base = {
	size: [1920, 1080],
	fps: 30,
	footage: { talk: { src: 'talk.mp4', transcript: 'take1.transcript.json' } }
};

/** 120 BPM in 4/4, 40 s long: beats every 0.5 s from 0.5 s, downbeats every 2 s. */
function beatsFile() {
	const beats = [];
	for (let i = 0; 0.5 + 0.5 * i < 39.75; i++)
		beats.push({ time: 0.5 + 0.5 * i, bar: Math.floor(i / 4) + 1, beat: (i % 4) + 1, energy: -20 });
	return BeatsFileShape.parse({
		version: 1,
		source: { file: 'bed.wav', sha256: '0'.repeat(64), duration: 40 },
		analyzer: { name: 'fixture', version: '1' },
		tempo: 120,
		beatsPerBar: 4,
		beats,
		bars: beats.filter((b) => b.beat === 1).map((b) => ({ bar: b.bar, start: b.time, energy: -20 }))
	});
}
const BED = { id: 'bed', src: 'bed.wav', beats: 'bed.beats.json', from: 0.2, in: 0.1 };

function inputs(json: Record<string, unknown>, extra: Partial<ProgramInputs> = {}): ProgramInputs {
	const project = parseMotionProject({ ...base, ...json });
	const file = beatsFile();
	const tracks = (project.music ?? []).flatMap((m, i) => (m.beats ? [musicTrack(file, m, i)] : []));
	return {
		words: null,
		transcripts: { talk: take1 },
		sources: { talk: source(500) },
		tracks,
		...extra
	};
}
const cutList = (json: Record<string, unknown>, extra: Partial<ProgramInputs> = {}) =>
	resolveCutList(parseMotionProject({ ...base, ...json }), inputs(json, extra));
const program = (json: Record<string, unknown>) =>
	resolveProgram(parseMotionProject({ ...base, ...json }), inputs(json));
const diags = (c: { diagnostics: { level: string; field: string; message: string }[] }) =>
	c.diagnostics.filter((d) => d.level !== 'info').map((d) => [d.level, d.field, d.message]);

describe('cut range failures', () => {
	it('reports footage that is not declared, with the footage that is', () => {
		const c = cutList({ cuts: [{ source: 'nope', in: 0, out: 1 }] });
		expect(diags(c)).toEqual([
			['error', 'cuts[0].source', 'cut 1: unknown footage "nope". Footage: talk']
		]);
		expect(c.cuts).toEqual([]);
	});

	it('refuses a beat on "in" and names the cut whose "out" should carry it', () => {
		const c = cutList({
			cuts: [
				{ source: 'talk', in: 0, out: 2 },
				{ source: 'talk', in: { bar: 3 }, out: 9 }
			]
		});
		expect(diags(c)).toEqual([
			[
				'error',
				'cuts[1].in',
				'cut 2: "in" is a point in the source; a cut starts where the one before it ends. Put the beat on the "out" of cut 1.'
			]
		]);
		expect(c.cuts).toHaveLength(1);
		const first = cutList({ cuts: [{ source: 'talk', in: { bar: 3 }, out: 9 }] });
		expect(diags(first)[0][2]).toContain('Put the beat on the "out" of the cut before.');
	});

	it('reports an "in" phrase that is not in the transcript', () => {
		const c = cutList({ cuts: [{ source: 'talk', in: 'zebra unicorn', out: 5 }] });
		expect(diags(c)).toEqual([
			['error', 'cuts[0].in', expect.stringMatching(/^cut 1: .*zebra unicorn/)]
		]);
	});

	it('reports an "out" phrase that is not in the transcript', () => {
		const c = cutList({ cuts: [{ source: 'talk', in: 0, out: 'zebra unicorn' }] });
		expect(diags(c)).toEqual([
			['error', 'cuts[0].out', expect.stringMatching(/^cut 1: .*zebra unicorn/)]
		]);
	});

	it('asks for "out" when the source length is unknown', () => {
		const c = cutList({ cuts: [{ source: 'talk', in: 0 }] }, { sources: {} });
		expect(diags(c)).toEqual([
			[
				'error',
				'cuts[0].out',
				'cut 1: no "out" and the length of "talk.mp4" is unknown (file not found or not probed). Give "out".'
			]
		]);
	});

	it('takes the source end for a missing "out" when the length is known', () => {
		const c = cutList({ cuts: [{ source: 'talk', in: 1 }] });
		expect(diags(c)).toEqual([]);
		expect([c.cuts[0].srcIn, c.cuts[0].srcOut]).toEqual([30, 500]);
	});

	it('refuses an "in" before the source starts', () => {
		const c = cutList({
			cuts: [{ source: 'talk', in: { say: 'hello and welcome', offset: -1 }, out: 3 }]
		});
		expect(diags(c)).toEqual([
			['error', 'cuts[0].in', 'cut 1: "in" lands before the source starts (-0.50 s).']
		]);
	});

	it('refuses an "out" after the end of the source', () => {
		const c = cutList({ cuts: [{ source: 'talk', in: 1, out: 30 }] });
		expect(diags(c)).toEqual([
			['error', 'cuts[0].out', 'cut 1: "out" (30.00 s) is after the end of "talk.mp4" (16.67 s).']
		]);
	});

	it('refuses an "out" that is not after "in"', () => {
		const c = cutList({ cuts: [{ source: 'talk', in: 5, out: 2 }] });
		expect(diags(c)).toEqual([
			['error', 'cuts[0].out', 'cut 1: "out" (2.00 s) is not after "in" (5.00 s).']
		]);
	});

	it('refuses a beat "out" that lands before the cut starts', () => {
		const c = cutList({
			cuts: [
				{ source: 'talk', in: 0, out: 9 },
				{ source: 'talk', in: 5, out: { bar: 1 } }
			],
			music: [BED]
		});
		expect(diags(c)).toEqual([
			[
				'error',
				'cuts[1].out',
				'cut 2: "out" on the music lands at 0.60 s, not after the cut starts (9.00 s).'
			]
		]);
	});

	it('keeps a good cut after a failed one and stacks only the good ones', () => {
		const c = cutList({
			cuts: [
				{ source: 'talk', in: 5, out: 2 },
				{ source: 'talk', in: 1, out: 3 }
			]
		});
		expect(c.cuts.map((x) => [x.id, x.index, x.startFrame, x.frames])).toEqual([
			['cut2', 0, 0, 60]
		]);
		expect(c.frames).toBe(60);
	});
});

describe('music from and until failures', () => {
	const cuts = [{ source: 'talk', in: 0, out: 9 }];
	const errors = (json: Record<string, unknown>) =>
		program({ cuts, ...json })
			.diagnostics.filter((d) => d.level === 'error')
			.map((d) => `${d.field}: ${d.message}`);

	it('reports a "from" phrase that is not in the transcript and plays the music from 0', () => {
		const p = program({ cuts, music: [{ ...BED, from: 'zebra unicorn' }] });
		const e = p.diagnostics.filter((d) => d.level === 'error');
		expect(e.map((d) => d.field)).toEqual(['music[0].from']);
		expect(e[0].message).toContain('zebra unicorn');
	});

	it('reports an "until" phrase that is not in the transcript and plays to the end', () => {
		const e = errors({ music: [{ ...BED, until: 'zebra unicorn' }] });
		expect(e).toHaveLength(1);
		expect(e[0]).toMatch(/^music\[0\]\.until: .*zebra unicorn/);
	});

	it('refuses an "until" that is not after the start', () => {
		expect(errors({ music: [{ ...BED, until: 0.1 }] })).toEqual([
			'music[0].until: Music "bed" stops (0.10 s) before it starts (0.20 s).'
		]);
	});

	it('lets "until" read the music own beats', () => {
		const p = program({ cuts, music: [{ ...BED, until: { bar: 3 } }] });
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(p.audio.music[0].snap).toEqual({ bar: 2, target: 4.6 });
	});

	it('tells cut points that music waits when it starts on music that starts on a phrase', () => {
		const e = errors({
			cuts: [{ source: 'talk', in: 0, out: { bar: 2, music: 'second' } }],
			music: [
				{ ...BED, from: 'hello and welcome' },
				{ ...BED, id: 'second', src: 'second.wav', from: { bar: 2, music: 'bed' } }
			]
		});
		expect(e).toEqual([
			'cuts[0].out: cut 1: Music "second" is placed by a phrase (its own "from", or that of the music it starts on), and the cut list decides where phrases play, so cut points cannot read its beats. Start it in seconds or on the beats of other music, or end the cut on a phrase.',
			'music[0].from: "hello and welcome" needs a transcript; set "transcript" in the project.'
		]);
	});
});
