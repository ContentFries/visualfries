import { describe, expect, it } from 'vitest';
import {
	HEADROOM,
	frameOnHead,
	mixLayouts,
	shotLayout,
	type Rect,
	type ShotLayout,
	type ShotSpan
} from '$lib/motion/shots/index.js';
import { headCropMessage, headCrops, shotHead, type FramingData } from '$lib/motion/framing.js';
import type { FootageFrames, SubjectBox } from '$lib/motion/resolve.js';
import type { FootageMap } from '$lib/motion/footage-map.js';
import type { ProgramTransition } from '$lib/motion/program.js';

const PORTRAIT: [number, number] = [1080, 1920];
const LANDSCAPE: [number, number] = [1920, 1080];
const SELFIE_FOOTAGE: [number, number] = [1080, 1920];

/** A handheld selfie: the head fills half the footage's height, its top at 17 %. */
const SELFIE: SubjectBox = {
	x: 0.05,
	y: 0.17,
	width: 0.9,
	height: 0.83,
	headX: 0.5,
	headY: 0.17,
	headHeight: 0.5
};
/** A studio medium shot: a small head well inside landscape footage. */
const STUDIO: SubjectBox = {
	x: 0.3,
	y: 0.12,
	width: 0.4,
	height: 0.88,
	headX: 0.52,
	headY: 0.12,
	headHeight: 0.28
};

type Extra = {
	params?: Record<string, unknown>;
	subject?: SubjectBox | null;
	footage?: [number, number] | null;
	head?: number | null;
	keys?: ShotSpan['keys'];
	headTop?: number | null;
};
const layout = (shot: string, size: [number, number], extra: Extra = {}, f?: number) =>
	shotLayout(
		{ shot, params: extra.params ?? {}, keys: extra.keys },
		{
			cls: size[0] > size[1] ? 'landscape' : size[0] === size[1] ? 'square' : 'portrait',
			size,
			footage: extra.footage === undefined ? SELFIE_FOOTAGE : extra.footage,
			subject: extra.subject === undefined ? SELFIE : extra.subject,
			headOf: extra.head === undefined ? undefined : () => extra.head!,
			headTop: extra.headTop
		},
		f
	);

const headTop = (l: ShotLayout, s: SubjectBox = SELFIE) => l.camera.y + s.headY * l.camera.height;
const chin = (l: ShotLayout, s: SubjectBox = SELFIE) =>
	l.camera.y + (s.headY + s.headHeight!) * l.camera.height;
const covers = (camera: Rect, clip: Rect) =>
	camera.x <= clip.x + 0.01 &&
	camera.y <= clip.y + 0.01 &&
	camera.x + camera.width >= clip.x + clip.width - 0.01 &&
	camera.y + camera.height >= clip.y + clip.height - 0.01;

/** The params of a shot that keeps the head in, plus `more`. */
const H = (more: Record<string, unknown> = {}) => ({ headroom: HEADROOM, ...more });

