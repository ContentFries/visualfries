// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveProgram, type ProgramInputs, type ResolvedProgram } from '$lib/motion/program.js';
import { sha1 } from '$lib/motion/sha1.js';
import { loadMotionProject, motionProgram } from '../../src/lib/motion/node.js';

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
/** Fixed inputs: what the node tooling would probe and hash for the fixtures. */
const inputs: ProgramInputs & { hashes: object } = {
	words: null,
	transcripts: { talk: take1 },
	sources: { talk: source(400), broll: source(90) },
	hashes: {
		project: 'project-hash',
		transcripts: { talk: 'talk-transcript-hash' },
		sources: { talk: 'talk-file-hash', broll: 'broll-file-hash' },
		assets: { 'blocks/Word.svelte': 'word-block-hash', 'blocks/Title.svelte': 'title-block-hash' }
	}
};
const program = (json: unknown, extra: Partial<ProgramInputs> = {}) =>
	resolveProgram(parseMotionProject(json), { ...inputs, ...extra });
const errors = (p: ResolvedProgram) => p.diagnostics.filter((d) => d.level === 'error');

/** Golden files are compared as JSON text; UPDATE_GOLDEN=1 rewrites them. */
function expectGolden(name: string, value: ResolvedProgram) {
	const file = path.join(DIR, name);
	if (process.env.UPDATE_GOLDEN) fs.writeFileSync(file, JSON.stringify(value, null, '\t') + '\n');
	expect(JSON.stringify(value)).toBe(JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8'))));
}

describe('resolved program', () => {
	it('matches the golden program of the retake fixture', () => {
		const p = program(read('retake.vf.json'));
		// The codec clip names the panel slot, but no strip frees it.
		expect(p.diagnostics).toEqual([
			{
				level: 'warning',
				clip: 'codec',
				field: 'slot',
				message:
					'No shot frees the "panel" slot for 90 of the clip\'s 90 frames (first at 3.30 s); the clip is hidden there. Shots with a "panel" slot: strip, window.'
			}
		]);
		expectGolden('retake.program.json', p);
	});

	it('matches the golden program of the handles fixture', () => {
		expectGolden('handles.program.json', program(read('handles.vf.json')));
	});

	it('is byte-identical between runs', () => {
		for (const fixture of ['retake.vf.json', 'handles.vf.json']) {
			const a = JSON.stringify(program(read(fixture)), null, 2);
			const b = JSON.stringify(program(read(fixture)), null, 2);
			expect(a).toBe(b);
		}
	});

	it('writes the same program file twice through the node tooling', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-program-'));
		fs.copyFileSync(
			path.join(DIR, 'take1.transcript.json'),
			path.join(dir, 'take1.transcript.json')
		);
		fs.copyFileSync(path.join(DIR, 'retake.vf.json'), path.join(dir, 'p.vf.json'));
		const bytes: Buffer[] = [];
		for (let run = 0; run < 2; run++) {
			const { file } = await motionProgram(await loadMotionProject(path.join(dir, 'p.vf.json')), {
				write: true
			});
			expect(file).toBe(path.join(dir, '.visualfries/program/1080x1920.json'));
			bytes.push(fs.readFileSync(file!));
		}
		expect(bytes[0].equals(bytes[1])).toBe(true);
		const saved = JSON.parse(bytes[0].toString());
		expect(saved.hashes.transcripts.talk).toMatch(/^[0-9a-f]{12}$/);
		expect(saved.frames).toBe(189);
	});
});

