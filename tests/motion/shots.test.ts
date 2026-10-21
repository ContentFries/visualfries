import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram, type ProgramInputs } from '$lib/motion/program.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import {
	DEFAULT_PUNCH_SCALE,
	SHOT_MODULES,
	defaultMorph,
	facePoint,
	mixLayouts,
	shotAt,
	shotEvents,
	shotLayout,
	shotLayoutAt,
	shotsDuring,
	type Rect,
	type ShotInput,
	type ShotLayout,
	type ShotSpan
} from '$lib/motion/shots/index.js';
import type { SubjectBox } from '$lib/motion/resolve.js';
import type { ResolvedKey } from '$lib/motion/program.js';

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

describe('window', () => {
	it('sets the speaker in a ringed corner window with a panel beside it in landscape', () => {
		const l = layout('window', LANDSCAPE);
		expect(l.clip).toEqual({ x: 1290, y: 702, width: 576, height: 324 });
		expect(l.slots).toEqual({ panel: { x: 0, y: 0, width: 1236, height: 1080 } });
		expect(l.closed).toEqual({ panel: { x: -1236, y: 0, width: 1236, height: 1080 } });
		expect(l).toMatchObject({ radius: 26, fill: 'surface', ring: 4, lift: 1 });
		// The camera goes 1.2 times closer inside the window; the face is in it, the window covered.
		expect(l.camera.width).toBeCloseTo(576 * 1.2, 1);
		const centred = layout('window', LANDSCAPE, { subject: { ...SUBJECT, headX: 0.5 } });
		expect(faceOnStage(centred, { ...SUBJECT, headX: 0.5 }).x).toBeCloseTo(1290 + 288, 1);
		// A head right of centre: the footage stays covering the window, the face off its mark.
		expect(faceOnStage(l).x).toBeGreaterThan(1290 + 288);
		expect(faceOnStage(l).x).toBeLessThan(1290 + 576);
		expect(covers(l.camera, l.clip)).toBe(true);
		// The panel never reaches under the window.
		expect(l.slots.panel.x + l.slots.panel.width).toBeLessThan(l.clip.x);
	});

	it('moves to another corner and takes size, zoom and ring', () => {
		const l = layout('window', LANDSCAPE, {
			params: { corner: 'top-left', size: 0.25, zoom: 1, ring: 0 }
		});
		expect(l.clip).toEqual({ x: 54, y: 54, width: 480, height: 270 });
		expect(l.slots.panel).toEqual({ x: 588, y: 0, width: 1332, height: 1080 });
		expect(l.closed.panel.x).toBe(1920);
		expect(l.camera.width).toBeCloseTo(480, 1);
		expect(l.ring).toBe(0);
	});

	it('centres a square window near the top in portrait, the panel below', () => {
		const l = layout('window', PORTRAIT);
		expect(l.clip).toEqual({ x: 238, y: 154, width: 605, height: 605 });
		expect(l.slots.panel).toEqual({ x: 0, y: 813, width: 1080, height: 1107 });
		expect(l.closed.panel).toEqual({ x: 0, y: 1920, width: 1080, height: 1107 });
		expect(faceOnStage(l).x).toBeCloseTo(238 + 302.5, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
		// Bottom: above the band captions and platform buttons use, the panel above.
		const low = layout('window', PORTRAIT, { params: { corner: 'bottom-left' } });
		expect(low.clip).toEqual({ x: 238, y: 739, width: 605, height: 605 });
		expect(low.slots.panel).toEqual({ x: 0, y: 0, width: 1080, height: 685 });
		expect(low.closed.panel.y).toBe(-685);
	});

	it('uses a square window in the corner of a square frame', () => {
		const l = layout('window', SQUARE);
		expect(l.clip).toEqual({ x: 594, y: 594, width: 432, height: 432 });
		expect(l.slots.panel).toEqual({ x: 0, y: 0, width: 540, height: 1080 });
		expect(covers(l.camera, l.clip)).toBe(true);
	});

	it('checks its params', () => {
		expect(
			SHOT_MODULES.window.check!({ corner: 'middle', size: 0.9, zoom: 0.5, ring: -1, tilt: 2 })
		).toEqual([
			'Unknown param "tilt". Known: corner, size, zoom, ring.',
			'"corner" must be one of top-left, top-right, bottom-left, bottom-right (got "middle").',
			'"size" must be a number from 0.15 to 0.7 (got 0.9).',
			'"zoom" must be a number from 1 to 3 (got 0.5).',
			'"ring" must be a number from 0 to 40 (got -1).'
		]);
	});
});

describe('behind', () => {
	it('frames like full, dims and blurs the room and opens a word slot around the head', () => {
		const full = layout('full', LANDSCAPE);
		const l = layout('behind', LANDSCAPE);
		expect(l.camera).toEqual(full.camera);
		expect(l.clip).toEqual(full.clip);
		expect(l.room).toEqual({ dim: 0.55, blur: 12 });
		// From the frame top (the head is high) to below the face: head top 118.8, face 226.8.
		expect(l.slots.word).toEqual({ x: 0, y: 0, width: 1920, height: 421.2 });
		// The slot never slides: the word's own clip brings it in.
		expect(l.closed.word).toEqual(l.slots.word);
	});

	it('follows the head', () => {
		const low = layout('behind', LANDSCAPE, { subject: { ...SUBJECT, headY: 0.4 } });
		// Head top 432: the slot starts 0.12 of the frame above it and ends below the face.
		expect(low.slots.word.y).toBeCloseTo(432 - 129.6, 1);
		expect(low.slots.word.y + low.slots.word.height).toBeCloseTo(432 + 108 + 194.4, 1);
		// Without a matte the frame's stand-in face is used.
		expect(layout('behind', LANDSCAPE, { subject: null }).slots.word.height).toBeGreaterThan(0);
	});

	it('scales the blur with the frame and takes scale, dim and blur', () => {
		expect(layout('behind', [3840, 2160]).room).toEqual({ dim: 0.55, blur: 24 });
		const l = layout('behind', PORTRAIT, { params: { scale: 1.2, dim: 0.3, blur: 0 } });
		expect(l.room).toEqual({ dim: 0.3, blur: 0 });
		expect(l.camera.height).toBeCloseTo(1920 * 1.2, 1);
		expect(faceOnStage(l).x).toBeCloseTo(540, 1);
		expect(SHOT_MODULES.behind.check!({ dim: 1, blur: 50, scale: 0 })).toEqual([
			'"scale" must be a number from 1 to 4 (got 0).',
			'"dim" must be a number from 0 to 0.9 (got 1).',
			'"blur" must be a number from 0 to 40 (got 50).'
		]);
	});
});

describe('whip', () => {
	it('sends the camera one frame away and brings a card slot in from the other side', () => {
		const full = layout('full', LANDSCAPE);
		const l = layout('whip', LANDSCAPE);
		expect(l.clip).toEqual({ x: -1920, y: 0, width: 1920, height: 1080 });
		expect(l.camera).toEqual({ ...full.camera, x: full.camera.x - 1920 });
		expect(l.slots).toEqual({ card: { x: 0, y: 0, width: 1920, height: 1080 } });
		expect(l.closed).toEqual({ card: { x: 1920, y: 0, width: 1920, height: 1080 } });
		expect(l.fill).toBe('surface');
		const back = layout('whip', LANDSCAPE, { params: { direction: 'back' } });
		expect(back.clip.x).toBe(1920);
		expect(back.closed.card.x).toBe(-1920);
	});

	it('whips up in portrait unless a screen direction is written', () => {
		const l = layout('whip', PORTRAIT);
		expect(l.clip).toEqual({ x: 0, y: -1920, width: 1080, height: 1920 });
		expect(l.closed.card).toEqual({ x: 0, y: 1920, width: 1080, height: 1920 });
		expect(layout('whip', PORTRAIT, { params: { direction: 'right' } }).clip.x).toBe(1080);
		expect(SHOT_MODULES.whip.check!({ direction: 'sideways', blur: -2 })).toEqual([
			'"direction" must be one of forward, back, left, right, up, down (got "sideways").',
			'"blur" must be a number from 0 to 400 (got -2).'
		]);
	});

	const spans = (cls: [number, number]): ShotSpan[] =>
		[
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
				id: 'w',
				shot: 'whip',
				startFrame: 10,
				frames: 20,
				params: {},
				morphFrames: 12,
				morphEase: 'none'
			},
			{
				id: 'b',
				shot: 'punch',
				startFrame: 30,
				frames: 20,
				params: {},
				morphFrames: 12,
				morphEase: 'none'
			}
		].map((s) => ({ ...s, params: cls === PORTRAIT ? { ...s.params } : s.params }));

	it('blurs the move along the whip, most at the middle, and keeps camera and card together', () => {
		const at = (f: number, size = LANDSCAPE) => shotLayoutAt(spans(size), f, input(size));
		expect(at(10).motionBlur).toBeUndefined();
		expect(at(16).motionBlur).toEqual({ x: 48, y: 0 });
		expect(at(13).motionBlur!.x).toBeCloseTo(48 * Math.sin(Math.PI * 0.25), 1);
		expect(at(22).motionBlur).toBeUndefined();
		// The whip back blurs too, and the card leaves the way the camera comes back.
		expect(at(36).motionBlur).toEqual({ x: 48, y: 0 });
		expect(at(36).slots.card.x).toBeGreaterThan(0);
		// Portrait: up, by the frame height.
		expect(at(16, PORTRAIT).motionBlur).toEqual({ x: 0, y: 48 });
		// The card's leading edge meets the camera window's trailing edge all the way.
		for (let f = 10; f < 22; f++) {
			const l = at(f);
			expect(l.slots.card.x).toBeCloseTo(l.clip.x + l.clip.width, 1);
		}
	});

	it('makes a whip event on the way out and on the way back, and lands the punch after it', () => {
		const s = spans(LANDSCAPE);
		expect(shotEvents(s[1], 'full')).toEqual([{ kind: 'whip', frame: 16 }]);
		// The punch hits when the camera lands, the whip back halfway.
		expect(shotEvents(s[2], 'whip')).toEqual([
			{ kind: 'whip', frame: 36 },
			{ kind: 'punch', frame: 42 }
		]);
		// Back to full: the whip stands in for the shot event.
		expect(shotEvents({ ...s[2], shot: 'full' }, 'whip')).toEqual([{ kind: 'whip', frame: 36 }]);
		// A program starting on a whip has nothing to whip from.
		expect(shotEvents({ ...s[1], startFrame: 0 }, null)).toEqual([]);
		expect(defaultMorph('full', 'whip')).toEqual({ seconds: 0.42, ease: 'power3.inOut' });
		expect(defaultMorph('whip', 'strip')).toEqual({ seconds: 0.42, ease: 'power3.inOut' });
	});
});