describe('head-aware framing', () => {
	it('is off by default: the face mark alone, as before', () => {
		for (const shot of ['full', 'strip', 'window', 'punch', 'behind', 'whip']) {
			const l = layout(shot, PORTRAIT, { params: { size: 0.5 } });
			expect(l.backdrop, shot).toBeUndefined();
			expect(covers(l.camera, l.clip), shot).toBe(true);
		}
		const strip = layout('strip', PORTRAIT, { params: { size: 0.5 } });
		expect(strip.camera).toEqual(frameOnHead(strip.clip, SELFIE_FOOTAGE, SELFIE));
		// Even with the shot's head size known, the strip keeps its share.
		expect(layout('strip', PORTRAIT, { head: 0.6 }).clip.height).toBe(864);
		// A key scaling the footage below the window shows the fill, as before.
		const keys: ShotSpan['keys'] = [
			{ frame: 0, values: { scale: 0.8 }, ease: 'none', mix: 'oklab' }
		];
		expect(layout('full', PORTRAIT, { keys }, 0).backdrop).toBeUndefined();
	});

	it('keeps the whole head, with headroom, in a strip too short for the face mark', () => {
		const l = layout('strip', PORTRAIT, { params: H({ size: 0.5 }) });
		expect(l.clip).toEqual({ x: 0, y: 0, width: 1080, height: 960 });
		expect(headTop(l)).toBeGreaterThanOrEqual(HEADROOM * 960 - 0.01);
		expect(chin(l)).toBeLessThanOrEqual(960 + 0.01);
		// A head half the footage tall does not fit 960 px at the strip's width: the camera backs
		// off, the footage leaves the sides open and a blurred copy fills them.
		expect(l.camera.width).toBeLessThan(1080);
		expect(l.camera.x).toBeGreaterThan(0);
		expect(l.camera.x + l.camera.width).toBeLessThan(1080);
		expect(l.backdrop).toBeDefined();
		expect(covers(l.backdrop!.camera, l.clip)).toBe(true);
		// Centred on the footage, a little past the window on every side.
		expect(l.backdrop!.camera.x + l.backdrop!.camera.width / 2).toBeCloseTo(
			l.camera.x + l.camera.width / 2,
			1
		);
		expect(l.backdrop!.camera.x).toBeLessThan(l.clip.x);
		expect(l.backdrop).toMatchObject({ blur: 40, dim: 0.3 });
	});

	it('moves the footage down instead when the head fits the window at covering scale', () => {
		// A narrow strip (480 px): the face mark alone cuts the top of a smaller head.
		const small = { ...SELFIE, headY: 0.3, headHeight: 0.2 };
		const before = layout('strip', PORTRAIT, { subject: small, params: { size: 0.25 } });
		expect(headTop(before, small)).toBeLessThan(0);
		const l = layout('strip', PORTRAIT, { subject: small, params: H({ size: 0.25 }) });
		expect(l.camera.width).toBe(1080);
		expect(headTop(l, small)).toBeCloseTo(HEADROOM * 480, 1);
		expect(covers(l.camera, l.clip)).toBe(true);
		expect(l.backdrop).toBeUndefined();
	});

	it('keeps less headroom rather than leave the window open when the footage has none', () => {
		const touching = { ...SELFIE, headY: 0.01, headHeight: 0.36 };
		const l = layout('strip', PORTRAIT, { subject: touching, params: H({ size: 0.5 }) });
		expect(l.camera.y).toBe(0);
		expect(headTop(l, touching)).toBeGreaterThanOrEqual(0);
		expect(l.backdrop).toBeUndefined();
	});

	it('keeps covering rather than open slivers a few pixels wide', () => {
		// The head needs 2 % less than covering: no seam, the chin touches the edge instead.
		const head = (960 * (1 - HEADROOM)) / 1920 / 0.98;
		const l = layout('strip', PORTRAIT, {
			subject: { ...SELFIE, headHeight: head },
			params: H({ size: 0.5 })
		});
		expect(l.camera.width).toBe(1080);
		expect(l.backdrop).toBeUndefined();
		expect(headTop(l)).toBeGreaterThanOrEqual(0);
	});

	it('keeps the headroom above how high the head gets, not where it is on average', () => {
		const small = { ...SELFIE, headY: 0.3, headHeight: 0.2 };
		const l = layout('strip', PORTRAIT, {
			subject: small,
			headTop: 0.27,
			params: H({ size: 0.25 })
		});
		expect(l.camera.y + 0.27 * l.camera.height).toBeCloseTo(HEADROOM * 480, 1);
		// A lower one never pulls the head up past its own.
		const lower = layout('strip', PORTRAIT, {
			subject: small,
			headTop: 0.4,
			params: H({ size: 0.25 })
		});
		expect(headTop(lower, small)).toBeCloseTo(HEADROOM * 480, 1);
	});

	it('takes headroom as a share of the camera window', () => {
		const roomy = layout('strip', PORTRAIT, { params: { size: 0.5, headroom: 0.15 } });
		expect(headTop(roomy)).toBeCloseTo(0.15 * 960, 0);
	});

	it('leaves a head that already fits where the face mark puts it', () => {
		for (const shot of ['full', 'strip', 'window', 'punch', 'behind']) {
			const on = layout(shot, LANDSCAPE, { footage: [1920, 1080], subject: STUDIO, params: H() });
			const off = layout(shot, LANDSCAPE, { footage: [1920, 1080], subject: STUDIO });
			expect(on.camera, shot).toEqual(off.camera);
			expect(on.backdrop, shot).toBeUndefined();
		}
		// Without a measured head size only the top counts.
		const { headHeight: _, ...unsized } = STUDIO;
		expect(
			layout('window', LANDSCAPE, { footage: [1920, 1080], subject: unsized, params: H() }).camera
		).toEqual(layout('window', LANDSCAPE, { footage: [1920, 1080], subject: STUDIO }).camera);
	});

	it("frames the shot's one head size when the engine gives it, not the frame's", () => {
		const own = layout('strip', PORTRAIT, { params: H({ size: 0.5 }) });
		const shot = layout('strip', PORTRAIT, { params: H({ size: 0.5 }), head: 0.4 });
		// The shot's head (0.4) fits at the strip's width; this frame's own (0.5) would not.
		expect(shot.camera.width).toBe(1080);
		expect(own.camera.width).toBeLessThan(1080);
	});

	it('backs off no further than MIN_FIT of covering: past it the chin is cut, never the top', () => {
		const huge = { ...SELFIE, headY: 0.05, headHeight: 0.95 };
		const l = layout('strip', PORTRAIT, { subject: huge, params: H({ size: 0.3 }) });
		expect(l.camera.width / 1080).toBeCloseTo(0.7, 2);
		expect(headTop(l, huge)).toBeGreaterThanOrEqual(HEADROOM * l.clip.height - 0.01);
	});

	it('goes no closer in a punch than keeps the head in, and never leaves the frame open', () => {
		const big = { ...SELFIE, headY: 0.1, headHeight: 0.75 };
		const l = layout('punch', PORTRAIT, { subject: big, params: H() });
		const fit = (1920 * (1 - HEADROOM)) / (0.75 * 1920);
		expect(l.camera.height / 1920).toBeCloseTo(fit, 2);
		expect(covers(l.camera, l.clip)).toBe(true);
		// Without headroom it punches in all the way.
		expect(layout('punch', PORTRAIT, { subject: big }).camera.height).toBeCloseTo(1920 * 1.45, 0);
	});

	it('grows a portrait strip without size for a tall head, up to 0.55 of the frame', () => {
		// The shot's head 0.46 of 1920 px footage at the strip's width: 883 px plus headroom.
		const grown = layout('strip', PORTRAIT, {
			head: 0.46,
			subject: { ...SELFIE, headHeight: 0.46 },
			params: H()
		});
		expect(grown.clip.height).toBe(941);
		expect(grown.slots.panel.y).toBe(941);
		expect(grown.camera.width).toBe(1080);
		expect(headTop(grown)).toBeGreaterThanOrEqual(HEADROOM * 941 - 0.01);
		// Capped; an explicit size and a frame-by-frame head never move it.
		expect(layout('strip', PORTRAIT, { head: 0.6, params: H() }).clip.height).toBe(1056);
		expect(layout('strip', PORTRAIT, { head: 0.6, params: H({ size: 0.45 }) }).clip.height).toBe(
			864
		);
		expect(layout('strip', PORTRAIT, { params: H() }).clip.height).toBe(864);
		// A small head keeps the class's share; landscape never grows.
		expect(layout('strip', PORTRAIT, { head: 0.2, params: H() }).clip.height).toBe(864);
		expect(layout('strip', LANDSCAPE, { head: 0.6, params: H() }).clip.width).toBe(640);
	});

	it('fits the head in a 4:5 portrait window', () => {
		const l = layout('window', PORTRAIT, { params: H({ aspect: '4:5' }) });
		expect(l.clip.width / l.clip.height).toBeCloseTo(0.8, 2);
		expect(headTop(l)).toBeGreaterThanOrEqual(l.clip.y + HEADROOM * l.clip.height - 0.01);
		expect(chin(l)).toBeLessThanOrEqual(l.clip.y + l.clip.height + 0.01);
	});

	it('backs a portrait selfie off inside a landscape window, with a blurred copy around it', () => {
		const l = layout('window', LANDSCAPE, { params: H() });
		expect(l.camera.width).toBeLessThan(l.clip.width);
		expect(headTop(l)).toBeGreaterThanOrEqual(l.clip.y + HEADROOM * l.clip.height - 0.01);
		expect(l.backdrop).toBeDefined();
		expect(covers(l.backdrop!.camera, l.clip)).toBe(true);
	});

	it('puts a blurred copy under footage a key scales below the window', () => {
		const keys: ShotSpan['keys'] = [
			{ frame: 0, values: { scale: 0.8 }, ease: 'none', mix: 'oklab' }
		];
		const l = layout('full', PORTRAIT, { keys, params: H() }, 0);
		expect(covers(l.camera, l.clip)).toBe(false);
		expect(covers(l.backdrop!.camera, l.clip)).toBe(true);
		expect(
			layout('full', PORTRAIT, { footage: null, keys, params: H() }, 0).backdrop
		).toBeUndefined();
	});

	it('keeps the open edge covered all through a morph to a shot without a backdrop', () => {
		const a = layout('strip', PORTRAIT, { params: H({ size: 0.5 }) });
		const b = layout('full', PORTRAIT);
		expect(a.backdrop).toBeDefined();
		expect(b.backdrop).toBeUndefined();
		for (const t of [0, 0.25, 0.5, 0.75, 1]) {
			const m = mixLayouts(a, b, t);
			expect(m.backdrop, `t=${t}`).toBeDefined();
			expect(covers(m.backdrop!.camera, m.clip), `t=${t}`).toBe(true);
			expect(m.backdrop!.blur).toBe(40);
		}
	});
});

