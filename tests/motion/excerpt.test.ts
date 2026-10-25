// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveProgram, type ProgramInputs, type ResolvedProgram } from '$lib/motion/program.js';
import { segmentStage } from '$lib/motion/segments.js';
import { EDGE_FADE, END_CARD_BLOCK } from '$lib/motion/excerpt.js';

const DIR = path.join(__dirname, 'fixtures/program');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
const take1 = parseTranscriptWords(read('take1.transcript.json'));
const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1920,
	height: 1080,
	fps: 30,
	audio: true
});
const inputs: ProgramInputs = {
	words: null,
	transcripts: { talk: take1 },
	sources: { talk: source(400) },
	sounds: { pop: { hit: 0.05 }, 'bed.mp3': { hit: 0 } }
};
const base = read('retake.vf.json');
/** The retake fixture with music and excerpts. */
const project = (extra: object = {}) =>
	parseMotionProject({
		...base,
		music: [
			{
				id: 'bed',
				src: 'bed.mp3',
				from: 0,
				keys: [
					{ at: 0, gain: 0 },
					{ at: 2, gain: -6 },
					{ at: 5, gain: -12 }
				]
			}
		],
		excerpts: [
			{
				id: 'teaser',
				from: 'today we fix',
				until: 'faster codec',
				format: '1080x1350',
				end: { duration: 1, props: { lines: ['Full video', 'on the channel'] }, sound: 'pop' }
			},
			{ id: 'mid', from: 'the slow export', until: 'for today' }
		],
		...extra
	});
const full = (p = project()) => resolveProgram(p, inputs);
const excerpt = (id: string, p = project(), opts: { format?: string } = {}) =>
	resolveProgram(p, inputs, { ...opts, excerpt: id });
const errors = (p: ResolvedProgram) => p.diagnostics.filter((d) => d.level === 'error');

