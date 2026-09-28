import { describe, expect, it } from 'vitest';
import { MotionProjectShape } from '$lib/motion/project.js';
import { parseTranscriptWords, findPhrase } from '$lib/motion/transcript.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';
import { Clip } from '$lib/motion/runtime.svelte.js';

const words = parseTranscriptWords({
	words: [
		{ text: 'Úvod', startMs: 1020, endMs: 1300 },
		{ text: 'ktoré', startMs: 1500, endMs: 1700 },
		{ text: 'sú', startMs: 1800, endMs: 1900 },
		{ text: 'naviac,', startMs: 2000, endMs: 2400 },
		{ text: 'ktoré', startMs: 2600, endMs: 2800 },
		{ text: 'sú', startMs: 2900, endMs: 3000 },
		{ text: 'duplicitné.', startMs: 3100, endMs: 3700 },
		{ text: 'Koniec', startMs: 4000, endMs: 4500 }
	]
});

function project(clip: Record<string, unknown>) {
	return MotionProjectShape.parse({
		size: [1920, 1080],
		fps: 30,
		clips: [{ id: 'c', block: 'b.svelte', ...clip }]
	});
}

describe('motion resolve', () => {
	it('matches phrases across punctuation-only transcript words', () => {
		const ws = parseTranscriptWords([
			{ text: 'one', start: 0, end: 0.2 },
			{ text: '…', start: 0.2, end: 0.25 },
			{ text: 'two', start: 0.3, end: 0.5 }
		]);
		const [hit] = findPhrase(ws, 'one two');
		expect(hit).toMatchObject({ start: 0, end: 0.5 });
	});

	it('matches phrases ignoring punctuation and case', () => {
		expect(findPhrase(words, 'Naviac')).toHaveLength(1);
		expect(findPhrase(words, 'ktoré sú')).toHaveLength(2);
	});

	it('keeps the first word when the start frame rounds past it', () => {
		const r = resolveMotionProject(
			project({ from: 'úvod', until: 'koniec', cues: { intro: 'úvod' }, words: { all: 'clip' } }),
			words
		);
		const clip = r.clips[0];
		expect(clip.start).toBeCloseTo(31 / 30);
		expect(r.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(clip.words.all[0].text).toBe('Úvod');
	});

	it('reports ambiguous phrases with every occurrence instead of picking one', () => {
		const r = resolveMotionProject(
			project({ from: 'úvod', until: 'koniec', cues: { x: 'ktoré sú' } }),
			words
		);
		const error = r.diagnostics.find((d) => d.level === 'error')!;
		expect(error.message).toMatch(/ambiguous.*#1 at 1\.50s.*#2 at 2\.60s/);
	});

	it('supports occurrence and the last-word edge', () => {
		const r = resolveMotionProject(
			project({
				from: 'úvod',
				until: 'koniec',
				cues: {
					second: { say: 'ktoré sú', occurrence: 2 },
					dup: { say: 'ktoré sú duplicitné', edge: 'last' }
				}
			}),
			words
		);
		const c = r.clips[0];
		expect(c.cues.second.start + c.start).toBeCloseTo(2.6);
		expect(c.cues.dup.start + c.start).toBeCloseTo(3.1);
		expect(c.cues.dup.words.map((w) => w.text)).toEqual(['ktoré', 'sú', 'duplicitné']);
	});

	it('fails the clip, not silently, when a range anchor is missing', () => {
		const r = resolveMotionProject(project({ from: 'nikde', until: 'koniec' }), words);
		expect(r.clips).toHaveLength(0);
		expect(r.diagnostics[0]).toMatchObject({ level: 'error', clip: 'c', field: 'from' });
	});

	it('warns about a cue on the exclusive end', () => {
		const r = resolveMotionProject(
			project({
				from: 'úvod',
				until: { say: 'koniec', edge: 'start' },
				cues: { finale: 'koniec' }
			}),
			words
		);
		expect(r.diagnostics).toContainEqual(
			expect.objectContaining({ level: 'warning', field: 'cues.finale' })
		);
	});

	it('warns about one-word range anchors', () => {
		const r = resolveMotionProject(project({ from: 'úvod', until: 'koniec' }), words);
		expect(r.diagnostics.map((d) => d.field)).toEqual(['from', 'until']);
	});

	it('suggests the closest phrase when a re-take changed the words', () => {
		const r = resolveMotionProject(
			project({ from: 'úvod', until: 'koniec', cues: { extra: 'navyše' } }),
			words
		);
		const error = r.diagnostics.find((d) => d.level === 'error')!;
		expect(error.message).toMatch(/Did you mean "naviac" at 2\.00s/);
	});

	it('reserves the built-in cue names', () => {
		expect(() => project({ from: 'úvod', until: 'koniec', cues: { end: 'koniec' } })).toThrow(
			/built in/
		);
	});

	it('reads { frame } in cues as a clip-local frame', () => {
		const r = resolveMotionProject(
			project({ from: 'úvod', until: 'koniec', cues: { f: { frame: 15 } } }),
			words
		);
		expect(r.clips[0].cues.f.start).toBeCloseTo(0.5);
	});
});

describe('motion clip helpers', () => {
	const r = resolveMotionProject(
		project({
			from: 'úvod',
			until: 'koniec',
			cues: { extra: 'naviac', dup: { say: 'ktoré sú duplicitné', edge: 'last' } }
		}),
		words
	);
	const clip = new Clip(r.clips[0]);

	it('resolves cue offsets, edges and the built-in start/end', () => {
		expect(clip.at('extra+0.5')).toBeCloseTo(clip.cue.extra.start + 0.5);
		expect(clip.at('extra.end')).toBeCloseTo(clip.cue.extra.end);
		expect(clip.at('end-0.2')).toBeCloseTo(clip.duration - 0.2);
	});

	it('eases progress and handles zero duration', () => {
		clip.t = clip.at('extra') + 0.3;
		expect(clip.p('extra', 0.6, 'none')).toBeCloseTo(0.5);
		expect(clip.p('extra', 0)).toBe(1);
		clip.t = 0;
		expect(clip.p('extra', 0)).toBe(0);
	});

	it('checks membership through cue words', () => {
		const dup = clip.cue.dup.words;
		expect(clip.has('dup', dup[0])).toBe(true);
		expect(clip.has('extra', dup[0])).toBe(false);
	});

	it('throws on an unknown ease instead of animating linearly', () => {
		expect(() => clip.p('extra', 0.6, 'power2.Out')).toThrow(/Unknown ease "power2.Out"/);
	});

	it('shares one moment grammar with the CLI', () => {
		expect(clip.at('f15')).toBeCloseTo(0.5);
		expect(clip.at('1.5s')).toBeCloseTo(1.5);
		expect(clip.at('mid')).toBeCloseTo(clip.duration / 2);
		expect(clip.at('extra.end - 0.1')).toBeCloseTo(clip.cue.extra.end - 0.1);
	});

	it('refuses a map that goes back in time', () => {
		expect(() =>
			clip.map([
				[0, 0],
				['dup', 1],
				['extra', 2]
			])
		).toThrow(/must not go back in time/);
	});
});
