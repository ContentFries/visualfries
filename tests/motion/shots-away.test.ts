import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import {
	resolveProgram,
	type ProgramInputs,
	type ResolvedKey,
	type ResolvedProgram
} from '$lib/motion/program.js';
import { footageMap, programFootageAt, transitionSidesAt } from '$lib/motion/footage-map.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { edgeFrames } from '$lib/motion/segments.js';
import { headCrops, programFraming } from '$lib/motion/framing.js';
import {
	AWAY_ENTER,
	AWAY_EXIT,
	awayAt,
	shotLayout,
	shotLayoutAt,
	turnedReadback,
	type LayoutInput,
	type ShotAway,
	type ShotLayout,
	type ShotSpan
} from '$lib/motion/shots/index.js';
import type { FootageFrames, SubjectBox } from '$lib/motion/resolve.js';
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
			// Just clear, with a small margin past the room's blur: the distance follows the
			// speaker and the frame.
			expect(right).toBeGreaterThan(-0.05 * Math.min(...size) - 3 * away.room!.blur);
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
		const at = (f: number) =>
			input(LANDSCAPE, { ...own, subject: f < 7 ? leftish : rightish, reach: null });
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
				enter: { frames: 7, ease: 'expo.out' },
				// The picture where each move decides the side: where the exit starts, the way back's last frame.
				looks: {
					exit: { source: 'talk', frame: 55, first: 25, last: 85 },
					enter: { source: 'talk', frame: 96, first: 66, last: 126 }
				}
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
			enter: { frames: 15, ease: 'back.out(1.4)' },
			looks: {
				exit: { source: 'talk', frame: 50, first: 20, last: 80 },
				enter: { source: 'talk', frame: 103, first: 73, last: 133 }
			}
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

// ---------------------------------------------------------------- decisions and moves

const leftish: SubjectBox = {
	x: 0.1,
	y: 0.05,
	width: 0.35,
	height: 0.95,
	headX: 0.27,
	headY: 0.05
};
const rightish: SubjectBox = { ...leftish, x: 0.55, headX: 0.73 };

/** Matte boxes of a source: `at(frame)` for each of its `frames` frames. */
const matted = (
	width: number,
	height: number,
	frames: number,
	at: (f: number) => SubjectBox
): FootageFrames => ({
	url: '',
	first: 0,
	last: frames - 1,
	total: frames,
	width,
	height,
	startFrame: 0,
	subject: true,
	boxes: Array.from({ length: frames }, (_, f) => at(f))
});

/** The framing a stage of the whole of `p` gets (see `programFraming`). */
function framed(p: ResolvedProgram, footage: Record<string, FootageFrames>) {
	const map = footageMap(p);
	const framing = programFraming({
		fps: p.fps,
		size: p.format.size,
		cls: p.format.class,
		format: p.format as never,
		footage,
		footageMap: map,
		shots: p.shots
	});
	/** Where the picture is at `f`, and how far the away ranges moved it from the shot alone. */
	return (f: number) => {
		const view = programFootageAt(map, f);
		const shot = p.shots.find((s) => f >= s.startFrame && f < s.startFrame + s.frames)!;
		const layout = framing.layoutFor(f, view, shot);
		const plain = framing.layoutFor(f, view, { ...shot, away: undefined });
		return {
			layout,
			dx: layout.camera.x - plain.camera.x,
			dy: layout.camera.y - plain.camera.y
		};
	};
}

const twoCuts = (shots: unknown[], extra: Record<string, unknown> = {}) => ({
	size: [1920, 1080],
	fps: 30,
	footage: {
		a: { src: 'a.mp4', matte: 'a.matte.mp4' },
		b: { src: 'b.mp4', matte: 'b.matte.mp4' }
	},
	cuts: [
		{ id: 'A', source: 'a', in: 0, out: 4 },
		{ id: 'B', source: 'b', in: 0, out: 4 }
	],
	shots,
	clips: [],
	...extra
});
const TWO: ProgramInputs = {
	words: null,
	sources: {
		a: { frames: 240, duration: 8, width: 1920, height: 1080, fps: 30, audio: true },
		b: { frames: 240, duration: 8, width: 1920, height: 1080, fps: 30, audio: true }
	}
};
const hashes = (sources: Record<string, string>) => ({ sources }) as ProgramInputs['hashes'];
/** The hash of the chunk that draws program frame `f`. */
const chunkAt = (p: ResolvedProgram, f: number) =>
	p.segments.flatMap((s) => s.chunks).find((c) => f >= c.startFrame && f < c.startFrame + c.frames)!
		.hash;