describe('excerpts', () => {
	it('lists the excerpts as ranges of the whole program and leaves the program as it was', () => {
		const plain = resolveProgram(parseMotionProject(base), inputs);
		const whole = full(project({ music: undefined }));
		const { excerpts, ...rest } = whole;
		expect(JSON.stringify(rest)).toBe(JSON.stringify(plain));
		const today = whole.words.find((w) => w.text === 'today')!;
		const codec = whole.words.find((w) => w.text.startsWith('codec'))!;
		expect(excerpts).toEqual([
			{
				id: 'teaser',
				startFrame: Math.round(today.start * 30),
				frames: Math.round(codec.end * 30) - Math.round(today.start * 30),
				format: '1080x1350',
				end: { clip: 'teaser.end', frames: 30 }
			},
			expect.objectContaining({ id: 'mid', format: '1080x1920', end: null })
		]);
	});

	it('slices the resolved program: items keep their own time, cuts are trimmed', () => {
		const whole = full();
		const range = whole.excerpts![0];
		const p = excerpt('teaser');
		const A = range.startFrame;
		expect(errors(p)).toEqual([]);
		expect(p.excerpt).toEqual(range);
		expect(p.excerpts).toBeUndefined();
		expect(p.format.name).toBe('1080x1350');
		expect(p.frames).toBe(range.frames + 30);
		// The cuts on screen, trimmed to the range: each shows the same source frames as before.
		for (const cut of p.cuts) {
			const was = whole.cuts.find((c) => c.id === cut.id)!;
			expect(cut.startFrame).toBeGreaterThanOrEqual(0);
			expect(cut.startFrame + cut.frames).toBeLessThanOrEqual(range.frames);
			expect(cut.srcIn - (cut.startFrame + A)).toBe(was.srcIn - was.startFrame);
		}
		expect(p.cuts.map((c) => c.id)).toEqual(['cut2', 'cut3']);
		// Shots and clips move by the range start; their lengths and keys stay.
		const shot = p.shots.find((s) => s.id === 'punch1')!;
		const shotWas = whole.shots.find((s) => s.id === 'punch1')!;
		expect(shot.startFrame).toBe(shotWas.startFrame - A);
		expect(shot.frames).toBe(shotWas.frames);
		expect(shot.keys.map((k) => k.frame)).toEqual(shotWas.keys.map((k) => k.frame - A));
		// The format-dependent parts come from resolving the whole program in the excerpt's format.
		const formatted = resolveProgram(project(), inputs, { format: '1080x1350' });
		const codec = p.clips.find((c) => c.id === 'codec')!;
		const codecWas = formatted.clips.find((c) => c.id === 'codec')!;
		expect(codec.startFrame).toBe(codecWas.startFrame - A);
		// It runs on past `until` with its own length, so its animation is the full video's.
		expect(codec.frames).toBe(codecWas.frames);
		expect(codec.cues.codec.frame).toBe(codecWas.cues.codec.frame);
		expect(codec.cues.codec.start).toBe(codecWas.cues.codec.start);
		expect(codec.size).toEqual([1080, 1350]);
		expect(codec.words).toEqual({});
		const title = p.clips.find((c) => c.id === 'title')!;
		expect(title.startFrame).toBe(0);
		expect(title.cues.slow.words[0].start).toBeCloseTo(
			formatted.clips.find((c) => c.id === 'title')!.cues.slow.words[0].start - A / 30,
			6
		);
		// Words of the program inside the range, in excerpt time.
		expect(p.words[0].text).toBe('today');
		expect(p.words[0].start).toBeCloseTo(0, 1);
		expect(p.words.at(-1)!.text).toMatch(/^codec/);
	});

	it('appends the end card over the held last frame, with its sound', () => {
		const p = excerpt('teaser');
		const N = p.excerpt!.frames;
		const card = p.clips.at(-1)!;
		expect(card).toMatchObject({
			id: 'teaser.end',
			block: END_CARD_BLOCK,
			startFrame: N,
			frames: 30,
			props: { lines: ['Full video', 'on the channel'] },
			layer: 'front',
			slot: null
		});
		expect(card.z).toBeGreaterThan(Math.max(...p.clips.slice(0, -1).map((c) => c.z)));
		expect(card.format.class).toBe('portrait');
		const sound = p.audio.sfx.find((s) => s.owner === 'teaser.end.sound')!;
		expect(sound.at).toBeCloseTo(N / 30 - 0.05, 6);
		// The page holds frame N − 1 from frame N on, the card plays on.
		const stage = segmentStage(p, p.segments.at(-1)!, { frames: {}, map: null });
		expect(stage.hold).toEqual({ from: N, clips: ['teaser.end'] });
		expect(p.segments.at(-1)!.startFrame + p.segments.at(-1)!.frames).toBe(p.frames);
	});

	it('trims the sound at the edges: speech to the range, music on under the end card', () => {
		const whole = full();
		const p = excerpt('teaser');
		const a = p.excerpt!.startFrame / 30;
		const b = (p.excerpt!.startFrame + p.excerpt!.frames) / 30;
		const end = p.frames / 30;
		for (const s of p.audio.speech) {
			expect(s.at).toBeGreaterThanOrEqual(0);
			expect(s.at + s.dur!).toBeLessThanOrEqual(b - a + 1e-6);
		}
		// The speech of the last cut stops at `until` with an anti-click fade.
		const last = p.audio.speech.find((s) => s.owner === 'cut3')!;
		expect(last.at + last.dur!).toBeCloseTo(b - a, 6);
		expect(last.fadeOut).toBe(EDGE_FADE.speech);
		// Music starts inside its file, fades in briefly, plays under the card and fades out there.
		const [music] = p.audio.music;
		const was = whole.audio.music[0];
		expect(music.at).toBe(0);
		expect(music.srcIn).toBeCloseTo(was.srcIn + a, 6);
		expect(music.fadeIn).toBe(EDGE_FADE.music);
		expect(music.at + music.dur!).toBeCloseTo(end, 6);
		expect(music.fadeOut).toBe(1);
		// Its keys hold the level they have at each edge.
		expect(music.gainKeys![0]).toEqual({ at: 0, gain: expect.any(Number) });
		expect(music.gainKeys!.at(-1)!.at).toBeCloseTo(b - a, 6);
		// The pop on "faster codec" is inside; the transition's sound is not drawn here.
		expect(p.audio.sfx.map((s) => s.owner)).toContain('sfx1');
	});

	it('follows an edit before it: the same words, later or earlier in the program', () => {
		const before = excerpt('teaser');
		const shorter = project({
			cuts: [{ ...base.cuts[0], out: 'and welcome' }, ...base.cuts.slice(1)]
		});
		const after = excerpt('teaser', shorter);
		expect(after.excerpt!.startFrame).toBeLessThan(before.excerpt!.startFrame);
		expect(after.frames).toBe(before.frames);
		expect(after.cuts.map((c) => [c.startFrame, c.srcIn, c.srcOut])).toEqual(
			before.cuts.map((c) => [c.startFrame, c.srcIn, c.srcOut])
		);
		expect(after.words.map((w) => w.text)).toEqual(before.words.map((w) => w.text));
	});

	it('tells what its edges cut', () => {
		const p = excerpt('mid');
		const notes = p.diagnostics.filter((d) => d.item === 'mid');
		// It starts on "the slow export", inside the punch-in's shot and its title clip.
		expect(
			notes.some((d) => d.level === 'info' && /"title" runs across the start/.test(d.message))
		).toBe(true);
		expect(p.shots[0].startFrame).toBeLessThan(0);
	});

	it('takes --format over the excerpt format', () => {
		const p = excerpt('teaser', project(), { format: '1920x1080' });
		expect(p.format.name).toBe('1920x1080');
		expect(p.excerpt!.format).toBe('1920x1080');
	});

	it('fails clearly on an unknown excerpt or one that does not resolve', () => {
		expect(() => excerpt('nope')).toThrow(/Unknown excerpt "nope". Excerpts: teaser, mid/);
		const broken = project({
			excerpts: [
				{ id: 'teaser', from: 'today we fix', until: 'never said' },
				{ id: 'other', from: 'nothing like it', until: 'for today' }
			]
		});
		// The whole program renders; only the excerpt asked for has an error.
		expect(errors(full(broken))).toEqual([]);
		expect(
			full(broken).diagnostics.filter((d) => d.level === 'warning' && d.item === 'other')
		).toHaveLength(1);
		const p = excerpt('teaser', broken);
		expect(errors(p).map((d) => d.field)).toEqual(['excerpts[0].until']);
		expect(p.excerpt).toBeUndefined();
		expect(() =>
			resolveProgram(
				parseMotionProject({
					size: [100, 100],
					fps: 30,
					clips: [{ id: 'a', block: 'A.svelte', from: 0, until: 1 }],
					excerpts: [{ id: 'x', from: 0, until: 1 }]
				}),
				{ words: null },
				{ excerpt: 'x' }
			)
		).toThrow(/no "cuts" or "shots"/);
	});

	it('hashes what a transition window across an edge shows: its other side and held clips', () => {
		const at = (from: number, until: number, extra: object = {}) =>
			excerpt(
				'x',
				project({
					excerpts: [{ id: 'x', from: { frame: from }, until: { frame: until } }],
					...extra
				})
			);
		const whole = full();
		const push = whole.transitions.find((t) => t.owner === 'cut3')!;
		const wipe = whole.transitions.find((t) => t.owner === 'codec')!;
		// Ends inside the push window, before its cut: cut3 and the codec clip (its wipe starts
		// before the edge) are drawn, so they are in the segment and its hash.
		const end = push.cutFrame - 2;
		expect(wipe.startFrame).toBeLessThan(end);
		const p = at(39, end);
		const seg = p.segments.at(-1)!;
		expect(seg.items).toEqual(expect.arrayContaining(['cut3', 'codec']));
		const props = base.clips.map((c: { id: string }) =>
			c.id === 'codec' ? { ...c, props: { title: 'other' } } : c
		);
		expect(at(39, end, { clips: props }).segments.at(-1)!.hash).not.toBe(seg.hash);
		// Starts inside the window after its cut: the outgoing cut2 is drawn and hashed.
		const q = at(push.cutFrame + 2, push.cutFrame + 40);
		expect(q.segments[0].items).toContain('cut2');
		const later = base.cuts.map((c: object, i: number) =>
			i === 1 ? { ...c, in: { say: 'today we fix', offset: -0.2 } } : c
		);
		expect(at(push.cutFrame + 2, push.cutFrame + 40, { cuts: later }).segments[0].hash).not.toBe(
			q.segments[0].hash
		);
	});

	it('keeps both shots of a shot transition across an edge', () => {
		const shots = [
			{ id: 'open', shot: 'full', from: 0, until: 1.5 },
			{ id: 'in', shot: 'punch', from: 1.5, until: 3, transition: { type: 'push', duration: 0.6 } }
		];
		const p = excerpt('x', project({ shots, excerpts: [{ id: 'x', from: 0.8, until: 1.4 }] }));
		expect(p.transitions.map((t) => t.owner)).toEqual(['in']);
		expect(p.shots.map((s) => s.id)).toEqual(['open', 'in']);
		const stage = segmentStage(p, p.segments[0], { frames: {}, map: null });
		expect(stage.shots.map((s) => s.id)).toEqual(['open', 'in']);
	});

	it('leaves out music that starts after until, and fades effects out at the end', () => {
		const p = excerpt(
			'x',
			project({
				music: [
					{ id: 'bed', src: 'bed.mp3', from: 0, until: 2 },
					{ id: 'late', src: 'bed.mp3', from: 3.8 }
				],
				excerpts: [
					{ id: 'x', from: 'today we fix', until: 'the slow export', end: { duration: 1 } }
				]
			})
		);
		expect(p.audio.music.map((m) => m.owner)).toEqual(['bed']);
		const card = p.frames / 30;
		const short = excerpt(
			'y',
			project({ excerpts: [{ id: 'y', from: 'then pick', until: 'faster codec' }] })
		);
		const pop = short.audio.sfx.find((s) => s.owner === 'sfx1')!;
		expect(pop.at + pop.dur!).toBeCloseTo(short.frames / 30, 6);
		expect(pop.fadeOut).toBe(EDGE_FADE.speech);
		expect(card).toBeGreaterThan(0);
	});

	it('tells about a broken end card in the whole program, as a warning', () => {
		const p = project({
			excerpts: [
				{
					id: 'x',
					from: 0,
					until: 2,
					end: { duration: 1, sound: 'missing.wav', props: { image: { file: 'nope.png' } } }
				}
			]
		});
		const sounds = { ...inputs.sounds, 'missing.wav': null };
		const whole = resolveProgram(p, {
			...inputs,
			sounds,
			files: { 'nope.png': 'File not found: nope.png' },
			endBlocks: { [END_CARD_BLOCK]: null }
		});
		const told = whole.diagnostics.filter((d) => d.item?.startsWith('x.') || d.clip === 'x.end');
		expect(told.map((d) => d.level)).toEqual(['warning', 'warning']);
		expect(errors(whole)).toEqual([]);
		const asked = resolveProgram(
			p,
			{ ...inputs, sounds, endBlocks: { [END_CARD_BLOCK]: 'Unknown built-in block' } },
			{ excerpt: 'x' }
		);
		expect(errors(asked).map((d) => d.field)).toEqual(
			expect.arrayContaining(['excerpts[0].end.sound', 'excerpts[0].end.block'])
		);
	});

	it('rejects unknown fields', () => {
		expect(() => project({ excerpts: [{ id: 'x', from: 0, untill: 2 }] })).toThrow(/untill/);
	});
});
