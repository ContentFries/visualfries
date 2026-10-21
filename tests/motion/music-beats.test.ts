// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { BeatsFileShape, programBeats, type BeatsFile } from '$lib/motion/beat-grid.js';
import { musicTrack } from '$lib/motion/music.js';
import { resolveProgram, type ProgramInputs, type ResolvedProgram } from '$lib/motion/program.js';
import { fileSha256, formatBeatsFile } from '../../src/lib/motion/beats.js';
import { loadMotionProject, motionProgram } from '../../src/lib/motion/node.js';
import { mixProgram, writeWav, type MixedProgram } from '../../src/lib/motion/audio.js';
import { RATE } from '../../src/lib/motion/loudness.js';

const FIXTURES = path.join(__dirname, 'fixtures/program');
const take = async (n: number) =>
	parseTranscriptWords(
		JSON.parse(await fs.readFile(path.join(FIXTURES, `take${n}.transcript.json`), 'utf8'))
	);
const take1 = await take(1);
const take2 = await take(2);

/**
 * 120 BPM in 4/4, `seconds` long: beats every 0.5 s from 0.5 s, bar k's downbeat at
 * 0.5 + 2(k − 1) s of the file.
 */
function beatsFile(seconds: number, opts: { downbeats?: boolean } = {}): BeatsFile {
	const bars = opts.downbeats !== false;
	const beats = [];
	for (let i = 0; 0.5 + 0.5 * i < seconds - 0.25; i++)
		beats.push({
			time: 0.5 + 0.5 * i,
			...(bars ? { bar: Math.floor(i / 4) + 1, beat: (i % 4) + 1 } : {}),
			energy: -20
		});
	return BeatsFileShape.parse({
		version: 1,
		source: { file: 'bed.wav', sha256: '0'.repeat(64), duration: seconds },
		analyzer: { name: 'fixture', version: '1' },
		tempo: 120,
		beatsPerBar: bars ? 4 : null,
		beats,
		bars: bars
			? beats.filter((b) => b.beat === 1).map((b) => ({ bar: b.bar!, start: b.time, energy: -20 }))
			: []
	});
}

const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1920,
	height: 1080,
	fps: 30,
	audio: true
});

// The bed plays file second 0.1 at program 0.2 s: bar k's downbeat lands at 0.6 + 2(k − 1) s.
const BED = { id: 'bed', src: 'bed.wav', beats: 'bed.beats.json', from: 0.2, in: 0.1 };
const bar = (k: number) => 0.6 + 2 * (k - 1);
const frameOf = (seconds: number) => Math.round(seconds * 30);

function project(extra: Record<string, unknown> = {}) {
	return {
		size: [1920, 1080],
		fps: 30,
		footage: { talk: { src: 'talk.mp4', transcript: 'take1.transcript.json' } },
		cuts: [
			// Program 0 → bar 2 (2.6 s, frame 78).
			{ source: 'talk', in: 'hello and welcome', out: { bar: 2, music: 'bed' } },
			// "the settings" ends at 4.0 s in the program; the next downbeat is bar 3 (4.6 s, frame 138).
			{
				source: 'talk',
				in: 'first open',
				out: { downbeat: 'after', at: 'the settings', music: 'bed' }
			},
			// Words: 117 frames with take 1, 129 with take 2.
			{ source: 'talk', in: 'then pick', out: 'for today' }
		],
		music: [BED],
		...extra
	};
}

function resolve(
	json: Record<string, unknown>,
	opts: {
		words?: typeof take1;
		duration?: number;
		downbeats?: boolean;
		inputs?: Partial<ProgramInputs>;
		/** Hand the tracks over last item first (their order must not matter). */
		reverse?: boolean;
	} = {}
): ResolvedProgram {
	const p = parseMotionProject(json);
	const file = beatsFile(opts.duration ?? 40, { downbeats: opts.downbeats });
	const tracks = (p.music ?? []).flatMap((m, i) => (m.beats ? [musicTrack(file, m, i)] : []));
	if (opts.reverse) tracks.reverse();
	return resolveProgram(p, {
		words: null,
		transcripts: { talk: opts.words ?? take1 },
		sources: { talk: source(500) },
		tracks,
		...opts.inputs
	});
}
const errors = (p: ResolvedProgram) =>
	p.diagnostics.filter((d) => d.level === 'error').map((d) => `${d.field}: ${d.message}`);