describe('where an away move decides its side', () => {
	it('draws a chunk again when the footage its moves decide by changes, in a cut it does not show', () => {
		// Gone at 5 s after a 2 s exit: the side is decided at 3 s, in cut A, while 4–5 s show B.
		const json = twoCuts([
			{ id: 'talk', shot: 'behind', from: 0, until: 'end', away: [{ from: 5, until: 7, exit: 2 }] }
		]);
		const at = (sources: Record<string, string>) =>
			resolveProgram(parseMotionProject(json), { ...TWO, hashes: hashes(sources) });
		expect(chunkAt(at({ a: 'a1', b: 'b1' }), 135)).not.toBe(chunkAt(at({ a: 'a2', b: 'b1' }), 135));
		// The same in an excerpt that leaves cut A out.
		const cut = { ...json, excerpts: [{ id: 'late', from: 4.5, until: 8 }] };
		const excerpt = (sources: Record<string, string>) =>
			resolveProgram(
				parseMotionProject(cut),
				{ ...TWO, hashes: hashes(sources) },
				{ excerpt: 'late' }
			);
		expect(excerpt({ a: 'a1', b: 'b1' }).cuts.map((c) => c.source)).toEqual(['b']);
		expect(chunkAt(excerpt({ a: 'a1', b: 'b1' }), 10)).not.toBe(
			chunkAt(excerpt({ a: 'a2', b: 'b1' }), 10)
		);
	});

	it('draws a chunk again when the keys where its moves decide change, though its own frames keep theirs', () => {
		const json = (x: number) =>
			twoCuts([
				{
					id: 'talk',
					shot: 'behind',
					from: 0,
					until: 'end',
					keys: [
						{ at: 0, x },
						{ at: 3.4, x: -300 }
					],
					away: [{ from: 5, until: 7, exit: 2 }]
				}
			]);
		const at = (x: number) => resolveProgram(parseMotionProject(json(x)), TWO);
		expect(chunkAt(at(0), 135)).not.toBe(chunkAt(at(200), 135));
	});

	it('decides with the footage shown where the move starts, its size included, across a cut', () => {
		// A wide take, then a tall one: the exit (0.8–1.2 s) runs across the cut at 1 s.
		const json = {
			size: [1920, 1080],
			fps: 30,
			footage: {
				wide: { src: 'wide.mp4', matte: 'wide.matte.mp4' },
				tall: { src: 'tall.mp4', matte: 'tall.matte.mp4' }
			},
			cuts: [
				{ source: 'wide', in: 0, out: 1 },
				{ source: 'tall', in: 0, out: 2 }
			],
			shots: [
				{
					id: 'talk',
					shot: 'behind',
					from: 0,
					until: 'end',
					away: [{ from: 1.2, until: 2.5, exit: 0.4 }]
				}
			],
			clips: []
		};
		const p = resolveProgram(parseMotionProject(json), {
			words: null,
			sources: {
				wide: { frames: 90, duration: 3, width: 1920, height: 1080, fps: 30, audio: true },
				tall: { frames: 90, duration: 3, width: 1080, height: 1920, fps: 30, audio: true }
			}
		});
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		const at = framed(p, {
			wide: matted(1920, 1080, 90, () => SUBJECT),
			tall: matted(1080, 1920, 90, () => SUBJECT)
		});
		// In the wide take where the exit starts, the speaker sinks out of the bottom.
		expect(at(27).dx).toBe(0);
		expect(at(27).dy).toBeGreaterThan(0);
		// Past the cut he goes on the same way.
		expect(at(33).dx).toBe(0);
		expect(at(33).dy).toBeGreaterThan(0);
	});

	it('slides an excerpt the way the full program does, though its move started before it', () => {
		// The exit runs 1–3 s; the speaker is on the left at 1 s and on the right from 1.7 s on.
		const json = {
			...project([{ from: 3, until: 4.5, exit: 2 }], {}),
			size: [1920, 1080],
			excerpts: [{ id: 'late', from: 2.5, until: 5 }]
		};
		const footage = { talk: matted(1920, 1080, 180, (f) => (f < 50 ? leftish : rightish)) };
		const full = framed(resolve(json), footage);
		const sliced = resolveProgram(parseMotionProject(json), INPUTS, { excerpt: 'late' });
		const excerpt = framed(sliced, footage);
		expect(full(80).dx).toBeLessThan(0);
		expect(excerpt(80 - 75).layout).toEqual(full(80).layout);
		// The excerpt extracts the footage the move decides by, with the frames it is smoothed over.
		const around = sliced.excerpt!.footage!.around.talk;
		expect(around.some((r) => r.first <= 30 - 15 && r.last >= 30 + 15)).toBe(true);
	});

	it('decides a range from the shot start by the shot, not by the picture before it', () => {
		const json = twoCuts([
			{ id: 'open', shot: 'full', from: 0, until: 4 },
			{ id: 'talk', shot: 'behind', from: 4, until: 'end', away: [{ from: 4, until: 6 }] }
		]);
		const p = resolveProgram(parseMotionProject(json), TWO);
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		const at = framed(p, {
			a: matted(1920, 1080, 240, () => leftish),
			b: matted(1920, 1080, 240, () => rightish)
		});
		expect(at(150).dx).toBeGreaterThan(0);
	});

	it('decides a way back that lands on the shot end by the shot, not by what follows it', () => {
		// Back from 3.78 s with the default 0.22 s: he lands on 4 s, where the next cut starts.
		const json = twoCuts([
			{ id: 'talk', shot: 'behind', from: 0, until: 4, away: [{ from: 1, until: 3.78 }] },
			{ id: 'after', shot: 'full', from: 4, until: 'end' }
		]);
		const p = resolveProgram(parseMotionProject(json), TWO);
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		const r = p.shots[0].away![0];
		expect(r.until! + r.enter.frames).toBe(120);
		const at = framed(p, {
			a: matted(1920, 1080, 240, () => leftish),
			b: matted(1920, 1080, 240, () => rightish)
		});
		expect(at(116).dx).toBeLessThan(0);
	});
});

