import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram, type ProgramInputs, type ResolvedKey } from '$lib/motion/program.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { edgeFrames } from '$lib/motion/segments.js';
import { headCrops } from '$lib/motion/framing.js';
import {
	AWAY_ENTER,
	AWAY_EXIT,
	awayAt,
	shotLayout,
	shotLayoutAt,
	type LayoutInput,
	type ShotAway,
	type ShotLayout,
	type ShotSpan
} from '$lib/motion/shots/index.js';
import type { SubjectBox } from '$lib/motion/resolve.js';
import { easeOf } from '$lib/motion/ease.js';

const LANDSCAPE: [number, number] = [1920, 1080];
const PORTRAIT: [number, number] = [1080, 1920];
/** A speaker a little right of centre, head top at 11 % (the real recording's numbers). */
const SUBJECT: SubjectBox = {
	x: 0.2,
	y: 0.11,
	width: 0.57,
	height: 0.89,
	headX: 0.6,
	headY: 0.11
};

const input = (size: [number, number], extra: Partial<LayoutInput> = {}): LayoutInput => ({
	cls: size[0] > size[1] ? 'landscape' : 'portrait',
	size,
	footage: [1920, 1080],
	subject: SUBJECT,
	...extra
});

const range = (from: number, until: number | null, extra: Partial<ShotAway> = {}): ShotAway => ({
	from,
	until,
	side: null,
	exit: { frames: 5, ease: AWAY_EXIT.ease },
	enter: { frames: 7, ease: AWAY_ENTER.ease },
	...extra
});
const behind = (away: ShotAway[], keys: ResolvedKey[] = []) => ({
	id: 'talk',
	shot: 'behind',
	params: {},
	keys,
	away
});

/** The subject's box on the stage under a layout (no rotation). */
const onStage = (l: ShotLayout, box: SubjectBox = SUBJECT) => ({
	left: l.camera.x + box.x * l.camera.width,
	right: l.camera.x + (box.x + box.width) * l.camera.width,
	top: l.camera.y + box.y * l.camera.height
});