const warnings = (p: ResolvedProgram) =>
	p.diagnostics.filter((d) => d.level === 'warning').map((d) => `${d.field}: ${d.message}`);

describe('music placed in program time', () => {
	it('ends cuts on bars and on the downbeat after a phrase, on the beat frames', () => {
		const p = resolve(project());
		expect(errors(p)).toEqual([]);
		expect(p.cuts.map((c) => [c.startFrame, c.frames])).toEqual([
			[0, frameOf(bar(2))],
			[frameOf(bar(2)), frameOf(bar(3)) - frameOf(bar(2))],
			[frameOf(bar(3)), 117]
		]);
		expect(frameOf(bar(2))).toBe(78);
		expect(frameOf(bar(3))).toBe(138);
		// The source keeps its own start; only the end moves to the beat.
		expect(p.cuts[1]).toMatchObject({ srcIn: 180, srcOut: 180 + 60 });
		expect(p.frames).toBe(255);
	});

	it('times clips, cues, shots, keys, sfx and gain keys on the same beats', () => {
		const p = resolve(
			project({
				clips: [
					{
						id: 'title',
						block: 'blocks/Word.svelte',
						from: { bar: 2 },
						until: { bar: 3, beat: 3 },
						cues: { hit: { bar: 3 } },
						keys: [{ at: { bar: 3 }, opacity: 1 }]
					}
				],
				shots: [
					{
						shot: 'punch',
						from: { beat: 6 },
						until: { bar: 4 },
						keys: [{ at: { bar: 3, beat: 2 }, scale: 1.2 }]
					}
				],
				sfx: [{ at: { bar: 4, offset: '-1b' }, sound: 'hit.wav' }],
				music: [{ ...BED, keys: [{ at: { bar: 2 }, gain: -6 }] }]
			})
		);
		expect(errors(p)).toEqual([]);
		const clip = p.clips[0];
		expect([clip.startFrame, clip.startFrame + clip.frames]).toEqual([
			frameOf(bar(2)),
			frameOf(bar(3) + 1)
		]);
		expect(clip.cues.hit.start).toBeCloseTo(bar(3) - bar(2), 6);
		expect(clip.keys.map((k) => k.frame)).toEqual([frameOf(bar(3))]);
		const shot = p.shots.find((s) => s.shot === 'punch')!;
		// Beat 6 is file second 3.0: program 3.1 s.
		expect([shot.startFrame, shot.startFrame + shot.frames]).toEqual([
			frameOf(3.1),
			frameOf(bar(4))
		]);
		expect(shot.keys.map((k) => k.frame)).toEqual([frameOf(bar(3) + 0.5)]);
		expect(p.audio.sfx[0].at).toBeCloseTo(frameOf(bar(4) - 0.5) / 30, 6);
		expect(p.audio.music[0].gainKeys).toEqual([{ at: bar(2), gain: -6 }]);
	});

	it('starts the music on a phrase or on another music’s bar, and its beats move with it', () => {
		const p = resolve(
			project({
				// "First open" plays from program 2.6 s; the stinger starts there, 1 s into its file.
				music: [
					BED,
					{ id: 'sting', src: 'sting.wav', beats: 'sting.beats.json', from: 'first open', in: 1 }
				],
				clips: [
					{
						id: 'c',
						block: 'blocks/Word.svelte',
						from: { bar: 2, music: 'sting' },
						until: { bar: 3, music: 'bed' }
					}
				]
			})
		);
		expect(errors(p)).toEqual([]);
		const sting = p.audio.music[1];
		expect(sting).toMatchObject({ owner: 'sting', at: 2.6, srcIn: 1 });
		// Sting bar 2 is file second 2.5: program 2.6 + 1.5.
		expect(p.clips[0].startFrame).toBe(frameOf(4.1));
		expect(p.clips[0].startFrame + p.clips[0].frames).toBe(frameOf(bar(3)));
		const later = resolve(project({ music: [BED, { ...BED, id: 'two', from: { bar: 2 } }] }));
		expect(errors(later)).toEqual([]);
		expect(later.audio.music[1].at).toBeCloseTo(bar(2), 6);
	});

	it('moves beats by "in" for clips in inserts mode too, where nothing snaps', () => {
		const p = resolve({
			size: [1920, 1080],
			fps: 30,
			music: [{ ...BED, until: 5.9 }],
			clips: [{ id: 'c', block: 'blocks/Word.svelte', from: { bar: 2 }, until: { bar: 3 } }]
		});
		expect(p.mode).toBe('inserts');
		expect(errors(p)).toEqual([]);
		expect([p.clips[0].startFrame, p.clips[0].startFrame + p.clips[0].frames]).toEqual([
			frameOf(bar(2)),
			frameOf(bar(3))
		]);
		expect(p.audio.music[0].snap).toBeUndefined();
		expect(p.audio.music[0].at + p.audio.music[0].dur!).toBeCloseTo(5.9, 6);
	});

	it('keeps the beats of music placed in seconds the same as before "in" existed', () => {
		const p = resolve(project({ music: [{ ...BED, in: undefined, from: -0.5 }] }));
		expect(errors(p)).toEqual([]);
		expect(p.audio.music[0]).toMatchObject({ at: 0, srcIn: 0.5 });
		// Bar 2 at file 2.5 s plays at 2.0 s.
		expect(p.cuts[1].startFrame).toBe(60);
	});
});