describe('transition windows and handles', () => {
	const p = program(read('handles.vf.json'));

	it('reports a missing handle with the numbers', () => {
		const push = p.transitions.find((t) => t.owner === 'broll')!;
		expect(push).toMatchObject({
			startFrame: 32,
			frames: 15,
			cutFrame: 39,
			held: { in: 4, out: 0 }
		});
		expect(p.diagnostics).toContainEqual({
			level: 'warning',
			item: 'broll',
			field: 'cuts[1].transition',
			message:
				'cut 2: push needs 0.23 s of incoming handle, 0.10 s available; the first frame holds 4 frames.'
		});
	});

	it('places start- and end-aligned windows on the cut', () => {
		const card = p.transitions.find((t) => t.type === 'card')!;
		expect(card.startFrame + card.frames).toBe(card.cutFrame);
		expect(card.held).toEqual({ in: 0, out: 0 });
		const wipe = p.transitions.find((t) => t.owner === 'whip')!;
		expect(wipe).toMatchObject({ kind: 'shot', outgoing: 'punch', startFrame: 150, frames: 12 });
	});

	it('holds the outgoing edge frame when the outgoing source runs out', () => {
		const json = read('handles.vf.json');
		json.cuts[1].in = 1;
		const short = program(json, { sources: { talk: source(55), broll: source(90) } });
		const push = short.transitions.find((t) => t.owner === 'broll')!;
		// talk ends one frame after cut 1's "out" (frame 54 of 55): 8 frames needed after the cut.
		expect(push.held).toEqual({ in: 0, out: 7 });
		expect(short.diagnostics.map((d) => d.message)).toContain(
			'cut 2: push needs 0.27 s of outgoing handle, 0.03 s available; the last frame holds 7 frames.'
		);
	});

	it('splits segments only at hard cuts outside transition windows', () => {
		const hard = p.cuts.filter((c) => c.index > 0 && !c.transition).map((c) => c.startFrame);
		expect(hard).toEqual([96, 156]);
		// 156 sits inside the wipe into the whip shot, so only 96 splits.
		expect(p.segments.map((s) => [s.startFrame, s.frames])).toEqual([
			[0, 96],
			[96, p.frames - 96]
		]);
		for (const seg of p.segments.slice(1)) {
			expect(hard).toContain(seg.startFrame);
			for (const t of p.transitions)
				expect(t.startFrame < seg.startFrame && seg.startFrame < t.startFrame + t.frames).toBe(
					false
				);
		}
		expect(p.segments[0].items).toEqual(['cut1', 'broll', 'full-0', 'broll.transition']);
	});

	it('changes only the hashes of segments whose content changed', () => {
		const json = read('handles.vf.json');
		json.clips[0].props = { color: 'red' };
		const changed = program(json);
		expect(changed.segments[0].hash).toBe(p.segments[0].hash);
		expect(changed.segments[1].hash).not.toBe(p.segments[1].hash);
	});

	it('rejects a transition on the first cut, windows longer than a range and overlapping windows', () => {
		const json = read('handles.vf.json');
		json.cuts[0].transition = 'wipe';
		json.cuts[3].transition = { type: 'push', duration: 4 };
		const messages = errors(program(json)).map((d) => d.message);
		expect(messages).toContain('cut 1 is the first cut: there is nothing to transition from.');
		expect(
			messages.some((m) => /^cut 4: the push window .* is longer than a neighbouring range/.test(m))
		).toBe(true);
		const overlap = read('handles.vf.json');
		overlap.cuts[3].transition = { type: 'push', duration: 0.4 };
		expect(errors(program(overlap)).map((d) => d.message)).toContain(
			'The wipe window into whip overlaps the push window into cut4.'
		);
	});

	it('resolves a clip transition against everything below the clip', () => {
		const t = program(read('retake.vf.json')).transitions.find((x) => x.kind === 'clip')!;
		expect(t).toMatchObject({
			owner: 'codec',
			outgoing: null,
			type: 'wipe',
			frames: 12,
			held: { in: 6, out: 0 }
		});
	});
});