/** One source shown from program frame 0, a box per source frame. */
function program(boxes: (SubjectBox | null)[]) {
	const url = 'http://visualfries.local/footage/';
	const frames: FootageFrames = {
		url,
		first: 0,
		last: boxes.length - 1,
		ranges: [{ url, first: 0, last: boxes.length - 1, boxes }],
		total: boxes.length,
		width: 1080,
		height: 1920,
		startFrame: 0,
		subject: true
	};
	const map: FootageMap = {
		frames: boxes.length,
		totals: { talk: boxes.length },
		spans: [
			{ owner: 'c', kind: 'cut', source: 'talk', startFrame: 0, frames: boxes.length, srcIn: 0 }
		],
		windows: []
	};
	return { footage: { talk: frames }, map };
}

const span = (shot: string, extra: Partial<ShotSpan> = {}): ShotSpan => ({
	id: 's',
	shot,
	startFrame: 0,
	frames: 60,
	params: {},
	morphFrames: 0,
	morphEase: 'none',
	...extra
});

const data = (
	shots: ShotSpan[],
	boxes: (SubjectBox | null)[]
): FramingData & { transitions: ProgramTransition[] } => {
	const { footage, map } = program(boxes);
	return {
		fps: 30,
		size: PORTRAIT,
		cls: 'portrait',
		format: {
			class: 'portrait',
			aspect: '9:16',
			width: 1080,
			height: 1920,
			zone: 'all',
			safe: { top: 288, right: 300, bottom: 672, left: 120, notchY: 840, rightUpper: 192 }
		},
		footage,
		footageMap: map,
		shots,
		transitions: []
	};
};

