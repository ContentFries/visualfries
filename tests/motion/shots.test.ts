import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram, type ProgramInputs } from '$lib/motion/program.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import {
	DEFAULT_PUNCH_SCALE,
	defaultMorph,
	facePoint,
	mixLayouts,
	shotAt,
	shotLayout,
	shotLayoutAt,
	shotsDuring,
	type Rect,
	type ShotInput,
	type ShotLayout,
	type ShotSpan
} from '$lib/motion/shots/index.js';
import type { SubjectBox } from '$lib/motion/resolve.js';

const LANDSCAPE: [number, number] = [1920, 1080];
const PORTRAIT: [number, number] = [1080, 1920];
const SQUARE: [number, number] = [1080, 1080];
/** A speaker a little right of centre, head top at 11 % (the real recording's numbers). */
const SUBJECT: SubjectBox = {
	x: 0.2,
	y: 0.11,
	width: 0.57,
	height: 0.89,
	headX: 0.6,
	headY: 0.11
};

const input = (
	size: [number, number],
	extra: Partial<ShotInput> = {}
): Omit<ShotInput, 'params'> => ({
	cls: size[0] > size[1] ? 'landscape' : size[0] === size[1] ? 'square' : 'portrait',
	size,
	footage: [1920, 1080],
	subject: SUBJECT,
	...extra
});
const layout = (shot: string, size: [number, number], extra: Partial<ShotInput> = {}) =>
	shotLayout({ shot, params: extra.params ?? {} }, input(size, extra));

/** Where the face lands on the stage under a layout. */
const faceOnStage = (l: ShotLayout, subject: SubjectBox | null = SUBJECT) => {
	const face = facePoint(subject);
	return { x: l.camera.x + face.x * l.camera.width, y: l.camera.y + face.y * l.camera.height };
};
/** The footage covers the camera window: no empty edge. */
const covers = (camera: Rect, clip: Rect) =>
	camera.x <= clip.x + 0.01 &&
	camera.y <= clip.y + 0.01 &&
	camera.x + camera.width >= clip.x + clip.width - 0.01 &&
	camera.y + camera.height >= clip.y + clip.height - 0.01;

