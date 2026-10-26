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
	type LayoutInput,
	type Rect,
	type ShotInput,
	type ShotLayout,
	type ShotSpan
} from '$lib/motion/shots/index.js';
import type { SubjectBox } from '$lib/motion/resolve.js';
import { resolveFormat, slotArea, slotTokens, type SlotArea } from '$lib/motion/format.js';
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

	it('keeps the portrait window and panel inside the safe area, out of the caption band', () => {
		// The all-platform zone at 1080 × 1920: 288 from the top, 672 from the bottom.
		const ALL = { top: 288, right: 192, bottom: 672, left: 48 };
		const l = layout('window', PORTRAIT, { safe: ALL });
		expect(l.clip).toEqual({ x: 303, y: 288, width: 475, height: 475 });
		expect(l.slots.panel).toEqual({ x: 0, y: 817, width: 1080, height: 431 });
		expect(l.slots.panel.y + l.slots.panel.height).toBe(1920 - 672);
		expect(l.closed.panel).toEqual({ x: 0, y: 1920, width: 1080, height: 431 });
		expect(faceOnStage(l).x).toBeGreaterThan(303);
		expect(faceOnStage(l).x).toBeLessThan(303 + 475);
		expect(covers(l.camera, l.clip)).toBe(true);
		// Without insets the same zone, as shares of the frame.
		expect(layout('window', PORTRAIT).clip).toEqual(l.clip);
		// One platform's zone (TikTok: 240 top, 660 bottom).
		const tiktok = layout('window', PORTRAIT, {
			safe: { top: 240, right: 120, bottom: 660, left: 120 }
		});
		expect(tiktok.clip.y).toBe(240);
		expect(tiktok.slots.panel.y + tiktok.slots.panel.height).toBe(1260);
		// Bottom: the window just above the caption band, the panel above it.
		const low = layout('window', PORTRAIT, { params: { corner: 'bottom-left' }, safe: ALL });
		expect(low.clip).toEqual({ x: 303, y: 773, width: 475, height: 475 });
		expect(low.slots.panel).toEqual({ x: 0, y: 288, width: 1080, height: 431 });
		expect(low.closed.panel.y).toBe(-431);
		// A 4:5 window keeps the square's area: taller, a little narrower, the panel shorter.
		const tall = layout('window', PORTRAIT, { safe: ALL, params: { aspect: '4:5' } });
		expect(tall.clip).toEqual({ x: 328, y: 288, width: 425, height: 531 });
		expect(tall.slots.panel).toEqual({ x: 0, y: 873, width: 1080, height: 375 });
		expect(tall.slots.panel.y + tall.slots.panel.height).toBe(1920 - 672);
	});

	it('scales the ring with the frame, like the blur of behind', () => {
		expect(layout('window', [3840, 2160]).ring).toBe(8);
		expect(layout('window', LANDSCAPE, { params: { ring: 2 } }).ring).toBe(2);
		expect(layout('window', [1280, 720], { params: { ring: 6 } }).ring).toBe(4);
	});

	it("makes no shot event on the program's first frame, like strip", () => {
		for (const shot of ['window', 'strip'])
			expect(
				shotEvents(
					{
						id: 's',
						shot,
						startFrame: 0,
						frames: 30,
						params: {},
						morphFrames: 0,
						morphEase: 'none'
					},
					null
				)
			).toEqual([]);
	});

	it('uses a square window in the corner of a square frame', () => {
		const l = layout('window', SQUARE);
		expect(l.clip).toEqual({ x: 594, y: 594, width: 432, height: 432 });
		expect(l.slots.panel).toEqual({ x: 0, y: 0, width: 540, height: 1080 });
		expect(covers(l.camera, l.clip)).toBe(true);
	});

	it('takes an aspect as width:height or a number, keeping the area without a size', () => {
		const wide = layout('window', PORTRAIT, { params: { aspect: '16:9' } });
		expect(wide.clip.width / wide.clip.height).toBeCloseTo(16 / 9, 1);
		expect((wide.clip.width * wide.clip.height) / (475 * 475)).toBeCloseTo(1, 1);
		expect(layout('window', PORTRAIT, { params: { aspect: 0.8 } }).clip).toEqual(
			layout('window', PORTRAIT, { params: { aspect: '4:5' } }).clip
		);
		expect(layout('window', PORTRAIT, { params: { aspect: '1:1' } }).clip).toEqual(
			layout('window', PORTRAIT).clip
		);
		// With a size the width is the size and the height follows the aspect.
		const sized = layout('window', LANDSCAPE, { params: { size: 0.25, aspect: '4:5' } });
		expect(sized.clip).toMatchObject({ width: 480, height: 600 });
	});

	it('checks its params', () => {
		expect(
			SHOT_MODULES.window.check!({
				corner: 'middle',
				size: 0.9,
				zoom: 0.5,
				ring: -1,
				tilt: 2,
				aspect: 'tall',
				headroom: 0.5
			})
		).toEqual([
			'Unknown param "tilt". Known: corner, size, aspect, zoom, ring, headroom.',
			'"corner" must be one of top-left, top-right, bottom-left, bottom-right (got "middle").',
			'"size" must be a number from 0.15 to 0.7 (got 0.9).',
			'"zoom" must be a number from 1 to 3 (got 0.5).',
			'"ring" must be a number from 0 to 40 (got -1).',
			'"aspect" must be width:height like "4:5", "1:1" or "16:9", or a number (width over height), from 0.5 to 2.5 (got "tall").',
			'"headroom" must be a number from 0 to 0.3: the share of the camera window kept free above the head, 0.06 is a good start (got 0.5).'
		]);
		expect(SHOT_MODULES.window.check!({ aspect: '4:5', headroom: 0.06 })).toEqual([]);
		expect(SHOT_MODULES.window.check!({ aspect: 3 })).toHaveLength(1);
		expect(SHOT_MODULES.strip.check!({ headroom: false })).toHaveLength(1);
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

describe('cutout', () => {
	/** The speaker of `SUBJECT` with a measured head a quarter of the footage tall. */
	const SIZED: SubjectBox = { ...SUBJECT, headHeight: 0.25 };
	const cut = (
		size: [number, number],
		params: Record<string, unknown>,
		extra: Partial<LayoutInput> = {}
	) => shotLayout({ shot: 'cutout', params }, { ...input(size, { subject: SIZED }), ...extra });
	/** The head's height and the top of its head on the stage. */
	const head = (l: ShotLayout, s: SubjectBox = SIZED) => ({
		height: s.headHeight! * l.camera.height,
		top: l.camera.y + s.headY * l.camera.height,
		x: l.camera.x + s.headX * l.camera.width
	});

	it('sizes the speaker by the head and sits the body on the bottom edge, room gone', () => {
		const l = cut(PORTRAIT, { anchor: 'bottom-left', size: 0.15 });
		// The head is 15 % of the frame height, whatever the recording's framing.
		expect(head(l).height).toBeCloseTo(0.15 * 1920, 1);
		// The matte reaches the recording's bottom edge: that edge sits on the frame's.
		expect(l.camera.y + l.camera.height).toBeCloseTo(1920, 1);
		// The head 1.2 head heights in from the left margin (54 px): the shoulders stay in.
		expect(head(l).x).toBeCloseTo(54 + 1.2 * 288, 1);
		// The camera window is the frame; the room is gone and the style fill shows around.
		expect(l.clip).toEqual({ x: 0, y: 0, width: 1080, height: 1920 });
		expect(l.cutout).toBe(1);
		expect(l.fill).toBe('surface');
		expect(l.radius).toBe(0);
		expect(l.room).toBeUndefined();
		expect(l.backdrop).toBeUndefined();
	});

	it('anchors to the right, the middle and the vertical centre', () => {
		const right = cut(PORTRAIT, { anchor: 'bottom-right', size: 0.15 });
		expect(head(right).x).toBeCloseTo(1080 - 54 - 1.2 * 288, 1);
		expect(right.camera.y + right.camera.height).toBeCloseTo(1920, 1);
		const bottom = cut(PORTRAIT, { anchor: 'bottom', size: 0.15 });
		expect(head(bottom).x).toBeCloseTo(540, 1);
		// left, right and center: the speaker's box (head top to the matte's bottom) is centred
		// on the frame's height.
		for (const anchor of ['left', 'right', 'center']) {
			const l = cut(LANDSCAPE, { anchor, size: 0.2 });
			const top = head(l).top;
			const bottom = l.camera.y + (SIZED.y + SIZED.height) * l.camera.height;
			expect((top + bottom) / 2, anchor).toBeCloseTo(540, 1);
		}
		expect(head(cut(LANDSCAPE, { anchor: 'left', size: 0.2 })).x).toBeCloseTo(54 + 1.2 * 216, 1);
		expect(head(cut(LANDSCAPE, { anchor: 'center', size: 0.2 })).x).toBeCloseTo(960, 1);
	});

	it('stands a speaker whose matte ends above the recording edge on the margin', () => {
		// Feet at 80 % of the footage: the matte's bottom sits a margin above the frame's.
		const standing = { ...SIZED, height: 0.69 };
		const l = cut(PORTRAIT, { anchor: 'bottom', size: 0.1 }, { subject: standing });
		expect(l.camera.y + 0.8 * l.camera.height).toBeCloseTo(1920 - 54, 1);
		// Just above the edge: no further up than the gap, so the body never floats.
		const close = { ...SIZED, height: 0.885 };
		const k = cut(PORTRAIT, { anchor: 'bottom', size: 0.1 }, { subject: close });
		expect(k.camera.y + k.camera.height).toBeCloseTo(1920, 1);
	});

	it('keeps a speaker too big for the shoulders rule on its side, running off the edge', () => {
		// A head 37 % of the frame: the shoulders cannot both fit. The head stays 0.35 of the
		// frame in from the margin instead of drifting to the middle.
		const left = cut(PORTRAIT, { anchor: 'bottom-left', size: 0.37 });
		expect(head(left).x).toBeCloseTo(54 + 378, 1);
		const right = cut(PORTRAIT, { anchor: 'right', size: 0.37 });
		expect(head(right).x).toBeCloseTo(1080 - 54 - 378, 1);
		// A negative margin moves it further off the edge, the panel keeps its distance.
		const off = cut(PORTRAIT, { anchor: 'bottom-left', size: 0.15, margin: -0.1 });
		expect(head(off).x).toBeCloseTo(-108 + 1.2 * 288, 1);
		expect(off.slots.panel.y + off.slots.panel.height).toBeCloseTo(head(off).top - 54, 1);
	});

	it('takes the shot-wide head size, and a default size per format class', () => {
		const l = cut(PORTRAIT, { anchor: 'bottom' }, { headOf: () => 0.5 });
		expect(0.5 * l.camera.height).toBeCloseTo(0.11 * 1920, 1);
		expect(head(cut(LANDSCAPE, {})).height).toBeCloseTo(0.2 * 1080, 1);
		expect(head(cut(SQUARE, {})).height).toBeCloseTo(0.15 * 1080, 1);
		// The default anchor is the bottom middle.
		expect(head(cut(PORTRAIT, {})).x).toBeCloseTo(540, 1);
		// The margin is a share of the frame's shorter side.
		const wide = cut(PORTRAIT, { anchor: 'bottom-left', size: 0.15, margin: 0.1 });
		expect(head(wide).x).toBeCloseTo(108 + 1.2 * 288, 1);
	});

	it('opens a panel above the speaker in portrait and beside it in landscape', () => {
		const p = cut(PORTRAIT, { anchor: 'bottom-left', size: 0.15 });
		// From the top of the all-platform zone (15 %) to a margin above the head.
		expect(p.slots.panel).toEqual({
			x: 0,
			y: 288,
			width: 1080,
			height: Math.round((head(p).top - 54 - 288) * 100) / 100
		});
		// It slides in from the top edge.
		expect(p.closed.panel).toEqual({ ...p.slots.panel, y: -p.slots.panel.height });
		// The format's safe top, when known.
		const safe = { top: 200, right: 0, bottom: 0, left: 0 };
		expect(cut(PORTRAIT, { anchor: 'bottom', size: 0.15 }, { safe }).slots.panel.y).toBe(200);
		// Landscape, speaker on the left: the panel takes the frame right of the shoulders.
		const l = cut(LANDSCAPE, { anchor: 'bottom-left', size: 0.25 });
		const reach = 54 + 1.2 * 270 + 1.2 * 270 + 54;
		expect(l.slots.panel).toEqual({ x: reach, y: 0, width: 1920 - reach, height: 1080 });
		expect(l.closed.panel).toEqual({ ...l.slots.panel, x: 1920 });
		// Speaker on the right: the panel on the left, sliding in from the left edge.
		const r = cut(LANDSCAPE, { anchor: 'right', size: 0.25 });
		expect(r.slots.panel).toEqual({ x: 0, y: 0, width: 1920 - reach, height: 1080 });
		expect(r.closed.panel.x).toBe(-r.slots.panel.width);
		// Centred in the frame: no panel.
		expect(cut(LANDSCAPE, { anchor: 'center' }).slots).toEqual({});
	});

	it('holds the panel still while the head moves, by the shot-wide head top', () => {
		const a = cut(PORTRAIT, { anchor: 'bottom', size: 0.15 }, { topOf: () => 0.08 });
		const b = cut(
			PORTRAIT,
			{ anchor: 'bottom', size: 0.15 },
			{ topOf: () => 0.08, subject: { ...SIZED, headY: 0.14, headX: 0.55 } }
		);
		expect(a.slots.panel).toEqual(b.slots.panel);
		expect(a.slots.panel.y + a.slots.panel.height).toBeCloseTo(
			a.camera.y + 0.08 * a.camera.height - 54,
			1
		);
	});

	it('frees its panel without footage, so check knows the slot', () => {
		const l = layout('cutout', PORTRAIT, { footage: null, subject: null });
		expect(l.camera).toEqual(l.clip);
		expect(l.slots.panel).toBeDefined();
	});

	it('takes keys on top: the speaker moves and scales about the face, the panel stays', () => {
		const plain = cut(PORTRAIT, { anchor: 'bottom-left', size: 0.15 });
		const keys: ResolvedKey[] = [
			{ frame: 0, values: { scale: 1.2, x: -40, y: 30 }, ease: 'none', mix: 'oklch' }
		];
		const l = shotLayout(
			{ shot: 'cutout', params: { anchor: 'bottom-left', size: 0.15 }, keys },
			input(PORTRAIT, { subject: SIZED }),
			0
		);
		expect(l.camera.width).toBeCloseTo(plain.camera.width * 1.2, 1);
		expect(faceOnStage(l, SIZED).x).toBeCloseTo(faceOnStage(plain, SIZED).x - 40, 1);
		expect(faceOnStage(l, SIZED).y).toBeCloseTo(faceOnStage(plain, SIZED).y + 30, 1);
		expect(l.slots).toEqual(plain.slots);
		expect(l.cutout).toBe(1);
	});

	it('fades the room out and in over a morph', () => {
		const full = layout('full', PORTRAIT, { subject: SIZED });
		const c = cut(PORTRAIT, { anchor: 'bottom-left', size: 0.15 });
		expect(mixLayouts(full, c, 0).cutout).toBe(0);
		expect(mixLayouts(full, c, 0.5).cutout).toBe(0.5);
		expect(mixLayouts(c, full, 1).cutout).toBe(0);
		expect(mixLayouts(full, c, 0.5).fill).toBe('surface');
		expect(mixLayouts(full, layout('punch', PORTRAIT), 0.5).cutout).toBeUndefined();
		expect(defaultMorph('full', 'cutout')).toEqual({ seconds: 0.7, ease: 'expo.inOut' });
		expect(defaultMorph('cutout', 'window')).toEqual({ seconds: 0.7, ease: 'expo.inOut' });
		expect(shotEvents({ ...SPAN, shot: 'cutout' }, 'full')).toEqual([{ kind: 'shot', frame: 6 }]);
		expect(shotEvents({ ...SPAN, shot: 'cutout' }, null)).toEqual([]);
	});

	it('needs a matte and checks its params', () => {
		expect(SHOT_MODULES.cutout.needsMatte).toBe(true);
		expect(SHOT_MODULES.cutout.check!({ anchor: 'bottom-left', size: 0.15, margin: 0 })).toEqual(
			[]
		);
		expect(SHOT_MODULES.cutout.check!({ anchor: 'top', size: 0.9, margin: 1, zoom: 2 })).toEqual([
			'Unknown param "zoom". Known: anchor, size, margin.',
			'"anchor" must be one of bottom-left, bottom, bottom-right, left, center, right (got "top"): where the speaker sits; a body cut by the recording\'s bottom edge belongs on a bottom anchor.',
			'"size" must be a number from 0.03 to 0.5 (got 0.9).',
			'"margin" must be a number from -0.25 to 0.25 (got 1).'
		]);
	});
});

const SPAN: ShotSpan = {
	id: 'c',
	shot: 'full',
	startFrame: 0,
	frames: 30,
	params: {},
	morphFrames: 12,
	morphEase: 'none'
};

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

describe('moves into, out of and between the new shots', () => {
	it('dims into behind fast from the same framing, and moves like a shot change otherwise', () => {
		expect(defaultMorph('full', 'behind')).toEqual({ seconds: 0.3, ease: 'expo.out' });
		expect(defaultMorph('punch', 'behind')).toEqual({ seconds: 0.45, ease: 'power3.inOut' });
		expect(defaultMorph('window', 'behind')).toEqual({ seconds: 0.7, ease: 'expo.inOut' });
		expect(defaultMorph('strip', 'behind')).toEqual({ seconds: 0.7, ease: 'expo.inOut' });
	});

	it('carries the word slot out with the camera instead of leaving it hanging', () => {
		const behind = layout('behind', LANDSCAPE);
		const word = behind.slots.word;
		// Whipping away: the word leaves with the footage, one frame width to the left.
		const whip = layout('whip', LANDSCAPE);
		expect(mixLayouts(behind, whip, 0.5).slots.word).toEqual({ ...word, x: -960 });
		expect(mixLayouts(behind, whip, 1).slots.word).toEqual({ ...word, x: -1920 });
		// Into a window: it shrinks into the window with the footage.
		const win = layout('window', LANDSCAPE);
		const k = win.camera.width / behind.camera.width;
		const end = mixLayouts(behind, win, 1).slots.word;
		expect(end.width).toBeCloseTo(word.width * k, 1);
		expect(end.x).toBeCloseTo(win.camera.x + (word.x - behind.camera.x) * k, 1);
		// And it rides in the same way from a shot without it.
		expect(mixLayouts(win, behind, 0).slots.word).toEqual(end);
	});

	const span = (id: string, shot: string, startFrame: number, params = {}): ShotSpan => ({
		id,
		shot,
		startFrame,
		frames: 30,
		params,
		morphFrames: 12,
		morphEase: 'none'
	});

	it('neither blurs nor makes a whip from a whip into a whip, and check says so', () => {
		const shots = [span('a', 'full', 0), span('w1', 'whip', 30), span('w2', 'whip', 60)];
		for (let f = 60; f < 72; f++)
			expect(shotLayoutAt(shots, f, input(LANDSCAPE)).motionBlur, `frame ${f}`).toBeUndefined();
		expect(shotEvents(shots[2], 'whip')).toEqual([]);
		const p = resolve({
			...structuredClone(PROJECT),
			shots: [
				{ id: 'w1', shot: 'whip', from: 1, until: 2 },
				{ id: 'w2', shot: 'whip', from: 2, until: 3 }
			],
			clips: []
		});
		expect(p.events.filter((e) => e.owner === 'w2')).toEqual([]);
		expect(p.diagnostics).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				item: 'w2',
				message: expect.stringMatching(/^A whip right after a whip does not move/)
			})
		);
	});

	it('puts a whip morph on whole pixels, the card meeting the camera window exactly', () => {
		const shots = [span('a', 'full', 0), span('w', 'whip', 30), span('b', 'full', 60)];
		for (const size of [LANDSCAPE, PORTRAIT, [1001, 563] as [number, number]])
			for (let f = 30; f < 72; f++) {
				const l = shotLayoutAt(shots, f, input(size));
				const { clip, slots } = l;
				for (const v of [clip.x, clip.y, clip.width, clip.height, slots.card.x, slots.card.y])
					expect(Number.isInteger(v), `frame ${f} at ${size}`).toBe(true);
				if (size === PORTRAIT) expect(slots.card.y).toBe(clip.y + clip.height);
				else expect(slots.card.x).toBe(clip.x + clip.width);
			}
		// Other morphs keep their hundredths (and their pixels).
		const strip = [span('a', 'full', 0), span('s', 'strip', 30)];
		expect(Number.isInteger(shotLayoutAt(strip, 35, input([1001, 563])).clip.width)).toBe(false);
	});

	it('warns when a whip and a transition would make two sounds on one move', () => {
		const p = resolve({
			...structuredClone(PROJECT),
			shots: [{ id: 'w', shot: 'whip', from: 1, until: 2, transition: 'push' }],
			clips: []
		});
		expect(p.diagnostics).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				item: 'w',
				message: expect.stringMatching(/^The whip of shot "w" \(1\.00 s\) and the transition/)
			})
		);
		// A whip on its own morph is fine.
		const alone = resolve({
			...structuredClone(PROJECT),
			shots: [{ id: 'w', shot: 'whip', from: 1, until: 2 }],
			clips: []
		});
		expect(alone.diagnostics.filter((d) => d.level === 'warning')).toEqual([]);
	});
});