describe('a shot that starts away, behind a shot transition', () => {
	const json = twoCuts([
		{ id: 'open', shot: 'full', from: 0, until: 4 },
		{
			id: 'talk',
			shot: 'behind',
			from: 4,
			until: 'end',
			transition: { type: 'push', duration: 0.6 },
			away: [{ from: 4, until: 6 }]
		}
	]);

	it('is away wherever its picture is drawn before its start: the transition window too', () => {
		const p = resolveProgram(parseMotionProject(json), TWO);
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		const t = p.transitions.find((x) => x.owner === 'talk')!;
		expect(t.startFrame).toBeLessThan(120);
		const map = footageMap(p);
		const framing = programFraming({
			fps: p.fps,
			size: p.format.size,
			cls: p.format.class,
			format: p.format as never,
			footage: {
				a: matted(1920, 1080, 240, () => SUBJECT),
				b: matted(1920, 1080, 240, () => SUBJECT)
			},
			footageMap: map,
			shots: p.shots
		});
		const talk = p.shots.find((s) => s.id === 'talk')!;
		// The incoming side as the window draws it, before and at the shot's start.
		const incoming = (g: number) => {
			const view = transitionSidesAt(map, t, g)!.in;
			return {
				away: framing.layoutFor(g, view, talk),
				plain: framing.layoutFor(g, view, { ...talk, away: undefined })
			};
		};
		const gone = incoming(120).away.camera;
		for (let g = t.startFrame; g < 120; g++) {
			const { away, plain } = incoming(g);
			expect(away.camera).not.toEqual(plain.camera);
			expect(away.camera).toEqual(gone);
		}
	});

	it('draws the window again when the footage the side is decided by changes', () => {
		const at = (sources: Record<string, string>) =>
			resolveProgram(parseMotionProject(json), { ...TWO, hashes: hashes(sources) });
		const t = at({ a: 'a1', b: 'b1' }).transitions.find((x) => x.owner === 'talk')!;
		const p1 = at({ a: 'a1', b: 'b1' });
		const p2 = at({ a: 'a1', b: 'b2' });
		expect(chunkAt(p1, t.startFrame)).not.toBe(chunkAt(p2, t.startFrame));
	});
});

describe('what an excerpt reads where a move decides', () => {
	/** Boxes of source frames `first`–`last` only, as extraction leaves them. */
	const extracted = (first: number, last: number, at: (f: number) => SubjectBox) => ({
		...matted(1920, 1080, 300, at),
		first,
		last,
		boxes: Array.from({ length: last - first + 1 }, (_, k) => at(first + k))
	});
	const json = {
		size: [1920, 1080],
		fps: 30,
		footage: { a: { src: 'a.mp4', matte: 'a.matte.mp4' } },
		cuts: [{ id: 'A', source: 'a', in: 2, out: 6 }],
		shots: [
			{
				id: 'talk',
				shot: 'behind',
				from: 0,
				until: 'end',
				away: [{ from: 2.1, until: 3.2, exit: 2 }]
			}
		],
		clips: [],
		excerpts: [{ id: 'mid', from: 1.5, until: 4 }]
	};
	const inputs: ProgramInputs = {
		words: null,
		sources: { a: { frames: 300, duration: 10, width: 1920, height: 1080, fps: 30, audio: true } }
	};

	it('decides with the frames the full program has, though the excerpt extracts more', () => {
		// On the left before source frame 60 (which the full program never shows), on the right after.
		const at = (f: number) => (f < 60 ? leftish : rightish);
		const full = framed(resolveProgram(parseMotionProject(json), inputs), {
			a: extracted(60, 179, at)
		});
		const sliced = resolveProgram(parseMotionProject(json), inputs, { excerpt: 'mid' });
		const excerpt = framed(sliced, { a: extracted(33, 193, at) });
		for (const f of [50, 60, 70]) expect(excerpt(f - 45).layout).toEqual(full(f).layout);
	});

	it('extracts only what the moves drawn in the excerpt decide by', () => {
		const far = {
			...json,
			cuts: [{ id: 'A', source: 'a', in: 0, out: 10 }],
			shots: [
				{
					id: 'talk',
					shot: 'behind',
					from: 0,
					until: 'end',
					away: [
						{ from: 2.1, until: 3.2, exit: 2 },
						{ from: 8, until: 9 }
					]
				}
			],
			excerpts: [{ id: 'mid', from: 1.5, until: 3 }]
		};
		const sliced = resolveProgram(parseMotionProject(far), inputs, { excerpt: 'mid' });
		const around = sliced.excerpt!.footage!.around.a;
		// The second range (its moves at 7.8–8 s and 9–9.2 s) is not drawn: none of its frames.
		expect(around.every((r) => r.last < 200)).toBe(true);
	});
});