describe('shots, clips, keys and events', () => {
	const p = program(read('handles.vf.json'));

	it('fills gaps between shots with an implicit full frame', () => {
		expect(p.shots.map((s) => [s.id, s.shot, s.startFrame, s.frames, s.implicit])).toEqual([
			['full-0', 'full', 0, 96, true],
			['punch', 'punch', 96, 60, false],
			['whip', 'whip', 156, 48, false],
			['full-204', 'full', 204, p.frames - 204, true]
		]);
	});

	it('resolves item-local keys to program frames', () => {
		const punch = p.shots.find((s) => s.id === 'punch')!;
		expect(punch.morphFrames).toBe(6);
		expect(punch.keys).toEqual([
			{ frame: 96, values: { scale: 1 }, ease: 'power2.inOut', mix: 'oklch' },
			{ frame: 126, values: { scale: 1.2 }, ease: 'power2.out', mix: 'oklch' },
			{ frame: 126, values: { x: '5%' }, ease: 'power2.inOut', mix: 'oklch' }
		]);
		const price = p.clips[0];
		expect(price.keys[0]).toMatchObject({ frame: price.startFrame + price.cues.slow.frame });
		expect(p.diagnostics).toContainEqual(
			expect.objectContaining({ level: 'warning', clip: 'price', field: 'keys[1].at' })
		);
	});

	it('passes slot, layer, z and native through to clips', () => {
		const codec = program(read('retake.vf.json')).clips.find((c) => c.id === 'codec')!;
		expect(codec).toMatchObject({ slot: 'panel', layer: 'front', z: 1, native: null });
		expect(p.clips[0].layer).toBe('behind');
	});

	it('needs a matte for a clip behind the subject', () => {
		const json = read('handles.vf.json');
		json.clips[0].from = 'hello and welcome';
		expect(errors(program(json))).toContainEqual(
			expect.objectContaining({
				clip: 'price',
				field: 'layer',
				message: expect.stringContaining('"broll" has none')
			})
		);
	});

	it('emits shot and transition events in frame order', () => {
		expect(p.events).toEqual([
			{ kind: 'transition', frame: 39, owner: 'broll.transition' },
			{ kind: 'punch', frame: 96, owner: 'punch' },
			{ kind: 'whip', frame: 156, owner: 'whip' },
			{ kind: 'transition', frame: 156, owner: 'whip.transition' },
			{ kind: 'transition', frame: 204, owner: 'cut5.transition' },
			// The whip back to full, halfway through its morph (0.42 s).
			{ kind: 'whip', frame: 210, owner: 'full-204' }
		]);
	});

	it('lays speech on the audio edit points and keeps explicit sfx and music', () => {
		const [, , third] = p.audio.speech;
		expect(third.at).toBeCloseTo(96 / 30 - 0.3 - 0.005, 9);
		expect(third.srcIn).toBeCloseTo(3 - 0.3 - 0.005, 9);
		expect(p.audio.speech[1].file).toBe('broll.mp4');
		expect(p.audio.sfx).toEqual([
			expect.objectContaining({ owner: 'sfx1', file: 'whoosh', gain: -3, at: 4.066667 })
		]);
		expect(p.audio.music[0]).toMatchObject({ owner: 'music1', file: 'bed.mp3', at: 0, srcIn: 0 });
		expect(p.audio.music[0].dur).toBeCloseTo(p.frames / 30, 9);
	});

	describe('speech never reads outside the source sound', () => {
		const twoCuts = (cuts: unknown[]) => ({
			size: [1920, 1080],
			fps: 30,
			footage: { talk: { src: 'talk.mp4' }, broll: { src: 'broll.mp4' } },
			cuts
		});

		it('starts a cut at source 0 with its sound and shortens the fade-in', () => {
			const p = program(
				twoCuts([
					{ source: 'talk', in: 1, out: 2 },
					{ source: 'broll', in: 0, out: 1 }
				])
			);
			expect(errors(p)).toEqual([]);
			const [first, second] = p.audio.speech;
			// The crossfade centres on 1.0 s: the outgoing piece fades 0.995–1.005 s.
			expect(first).toMatchObject({ at: 0, srcIn: 1, dur: 1.005, fadeOut: 0.01 });
			// broll has no sound before 0: it starts at the edit with half the fade left.
			expect(second).toMatchObject({ at: 1, srcIn: 0, dur: 1, fadeIn: 0.005, fadeOut: 0 });
		});

		it('ends a cut at the end of its sound and shortens the fade-out', () => {
			const sources = { talk: source(400), broll: source(30) };
			const p = program(
				twoCuts([
					{ source: 'broll', in: 0, out: 1 },
					{ source: 'talk', in: 2, out: 3 }
				]),
				{ sources }
			);
			const [first, second] = p.audio.speech;
			expect(first).toMatchObject({ at: 0, srcIn: 0, dur: 1, fadeOut: 0.005 });
			expect(second).toMatchObject({ at: 0.995, srcIn: 1.995, fadeIn: 0.01 });
			// A separate audio file shorter than the picture ends the piece earlier.
			const shortSound = program(
				twoCuts([
					{ source: 'broll', in: 0, out: 1 },
					{ source: 'talk', in: 2, out: 3 }
				]),
				{ sources: { ...sources, broll: { ...source(30), audioDuration: 0.9 } } }
			);
			expect(shortSound.audio.speech[0]).toMatchObject({ dur: 0.9, fadeOut: 0 });
		});
	});

	it('keeps segment hashes when only the sound changes', () => {
		const json = read('handles.vf.json');
		json.cuts[3].audio = { gain: -6, crossfade: 0.05 };
		json.cuts[1].transition.sound = 'whoosh';
		json.footage.talk.audio = 'talk.wav';
		const changed = program(json);
		expect(changed.audio.speech[3].gain).toBe(-6);
		expect(changed.segments.map((s) => s.hash)).toEqual(p.segments.map((s) => s.hash));
	});

	it('frames a shot source from its first frame unless the shot gives "in"', () => {
		const json = read('handles.vf.json');
		json.shots[0].source = 'broll';
		expect(program(json).shots.find((s) => s.id === 'punch')!.source).toEqual({
			name: 'broll',
			srcIn: 0
		});
	});

	it('reports a shot that starts after the program ends once', () => {
		const json = read('handles.vf.json');
		json.shots = [{ id: 'late', shot: 'punch', from: 60, until: 61 }];
		const late = program(json).diagnostics.filter((d) => d.item === 'late');
		expect(late).toEqual([
			{
				level: 'error',
				item: 'late',
				field: 'shots[0].from',
				message: `Shot starts at 60.00 s, after the program ends (${(p.frames / 30).toFixed(2)} s).`
			}
		]);
	});

	it('validates shot and transition names against the registry, and accepts custom files', () => {
		const json = read('retake.vf.json');
		json.shots[0].shot = 'zoom';
		json.cuts[2].transition = 'dissolve';
		const messages = errors(program(json)).map((d) => d.message);
		expect(messages).toContain(
			'Unknown shot "zoom". Built in: full, punch, strip, window, behind, whip; or a file such as "shots/My.ts".'
		);
		expect(messages).toContain(
			'Unknown transition "dissolve". Built in: wipe, push, zoom-through, shape-mask, blinds, card; or a file such as "transitions/My.svelte".'
		);
		json.shots[0].shot = 'shots/Split.ts';
		json.cuts[2].transition = 'transitions/Ink.svelte';
		expect(errors(program(json))).toEqual([]);
	});

	it('rejects overlapping shots', () => {
		const json = read('handles.vf.json');
		json.shots[1].from = 'the slow export';
		expect(errors(program(json)).map((d) => d.message)).toContainEqual(
			expect.stringMatching(/^Shot "whip" .* starts before shot "punch" ends/)
		);
	});
});

