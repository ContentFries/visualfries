// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveProgram, type ProgramInputs, type ResolvedProgram } from '$lib/motion/program.js';
import { footageAt, footageMap } from '$lib/motion/footage-map.js';
import { cutListUnder } from '$lib/motion/inserts.js';
import { edgeFrames } from '$lib/motion/segments.js';
import { readEvents } from '$lib/motion/animatable.js';
import { loadMotionProject, motionProgram } from '../../src/lib/motion/node.js';
import { writeWav } from '../../src/lib/motion/audio.js';

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
	sources: { talk: source(400) }
};

/**
 * Three cuts of take1 at 30 fps, all hard:
 *   cut1 "today we fix … slow export."   source 90–150   program 0–59
 *   cut2 "First open the settings."      source 180–222  program 60–101
 *   cut3 "Then pick a faster codec."     source 240–288  program 102–149
 */
const CUTS = [
	{ source: 'talk', in: 'today we fix', out: 'slow export' },
	{ source: 'talk', in: 'first open', out: 'the settings' },
	{ source: 'talk', in: 'then pick', out: 'faster codec' }
];
const base = {
	size: [1080, 1920],
	fps: 30,
	footage: { talk: { src: 'talk.mp4' } },
	cuts: CUTS,
	clips: []
};
const program = (json: object, extra: Partial<ProgramInputs> = {}) =>
	resolveProgram(parseMotionProject({ ...base, ...json }), { ...inputs, ...extra });
const errors = (p: ResolvedProgram) => p.diagnostics.filter((d) => d.level === 'error');
const messages = (p: ResolvedProgram, pattern: RegExp) =>
	p.diagnostics.filter((d) => pattern.test(d.message));

describe('shots across a hard cut', () => {
	it('stay quiet when nothing moves across the cut', () => {
		const p = program({
			shots: [{ id: 'still', shot: 'punch', from: 'today we fix', until: 'faster codec' }]
		});
		expect(errors(p)).toEqual([]);
		expect(messages(p, /hard cut/)).toEqual([]);
	});

	it('warn when keys move the camera across the cut', () => {
		const p = program({
			shots: [
				{
					id: 'drift',
					shot: 'full',
					from: 'today we fix',
					until: 'the settings',
					keys: [
						{ at: 0, scale: 1 },
						{ at: { moment: 'end' }, scale: 1.1 }
					]
				}
			]
		});
		expect(messages(p, /hard cut/)).toEqual([
			{
				level: 'warning',
				item: 'drift',
				field: 'shots',
				message:
					'Shot "drift" moves across the hard cut into cut2 at frame 60 (its keys): the move goes on over different footage. End the move before the cut, or put a transition on the cut.'
			}
		]);
	});

	it('do not warn about keys that hold across the cut', () => {
		const p = program({
			shots: [
				{
					id: 'held',
					shot: 'full',
					from: 'today we fix',
					until: 'faster codec',
					keys: [
						{ at: 0, scale: 1 },
						{ at: 1, scale: 1.1 },
						{ at: 4, scale: 1.1 }
					]
				}
			]
		});
		expect(messages(p, /hard cut/)).toEqual([]);
	});

	it('warn when a morph runs across the cut', () => {
		const p = program({
			shots: [
				{ id: 'p', shot: 'punch', from: 0, until: 1.8 },
				{ id: 'back', shot: 'full', from: 1.8, until: 3, morph: 0.4 }
			]
		});
		expect(messages(p, /hard cut/).map((d) => d.message)).toEqual([
			'Shot "back" moves across the hard cut into cut2 at frame 60 (its morph): the move goes on over different footage. End the move before the cut, or put a transition on the cut.'
		]);
	});
});