describe('morph continuity between every pair of shots', () => {
	const NAMES = ['full', 'punch', 'strip', 'window', 'behind', 'whip'];
	const SIZES = [LANDSCAPE, SQUARE, PORTRAIT];
	const rects = (l: ShotLayout) => [l.camera, l.clip];
	const looks = (l: ShotLayout) => [
		l.radius,
		l.ring ?? 0,
		l.lift ?? 0,
		l.room?.dim ?? 0,
		l.room?.blur ?? 0
	];

	it('starts on the previous layout, ends on the next and never jumps in between', () => {
		for (const size of SIZES)
			for (const from of NAMES)
				for (const to of NAMES) {
					const a = layout(from, size);
					const b = layout(to, size);
					const name = `${from} → ${to} at ${size.join('x')}`;
					expect(rects(mixLayouts(a, b, 0)), name).toEqual(rects(a));
					expect(looks(mixLayouts(a, b, 0)), name).toEqual(looks(a));
					expect(rects(mixLayouts(a, b, 1)), name).toEqual(rects(b));
					expect(looks(mixLayouts(a, b, 1)), name).toEqual(looks(b));
					// Steps of 5 % move everything (slots too) at most 5 % of its whole way.
					const all = (l: ShotLayout) => [
						...rects(l).flatMap((r) => [r.x, r.y, r.width, r.height]),
						...Object.values(l.slots).flatMap((r) => [r.x, r.y, r.width, r.height]),
						...looks(l)
					];
					const start = all(mixLayouts(a, b, 0));
					const whole = all(mixLayouts(a, b, 1)).map((v, k) => Math.abs(v - start[k]));
					let prev = mixLayouts(a, b, 0);
					for (let i = 1; i <= 20; i++) {
						const now = mixLayouts(a, b, i / 20);
						all(now).forEach((v, k) =>
							expect(Math.abs(v - all(prev)[k]), `${name} value ${k}`).toBeLessThanOrEqual(
								whole[k] / 20 + 0.02
							)
						);
						prev = now;
					}
				}
	});
});