describe('what an away range moves', () => {
	it('clears the blurred copy under footage that leaves its window open too', () => {
		const keys: ResolvedKey[] = [{ frame: 0, values: { scale: 0.5 }, ease: 'none', mix: 'oklch' }];
		const shot = { ...behind([range(10, 40, { side: 'left' })], keys), params: { headroom: 0.06 } };
		const l = shotLayout(shot, input(LANDSCAPE), 20);
		expect(l.backdrop).toBeDefined();
		const copy = l.backdrop!.camera;
		expect(copy.x + (SUBJECT.x + SUBJECT.width) * copy.width).toBeLessThan(0);
	});

	it('clears the reach of the blur too: the room around the cut-out and the blurred copy', () => {
		const keys: ResolvedKey[] = [{ frame: 0, values: { scale: 0.5 }, ease: 'none', mix: 'oklch' }];
		const shot = { ...behind([range(10, 40, { side: 'left' })], keys), params: { headroom: 0.06 } };
		const l = shotLayout(shot, input(LANDSCAPE), 20);
		// A Gaussian blur of deviation σ still shows a bright shirt's edge up to about 3σ out.
		const room = l.room!.blur;
		const copyBlur = Math.hypot(l.backdrop!.blur, room);
		const copy = l.backdrop!.camera;
		expect(copy.x + (SUBJECT.x + SUBJECT.width) * copy.width).toBeLessThan(-3 * copyBlur);
		expect(l.camera.x + (SUBJECT.x + SUBJECT.width) * l.camera.width).toBeLessThan(-3 * room);
	});

	it('leaves the word slot where it is through a morph into a shot that starts away', () => {
		const open: ShotSpan = {
			id: 'open',
			shot: 'full',
			params: {},
			startFrame: 0,
			frames: 30,
			morphFrames: 0,
			morphEase: 'none'
		};
		const talk = (away: ShotAway[]): ShotSpan => ({
			...behind(away),
			startFrame: 30,
			frames: 60,
			morphFrames: 10,
			morphEase: 'none'
		});
		const away = talk([range(30, 60, { side: 'left', exit: { frames: 0, ease: 'none' } })]);
		for (const f of [32, 35, 38]) {
			const moved = shotLayoutAt([open, away], f, input(LANDSCAPE));
			const plain = shotLayoutAt([open, talk([])], f, input(LANDSCAPE));
			expect(moved.slots).toEqual(plain.slots);
			expect(moved.camera.x).toBeLessThan(plain.camera.x);
		}
	});

	it('reads a turned picture back at no more pixels than the frame has, and not at all once it is gone', () => {
		const keys: ResolvedKey[] = [
			{ frame: 0, values: { scale: 0.25, rotation: 4 }, ease: 'none', mix: 'oklch' }
		];
		const l = shotLayout(behind([range(10, 40, { side: 'left' })], keys), input(LANDSCAPE), 20);
		const view = { x: 0, y: 0, width: 1920, height: 1080 };
		for (const picture of [
			[1920, 1080],
			[3840, 2160]
		] as [number, number][]) {
			const read = turnedReadback(l, view, picture, LANDSCAPE)!;
			const w = Math.ceil(read.region.width * read.scale);
			const h = Math.ceil(read.region.height * read.scale);
			expect(w * h).toBeLessThanOrEqual(1921 * 1081);
			// Only what the turned picture covers of the frame.
			expect(read.region.width).toBeLessThan(1920);
		}
		const gone = {
			...l,
			camera: { ...l.camera, x: -5000 },
			turn: { ...l.turn!, pivot: { x: -4000, y: 500 } }
		};
		expect(turnedReadback(gone, view, [1920, 1080], LANDSCAPE)).toBeNull();
	});
});