describe('music end on a bar end', () => {
	it('fades out onto the bar end nearest the program end, never after it', () => {
		const p = resolve(project());
		// Program end 8.5 s; bar ends at 6.6 and 8.6 s: 8.6 would pass the end.
		const [bed] = p.audio.music;
		expect(bed).toMatchObject({ at: 0.2, srcIn: 0.1, snap: { bar: 3, target: 8.5 } });
		expect(bed.at + bed.dur!).toBeCloseTo(bar(4), 6);
		expect(bed.fadeOut).toBe(1);
	});

	it('re-snaps the end after a retake changes the program length', () => {
		const before = resolve(project());
		const after = resolve(project(), { words: take2 });
		expect(errors(after)).toEqual([]);
		// Take 2 is slower: the last cut grows from 117 to 129 frames, the program to 8.9 s.
		expect(after.cuts.map((c) => c.startFrame)).toEqual(before.cuts.map((c) => c.startFrame));
		expect(after.frames).toBe(267);
		const [bed] = after.audio.music;
		expect(bed.snap).toEqual({ bar: 4, target: 8.9 });
		expect(bed.at + bed.dur!).toBeCloseTo(bar(5), 6);
		// Changing a cut by hand does the same.
		const longer = resolve(
			project({
				cuts: [...project().cuts.slice(0, 2), { source: 'talk', in: 'then pick', out: 12.5 }]
			})
		);
		expect(longer.frames).toBe(138 + 135);
		expect(longer.audio.music[0].snap).toEqual({ bar: 4, target: 9.1 });
	});

	it('snaps "until" to the nearest bar end, and keeps the exact end with "snap": false', () => {
		const p = resolve(project({ music: [{ ...BED, until: 5.9 }] }));
		expect(p.audio.music[0].at + p.audio.music[0].dur!).toBeCloseTo(bar(4), 6);
		expect(p.audio.music[0].snap).toEqual({ bar: 3, target: 5.9 });
		const exact = resolve(project({ music: [{ ...BED, until: 5.9, snap: false }] }));
		expect(exact.audio.music[0].at + exact.audio.music[0].dur!).toBeCloseTo(5.9, 6);
		expect(exact.audio.music[0].snap).toBeUndefined();
		// Its own bars are the default for "until".
		const own = resolve(project({ music: [{ ...BED, until: { bar: 3 } }] }));
		expect(own.audio.music[0].at + own.audio.music[0].dur!).toBeCloseTo(bar(3), 6);
	});

	it('does not depend on the order the tracks come in', () => {
		const two = project({
			music: [BED, { ...BED, id: 'sting', src: 'sting.wav', from: { bar: 2, music: 'bed' } }],
			clips: [{ id: 'c', block: 'b.svelte', from: { bar: 3, music: 'sting' }, until: 8 }]
		});
		const a = resolve(two, { words: take2 });
		expect(errors(a)).toEqual([]);
		expect(JSON.stringify(resolve(two, { words: take2, reverse: true }))).toBe(JSON.stringify(a));
	});

	it('accepts a bar end up to half a frame after the program end, ending with the program', () => {
		// Bars at 0.71 + 2(k − 1) s: the cut on bar 5 (8.71 s) rounds to frame 261, 8.70 s.
		const off = { ...BED, from: 0.21, in: 0 };
		const p = resolve(
			project({
				cuts: [{ source: 'talk', in: 0, out: { bar: 5 } }],
				music: [off],
				clips: [{ id: 'c', block: 'b.svelte', from: { bar: 4 }, until: { bar: 5 } }]
			})
		);
		expect(errors(p)).toEqual([]);
		expect(p.frames).toBe(261);
		const [bed] = p.audio.music;
		// The end of bar 4 (8.71 s) still counts; the fade is done on the program's last sample.
		expect(bed.snap).toEqual({ bar: 4, target: 8.7 });
		expect(bed.at + bed.dur!).toBeCloseTo(8.7, 6);
		expect(p.clips[0].startFrame + p.clips[0].frames).toBe(261);
		// One more frame short and the bar end is past the slack: the end of bar 3.
		const shorter = resolve(
			project({ cuts: [{ source: 'talk', in: 0, out: 8.66 }], music: [off] })
		);
		expect(shorter.frames).toBe(260);
		expect(shorter.audio.music[0].snap).toEqual({ bar: 3, target: 8.666667 });
	});

	it('keeps beat anchors to the beats the music plays, up to its snapped end', () => {
		// "until" 5.9 snaps to the end of bar 3 (6.6 s): bar 4's downbeat is the last beat.
		const p = resolve(
			project({
				music: [{ ...BED, until: 5.9 }],
				clips: [
					{ id: 'a', block: 'b.svelte', from: { bar: 3, beat: 3 }, until: { bar: 4 } },
					{ id: 'b', block: 'b.svelte', from: { bar: 4 }, until: { bar: 4, beat: 2 } }
				]
			})
		);
		expect(p.clips.map((c) => c.id)).toEqual(['a']);
		expect(p.clips[0].startFrame + p.clips[0].frames).toBe(frameOf(bar(4)));
		expect(errors(p)).toEqual([expect.stringMatching(/^until: Bar 4 has no beat 2/)]);
	});
});