describe('keys on the new shots', () => {
	const key = (frame: number, values: ResolvedKey['values']): ResolvedKey => ({
		frame,
		values,
		ease: 'none',
		mix: 'oklch'
	});
	const keyed = (shot: string, values: ResolvedKey['values']) => ({
		shot,
		params: {},
		keys: [key(0, { scale: 1, x: 0 }), key(10, values)]
	});

	it('move the camera inside the window, which stays where the shot put it', () => {
		const plain = layout('window', LANDSCAPE);
		const l = shotLayout(keyed('window', { scale: 1.5, x: 40 }), input(LANDSCAPE), 10);
		expect(l.clip).toEqual(plain.clip);
		expect(l.slots).toEqual(plain.slots);
		expect(l.camera.width).toBeCloseTo(plain.camera.width * 1.5, 1);
		// Scaled about the face, then moved.
		expect(faceOnStage(l).x).toBeCloseTo(faceOnStage(plain).x + 40, 1);
		expect(faceOnStage(l).y).toBeCloseTo(faceOnStage(plain).y, 1);
		// Halfway between the keys.
		expect(
			shotLayout(keyed('window', { scale: 1.5, x: 40 }), input(LANDSCAPE), 5).camera.width
		).toBeCloseTo(plain.camera.width * 1.25, 1);
	});

	it('push into the room behind a word and ride along a whip', () => {
		const behind = shotLayout(keyed('behind', { scale: 1.2 }), input(LANDSCAPE), 10);
		expect(behind.room).toEqual({ dim: 0.55, blur: 12 });
		expect(behind.camera.width).toBeCloseTo(1920 * 1.2, 1);
		const plainWhip = layout('whip', LANDSCAPE);
		const whip = shotLayout(keyed('whip', { scale: 1, x: 100 }), input(LANDSCAPE), 10);
		expect(whip.clip).toEqual(plainWhip.clip);
		expect(whip.camera.x).toBeCloseTo(plainWhip.camera.x + 100, 1);
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
		Object.assign(json.shots[1], { shot: 'shots/Orbit.ts' });
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
				message: 'Custom shot files are not drawn yet; "shots/Orbit.ts" is framed full.'
			})
		);
	});

	it('resolves window, behind and whip with their morphs and events', () => {
		const json = {
			...structuredClone(PROJECT),
			shots: [
				{ id: 'win', shot: 'window', from: 'Hello', until: 'punch here' },
				{ id: 'word', shot: 'behind', from: 'and', until: 'and three' },
				{ id: 'card', shot: 'whip', from: 'points', until: 3.4 },
				{ id: 'hit', shot: 'punch', from: 'finish', until: 'finish' }
			],
			clips: [
				{ id: 'tiles', block: 'blocks/Panel.svelte', from: 0.2, until: 1.9, slot: 'panel' },
				{
					id: 'fix',
					block: 'blocks/Word.svelte',
					from: 2,
					until: 2.7,
					layer: 'behind',
					slot: 'word'
				},
				// Until the card has whipped out again.
				{ id: 'list', block: 'blocks/Card.svelte', from: 2.8, until: 3.8, slot: 'card' }
			]
		};
		const p = resolve(json);
		expect(p.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		expect(p.shots.map((s) => [s.id, s.shot, s.startFrame, s.morphFrames, s.morphEase])).toEqual([
			['full-0', 'full', 0, 0, 'none'],
			['win', 'window', 6, 21, 'expo.inOut'],
			['full-57', 'full', 57, 3, 'expo.inOut'],
			['word', 'behind', 60, 9, 'expo.out'],
			['full-81', 'full', 81, 3, 'expo.inOut'],
			['card', 'whip', 84, 13, 'power3.inOut'],
			['full-102', 'full', 102, 13, 'power3.inOut'],
			['hit', 'punch', 117, 5, 'power4.out'],
			['full-138', 'full', 138, 12, 'power3.inOut']
		]);
		// Into the window and back out are shot changes; dimming the room is not.
		expect(p.events).toEqual([
			{ kind: 'shot', frame: 16, owner: 'win' },
			{ kind: 'shot', frame: 58, owner: 'full-57' },
			{ kind: 'whip', frame: 90, owner: 'card' },
			{ kind: 'whip', frame: 108, owner: 'full-102' },
			{ kind: 'punch', frame: 117, owner: 'hit' }
		]);
	});

	it('needs a matte for the behind shot', () => {
		const json = structuredClone(PROJECT) as typeof PROJECT & { shots: object[] };
		json.footage.talk.matte = undefined as unknown as string;
		json.shots = [{ id: 'word', shot: 'behind', from: 'and', until: 'and three' }];
		json.clips = [];
		expect(resolve(json).diagnostics).toContainEqual({
			level: 'error',
			item: 'word',
			field: 'shots',
			message: 'The "behind" shot needs a matte, but footage "talk" has none (visualfries matte).'
		});
	});
});