describe('inserts mode', () => {
	it('keeps clips as resolved today, in one segment, without cuts or shots', () => {
		const json = read('../legacy/basic.vf.json');
		const words = parseTranscriptWords(read('../legacy/talk.transcript.json'));
		const p = program(
			{ ...json, clips: [...json.clips, { ...json.clips[2], id: 'late', transition: 'push' }] },
			{
				words,
				transcripts: {}
			}
		);
		expect(p.mode).toBe('inserts');
		expect(p.cuts).toEqual([]);
		expect(p.shots).toEqual([]);
		expect(p.transitions).toEqual([]);
		expect(p.audio.speech).toEqual([]);
		expect(p.segments).toHaveLength(1);
		expect(p.frames).toBe(Math.max(...p.clips.map((c) => c.startFrame + c.frames)));
		expect(p.clips.find((c) => c.id === 'late')!.transition).toBeNull();
		expect(p.diagnostics).toContainEqual(
			expect.objectContaining({ level: 'warning', clip: 'late', field: 'transition' })
		);
	});
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

describe.skipIf(!hasFfmpeg)('loading a program', () => {
	const ffmpeg = (args: string[]) => {
		const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
		if (r.status !== 0) throw new Error(String(r.stderr));
	};
	const setup = () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-load-'));
		ffmpeg([
			...['-f', 'lavfi', '-i', 'color=black:s=32x32:r=30:d=2'],
			...['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2'],
			...['-pix_fmt', 'yuv420p', '-shortest', path.join(dir, 'talk.mp4')]
		]);
		ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5', path.join(dir, 'voice.wav')]);
		fs.copyFileSync(path.join(DIR, 'take1.transcript.json'), path.join(dir, 'take1.json'));
		const project = (audio?: string) => {
			const file = path.join(dir, 'p.vf.json');
			fs.writeFileSync(
				file,
				JSON.stringify({
					size: [32, 32],
					fps: 30,
					footage: {
						talk: { src: 'talk.mp4', transcript: 'take1.json', ...(audio ? { audio } : {}) }
					},
					cuts: [{ source: 'talk', in: 0, out: 1 }]
				})
			);
			return file;
		};
		return { dir, project };
	};

	it('refuses --transcript, which would replace the footage transcripts', async () => {
		const { project } = setup();
		await expect(
			loadMotionProject(project(), { transcript: path.join(DIR, 'take2.transcript.json') })
		).rejects.toThrow(/--transcript cannot replace the words of p\.vf\.json/);
	});

	it('probes the sound length of a separate audio file, outside the picture hash', async () => {
		const { project } = setup();
		const own = await loadMotionProject(project());
		expect(own.inputs.sources!.talk.audioDuration).toBeCloseTo(2, 1);
		const separate = await loadMotionProject(project('voice.wav'));
		expect(separate.inputs.sources!.talk).toMatchObject({ audio: true });
		expect(separate.inputs.sources!.talk.audioDuration).toBeCloseTo(1.5, 2);
		expect(separate.hashes.sources.talk).toBe(own.hashes.sources.talk);
	});
});

describe.skipIf(!hasFfmpeg)('segment hashes of the files behind the pictures', () => {
	it('follow imported helpers, CSS url() targets and files named in props, per segment', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-assets-'));
		spawnSync('ffmpeg', [
			...['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=black:s=32x32:r=30:d=2'],
			...['-pix_fmt', 'yuv420p', path.join(dir, 'v.mp4')]
		]);
		const write = (name: string, text: string) => fs.writeFileSync(path.join(dir, name), text);
		write(
			'Tinted.svelte',
			`<script>import { tint } from './color.js';</script><b style="color: {tint}">x</b>`
		);
		write('color.js', "export const tint = 'red';\n");
		write('Plain.svelte', '<b>y</b>');
		write('logo.png', 'one');
		write('style.css', 'body { background: url(bg.png); }');
		write('bg.png', 'one');
		write(
			'p.vf.json',
			JSON.stringify({
				size: [32, 32],
				fps: 30,
				css: ['style.css'],
				footage: { v: { src: 'v.mp4' } },
				// Two hard cuts: two segments, one clip in each.
				cuts: [
					{ source: 'v', in: 0, out: 1 },
					{ source: 'v', in: 1, out: 2 }
				],
				clips: [
					{ id: 'tint', block: 'Tinted.svelte', from: 0.2, until: 0.8 },
					{ id: 'logo', block: 'Plain.svelte', from: 1.2, until: 1.8, props: { image: 'logo.png' } }
				]
			})
		);
		const hashes = async () => {
			const { program } = await motionProgram(await loadMotionProject(path.join(dir, 'p.vf.json')));
			return { segments: program.segments.map((s) => s.hash), assets: program.hashes.assets };
		};
		const before = await hashes();
		expect(Object.keys(before.assets).sort()).toEqual([
			'Plain.svelte',
			'Tinted.svelte',
			'logo.png',
			'style.css'
		]);
		write('color.js', "export const tint = 'blue';\n");
		const helper = await hashes();
		expect(helper.segments[0]).not.toBe(before.segments[0]);
		expect(helper.segments[1]).toBe(before.segments[1]);
		write('logo.png', 'two');
		const prop = await hashes();
		expect(prop.segments[0]).toBe(helper.segments[0]);
		expect(prop.segments[1]).not.toBe(helper.segments[1]);
		write('bg.png', 'two');
		const css = await hashes();
		expect(css.assets['style.css']).not.toBe(prop.assets['style.css']);
		expect(css.segments.every((h, i) => h !== prop.segments[i])).toBe(true);
	});
});