describe('hold on a cut', () => {
	const held = (hold: number, more: object = {}) =>
		program({ cuts: [{ ...CUTS[0], hold }, ...CUTS.slice(1)], ...more });

	it('adds frames that hold the cut’s last frame after its out', () => {
		const p = held(1);
		expect(errors(p)).toEqual([]);
		expect(p.cuts[0]).toMatchObject({
			startFrame: 0,
			frames: 90,
			srcIn: 90,
			srcOut: 150,
			hold: 30
		});
		expect(p.cuts[1].startFrame).toBe(90);
		expect(p.frames).toBe(180);
		const map = footageMap(p);
		const shown = (f: number) => footageAt(map, f).map((v) => v.frame);
		expect(shown(59)).toEqual([149]);
		expect(shown(60)).toEqual([149]);
		expect(shown(89)).toEqual([149]);
		expect(shown(90)).toEqual([180]);
	});

	it('leaves cuts without a hold as they were', () => {
		const p = program({});
		expect(p.cuts.every((c) => !('hold' in c))).toBe(true);
		expect(p.frames).toBe(150);
	});

	it('is silent: words end before the hold and the next cut’s words move on', () => {
		const p = held(1);
		const exportWord = p.words.find((w) => /^export/.test(w.text))!;
		expect(exportWord.end).toBeCloseTo(2, 6);
		const first = p.words.find((w) => w.text === 'First')!;
		expect(first.start).toBeCloseTo(3, 6);
		// The held cut's sound stops at its out with its own anti-click fade; the next cut's
		// sound starts at its own first frame.
		const [a, b] = p.audio.speech;
		expect(a).toMatchObject({ owner: 'cut1', at: 0, dur: 2.005, fadeOut: 0.01 });
		expect(b).toMatchObject({ owner: 'cut2', at: 2.995, fadeIn: 0.01 });
	});

	it('keeps sfx and music on program time through the hold', () => {
		const p = held(1, { sfx: [{ at: 2.5, sound: 'pop.wav' }] });
		expect(p.audio.sfx[0]).toMatchObject({ at: 2.5 });
	});

	it('rounds the hold to frames and refuses a negative one', () => {
		expect(held(0.51).cuts[0].hold).toBe(15);
		expect(() => held(-1)).toThrow(/hold/);
	});

	it('lists the hold as its own piece of the cut list under an insert', () => {
		const p = held(1);
		expect(cutListUnder(p, 50, 50)).toEqual([
			{ cut: 'cut1', source: 'talk', startFrame: 50, frames: 10, srcIn: 140, srcOut: 150 },
			{
				cut: 'cut1',
				source: 'talk',
				startFrame: 60,
				frames: 30,
				srcIn: 149,
				srcOut: 150,
				hold: true
			},
			{ cut: 'cut2', source: 'talk', startFrame: 90, frames: 10, srcIn: 180, srcOut: 190 }
		]);
	});

	it('samples the first held frame in checks', () => {
		expect(edgeFrames(held(1))).toEqual(expect.arrayContaining([59, 60]));
	});

	it('holds the frozen frame for the outgoing side of a transition out of the hold', () => {
		const p = program({
			cuts: [
				{ ...CUTS[0], hold: 1 },
				{ ...CUTS[1], transition: { type: 'push', duration: 0.4 } },
				CUTS[2]
			]
		});
		expect(errors(p)).toEqual([]);
		const push = p.transitions[0];
		expect(push.held.out).toBe(0);
		const map = footageMap(p);
		const sides = footageAt(map, 92).map((v) => `${v.source}${v.frame}`);
		expect(sides).toContain('talk149');
	});
});

describe('the program end as an anchor', () => {
	it('ends clips, shots, music and sfx on "end"', () => {
		const p = program({
			clips: [{ id: 'all', block: 'b.svelte', from: 0.5, until: 'end' }],
			shots: [{ id: 'last', shot: 'punch', from: { program: 'end', offset: -1 }, until: 'end' }],
			music: [{ src: 'bed.wav', from: { program: 'end', offset: -3 }, until: 'end' }],
			sfx: [{ at: { program: 'end', offset: -0.5 }, sound: 'pop.wav' }]
		});
		expect(errors(p)).toEqual([]);
		const clip = p.clips[0];
		expect([clip.startFrame, clip.frames, clip.end, clip.duration]).toEqual([15, 135, 5, 4.5]);
		const shot = p.shots.find((s) => s.id === 'last')!;
		expect([shot.startFrame, shot.frames]).toEqual([120, 30]);
		expect(p.audio.music[0]).toMatchObject({ at: 2, dur: 3 });
		expect(p.audio.sfx[0]).toMatchObject({ at: 4.5 });
	});

	it('cuts a clip that runs past the program end, its own length included', () => {
		const p = program({ clips: [{ id: 'long', block: 'b.svelte', from: 1, until: 99 }] });
		const clip = p.clips[0];
		expect([clip.frames, clip.duration, clip.end]).toEqual([120, 4, 5]);
		expect(p.diagnostics).toContainEqual({
			level: 'info',
			clip: 'long',
			field: 'until',
			message:
				'Clip ends at 99.00 s, after the program (5.00 s); it is cut there. "until": "end" ends it with the program.'
		});
	});

	it('keeps "end" a phrase without a cut list, and says when the end is not fixed', () => {
		const inserts = resolveProgram(
			parseMotionProject({
				size: [1080, 1920],
				fps: 30,
				clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 'end' }]
			}),
			{
				words: parseTranscriptWords({
					words: [
						{ text: 'The', startMs: 0, endMs: 300 },
						{ text: 'end.', startMs: 400, endMs: 900 }
					]
				})
			}
		);
		expect(errors(inserts)).toEqual([]);
		expect(inserts.clips[0].end).toBeCloseTo(0.9, 6);
		const open = resolveProgram(
			parseMotionProject({
				size: [1080, 1920],
				fps: 30,
				shots: [{ shot: 'full', from: 0, until: 2 }],
				clips: [{ id: 'a', block: 'b.svelte', from: 0, until: { program: 'end' } }]
			}),
			{ words: null }
		);
		expect(errors(open).map((d) => d.message)).toContain(
			'The program end is not fixed yet: it needs "cuts" (or footage) or "duration".'
		);
	});

	it('leaves { "say": "end" } the spoken word', () => {
		const p = program({ clips: [{ id: 'a', block: 'b.svelte', from: 0, until: { say: 'end' } }] });
		expect(errors(p).map((d) => d.message)).toEqual([
			expect.stringMatching(/^Phrase "end" not found/)
		]);
	});
});

