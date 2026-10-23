import { describe, expect, it } from 'vitest';
import { MotionProjectShape } from '$lib/motion/project.js';
import { parseTranscriptWords, findPhrase } from '$lib/motion/transcript.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';
import { resolveProgram, type ResolvedProgram } from '$lib/motion/program.js';
import type { ProgramInputs } from '$lib/motion/cutlist.js';
import { parseMotionProject } from '$lib/motion/timeline.js';
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
			{ text: '–', start: 0.2, end: 0.25 },
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

describe('repeated phrases in program order', () => {
	// "hello world" is said at 1.0 s and again at 5.0 s.
	const talk = parseTranscriptWords({
		words: [
			{ text: 'Hello', startMs: 1000, endMs: 1200 },
			{ text: 'world.', startMs: 1300, endMs: 1600 },
			{ text: 'Then', startMs: 3000, endMs: 3300 },
			{ text: 'hello', startMs: 5000, endMs: 5200 },
			{ text: 'world.', startMs: 5300, endMs: 5600 },
			{ text: 'Bye', startMs: 7000, endMs: 7400 }
		]
	});
	const program = (json: Record<string, unknown>, extra: Partial<ProgramInputs> = {}) =>
		resolveProgram(
			parseMotionProject({
				size: [1920, 1080],
				fps: 30,
				footage: { talk: { src: 'talk.mp4' } },
				cuts: [{ source: 'talk', in: 0, out: 8 }],
				clips: [],
				...json
			}),
			{
				words: null,
				transcripts: { talk },
				sources: {
					talk: { frames: 240, duration: 8, width: 1920, height: 1080, fps: 30, audio: true }
				},
				...extra
			}
		);
	const errors = (p: ResolvedProgram) => p.diagnostics.filter((d) => d.level === 'error');
	const hints = (p: ResolvedProgram) =>
		p.diagnostics.filter((d) => d.level === 'info' && d.message.startsWith('Phrase'));

	it('picks the first occurrence at or after the previous item of the same kind', () => {
		const p = program({
			shots: [
				{ id: 'a', shot: 'punch', from: 'then', until: 4 },
				{ id: 'b', shot: 'full', from: 'hello world', until: 'end' }
			],
			clips: [
				{ id: 'c1', block: 'b.svelte', from: 'then', until: 'bye' },
				{ id: 'c2', block: 'b.svelte', from: 'hello world', until: 'end' }
			],
			sfx: [
				{ at: 'then', sound: 'a.wav' },
				{ at: 'hello world', sound: 'b.wav' }
			]
		});
		expect(errors(p)).toEqual([]);
		expect(p.shots.find((s) => s.id === 'b')!.startFrame).toBe(150);
		expect(p.clips.find((c) => c.id === 'c2')!.startFrame).toBe(150);
		expect(p.audio.sfx.find((s) => s.owner === 'sfx2')!.at).toBe(5);
		expect(hints(p).map((d) => [d.item ?? d.clip, d.field])).toEqual([
			['c2', 'from'],
			['b', 'shots[1].from'],
			['sfx2', 'sfx[1].at']
		]);
		expect(hints(p)[1].message).toBe(
			'Phrase "hello world" occurs 2 times; program order picked #2 at 5.00s, the first that starts or lands at or after the previous shot (3.00s). Other occurrences: #1 at 1.00s (Hello@1.00 world@1.30). If that is the wrong one, pin it with { "say": "hello world", "occurrence": n }.'
		);
	});

	it('ends on the first occurrence after the start in "until"', () => {
		const p = program({
			shots: [{ id: 'a', shot: 'punch', from: 0.5, until: 'hello world' }],
			clips: [{ id: 'c', block: 'b.svelte', from: 0.5, until: 'hello world' }]
		});
		expect(errors(p)).toEqual([]);
		expect(p.shots.find((s) => s.id === 'a')!.frames).toBe(48 - 15);
		expect(p.clips[0].frames).toBe(48 - 15);
		expect(hints(p).map((d) => d.message)).toEqual([
			expect.stringContaining(
				"#1 at 1.00s, the first that starts or lands at or after the clip's start (0.50s)"
			),
			expect.stringContaining(
				"#1 at 1.00s, the first that starts or lands at or after the shot's start (0.50s)"
			)
		]);
	});

	it('lets an explicit occurrence win, without a hint', () => {
		const p = program({
			sfx: [
				{ at: 'then', sound: 'a.wav' },
				{ at: { say: 'hello world', occurrence: 1 }, sound: 'b.wav' }
			]
		});
		expect(errors(p)).toEqual([]);
		expect(hints(p)).toEqual([]);
		expect(p.audio.sfx.find((s) => s.owner === 'sfx2')!.at).toBe(1);
	});

	it('counts from where the previous phrase is said, not from its offset', () => {
		const p = program({
			sfx: [
				{ at: 'then', sound: 'a.wav' },
				{ at: { say: 'hello world', occurrence: 2, offset: 0.5 }, sound: 'b.wav' },
				{ at: 'hello world', sound: 'c.wav' }
			]
		});
		expect(errors(p)).toEqual([]);
		expect(p.audio.sfx.find((s) => s.owner === 'sfx3')!.at).toBe(5);
	});

	it('counts an occurrence that lands after the previous item, though it starts before it', () => {
		// The previous sfx sits inside the phrase; this one is on the phrase's end.
		const p = program({
			sfx: [
				{ at: 0.5, sound: 'a.wav' },
				{ at: 'hello world', sound: 'b.wav' },
				{ at: 1.2, sound: 'c.wav' },
				{ at: { say: 'hello world', edge: 'end' }, sound: 'd.wav' }
			]
		});
		expect(errors(p)).toEqual([]);
		expect(p.audio.sfx.find((s) => s.owner === 'sfx4')!.at).toBe(1.6);
	});

	it('counts from the phrase a nearest-beat anchor stands on', () => {
		// Beats every 0.5 s, four to the bar: the downbeat after "hello world" (1.0 s) is at 2.0 s.
		const grid = Array.from({ length: 16 }, (_, i) => ({
			index: i + 1,
			time: i * 0.5,
			bar: Math.floor(i / 4) + 1,
			beat: (i % 4) + 1,
			energy: null
		}));
		const p = program(
			{
				sfx: [
					{ at: 0.5, sound: 'a.wav' },
					{ at: { downbeat: 'after', at: 'hello world' }, sound: 'b.wav' },
					{ at: 'hello world', sound: 'c.wav' },
					{ at: { say: 'hello world', edge: 'end', offset: 1.5 }, sound: 'd.wav' }
				]
			},
			{ music: [{ id: null, name: 'bed', grid }] }
		);
		expect(errors(p)).toEqual([]);
		const at = (owner: string) => p.audio.sfx.find((s) => s.owner === owner)!.at;
		expect([at('sfx2'), at('sfx3'), at('sfx4')]).toEqual([2, 1, 3.1]);
	});

	it('stays ambiguous without a previous item, or when every occurrence is before it', () => {
		const p = program({
			shots: [{ id: 'a', shot: 'punch', from: 'hello world', until: 'bye' }],
			sfx: [
				{ at: 6, sound: 'a.wav' },
				{ at: 'hello world', sound: 'b.wav' }
			]
		});
		expect(errors(p).map((d) => d.message)).toEqual([
			expect.stringMatching(
				/^Phrase "hello world" is ambiguous: #1 at 1\.00s .*#2 at 5\.00s .*\. Repeated phrases here resolve to the first occurrence at or after the previous shot, but there is none\. Use a longer phrase/
			),
			expect.stringContaining(
				'resolve to the first occurrence at or after the previous sfx, but every occurrence lands before it (6.00s).'
			)
		]);
	});

	it('keeps phrases inside a clip (cues) ambiguous', () => {
		const p = program({
			clips: [{ id: 'c', block: 'b.svelte', from: 0, until: 'bye', cues: { x: 'hello world' } }]
		});
		expect(errors(p)[0].message).toMatch(/is ambiguous: .*\. Use a longer phrase/);
	});

	it('applies to clips in inserts mode too', () => {
		const r = resolveMotionProject(
			MotionProjectShape.parse({
				size: [1920, 1080],
				fps: 30,
				clips: [
					{ id: 'a', block: 'b.svelte', from: 'then', until: 'bye' },
					{ id: 'b', block: 'b.svelte', from: 'hello world', until: 'bye' }
				]
			}),
			talk
		);
		expect(r.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(r.clips[1].startFrame).toBe(150);
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

describe('motion transcript normalization', () => {
	it('ignores dashes at word edges', () => {
		const w = parseTranscriptWords([{ word: 'silently—', start: 1, end: 2 }]);
		expect(w[0].text).toBe('silently');
		expect(findPhrase(w, 'silently')).toHaveLength(1);
	});
});