describe('morph continuity between every pair of shots', () => {
	const NAMES = ['full', 'punch', 'strip', 'window', 'behind', 'whip', 'cutout'];
	const SIZES = [LANDSCAPE, SQUARE, PORTRAIT];
	const rects = (l: ShotLayout) => [l.camera, l.clip];
	const looks = (l: ShotLayout) => [
		l.radius,
		l.ring ?? 0,
		l.lift ?? 0,
		l.room?.dim ?? 0,
		l.room?.blur ?? 0,
		l.cutout ?? 0
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
				message: 'Unknown param "zoom". Known: scale, headroom.'
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

	it('needs a matte on footage a cut transition hands over to the behind shot', () => {
		const json = structuredClone(PROJECT) as Record<string, unknown>;
		Object.assign(json, {
			footage: { ...PROJECT.footage, bare: { src: 'bare.mp4' } },
			cuts: [
				{ source: 'bare', in: 0, out: 1 },
				{ source: 'talk', in: 1, out: 5, transition: 'push' }
			],
			shots: [{ id: 'word', shot: 'behind', from: 1, until: 2 }],
			clips: []
		});
		const inputs = {
			...INPUTS,
			sources: { ...INPUTS.sources, bare: INPUTS.sources!.talk }
		};
		const p = resolveProgram(parseMotionProject(json), inputs);
		expect(p.diagnostics).toContainEqual(
			expect.objectContaining({
				level: 'error',
				item: 'word',
				message: 'The "behind" shot needs a matte, but footage "bare" has none (visualfries matte).'
			})
		);
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

	it('resolves a cutout with a panel clip, and needs a matte for it', () => {
		const json = structuredClone(PROJECT) as typeof PROJECT & { shots: object[] };
		json.shots = [
			{
				id: 'me',
				shot: 'cutout',
				from: 'and three',
				until: 'three points',
				params: { anchor: 'bottom-left' }
			}
		];
		json.clips = [
			{ id: 'list', block: 'blocks/Panel.svelte', from: 'and three', until: 3.6, slot: 'panel' }
		];
		const ok = resolve(json);
		// The panel is free all through the shot: no slot warning.
		expect(ok.diagnostics.filter((d) => d.field === 'slot' || d.level === 'error')).toEqual([]);
		expect(ok.shots.find((s) => s.id === 'me')).toMatchObject({
			shot: 'cutout',
			morphEase: 'expo.inOut'
		});
		json.footage.talk.matte = undefined as unknown as string;
		expect(resolve(json).diagnostics).toContainEqual({
			level: 'error',
			item: 'me',
			field: 'shots',
			message: 'The "cutout" shot needs a matte, but footage "talk" has none (visualfries matte).'
		});
	});
});

describe('the safe part of a slot', () => {
	const formats = [PORTRAIT, LANDSCAPE, SQUARE, [1080, 1350] as [number, number]];
	/** The slot less its insets, in stage pixels: what a block lays out in. */
	const safeBox = (a: SlotArea) => ({
		x: a.x + a.safe.left,
		y: a.y + a.safe.top,
		width: a.width - a.safe.left - a.safe.right,
		height: a.height - a.safe.top - a.safe.bottom
	});
	/** The slot clipped to the format's safe rectangle (empty: zero width or height). */
	const clipped = (r: Rect, f: ReturnType<typeof resolveFormat>) => {
		const x0 = Math.min(Math.max(r.x, f.safe.left), r.x + r.width);
		const y0 = Math.min(Math.max(r.y, f.safe.top), r.y + r.height);
		const x1 = Math.max(Math.min(r.x + r.width, f.width - f.safe.right), x0);
		const y1 = Math.max(Math.min(r.y + r.height, f.height - f.safe.bottom), y0);
		return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
	};

	it('leaves 384 of the 1056 px of a 9:16 strip panel above the bottom inset', () => {
		const f = resolveFormat(PORTRAIT);
		const panel = layout('strip', PORTRAIT).slots.panel;
		expect(slotArea(panel, f)).toEqual({
			...panel,
			safe: { top: 0, right: 300, bottom: 672, left: 120 }
		});
		// The camera at the bottom: the panel on top reaches into the top inset instead.
		const above = layout('strip', PORTRAIT, { params: { side: 'right' } }).slots.panel;
		expect(slotArea(above, f).safe).toEqual({ top: 288, right: 300, bottom: 0, left: 120 });
		expect(slotTokens(slotArea(panel, f))).toEqual({
			'--slot-safe-top': '0px',
			'--slot-safe-right': '300px',
			'--slot-safe-bottom': '672px',
			'--slot-safe-left': '120px'
		});
	});

	it('is the slot clipped to the safe area, for every slot of every shot and format', () => {
		for (const size of formats) {
			const f = resolveFormat(size);
			for (const shot of Object.keys(SHOT_MODULES)) {
				const l = layout(shot, size, { safe: f.safe });
				for (const [name, rect] of [
					...Object.entries(l.slots),
					...Object.entries(l.closed).map(([n, r]) => [`${n} closed`, r] as const)
				]) {
					const box = safeBox(slotArea(rect, f));
					const want = clipped(rect, f);
					const where = `${shot} ${name} ${size.join('×')}`;
					for (const k of ['width', 'height'] as const)
						expect(box[k], where).toBeCloseTo(want[k], 2);
					if (want.width > 0 && want.height > 0) {
						expect(box.x, where).toBeCloseTo(want.x, 2);
						expect(box.y, where).toBeCloseTo(want.y, 2);
					}
				}
			}
		}
	});

	it('is empty for a slot outside the safe area and whole for one inside it', () => {
		const f = resolveFormat(PORTRAIT);
		const gone = slotArea({ x: 0, y: 1920, width: 1080, height: 1056 }, f);
		expect(gone.safe).toEqual({ top: 0, right: 300, bottom: 1056, left: 120 });
		expect(slotArea({ x: 0, y: -300, width: 1080, height: 200 }, f).safe).toMatchObject({
			top: 200,
			bottom: 0
		});
		expect(slotArea({ x: 2000, y: 400, width: 500, height: 500 }, f).safe).toMatchObject({
			left: 0,
			right: 500
		});
		// The portrait window keeps its panel between the top and bottom insets, across the frame.
		const panel = layout('window', PORTRAIT, { safe: f.safe }).slots.panel;
		expect(slotArea(panel, f).safe).toEqual({ top: 0, right: 300, bottom: 0, left: 120 });
	});

	it('follows the slot through the strip opening, frame by frame', () => {
		const f = resolveFormat(PORTRAIT);
		const spans: ShotSpan[] = [
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
				frames: 30,
				params: {},
				morphFrames: 20,
				morphEase: 'expo.inOut'
			}
		];
		const areas = [...Array(22).keys()].map((i) =>
			slotArea(shotLayoutAt(spans, 10 + i, input(PORTRAIT, { safe: f.safe })).slots.panel, f)
		);
		// Closed below the frame: nothing safe; open: the 384 px above the bottom inset.
		expect(safeBox(areas[0]).height).toBe(0);
		expect(areas[21].safe.bottom).toBe(672);
		expect(safeBox(areas[21])).toEqual({ x: 120, y: 864, width: 660, height: 384 });
		// On the way the safe part grows as the panel rises and its bottom edge stays at the inset.
		for (let i = 1; i < areas.length; i++) {
			const box = safeBox(areas[i]);
			expect(box.height).toBeGreaterThanOrEqual(safeBox(areas[i - 1]).height);
			if (box.height > 0) expect(box.y + box.height).toBeCloseTo(1920 - 672, 2);
		}
		expect(new Set(areas.map((a) => a.safe.bottom)).size).toBeGreaterThan(5);
	});
});