describe('a speaker away from the frame', () => {
	it('slides the picture off the frame by what clears the speaker, not a fixed amount', () => {
		for (const size of [PORTRAIT, LANDSCAPE]) {
			const plain = shotLayout(behind([]), input(size), 20);
			const away = shotLayout(behind([range(10, 40, { side: 'left' })]), input(size), 20);
			// The window, the slots and the room stay; only the picture moves, and only sideways.
			expect(away.clip).toEqual(plain.clip);
			expect(away.slots).toEqual(plain.slots);
			expect(away.room).toEqual(plain.room);
			expect(away.camera.y).toBe(plain.camera.y);
			expect(away.camera.width).toBe(plain.camera.width);
			const right = onStage(away).right;
			expect(right).toBeLessThan(0);
			// Just clear, with a small margin: the distance follows the speaker and the frame.
			expect(right).toBeGreaterThan(-0.05 * Math.min(...size));
		}
		const left = range(10, 40, { side: 'left' });
		const portrait = shotLayout(behind([left]), input(PORTRAIT), 20);
		const landscape = shotLayout(behind([left]), input(LANDSCAPE), 20);
		const moved = (l: ShotLayout, size: [number, number]) =>
			shotLayout(behind([]), input(size), 20).camera.x - l.camera.x;
		expect(moved(portrait, PORTRAIT)).not.toBeCloseTo(moved(landscape, LANDSCAPE), 0);
	});

	it('leaves by the nearest edge unless the range says which', () => {
		// Cropped into a portrait frame the speaker overflows it: sideways is the shortest way out.
		expect(onStage(shotLayout(behind([range(10, 40)]), input(PORTRAIT), 20)).right).toBeLessThan(0);
		// The same speaker in a wide frame sinks out of the bottom: less of a way than sideways.
		const wide = shotLayout(behind([range(10, 40)]), input(LANDSCAPE), 20);
		expect(wide.camera.x).toBe(shotLayout(behind([]), input(LANDSCAPE), 20).camera.x);
		expect(onStage(wide).top).toBeGreaterThan(1080);
		const rightOf = { ...SUBJECT, x: 0.55, width: 0.4, headX: 0.75 };
		const l = shotLayout(
			behind([range(10, 40)]),
			input(PORTRAIT, { footage: [1080, 1920], subject: rightOf }),
			20
		);
		expect(l.camera.x).toBeGreaterThan(0);
		expect(onStage(l, rightOf).left).toBeGreaterThan(1080);
		// A small speaker low in a wide frame: down is the shortest way out.
		const low = { x: 0.35, y: 0.75, width: 0.3, height: 0.25, headX: 0.5, headY: 0.75 };
		const down = shotLayout(behind([range(10, 40)]), input(LANDSCAPE, { subject: low }), 20);
		expect(down.camera.x).toBe(
			shotLayout(behind([]), input(LANDSCAPE, { subject: low }), 20).camera.x
		);
		expect(onStage(down, low).top).toBeGreaterThan(1080);
		const written = shotLayout(behind([range(10, 40, { side: 'right' })]), input(LANDSCAPE), 20);
		expect(onStage(written).left).toBeGreaterThan(1920);
	});

	it('exits with its ease, ending wholly off at `from`, and comes back with its own from `until`', () => {
		const shot = behind([range(10, 40)]);
		const at = (f: number) => shotLayout(shot, input(PORTRAIT), f).camera.x;
		const home = shotLayout(behind([]), input(PORTRAIT), 0).camera.x;
		const gone = at(20);
		expect(at(5)).toBe(home);
		expect(at(10)).toBeCloseTo(gone, 1);
		// Two of the exit's five frames: power2.in has gone 16 % of the way.
		expect((at(7) - home) / (gone - home)).toBeCloseTo(easeOf('power2.in')(2 / 5), 2);
		expect(at(39)).toBeCloseTo(gone, 1);
		expect(at(40)).toBeCloseTo(gone, 1);
		// Three of the entry's seven frames: expo.out is most of the way back.
		expect((at(43) - home) / (gone - home)).toBeCloseTo(1 - easeOf('expo.out')(3 / 7), 2);
		expect(at(47)).toBe(home);
		expect(awayAt(shot.away, 7)).toMatchObject({ p: easeOf('power2.in')(2 / 5) });
		expect(awayAt(shot.away, 47)).toBeNull();
		expect(awayAt(shot.away, 4)).toBeNull();
	});

	it('stays away to the end of the shot, and on into the morph out of it', () => {
		const shot = {
			...behind([range(10, null)]),
			startFrame: 0,
			frames: 30,
			morphFrames: 0,
			morphEase: 'none'
		};
		const next: ShotSpan = {
			id: 'after',
			shot: 'full',
			params: {},
			startFrame: 30,
			frames: 30,
			morphFrames: 10,
			morphEase: 'none'
		};
		const gone = shotLayout(shot, input(PORTRAIT), 29).camera.x;
		const home = shotLayout(next, input(PORTRAIT), 40).camera.x;
		expect(shotLayoutAt([shot, next], 30, input(PORTRAIT)).camera.x).toBeCloseTo(gone, 1);
		// Halfway through the morph he is halfway back.
		expect(shotLayoutAt([shot, next], 35, input(PORTRAIT)).camera.x).toBeCloseTo(
			(gone + home) / 2,
			0
		);
	});

	it('composes with the shot keys: they keep moving the camera, the slide comes on top', () => {
		const key = (frame: number, values: ResolvedKey['values']): ResolvedKey => ({
			frame,
			values,
			ease: 'none',
			mix: 'oklch'
		});
		const keys = [
			key(0, { x: -250, y: 400, scale: 0.78 }),
			key(60, { x: -250, y: 400, scale: 0.9 })
		];
		const keyed = shotLayout(behind([], keys), input(PORTRAIT), 20);
		const away = shotLayout(behind([range(10, 40)], keys), input(PORTRAIT), 20);
		expect(away.camera.width).toBe(keyed.camera.width);
		expect(away.camera.y).toBe(keyed.camera.y);
		expect(onStage(away).right).toBeLessThan(0);
		// Back in, the keys alone again.
		expect(shotLayout(behind([range(10, 40)], keys), input(PORTRAIT), 50)).toEqual(
			shotLayout(behind([], keys), input(PORTRAIT), 50)
		);
		// A turned camera: the turned speaker clears the frame too, and the turn moves with him.
		const turned = [key(0, { rotation: 30 })];
		const t = shotLayout(behind([range(10, 40)], turned), input(PORTRAIT), 20);
		const plain = shotLayout(behind([], turned), input(PORTRAIT), 20);
		expect(t.turn!.rotation).toBe(30);
		expect(t.turn!.pivot.x - plain.turn!.pivot.x).toBeCloseTo(t.camera.x - plain.camera.x, 1);
		const a = (30 * Math.PI) / 180;
		const corners = [
			[SUBJECT.x, SUBJECT.y],
			[SUBJECT.x + SUBJECT.width, SUBJECT.y],
			[SUBJECT.x, SUBJECT.y + SUBJECT.height],
			[SUBJECT.x + SUBJECT.width, SUBJECT.y + SUBJECT.height]
		].map(([u, v]) => {
			const x = t.camera.x + u * t.camera.width - t.turn!.pivot.x;
			const y = t.camera.y + v * t.camera.height - t.turn!.pivot.y;
			return t.turn!.pivot.x + x * Math.cos(a) - y * Math.sin(a);
		});
		expect(Math.max(...corners)).toBeLessThan(0);
	});

	it('clears what the matte reaches around the frame, and the whole picture without a matte', () => {
		// An arm out to the right in the frames around: wider than this frame's box.
		const reach = { x: 0.2, y: 0.11, width: 0.75, height: 0.89 };
		const left = range(10, 40, { side: 'left' });
		const l = shotLayout(behind([left]), input(PORTRAIT, { reach }), 20);
		expect(l.camera.x + 0.95 * l.camera.width).toBeLessThan(0);
		const bare = shotLayout(behind([left]), input(PORTRAIT, { subject: null }), 20);
		expect(bare.camera.x + bare.camera.width).toBeLessThan(0);
	});

	it('decides the side once per move, where it starts, so a speaker near the middle never flips', () => {
		// Footage of the frame's own size fills it exactly: the boxes are where the frame shows them.
		const own = { footage: [1920, 1080] as [number, number] };
		const leftish = { x: 0.1, y: 0.05, width: 0.35, height: 0.95, headX: 0.27, headY: 0.05 };
		const rightish = { ...leftish, x: 0.55, headX: 0.73 };
		const home = shotLayout(behind([]), input(LANDSCAPE, { ...own, subject: rightish }), 8);
		// Alone, the speaker of frame 8 leaves right.
		expect(
			shotLayout(behind([range(10, 40)]), input(LANDSCAPE, { ...own, subject: rightish }), 8).camera
				.x
		).toBeGreaterThan(home.camera.x);
		// The exit started at frame 5 with the speaker on the left: he goes on leaving left.
		const at = (f: number) => ({ subject: f < 7 ? leftish : rightish, reach: null });
		const l = shotLayout(
			behind([range(10, 40)]),
			input(LANDSCAPE, { ...own, subject: rightish, at }),
			8
		);
		expect(l.camera.x).toBeLessThan(home.camera.x);
	});

	it('is out of the head crop check while away', () => {
		const shots = [
			{
				...behind([range(10, 40, { side: 'bottom' })]),
				startFrame: 0,
				frames: 60,
				morphFrames: 0,
				morphEase: 'none'
			}
		];
		const footage = {
			talk: {
				url: '',
				first: 0,
				last: 59,
				total: 60,
				width: 1920,
				height: 1080,
				startFrame: 0,
				subject: true,
				boxes: Array.from({ length: 60 }, () => ({ ...SUBJECT, headHeight: 0.3 }))
			}
		};
		const crops = headCrops({
			fps: 30,
			size: PORTRAIT,
			cls: 'portrait',
			format: { class: 'portrait', safe: { top: 0, right: 0, bottom: 0, left: 0 } } as never,
			footage,
			footageMap: {
				frames: 60,
				totals: { talk: 60 },
				spans: [{ owner: 'a', kind: 'cut', source: 'talk', startFrame: 0, frames: 60, srcIn: 0 }],
				windows: []
			},
			shots,
			transitions: []
		});
		expect(crops).toEqual([]);
	});
});