describe('shotHead', () => {
	it("takes a high percentile of the matte's head over the shot, skipping frames without one", () => {
		const boxes = Array.from({ length: 100 }, (_, i) =>
			i === 50 ? null : { ...SELFIE, headHeight: 0.3 + (i % 10) / 100 }
		);
		const { footage, map } = program(boxes);
		expect(shotHead({ startFrame: 0, frames: 100 }, map, footage)).toBeCloseTo(0.38, 5);
		// Just the shot's own frames.
		expect(shotHead({ startFrame: 0, frames: 5 }, map, footage)).toBeCloseTo(0.34, 5);
		expect(shotHead({ startFrame: 0, frames: 100 }, null, footage)).toBeNull();
		const { headHeight: _, ...unsized } = SELFIE;
		const old = program(Array.from({ length: 10 }, () => unsized));
		expect(shotHead({ startFrame: 0, frames: 10 }, old.map, old.footage)).toBeNull();
	});
});

describe('head crop check', () => {
	const boxes = Array.from({ length: 60 }, () => SELFIE);

	it('is quiet when the framing keeps the head in', () => {
		expect(headCrops(data([span('strip', { params: { size: 0.5 } })], boxes))).toEqual([]);
		expect(headCrops(data([span('window')], boxes))).toEqual([]);
		expect(headCrops(data([span('window', { params: H({ aspect: '4:5' }) })], boxes))).toEqual([]);
	});

	it('finds a key that pushes the head out of the window, with where and how much', () => {
		const keys: ShotSpan['keys'] = [
			{ frame: 0, values: { scale: 1, y: 0 }, ease: 'none', mix: 'oklab' },
			{ frame: 30, values: { scale: 1.3, y: -120 }, ease: 'none', mix: 'oklab' }
		];
		const shot = span('strip', { id: 'list', params: { size: 0.5 }, keys });
		const crops = headCrops(data([shot], boxes)).filter((c) => c.edge === 'top');
		expect(crops).toHaveLength(1);
		const [crop] = crops;
		expect(crop.shot).toBe('list');
		expect(crop.from).toBeGreaterThan(0);
		expect(crop.to).toBe(59);
		expect(crop.pixels).toBeGreaterThan(10);
		expect(crop.share).toBeGreaterThan(0);
		expect(headCropMessage(crop, shot, 30)).toMatch(
			/^Shot "list" \(strip\) cuts off the top of the speaker's head \(by up to \d+ px, \d+ % of the head\) from \d+\.\d\d s to 2\.00 s, its keys included\. If the crop is not meant, try: set "headroom": 0\.06 \(keeps the whole head in, backing off over a blurred copy when it must\); a larger "size"; a lower "scale" key; a "y" key further down \(a larger number\)\. Look at a still of the shot before deciding\.$/
		);
		// Headroom still applies under keys: the warning is what is left to the creator.
		const roomy = { ...shot, params: { size: 0.5, headroom: 0.06 } };
		const [left] = headCrops(data([roomy], boxes)).filter((c) => c.edge === 'top');
		expect(headCropMessage(left, roomy, 30)).not.toContain('"headroom"');
	});

	it("counts a head touching the top edge, from the frame's own matte", () => {
		// The smoothed subject the framing follows lags a quick lean up; the raw matte does not.
		const lean = Array.from({ length: 60 }, (_, i) =>
			i >= 30 && i < 40 ? { ...SELFIE, headY: 0.115 } : SELFIE
		);
		const shot = span('strip', { params: { size: 0.4 } });
		const [crop] = headCrops(data([shot], lean)).filter((c) => c.edge === 'top');
		expect(crop).toMatchObject({ edge: 'top', from: 30, to: 39 });
		expect(headCropMessage(crop, shot, 30)).toContain(
			"leaves no room above the speaker's head (it touches the window's top edge) from 1.00 s to 1.33 s"
		);
		// With headroom the framing makes room for how high the head gets around each frame.
		const roomy = span('strip', { params: { size: 0.4, headroom: 0.06 } });
		expect(headCrops(data([roomy], lean)).filter((c) => c.edge === 'top')).toEqual([]);
	});

	it('finds a face cut off at the bottom of a wide window, and suggests a taller aspect', () => {
		const shot = span('window', { id: 'end' });
		const wide = data([shot], boxes);
		const landscape = { ...wide, size: LANDSCAPE, cls: 'landscape' as const };
		const [crop] = headCrops(landscape).filter((c) => c.edge === 'face');
		expect(crop).toMatchObject({ shot: 'end', edge: 'face', from: 0, to: 59 });
		expect(crop.share).toBeGreaterThan(0.25);
		const message = headCropMessage(crop, shot, 30);
		expect(message).toMatch(
			/^Shot "end" \(window\) cuts the speaker's face off at the bottom \(up to \d+ px of the head below the window, \d+ % of the head\) from 0\.00 s to 2\.00 s/
		);
		expect(message).toContain('a taller "aspect" such as "4:5"');
		expect(message).toContain('a lower "zoom"');
		const tall = { ...shot, params: { aspect: '4:5', headroom: 0.06 } };
		expect(headCropMessage(crop, tall, 30)).not.toContain('"aspect"');
		// With a 4:5 window and headroom the head fits.
		expect(
			headCrops({ ...landscape, shots: [{ ...tall, params: { ...tall.params, size: 0.38 } }] })
		).toEqual([]);
	});

	it('ignores a crop shorter than a few frames', () => {
		const near = { ...SELFIE, headY: 0.3, headHeight: 0.2 };
		const shot = span('strip', { params: { size: 0.25 }, frames: 4 });
		expect(
			headCrops(
				data(
					[shot],
					Array.from({ length: 60 }, () => near)
				)
			)
		).toEqual([]);
	});

	it('skips morph frames and limits itself to a range', () => {
		const near = { ...SELFIE, headY: 0.3, headHeight: 0.2 };
		const shot = span('strip', { params: { size: 0.25 }, morphFrames: 10 });
		const all = Array.from({ length: 60 }, () => near);
		expect(headCrops(data([shot], all))[0].from).toBe(10);
		expect(headCrops(data([shot], all), { startFrame: 30, frames: 10 })[0]).toMatchObject({
			from: 30,
			to: 39
		});
	});
});