describe('item ids', () => {
	const json = {
		size: [100, 100],
		fps: 30,
		music: [{ id: 'quote', src: 'bed.mp3' }],
		clips: [{ id: 'quote', block: 'b.svelte', from: 0, until: 1 }]
	};

	it('lets music and clips share an id in inserts mode, as before cut lists', () => {
		const p = program(json, { words: null, transcripts: {} });
		expect(p.mode).toBe('inserts');
		expect(errors(p)).toEqual([]);
	});

	it('needs unique ids across kinds in a program', () => {
		const p = program({ ...json, shots: [{ shot: 'full', from: 0, until: 1 }] });
		expect(errors(p).map((d) => d.message)).toEqual([
			'The music id "quote" is also used by a clip; item ids must be unique.'
		]);
	});
});

describe('program audio pieces', () => {
	const base = {
		size: [1920, 1080],
		fps: 30,
		footage: { talk: { src: 'talk.mp4' }, broll: { src: 'broll.mp4' } },
		cuts: [
			{ id: 'a', source: 'talk', in: 1, out: 3 },
			{ id: 'b', source: 'talk', in: 5, out: 7, transition: { type: 'push', sound: 'whoosh.wav' } }
		]
	};

	it('places music with its gain, default fades and gain keys in program seconds', () => {
		const p = program({
			...base,
			music: [
				{
					src: 'bed.mp3',
					gain: -2,
					keys: [
						{ at: 'first open', gain: 0 },
						{ at: 1, gain: -6 }
					]
				},
				{ id: 'sting', src: 'sting.wav', from: -1.5, until: 9, fade: { in: 0, out: 0.25 } }
			]
		});
		expect(errors(p)).toEqual([]);
		const [bed, sting] = p.audio.music;
		expect(bed).toMatchObject({ at: 0, srcIn: 0, dur: 4, fadeIn: 0.01, fadeOut: 1, gain: -2 });
		// Keys sorted by time; a phrase anchor resolves against the program transcript.
		// "First" is source 6 s: program 2 s (cut b) + 1 s.
		expect(bed.gainKeys).toEqual([
			{ at: 1, gain: -6 },
			{ at: 3, gain: 0 }
		]);
		// A negative `from` starts inside the file; `until` past the program end stops at it.
		expect(sting).toMatchObject({
			owner: 'sting',
			at: 0,
			srcIn: 1.5,
			dur: 4,
			fadeIn: 0,
			fadeOut: 0.25
		});
	});

	it('adds an effect for a transition that names a sound, its hit on the transition event', () => {
		const p = program(base, { sounds: { 'whoosh.wav': { hit: 0.2 } } });
		const event = p.events.find((e) => e.owner === 'b.transition')!;
		expect(p.audio.sfx).toEqual([
			{
				owner: 'b.transition.sound',
				file: 'whoosh.wav',
				srcIn: 0,
				dur: null,
				at: Math.round((event.frame / 30 - 0.2) * 1e6) / 1e6,
				fadeIn: 0,
				fadeOut: 0,
				gain: 0
			}
		]);
		// `sound: false` (and no sound) adds nothing: the style palette comes with the SFX model.
		const silent = structuredClone(base);
		(silent.cuts[1].transition as { sound: unknown }).sound = false;
		expect(program(silent).audio.sfx).toEqual([]);
	});

	it('cuts an effect whose hit comes before its lead-in at the program start', () => {
		const p = program(
			{ ...base, sfx: [{ at: 0.1, sound: 'boom.wav', gain: 3 }] },
			{ sounds: { 'boom.wav': { hit: 0.3 }, 'whoosh.wav': { hit: 0 } } }
		);
		expect(p.audio.sfx[0]).toMatchObject({ owner: 'sfx1', at: 0, srcIn: 0.2, gain: 3 });
	});

	it('takes levels and loudness from the project, else the defaults', () => {
		expect(program(base).audio).toMatchObject({
			levels: { sfx: -10, music: -15 },
			master: { lufs: -14, truePeak: -1 }
		});
		const p = program({ ...base, mix: { sfx: -8, music: -20, loudness: -16, truePeak: -2 } });
		expect(p.audio).toMatchObject({
			levels: { sfx: -8, music: -20 },
			master: { lufs: -16, truePeak: -2 }
		});
	});
});

it('hashes like sha1', () => {
	for (const text of ['', 'abc', 'a'.repeat(55), 'a'.repeat(64), 'naïve – ✓'.repeat(300)])
		expect(sha1(text)).toBe(createHash('sha1').update(text).digest('hex'));
});