describe('anchors on events a block declares', () => {
	const kick = {
		id: 'kick',
		block: 'blocks/Kick.svelte',
		from: 'today we fix',
		until: 'faster codec',
		cues: { tail: 'slow export' }
	};
	const declared = {
		'blocks/Kick.svelte': { events: { land: 'tail+0.5', bonk: 'end-0.25', early: 0.4 } }
	};

	it('reads the events from the block’s module script', async () => {
		const source = `<script module>
	export const events = { land: 'tail+0.98', 'lid off': 'f12', early: 0.4 };
</script>
<div></div>`;
		expect(await readEvents(source, 'Kick.svelte')).toEqual({
			events: { land: 'tail+0.98', 'lid off': 'f12', early: 0.4 }
		});
		expect(await readEvents('<div></div>', 'Plain.svelte')).toEqual({ events: {} });
		expect(
			await readEvents(
				'<script module>export const events = { land: compute() };</script>',
				'Bad.svelte'
			)
		).toEqual({
			error:
				"Bad.svelte: events: write each entry as name: 'moment' or a number of clip seconds (no spreads or computed values)."
		});
	});

	it('places sfx, shots and music keys on a clip’s event', () => {
		const p = program(
			{
				clips: [kick],
				sfx: [
					{ at: { event: 'land', clip: 'kick' }, sound: 'bonk.wav' },
					{ at: { event: 'bonk', clip: 'kick', offset: 0.15 }, sound: 'bonk.wav' }
				],
				shots: [{ shot: 'punch', from: { event: 'early', clip: 'kick' }, until: 'faster codec' }],
				music: [{ src: 'bed.wav', keys: [{ at: { event: 'land', clip: 'kick' }, gain: -6 }] }]
			},
			{ blockEvents: declared }
		);
		expect(errors(p)).toEqual([]);
		// "slow" starts at program 1.0 s; land = 1.5 s, bonk = end (5.0 s) − 0.25 + 0.15.
		expect(p.audio.sfx.map((s) => s.at)).toEqual([1.5, 4.9]);
		expect(p.shots.find((s) => !s.implicit)!.startFrame).toBe(12);
		expect(p.audio.music[0].gainKeys).toEqual([{ at: 1.5, gain: -6 }]);
	});

	it('names what is missing', () => {
		const p = program(
			{
				clips: [
					kick,
					{ id: 'other', block: 'b.svelte', from: { event: 'land', clip: 'kick' }, until: 3 }
				],
				sfx: [
					{ at: { event: 'lnd', clip: 'kick' }, sound: 'a.wav' },
					{ at: { event: 'land', clip: 'nope' }, sound: 'a.wav' }
				]
			},
			{ blockEvents: declared }
		);
		expect(errors(p).map((d) => `${d.item ?? d.clip} ${d.field}: ${d.message}`)).toEqual([
			'other from: An event anchor ({ "event", "clip" }) works in sfx "at", shots and music keys, not here: the clip it names is placed first.',
			'sfx1 sfx[0].at: Block "blocks/Kick.svelte" of clip "kick" declares no event "lnd". It declares: land, bonk, early.',
			'sfx2 sfx[1].at: Unknown clip "nope". Clips: kick.'
		]);
	});

	it('needs the declarations read', () => {
		const p = program({
			clips: [kick],
			sfx: [{ at: { event: 'land', clip: 'kick' }, sound: 'a.wav' }]
		});
		expect(errors(p).map((d) => d.message)).toEqual([
			'Block "blocks/Kick.svelte" of clip "kick" declares no event "land". It declares none: add `export const events = { land: \'<moment>\' }` to its <script module>.'
		]);
	});

	it('reads the declarations of the project’s blocks through the node tooling', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-events-'));
		try {
			fs.copyFileSync(path.join(DIR, 'take1.transcript.json'), path.join(dir, 'take1.json'));
			fs.mkdirSync(path.join(dir, 'blocks'));
			await writeWav(path.join(dir, 'bonk.wav'), new Float32Array(9600));
			fs.writeFileSync(
				path.join(dir, 'blocks/Kick.svelte'),
				`<script module>
	export const events = { land: 'tail+0.5' };
</script>
<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
	const land = clip.at(events.land);
</script>
<div style:opacity={clip.after(land) ? 1 : 0}></div>
`
			);
			fs.writeFileSync(
				path.join(dir, 'p.vf.json'),
				JSON.stringify({
					...base,
					footage: { talk: { src: 'talk.mp4', transcript: 'take1.json' } },
					clips: [kick],
					sfx: [{ at: { event: 'land', clip: 'kick' }, sound: 'bonk.wav' }]
				})
			);
			const { program: p } = await motionProgram(
				await loadMotionProject(path.join(dir, 'p.vf.json'))
			);
			expect(errors(p)).toEqual([]);
			expect(p.audio.sfx.map((x) => x.at)).toEqual([1.5]);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