// ---------------------------------------------------------------- resolved program

const WORDS = parseTranscriptWords({
	words: [
		['Hello', 0.2, 0.6],
		['this', 0.7, 0.9],
		['is', 1.0, 1.1],
		['the', 1.2, 1.3],
		['answer', 1.4, 2.0],
		['so', 2.3, 2.5],
		['finally', 3.0, 3.6],
		['the', 3.7, 3.8],
		['answer', 3.9, 4.4],
		['bye', 4.6, 4.9]
	].map(([text, start, end]) => ({ text, start, end }))
});

const INPUTS: ProgramInputs = {
	words: null,
	transcripts: { talk: WORDS },
	sources: {
		talk: { frames: 180, duration: 6, width: 1920, height: 1080, fps: 30, audio: true }
	}
};

const project = (away: unknown, shot: Record<string, unknown> = {}) => ({
	size: [1080, 1920],
	fps: 30,
	footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', transcript: 'talk.json' } },
	cuts: [{ source: 'talk' }],
	shots: [{ id: 'talk', shot: 'behind', from: 0, until: 'end', away, ...shot }],
	clips: []
});
const resolve = (json: unknown) => resolveProgram(parseMotionProject(json), INPUTS);
const errors = (json: unknown) =>
	resolve(json)
		.diagnostics.filter((d) => d.level === 'error')
		.map((d) => [d.field, d.message]);