describe('full', () => {
	it('fills a frame of the same aspect exactly, wherever the head is', () => {
		const l = layout('full', LANDSCAPE);
		expect(l.camera).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
		expect(l.clip).toEqual(l.camera);
		expect(l).toMatchObject({ radius: 0, slots: {}, fill: null });
		expect(layout('full', LANDSCAPE, { subject: null }).camera).toEqual(l.camera);
	});

	it('crops landscape footage around the head in a portrait frame', () => {
		const l = layout('full', PORTRAIT);
		expect(l.clip).toEqual({ x: 0, y: 0, width: 1080, height: 1920 });
		expect(l.camera.height).toBe(1920);
		expect(l.camera.width).toBeCloseTo(3413.33, 1);
		expect(faceOnStage(l).x).toBeCloseTo(540, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
		// Without a matte: a centred crop.
		const plain = layout('full', PORTRAIT, { subject: null });
		expect(plain.camera.x + plain.camera.width / 2).toBeCloseTo(540, 1);
	});

	it('keeps the footage covering the frame when the head is near an edge', () => {
		const l = layout('full', PORTRAIT, { subject: { ...SUBJECT, headX: 0.98 } });
		expect(l.camera.x + l.camera.width).toBeCloseTo(1080, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
	});

	it('crops landscape footage around the head in a square frame', () => {
		const l = layout('full', SQUARE);
		expect(l.camera.height).toBe(1080);
		expect(faceOnStage(l).x).toBeCloseTo(540, 1);
	});

	it('stands portrait footage in a full-height window over the surface in a landscape frame', () => {
		const l = layout('full', LANDSCAPE, { footage: [1080, 1920] });
		expect(l.clip).toEqual({ x: 656.25, y: 0, width: 607.5, height: 1080 });
		expect(l.camera).toEqual(l.clip);
		expect(l.fill).toBe('surface');
		// Portrait footage in a portrait frame just fills it.
		expect(layout('full', PORTRAIT, { footage: [1080, 1920] }).fill).toBeNull();
	});
});

describe('punch', () => {
	it('goes closer toward the head by the default scale and keeps the frame covered', () => {
		const full = layout('full', LANDSCAPE);
		const l = layout('punch', LANDSCAPE);
		expect(l.clip).toEqual(full.clip);
		expect(l.camera.width).toBeCloseTo(1920 * DEFAULT_PUNCH_SCALE, 1);
		expect(DEFAULT_PUNCH_SCALE).toBe(1.45);
		expect(faceOnStage(l).x).toBeCloseTo(960, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
	});

	it('takes params.scale, else the energy default', () => {
		expect(layout('punch', LANDSCAPE, { params: { scale: 1.2 } }).camera.width).toBeCloseTo(
			2304,
			1
		);
		expect(layout('punch', LANDSCAPE, { energy: 'calm' }).camera.width).toBeCloseTo(2400, 1);
		expect(layout('punch', LANDSCAPE, { energy: 'punchy' }).camera.width).toBeCloseTo(3072, 1);
	});

	it('punches toward the head in a portrait frame too', () => {
		const full = layout('full', PORTRAIT);
		const l = layout('punch', PORTRAIT);
		expect(l.camera.height).toBeCloseTo(1920 * 1.45, 1);
		expect(faceOnStage(l).x).toBeCloseTo(540, 1);
		expect(faceOnStage(full).x).toBeCloseTo(540, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
	});
});

describe('strip', () => {
	it('narrows the camera into a left strip and opens a panel on the right in landscape', () => {
		const l = layout('strip', LANDSCAPE);
		expect(l.clip).toEqual({ x: 0, y: 0, width: 640, height: 1080 });
		expect(l.slots).toEqual({ panel: { x: 640, y: 0, width: 1280, height: 1080 } });
		expect(l.closed).toEqual({ panel: { x: 1920, y: 0, width: 1280, height: 1080 } });
		expect(l.fill).toBe('surface');
		expect(faceOnStage(l).x).toBeCloseTo(320, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
	});

	it('swaps sides with side: right and takes a camera share', () => {
		const l = layout('strip', LANDSCAPE, { params: { side: 'right', size: 0.5 } });
		expect(l.clip).toEqual({ x: 960, y: 0, width: 960, height: 1080 });
		expect(l.slots.panel).toEqual({ x: 0, y: 0, width: 960, height: 1080 });
		expect(l.closed.panel).toEqual({ x: -960, y: 0, width: 960, height: 1080 });
	});

	it('stacks the camera on top and the panel below in portrait', () => {
		const l = layout('strip', PORTRAIT);
		expect(l.clip).toEqual({ x: 0, y: 0, width: 1080, height: 864 });
		expect(l.slots.panel).toEqual({ x: 0, y: 864, width: 1080, height: 1056 });
		expect(l.closed.panel).toEqual({ x: 0, y: 1920, width: 1080, height: 1056 });
		expect(faceOnStage(l).x).toBeCloseTo(540, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
		const bottom = layout('strip', PORTRAIT, { params: { side: 'right' } });
		expect(bottom.clip).toEqual({ x: 0, y: 1056, width: 1080, height: 864 });
		expect(bottom.slots.panel).toEqual({ x: 0, y: 0, width: 1080, height: 1056 });
	});

	it('keeps the camera left with a narrower share in a square frame', () => {
		const l = layout('strip', SQUARE);
		expect(l.clip).toEqual({ x: 0, y: 0, width: 432, height: 1080 });
		expect(l.slots.panel).toEqual({ x: 432, y: 0, width: 648, height: 1080 });
	});
});

describe('morph', () => {
	const shots: ShotSpan[] = [
		{
			id: 'a',
			shot: 'full',
			startFrame: 0,
			frames: 10,
			params: {},
			morphFrames: 0,
			morphEase: 'none'
		},
		{
			id: 'b',
			shot: 'strip',
			startFrame: 10,
			frames: 20,
			params: {},
			morphFrames: 10,
			morphEase: 'none'
		},
		{
			id: 'c',
			shot: 'punch',
			startFrame: 40,
			frames: 10,
			params: {},
			morphFrames: 4,
			morphEase: 'power4.out'
		}
	];
	const at = (f: number) => shotLayoutAt(shots, f, input(LANDSCAPE));

	it('starts from the previous layout and lands on the shot', () => {
		const full = layout('full', LANDSCAPE);
		const strip = layout('strip', LANDSCAPE);
		expect(at(10)).toMatchObject({ camera: full.camera, clip: full.clip });
		// The panel waits at its closed place, off the frame.
		expect(at(10).slots).toEqual(strip.closed);
		expect(at(20)).toEqual(layout('strip', LANDSCAPE));
		expect(at(29)).toEqual(layout('strip', LANDSCAPE));
	});

	it('moves the camera window and the slot together, the slot from its closed place', () => {
		const half = at(15);
		expect(half.clip).toEqual({ x: 0, y: 0, width: 1280, height: 1080 });
		expect(half.slots.panel).toEqual({ x: 1280, y: 0, width: 1280, height: 1080 });
		// The panel's left edge is the camera's right edge all the way.
		for (let f = 10; f <= 20; f++) {
			const l = at(f);
			expect(l.slots.panel.x).toBeCloseTo(l.clip.x + l.clip.width, 1);
		}
	});

	it('morphs from full across a gap, with the shot ease', () => {
		const { prev, p } = shotAt(shots, 41);
		expect(prev).toMatchObject({ shot: 'full' });
		expect(p).toBeCloseTo(1 - Math.pow(1 - 0.25, 5), 6);
		// Frames outside every shot are full.
		expect(at(35)).toEqual(layout('full', LANDSCAPE));
	});

	it('slides a slot out to its closed place when the next shot does not free it', () => {
		const strip = layout('strip', LANDSCAPE);
		const full = layout('full', LANDSCAPE);
		expect(mixLayouts(strip, full, 0.5).slots.panel).toEqual({
			x: 1280,
			y: 0,
			width: 1280,
			height: 1080
		});
		expect(mixLayouts(strip, full, 1).slots.panel).toEqual(strip.closed.panel);
	});

	it('takes the previous shot leave and the next shot enter as defaults', () => {
		expect(defaultMorph(null, 'strip')).toBeNull();
		expect(defaultMorph('full', 'strip')).toEqual({ seconds: 0.7, ease: 'expo.inOut' });
		expect(defaultMorph('full', 'punch')).toEqual({ seconds: 0.16, ease: 'power4.out' });
		expect(defaultMorph('punch', 'full')).toEqual({ seconds: 0.45, ease: 'power3.inOut' });
	});

	it('gives a segment the shots inside it and the one the first morphs from', () => {
		expect(shotsDuring(shots, { startFrame: 12, frames: 5 }).map((s) => s.id)).toEqual(['a', 'b']);
		expect(shotsDuring(shots, { startFrame: 45, frames: 5 }).map((s) => s.id)).toEqual(['b', 'c']);
	});
});

// ---------------------------------------------------------------- resolved program

const WORDS = parseTranscriptWords({
	words: [
		['Hello', 0.2, 0.6],
		['punch', 1.0, 1.4],
		['here', 1.5, 1.9],
		['and', 2.0, 2.2],
		['three', 2.3, 2.7],
		['points', 2.8, 3.4],
		['to', 3.6, 3.8],
		['finish', 3.9, 4.6]
	].map(([text, start, end]) => ({ text, start, end }))
});

const INPUTS: ProgramInputs = {
	words: null,
	transcripts: { talk: WORDS },
	sources: {
		talk: { frames: 150, duration: 5, width: 1920, height: 1080, fps: 30, audio: true }
	}
};

const PROJECT = {
	size: [1080, 1920],
	fps: 30,
	footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', transcript: 'talk.json' } },
	cuts: [{ source: 'talk' }],
	shots: [
		{ id: 'hit', shot: 'punch', from: 'punch here', until: 'punch here' },
		{ id: 'list', shot: 'strip', from: 'and three', until: 'three points' }
	],
	// Until the panel has slid out with the morph back to full.
	clips: [
		{ id: 'points', block: 'blocks/Panel.svelte', from: 'and three', until: 3.6, slot: 'panel' }
	] as { id: string; block: string; from: string; until: string | number; slot: string }[]
};
const resolve = (json: unknown) => resolveProgram(parseMotionProject(json), INPUTS);

describe('shots in the program', () => {
	it('fills in morphs and declares shot and punch events', () => {
		const p = resolve(PROJECT);
		expect(p.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		expect(
			p.shots.map((s) => [s.id, s.shot, s.startFrame, s.frames, s.morphFrames, s.morphEase])
		).toEqual([
			['full-0', 'full', 0, 30, 0, 'none'],
			['hit', 'punch', 30, 27, 5, 'power4.out'],
			['full-57', 'full', 57, 3, 3, 'power3.inOut'],
			['list', 'strip', 60, 42, 21, 'expo.inOut'],
			['full-102', 'full', 102, 48, 21, 'expo.inOut']
		]);
		expect(p.events).toEqual([
			{ kind: 'punch', frame: 30, owner: 'hit' },
			{ kind: 'shot', frame: 70, owner: 'list' },
			{ kind: 'shot', frame: 112, owner: 'full-102' }
		]);
	});

	it('takes morph from the project, and none under a shot transition', () => {
		const json = structuredClone(PROJECT) as typeof PROJECT & { shots: object[] };
		Object.assign(json.shots[1], { morph: 0.4 });
		expect(resolve(json).shots[3].morphFrames).toBe(12);
		Object.assign(json.shots[1], { morph: undefined, transition: 'wipe' });
		expect(resolve(json).shots[3].morphFrames).toBe(0);
	});

	it('warns when a slotted clip outlasts every shot freeing its slot', () => {
		const json = structuredClone(PROJECT);
		json.clips[0].until = 'to finish';
		expect(resolve(json).diagnostics).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				clip: 'points',
				field: 'slot',
				message: expect.stringMatching(/^No shot frees the "panel" slot for \d+ of the clip/)
			})
		);
	});

	it('checks params and says which shots are not drawn yet', () => {
		const json = structuredClone(PROJECT) as typeof PROJECT & { shots: object[] };
		Object.assign(json.shots[0], { params: { scale: 0.5, zoom: 2 } });
		Object.assign(json.shots[1], { shot: 'window' });
		const d = resolve(json).diagnostics;
		expect(d).toContainEqual(
			expect.objectContaining({
				level: 'error',
				item: 'hit',
				field: 'shots[0].params',
				message: 'Unknown param "zoom". Known: scale.'
			})
		);
		expect(d).toContainEqual(
			expect.objectContaining({
				level: 'error',
				message: '"scale" must be a number from 1 to 4 (got 0.5).'
			})
		);
		expect(d).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				item: 'list',
				message: 'The "window" shot is not drawn yet; it is framed full.'
			})
		);
	});
});