/** One cut by the numbers: the program is 8.5 s whatever the music does. */
const PLAIN = [{ source: 'talk', in: 0, out: 8.5 }];

describe('music diagnostics', () => {
	it('says when the music runs out before it should end', () => {
		// 6 s of file: it runs out at 6.1 s; the bar end it should reach (8.6 s) is past that.
		const p = resolve(project(), { duration: 6 });
		expect(errors(p)).toEqual([]);
		// (Cut 1 ends on bar 2 in the middle of "today": that warning is the cut list's.)
		expect(warnings(p).filter((w) => w.startsWith('music'))).toEqual([
			'music[0].src: Music "bed" runs out at 6.10 s, 2.40 s before the program end (8.50 s); it ends at 4.60 s on the end of bar 2. Use a longer track or end it earlier with "until".'
		]);
		expect(p.audio.music[0].at + p.audio.music[0].dur!).toBeCloseTo(bar(3), 6);
		// Without beats it ends where the file does.
		const plain = resolve(project({ cuts: PLAIN, music: [{ ...BED, beats: undefined }] }), {
			inputs: { sounds: { 'bed.wav': { hit: 0, duration: 6 } } }
		});
		expect(warnings(plain)).toEqual([
			'music[0].src: Music "bed" runs out at 6.10 s, 2.40 s before the program end (8.50 s); it ends at 6.10 s. Use a longer track or end it earlier with "until".'
		]);
		expect(plain.audio.music[0].dur).toBeCloseTo(5.9, 6);
	});

	it('warns when no bar end falls inside the music', () => {
		const p = resolve(project({ cuts: PLAIN, music: [{ ...BED, from: 7, in: 0 }] }));
		expect(warnings(p)).toEqual([
			'music[0].snap: Music "bed" cannot end on a bar end: none falls between its start (7.00 s) and the program end (8.50 s). It ends at 8.50 s; "snap": false keeps that without this warning.'
		]);
		expect(p.audio.music[0].dur).toBeCloseTo(1.5, 6);
	});

	it('asks for the beats file when beats are used without one', () => {
		const json = project({
			cuts: [{ source: 'talk', in: 0, out: 3 }],
			music: [{ src: 'bed.wav', snap: 'bar' }],
			clips: [{ id: 'c', block: 'blocks/Word.svelte', from: { bar: 2 }, until: 2.9 }]
		});
		const advice =
			'Music "bed.wav" has no beats file, so beat anchors and its bar-end snap have nothing to read. Run: visualfries beats bed.wav --output bed.beats.json, then add "beats": "bed.beats.json" to it.';
		const p = resolve(json);
		expect(errors(p)).toContain(`music[0].snap: ${advice}`);
		expect(errors(p)).toContain(`music[0].beats: ${advice}`);
		// Without downbeats there are no bars to end on.
		const flat = resolve(project({ cuts: PLAIN, music: [{ ...BED, snap: 'bar' }] }), {
			downbeats: false
		});
		expect(errors(flat)).toEqual([
			'music[0].snap: Music "bed" has no downbeats, so it has no bars to end on. Re-analyse with a tool that finds downbeats, or set "snap": false.'
		]);
		// Unasked, beats without downbeats simply do not snap.
		const quiet = resolve(project({ cuts: [{ source: 'talk', in: 0, out: 3 }] }), {
			downbeats: false
		});
		expect(quiet.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		expect(quiet.audio.music[0].dur).toBeCloseTo(2.8, 6);
	});

	it('says once that music cannot start on its own beats', () => {
		const own =
			'music[0].from: Music "bed" cannot start on its own beats: they move with it. Start it in seconds, on a phrase, or on a beat of music listed before it ({ "bar": 2, "music": "<id>" }).';
		const p = resolve(
			project({
				cuts: PLAIN,
				music: [
					{ ...BED, from: { bar: 2 } },
					{ id: 'vo', src: 'vo.wav' }
				],
				clips: [{ id: 'c', block: 'b.svelte', from: { bar: 3 }, until: { bar: 4 } }],
				sfx: [{ at: { bar: 3 }, sound: 'hit.wav' }]
			})
		);
		// It plays from 0 instead, so what sits on its beats still resolves; "vo" is not to blame.
		expect(errors(p)).toEqual([own]);
		expect(p.clips[0].startFrame).toBe(frameOf(4.4));
		expect(
			errors(resolve(project({ cuts: PLAIN, music: [{ ...BED, from: { bar: 2, music: 'bed' } }] })))
		).toEqual([own]);
		// Music listed later cannot be the one it starts on either.
		const later = resolve(
			project({
				cuts: PLAIN,
				music: [
					{ ...BED, from: { bar: 2, music: 'sting' } },
					{ ...BED, id: 'sting', src: 'sting.wav' }
				]
			})
		);
		expect(errors(later)).toEqual([
			'music[0].from: Music "bed" starts on a beat of "sting", which is listed after it. Music can start only on the beats of music listed before it; move "sting" up.'
		]);
	});

	it('refuses music that would start past the end of its file', () => {
		const p = resolve(project({ cuts: PLAIN, music: [{ ...BED, from: -15, in: 30 }] }));
		expect(errors(p)).toEqual([
			'music[0].in: Music "bed" would start 45.00 s into "bed.wav", which is 40.00 s long.'
		]);
		expect(p.audio.music).toEqual([]);
	});

	it('keeps snap messages to where a snap can happen', () => {
		// Beats already in program time (no tracks) have no bars.
		const legacy = parseMotionProject(project({ cuts: PLAIN, music: [{ ...BED, snap: 'bar' }] }));
		const given = resolveProgram(legacy, {
			words: null,
			transcripts: { talk: take1 },
			sources: { talk: source(500) },
			music: [programBeats(beatsFile(40), { ...BED })]
		});
		expect(errors(given)).toEqual([
			'music[0].snap: Music "bed": "snap": "bar" needs its beats in seconds of the music file (inputs.tracks, as the node tooling reads them); beats already placed in the program (inputs.music) have no bars to end on.'
		]);
		// A broken cut list leaves no program to end in: only its own errors.
		const broken = resolve(
			project({
				cuts: [{ source: 'talk', in: 0, out: { bar: 2 } }],
				music: [BED, { ...BED, id: 'sting', src: 'sting.wav' }]
			})
		);
		expect(broken.diagnostics.filter((d) => d.level !== 'info').map((d) => d.field)).toEqual([
			'cuts[0].out'
		]);
		// Inserts mode mixes no music: one warning that "snap" does nothing there.
		const inserts = resolve({
			size: [1920, 1080],
			fps: 30,
			music: [
				{ ...BED, snap: 'bar' },
				{ ...BED, id: 'sting', src: 'sting.wav', snap: false }
			],
			clips: [{ id: 'c', block: 'b.svelte', from: 0, until: 2 }]
		});
		expect(warnings(inserts)).toEqual([
			'music[0].snap: "snap" has no effect without "cuts" or "shots": music is mixed, and ends on a bar, only in a program.'
		]);
	});

	it('refuses beats in "in", beats before the cut starts and music placed by words', () => {
		const p = resolve(
			project({
				cuts: [
					{ source: 'talk', in: 0, out: { bar: 2 } },
					{ source: 'talk', in: { bar: 3 }, out: 9 },
					{ source: 'talk', in: 5, out: { bar: 1 } }
				]
			})
		);
		expect(errors(p)).toEqual([
			'cuts[1].in: cut 2: "in" is a point in the source; a cut starts where the one before it ends. Put the beat on the "out" of cut 1.',
			'cuts[2].out: cut 3: "out" on the music lands at 0.60 s, not after the cut starts (2.60 s).'
		]);
		const words = resolve(project({ music: [{ ...BED, from: 'hello and welcome' }] }));
		expect(errors(words)[0]).toBe(
			'cuts[0].out: cut 1: Music "bed" is placed by a phrase (its own "from", or that of the music it starts on), and the cut list decides where phrases play, so cut points cannot read its beats. Start it in seconds or on the beats of other music, or end the cut on a phrase.'
		);
		// A phrase in "until" only waits: cut points still read the music.
		const until = resolve(project({ music: [{ ...BED, until: 'for today' }] }));
		expect(errors(until)).toEqual([]);
		expect(until.cuts.map((c) => c.startFrame)).toEqual([0, 78, 138]);
		expect(until.audio.music[0].snap).toEqual({ bar: 3, target: 8.5 });
	});

	it('reads several music items on cut points, and asks which when it is not said', () => {
		const sting = { ...BED, id: 'sting', src: 'sting.wav', from: 1, in: 0 };
		const cuts = [
			{ source: 'talk', in: 0, out: { bar: 2, music: 'bed' } },
			// Sting bar 2 (file 2.5 s) plays at 3.5 s.
			{ source: 'talk', in: 5, out: { bar: 2, music: 'sting' } },
			{ source: 'talk', in: 8, out: 9 }
		];
		const p = resolve(project({ cuts, music: [BED, sting] }));
		expect(errors(p)).toEqual([]);
		expect(p.cuts.map((c) => c.startFrame)).toEqual([0, 78, frameOf(3.5)]);
		const unnamed = resolve(
			project({ cuts: [{ source: 'talk', in: 0, out: { bar: 2 } }], music: [BED, sting] })
		);
		expect(errors(unnamed)).toEqual([
			'cuts[0].out: cut 1: Several music items have beats (bed, sting); give each an "id" and say which with "music": "<id>".'
		]);
		// One of them waiting for a phrase is still one of several.
		const waiting = resolve(
			project({
				cuts: [{ source: 'talk', in: 0, out: { bar: 2 } }],
				music: [BED, { ...sting, from: 'hello and welcome' }]
			})
		);
		expect(errors(waiting).filter((e) => e.startsWith('cuts'))).toEqual([
			'cuts[0].out: cut 1: Several music items have beats (bed, sting); say which with "music": "<id>".'
		]);
	});

	it('keeps J/L splits and transitions on cuts that end on beats', () => {
		const p = resolve(
			project({
				cuts: [
					{ source: 'talk', in: 'hello and welcome', out: { bar: 2 } },
					{
						source: 'talk',
						in: 'first open',
						out: { bar: 3 },
						audio: { split: -0.3 },
						transition: { type: 'wipe', duration: 0.4 }
					},
					{ source: 'talk', in: 'then pick', out: 'for today', audio: { split: 0.2 } }
				]
			})
		);
		expect(errors(p)).toEqual([]);
		// The picture cuts on the bars; the sound moves by the split; the wipe centres on the cut.
		expect(p.cuts.map((c) => [c.startFrame, c.audio.edit])).toEqual([
			[0, 0],
			[78, 2.3],
			[138, 4.8]
		]);
		expect(p.transitions.map((t) => [t.cutFrame, t.startFrame, t.frames])).toEqual([[78, 72, 12]]);
		expect(p.segments.map((s) => s.startFrame)).toEqual([0, 138]);
	});

	it('drops the beats of the part "in" skips', () => {
		// File second 10 plays at 5 s: bar 6 (file 10.5 s) is the first downbeat heard, at 5.5 s.
		const late = { ...BED, from: 5, in: 10 };
		const plain = [{ source: 'talk', in: 0, out: 12 }];
		const p = resolve(
			project({
				cuts: plain,
				music: [late],
				clips: [
					{
						id: 'c',
						block: 'b.svelte',
						from: { downbeat: 'after', at: 1 },
						until: { bar: 7 }
					}
				]
			})
		);
		expect(errors(p)).toEqual([]);
		// A search from inside the silence finds the first beat that plays.
		expect(p.clips[0].startFrame).toBe(frameOf(5.5));
		expect(p.clips[0].beats![0].time).toBe(5);
		// A bar the music skips does not exist.
		const skipped = resolve(
			project({
				cuts: [{ source: 'talk', in: 0, out: { bar: 4 } }, ...plain],
				music: [late]
			})
		);
		expect(errors(skipped)).toEqual([
			'cuts[0].out: cut 1: Bar 4 does not exist: bed has bars 6–20.'
		]);
	});
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

describe.skipIf(!hasFfmpeg)('music on beats through the node tooling', () => {
	let dir: string;
	const CLICKS = Array.from({ length: 23 }, (_, i) => 0.5 + 0.5 * i);

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-music-beats-'));
		const run = (args: string[]) => {
			const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
			if (r.status !== 0) throw new Error(String(r.stderr));
		};
		run([
			'-f',
			'lavfi',
			'-i',
			'color=black:s=320x180:r=30:d=10',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'v.mp4')
		]);
		const stereo = (seconds: number, f: (n: number) => number) => {
			const out = new Float32Array(Math.round(seconds * RATE) * 2);
			for (let n = 0; n < out.length / 2; n++) out[2 * n] = out[2 * n + 1] = f(n);
			return out;
		};
		await writeWav(
			path.join(dir, 'tone.wav'),
			stereo(10, (n) => 0.05 * Math.sin((2 * Math.PI * 300 * n) / RATE))
		);
		// A click on every beat of the music file.
		const at = new Set(CLICKS.map((t) => Math.round(t * RATE)));
		await writeWav(
			path.join(dir, 'bed.wav'),
			stereo(12, (n) => (at.has(n) ? 0.6 : 0))
		);
		const sha256 = await fileSha256(path.join(dir, 'bed.wav'));
		const file = beatsFile(12);
		await fs.writeFile(
			path.join(dir, 'bed.beats.json'),
			formatBeatsFile({ ...file, source: { ...file.source, sha256 } })
		);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	async function load(lastOut: number) {
		const file = path.join(dir, 'p.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [320, 180],
				fps: 30,
				footage: { v: { src: 'v.mp4', audio: 'tone.wav' } },
				cuts: [
					{ source: 'v', in: 0, out: { bar: 2 } },
					{ source: 'v', in: 3, out: { bar: 4 } },
					{ source: 'v', in: 1, out: lastOut }
				],
				music: [{ ...BED, src: 'bed.wav', fade: { in: 0, out: 0 } }]
			})
		);
		return (await motionProgram(await loadMotionProject(file))).program;
	}

	it('puts every music click, and the cut on each bar, on its sample', async () => {
		const program = await load(3);
		expect(program.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		// Cuts on bars 2 and 4: frames 78 and 198 (1600 samples a frame at 30 fps).
		expect(program.cuts.map((c) => c.startFrame)).toEqual([0, 78, 198]);
		const piece = program.audio.music[0];
		expect(piece).toMatchObject({ at: 0.2, srcIn: 0.1, snap: { bar: 4, target: 8.6 } });
		const { stems } = (await mixProgram(program, {
			dir,
			stems: true,
			normalize: false
		})) as MixedProgram;
		const music = stems!.music;
		let max = 0;
		for (let i = 0; i < music.length; i += 2) max = Math.max(max, Math.abs(music[i]));
		const found: number[] = [];
		for (let n = 0; n < music.length >> 1; n++) if (Math.abs(music[2 * n]) > max / 2) found.push(n);
		// File second t plays at program 0.2 + t − 0.1, until the bar end at 8.6 s.
		const end = Math.round((piece.at + piece.dur!) * RATE);
		const expected = CLICKS.map((t) => Math.round((0.1 + t) * RATE)).filter((n) => n < end);
		expect(found.length).toBe(expected.length);
		found.forEach((n, i) => expect(Math.abs(n - expected[i])).toBeLessThanOrEqual(1));
		// In the mix, the downbeats of bars 2 and 4 sound on the first sample of their cuts.
		for (const cut of [78, 198])
			expect(
				found.some((n) => Math.abs(n - cut * 1600) <= 1),
				`click at frame ${cut}`
			).toBe(true);
	});

	it('keeps a music item that cannot be placed an error of the loaded project', async () => {
		const file = path.join(dir, 'inserts.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [320, 180],
				fps: 30,
				music: [{ ...BED, src: 'bed.wav', from: { bar: 2 } }],
				clips: [{ id: 'c', block: 'b.svelte', from: 0, until: 1 }]
			})
		);
		const loaded = await loadMotionProject(file);
		expect(loaded.resolved.diagnostics).toEqual([
			{
				level: 'error',
				field: 'music[0].from',
				message:
					'Music "bed" cannot start on its own beats: they move with it. Start it in seconds, on a phrase, or on a beat of music listed before it ({ "bar": 2, "music": "<id>" }).'
			}
		]);
	});

	it('resolves the same program in fresh processes', async () => {
		const program = await load(3);
		const cli = () =>
			spawnSync(
				process.execPath,
				[path.resolve('bin/visualfries.js'), 'program', 'p.vf.json', '--json'],
				{
					cwd: dir,
					encoding: 'utf8'
				}
			).stdout;
		const first = cli();
		expect(JSON.parse(first).audio.music[0].snap).toEqual({ bar: 4, target: 8.6 });
		expect(cli()).toBe(first);
		expect(JSON.stringify(JSON.parse(first))).toBe(JSON.stringify(program));
	});

	it('re-snaps the music end when a cut changes', async () => {
		const shorter = await load(2.5);
		expect(shorter.frames).toBe(243);
		const piece = shorter.audio.music[0];
		expect(piece.snap).toEqual({ bar: 3, target: 8.1 });
		expect(piece.at + piece.dur!).toBeCloseTo(6.6, 6);
	});
});