describe('away ranges in the program', () => {
	it('resolves moments to frames with the default moves, and leaves other shots as they were', () => {
		const p = resolve(
			project([
				{
					from: { say: 'answer', occurrence: 1, edge: 'end' },
					until: { say: 'finally', edge: 'start' }
				},
				{ from: { say: 'answer', occurrence: 2, edge: 'end' }, until: 'end', side: 'right' }
			])
		);
		expect(p.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		expect(p.shots[0].away).toEqual([
			{
				from: 60,
				until: 90,
				side: null,
				exit: { frames: 5, ease: 'power2.in' },
				enter: { frames: 7, ease: 'expo.out' }
			},
			{
				from: 132,
				until: null,
				side: 'right',
				exit: { frames: 5, ease: 'power2.in' },
				enter: { frames: 7, ease: 'expo.out' }
			}
		]);
		expect(AWAY_EXIT).toEqual({ seconds: 0.16, ease: 'power2.in' });
		expect(AWAY_ENTER).toEqual({ seconds: 0.22, ease: 'expo.out' });
		const plain = resolve({ ...project(undefined) });
		expect('away' in plain.shots[0]).toBe(false);
	});

	it('takes exit and enter as seconds or with an ease, and offsets on the moments', () => {
		const p = resolve(
			project([
				{
					from: { say: 'answer', occurrence: 1, edge: 'end', offset: -0.04 },
					until: { say: 'finally', edge: 'start', offset: -0.02 },
					exit: 0.3,
					enter: { seconds: 0.5, ease: 'back.out(1.4)' }
				}
			])
		);
		expect(p.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		expect(p.shots[0].away![0]).toEqual({
			from: 59,
			until: 89,
			side: null,
			exit: { frames: 9, ease: 'power2.in' },
			enter: { frames: 15, ease: 'back.out(1.4)' }
		});
	});

	it('resolves a repeated phrase by program order: from after the previous range, until after from', () => {
		const p = resolve(
			project([
				{ from: { say: 'answer', edge: 'end' }, until: { say: 'so', edge: 'start' } },
				{ from: { say: 'answer', edge: 'end' }, until: 'bye' }
			])
		);
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(p.shots[0].away!.map((r) => [r.from, r.until])).toEqual([
			[60, 69],
			[132, 147]
		]);
	});

	it('is an error on a shot that does not cut the speaker out', () => {
		expect(errors(project([{ from: 1, until: 2 }], { shot: 'full' }))).toEqual([
			[
				'shots[0].away',
				'"away" needs a shot that draws the speaker cut out by the matte ("behind"): in a "full" shot the speaker is the whole picture, so nothing would stay in the frame when he leaves. Use "behind" (with a clip behind him for the world he leaves), or move the picture with shot keys.'
			]
		]);
	});

	it('is an error when a range is inverted, overlaps another or lies outside the shot', () => {
		expect(errors(project([{ from: 3, until: 2 }]))).toEqual([
			[
				'shots[0].away[0].until',
				'The speaker would be back (2.00 s) before he is gone (3.00 s): "until" must come after "from".'
			]
		]);
		expect(errors(project([{ from: 2, until: 2 }]))[0][0]).toBe('shots[0].away[0].until');
		expect(
			errors(
				project([
					{ from: 1, until: 2 },
					{ from: 2.1, until: 3 }
				])
			)
		).toEqual([
			[
				'shots[0].away[1].from',
				'Away range 2 starts leaving at 1.93 s (its exit takes 0.17 s), before range 1 is back (2.23 s). Start it later, or join the two ranges.'
			]
		]);
		const short = project([{ from: 2, until: 5 }], { from: 1, until: 4 });
		expect(errors(short)).toEqual([
			[
				'shots[0].away[0].until',
				'"until" (5.00 s) is after the shot ends (4.00 s). Write the shot\'s own end, or "end" in a shot that runs to the program end, to keep the speaker away to its end.'
			]
		]);
		expect(errors(project([{ from: 0.5, until: 3 }], { from: 1, until: 4 }))).toEqual([
			['shots[0].away[0].from', '"from" (0.50 s) is before the shot starts (1.00 s).']
		]);
		expect(errors(project([{ from: 1.1, until: 3 }], { from: 1, until: 4 }))).toEqual([
			[
				'shots[0].away[0].from',
				'The exit (0.17 s) would start at 0.93 s, before the shot starts (1.00 s). Start the range at the shot\'s start to have the speaker away from its first frame, or shorten "exit".'
			]
		]);
		expect(errors(project([{ from: 2, until: 3.9 }], { from: 1, until: 4 }))).toEqual([
			[
				'shots[0].away[0].until',
				'The speaker would still be coming back (3.90–4.13 s) when the shot ends (4.00 s). End the range at the shot\'s end to keep him away to it, or shorten "enter".'
			]
		]);
		// From the shot's first frame: away from the start, no exit inside the shot.
		expect(errors(project([{ from: 1, until: 3 }], { from: 1, until: 4 }))).toEqual([]);
	});

	it('checks the side and the moves', () => {
		expect(() => resolve(project([{ from: 1, until: 2, side: 'top' }]))).toThrow(
			/shots\[0\]\.away\[0\]\.side/
		);
		expect(() => resolve(project([{ from: 1, until: 2, enter: -1 }]))).toThrow(
			/shots\[0\]\.away\[0\]\.enter/
		);
		expect(
			errors(project([{ from: 1, until: 2, exit: { seconds: 0.2, ease: 'wobble' } }]))
		).toEqual([['shots[0].away[0].exit', 'Unknown ease "wobble".']]);
	});

	it('warns when the speaker is gone while still saying a word, or comes back after he started one', () => {
		const p = resolve(
			project([
				{
					from: { say: 'answer', occurrence: 1, offset: 0.2 },
					until: { say: 'finally', edge: 'start', offset: 0.3 }
				}
			])
		);
		const warnings = p.diagnostics.filter((d) => d.level === 'warning');
		expect(warnings).toEqual([
			{
				level: 'warning',
				item: 'talk',
				field: 'shots[0].away[0].from',
				message:
					'The speaker is wholly off the frame at 1.60 s, 0.40 s before he finishes "answer" (1.40–2.00 s): he leaves mid-word. Anchor "from" on the end of the word ({ "say": …, "edge": "end" }) unless that is meant.'
			},
			{
				level: 'warning',
				item: 'talk',
				field: 'shots[0].away[0].until',
				message:
					'The speaker starts coming back at 3.30 s, 0.30 s after he starts "finally" (3.00–3.60 s): he says its start off the frame. Anchor "until" on the start of the word ({ "say": …, "edge": "start" }) unless that is meant.'
			}
		]);
	});

	it('moves with the excerpt, and adds its moves to the frames check looks at', () => {
		const json = {
			...project([
				{
					from: { say: 'answer', occurrence: 1, edge: 'end' },
					until: { say: 'finally', edge: 'start' }
				}
			]),
			excerpts: [{ id: 'short', from: 1, until: 5 }]
		};
		const full = resolve(json);
		const excerpt = resolveProgram(parseMotionProject(json), INPUTS, { excerpt: 'short' });
		expect(excerpt.shots.find((s) => s.id === 'talk')!.away![0]).toMatchObject({
			from: 30,
			until: 60
		});
		const edges = edgeFrames(full);
		for (const f of [55, 60, 90, 97]) expect(edges).toContain(f);
	});
});
