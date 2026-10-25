import { flushSync, mount, unmount, type Component } from 'svelte';
import {
	Clip,
	MOTION_CONTEXT_KEY,
	registerClipRoot,
	type ClipController
} from './runtime.svelte.js';
import { brandTokens } from './brand.js';
import { formatTokens } from './format.js';
import { seekTimeline } from './seek.js';
import { programFootageAt, transitionSidesAt, type FootageView } from './footage-map.js';
import { sourceFrameUrl, sourceSubjectBox } from './footage.js';
import { programFraming } from './framing.js';
import type { ProgramTransition } from './program.js';
import { clipFrameAt, type StageClip, type StageSegment } from './segments.js';
import { shotModule, type Rect, type ShotLayout, type ShotSpan } from './shots/index.js';
import { facePoint } from './shots/layout.js';
import { createTransitionPlayer } from './transitions/player.js';
import type { Point } from './transitions/contract.js';
import { keyTracks, placementTransform, type Animatable, type KeyTracks } from './keys.js';
import { applyRegion, drawRegion, drawRim, loadPicture } from './subject-canvas.js';
import type { CameraView, HoleSource } from './runtime.svelte.js';
import {
	BEHIND_TEXT_SECONDS,
	BEHIND_TEXT_SHARE,
	FACE_TEXT_SECONDS,
	FACE_TEXT_SHARE,
	TEXT_OPACITY,
	clearOfSpeaker,
	faceCovered,
	facePoints,
	headOnStage,
	intersect,
	textBehindMessage,
	textOverFaceMessage,
	type SpeakerMask
} from './text-over-face.js';
import {
	CUT_SHARE,
	FIT_SECONDS,
	SAFE_TEXT_SHARE,
	addReach,
	contentReach,
	cutShare,
	emptyPart,
	frameFitMessage,
	newReach,
	outsideSafe,
	reachBox,
	safeBoxes,
	type FitFinding,
	type Reach
} from './frame-fit.js';
import { PANEL_TEXT_SHARE, captionsInMoveMessage, moveAtStart, shotMoves } from './shot-moves.js';

/**
 * The program's layer tree on one stage, for a segment of the program:
 *
 *   #vf-stage
 *     .vf-side[a]  .vf-fill             style fill around a framed shot
 *                  .vf-picture          the footage as one picture (a shot's `opacity` key fades it):
 *                    .vf-plate          the shot's camera window:
 *                      img.vf-backdrop  the same footage blurred, where the footage leaves it open
 *                      img              footage the cut list shows
 *                    .vf-behind         clips with `layer: "behind"` (frame space)
 *                    .vf-subject > img  the subject cut out by its matte, over the behind clips
 *     .vf-side[b]  the same, for the incoming side of a cut or shot transition
 *     .vf-under    one element per transition, above both sides and below the front clips
 *     .vf-clips    front clips in project order; a slotted clip follows its slot
 *     .vf-overlay  one element per transition, above everything
 *
 * Every clip mounts once in its own root with its own controller. A clip off screen is hidden
 * and not seeked; inside a transition window its edge frame holds (see `clipFrameAt`). The shot
 * layout of every frame comes from the shot engine: where the camera window and the footage in
 * it sit, which slots are open.
 *
 * Inside a cut or shot transition window side a shows the outgoing picture and side b the
 * incoming one (see `transitionSidesAt`); clips that end on the cut leave with side a and clips
 * that start on it arrive with side b. The transition engine moves, hides or covers them.
 *
 * Keys: a shot's keys move its camera (see `keyCamera`); a clip's placement keys move a
 * `.vf-keys` box between its root and the block (the root stays the transitions'), and its
 * props keys set `clip.props` on every seek, which redraws what the block reads from them.
 *
 * Shot looks: a window's ring and shadow sit on `.vf-plate`; a dimmed room filters the plate's
 * image (the subject is then drawn over it, its edge dimmed too); motion blur filters the
 * plate's and the subject's images, `.vf-behind` and, in a segment with a shot that blurs its
 * moves, a `.vf-streak` box between a slotted clip's root and the block. Inside a transition
 * window there is no motion blur: the transition owns the move. The SVG filters are built on
 * first use.
 */

type Mounted = {
	data: StageClip;
	controller: ClipController;
	instance: ReturnType<typeof mount>;
	/** Clip frame shown at the current program frame; null: hidden. */
	shown: number | null;
	/** The clip's keys as tracks. */
	tracks: KeyTracks;
	/** Inside the root, around the block: what placement keys move (null without them). */
	keyed: HTMLDivElement | null;
	/** Inside the root of a slotted clip: what a whip's motion blur filters (null without). */
	streak: HTMLDivElement | null;
};

/** Whether the speaker is drawn at each of a list of points (stage pixels); null: unknown. */
type Sampler = (points: { x: number; y: number }[]) => boolean[] | null;

type Picture = { box: HTMLDivElement; img: HTMLImageElement; back?: HTMLImageElement };

type Side = {
	el: HTMLDivElement;
	fill: HTMLDivElement;
	/** Plate, behind clips and subject: faded together, so the subject never doubles the plate. */
	picture: HTMLDivElement;
	plate: Picture;
	behind: HTMLDivElement;
	subject: Picture;
	name: 'a' | 'b';
	/** Made on the first hole (see `<Subject hole>`): the clean plate in the holes, under `behind`. */
	hole?: Sheet;
	/** The subject with the holes cut out, and their rims, over `behind`. */
	cut?: Sheet;
};

/** A canvas of footage size in its own clipped box (the camera window), like a `Picture`. */
type Sheet = { box: HTMLDivElement; canvas: HTMLCanvasElement };

/** What one side shows at a frame. */
type SideView = { view: FootageView | null; layout: ShotLayout };

/** Everything a program frame decides before anything is drawn. */
type Plan = {
	f: number;
	/** The cut or shot transition on screen; null outside every drawn window. */
	staged: ProgramTransition | null;
	a: SideView;
	/** Null: side b is hidden. */
	b: SideView | null;
	/** Per mounted clip: the clip frame shown (null: hidden), its slot rect, the side it rides. */
	clips: { local: number | null; slot: Rect | null; side: 'a' | 'b' | null }[];
	/** Motion blur of the clips in slots; null: none. */
	streak: { x: number; y: number } | null;
};

/**
 * The fill around a framed shot: the brand's surface; without a brand, the project background
 * (the brand's neutral surface when there is none either).
 */
const surface = (seg: StageSegment) =>
	seg.brand.neutral ? (seg.background ?? seg.brand.colors.surface) : 'var(--brand-surface)';

/** Brand tokens, safe insets and `data-format`, as the clip stage sets them on a clip's root. */
function applyLook(el: HTMLElement, seg: StageSegment) {
	el.dataset.format = seg.format.class;
	for (const [name, value] of Object.entries({
		...brandTokens(seg.brand),
		...formatTokens(seg.format)
	}))
		el.style.setProperty(name, value);
}

export type ProgramScene = {
	readonly fps: number;
	/** `useReady` promises of every clip. */
	readonly ready: Promise<unknown>[];
	/** Sets every clip's time for program frame `f`, shows and hides roots, seeks timelines. */
	seek(f: number): void;
	/** Draws the footage and runs `useFrame` of the clips on screen; resolves once all settle. */
	draw(f: number): Promise<void>;
	/** What `check` should warn about at the frame last drawn (see `pushGaps`). */
	warnings(f: number): string[];
	/**
	 * Measures what `check` cannot see from the plan at the frame last drawn (frames checked in
	 * ascending order): subject region layers whose region holds none of the speaker for half a
	 * second or more, text that covers the speaker's face (see `faceText`), content that does not
	 * fit the frame (see `frameFit`), captions drawn over a shot move (see `movingCaptions`) and
	 * text behind the speaker that the speaker covers (see `textBehind`).
	 */
	measure(f: number): Promise<string[]>;
	/**
	 * A holdout insert's second pass: `true` shows the subject alone (as drawn at the frame last
	 * drawn) and returns whether there is one to cut out; `false` shows the clips again.
	 */
	holdout(on: boolean): boolean;
	destroy(): void;
};

const LAYER = 'position:absolute;inset:0';
/**
 * A layer whose children stack inside it: a block's `z-index` (or a blend mode) cannot lift it
 * out of its clip, past the subject or over the transition overlay.
 */
const ISOLATED = `${LAYER};isolation:isolate`;

function layer(parent: HTMLElement, className: string, style = LAYER): HTMLDivElement {
	const el = document.createElement('div');
	el.className = className;
	el.style.cssText = style;
	parent.appendChild(el);
	return el;
}

/**
 * An `<img>` in its own clipped box (the camera window), with `backdrop` a second one under it
 * for a blurred copy; empty images stay hidden.
 */
function picture(parent: HTMLElement, className: string, backdrop = false): Picture {
	// Placed by `frameBox` alone: an `inset` here would fight its left and top.
	const box = layer(parent, className, 'position:absolute;overflow:hidden;isolation:isolate');
	const image = () => {
		const img = document.createElement('img');
		img.alt = '';
		img.draggable = false;
		img.style.cssText = 'position:absolute;display:none;max-width:none';
		box.appendChild(img);
		return img;
	};
	const back = backdrop ? image() : undefined;
	if (back) back.className = 'vf-backdrop';
	return { box, img: image(), back };
}

function side(stage: HTMLElement, name: 'a' | 'b'): Side {
	const el = layer(stage, 'vf-side', ISOLATED);
	el.dataset.side = name;
	const fill = layer(el, 'vf-fill');
	const group = layer(el, 'vf-picture');
	const plate = picture(group, 'vf-plate', true);
	// Painted over their whole box (see `TransitionSides`).
	for (const solid of [el, fill, plate.box]) solid.dataset.solid = '';
	const behind = layer(group, 'vf-behind', ISOLATED);
	const subject = picture(group, 'vf-subject');
	return { el, fill, picture: group, plate, behind, subject, name };
}

const SVG = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(
	parent: Element,
	tag: K,
	attrs: Record<string, string>
): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG, tag);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	parent.appendChild(el);
	return el;
}

/** Motion blur clips' content gets, of the footage's (the approved look). */
const CLIP_STREAK = 0.6;
/** Below this a blur is not drawn at all. */
const BLUR_MIN = 0.4;
/**
 * In a dimmed room the subject's semi-transparent edge (which carries some of the room) is
 * dimmed with it, by `1 - alpha^EDGE`: the matte's fringe never outlines the speaker.
 */
const EDGE = 3;
/** Alpha kept as fully opaque after a blur: anything the blur reached at all. */
const OPAQUE = `0${' 1'.repeat(15)}`;

type Amount = { x: number; y: number };
const seen = (a: Amount | null | undefined): a is Amount =>
	!!a && (a.x >= BLUR_MIN || a.y >= BLUR_MIN);
const deviation = (a: Amount) => `${a.x.toFixed(2)} ${a.y.toFixed(2)}`;

function region(filter: SVGFilterElement, inset: boolean) {
	const r = inset
		? { x: '0', y: '0', width: '100%', height: '100%' }
		: { x: '-30%', y: '-30%', width: '160%', height: '160%' };
	for (const [k, v] of Object.entries(r)) filter.setAttribute(k, v);
}

/**
 * Motion blur that keeps a solid surface solid: the blur smears past the element's shape into
 * transparency, and over it the element's own shape is drawn again, opaque where it was, in the
 * blurred colours. Two surfaces meeting at a seam (the footage and a card) never let what is
 * under them show through, and text keeps a readable core.
 */
function streakSteps(filter: SVGFilterElement, input: string) {
	const blur = svgEl(filter, 'feGaussianBlur', { in: input, stdDeviation: '0 0', result: 'blur' });
	const solid = svgEl(filter, 'feComponentTransfer', { in: 'blur', result: 'solid' });
	svgEl(solid, 'feFuncA', { type: 'discrete', tableValues: OPAQUE });
	svgEl(filter, 'feComposite', {
		in: 'solid',
		in2: 'SourceAlpha',
		operator: 'in',
		result: 'core'
	});
	const merge = svgEl(filter, 'feMerge', {});
	svgEl(merge, 'feMergeNode', { in: 'blur' });
	svgEl(merge, 'feMergeNode', { in: 'core' });
	return blur;
}

/**
 * SVG filters of shot looks, each built on first use in a hidden `<svg>` on the stage and
 * updated per frame:
 * - `plate`: the footage plate desaturated and darkened (a dimmed room), blurred (the room's
 *   blur and the motion blur together) inside its own box with its edges kept opaque, so
 *   neither the frame edge nor a seam ever darkens;
 * - `subject`: the cut-out's edge dimmed with the room, and motion blur (see `streakSteps`);
 * - `streak`: motion blur alone, for the clips behind the subject and in slots.
 */
let scenes = 0;

function shotFilters(stage: HTMLElement) {
	// Ids unique per scene: two stages on one page never use each other's filters.
	const scope = ++scenes;
	let svg: SVGSVGElement | null = null;
	const built = new Map<string, Record<string, SVGElement>>();
	function get(name: string, build: (filter: SVGFilterElement) => Record<string, SVGElement>) {
		const id = `${name}-${scope}`;
		let parts = built.get(id);
		if (!parts) {
			svg ??= svgEl(stage, 'svg', {
				width: '0',
				height: '0',
				style: 'position:absolute;left:0;top:0'
			});
			const filter = svgEl(svg, 'filter', { id, 'color-interpolation-filters': 'sRGB' });
			parts = build(filter);
			built.set(id, parts);
		}
		return { id, parts };
	}
	return {
		dispose() {
			svg?.remove();
		},
		/**
		 * `filter` value for the plate (or its backdrop, `side` `a-back`) of a room and a motion
		 * blur; '' when it is untouched.
		 */
		plate(side: string, room: ShotLayout['room'], streak: Amount | undefined): string {
			const dim = room && room.dim > 0 ? room.dim : 0;
			const r = room?.blur ?? 0;
			const blur = { x: Math.hypot(r, streak?.x ?? 0), y: Math.hypot(r, streak?.y ?? 0) };
			const blurred = seen(blur);
			if (!dim && !blurred) return '';
			const { id, parts } = get(`vf-plate-${side}-${blurred ? 'b' : 'n'}`, (filter) => {
				region(filter, true);
				const saturate = svgEl(filter, 'feColorMatrix', { type: 'saturate', values: '1' });
				const light = svgEl(filter, 'feComponentTransfer', {});
				const [r, g, b] = (['feFuncR', 'feFuncG', 'feFuncB'] as const).map((tag) =>
					svgEl(light, tag, { type: 'linear', slope: '1', intercept: '0' })
				);
				const out: Record<string, SVGElement> = { saturate, r, g, b };
				if (blurred) {
					out.blur = svgEl(filter, 'feGaussianBlur', { stdDeviation: '0 0' });
					// Opaque wherever the blur reached at all: a corner keeps only a quarter of
					// its alpha, and anything below that would round it off.
					const opaque = svgEl(filter, 'feComponentTransfer', {});
					svgEl(opaque, 'feFuncA', { type: 'discrete', tableValues: OPAQUE });
				}
				return out;
			});
			parts.saturate.setAttribute('values', (1 - 0.9 * dim).toFixed(3));
			for (const k of ['r', 'g', 'b']) parts[k].setAttribute('slope', (1 - dim).toFixed(3));
			if (blurred) parts.blur.setAttribute('stdDeviation', deviation(blur));
			return `url(#${id})`;
		},
		/** `filter` value for the subject cut-out in a room dimmed by `dim` and a motion blur. */
		subject(side: 'a' | 'b', dim: number, streak: Amount | undefined): string {
			const blurred = seen(streak);
			if (dim <= 0 && !blurred) return '';
			const edged = dim > 0;
			const key = `${edged ? 'e' : ''}${blurred ? 'b' : ''}`;
			const { id, parts } = get(`vf-subject-${side}-${key}`, (filter) => {
				const out: Record<string, SVGElement> = {};
				region(filter, !blurred);
				if (edged) {
					// alpha^EDGE in every colour channel, opaque…
					svgEl(filter, 'feColorMatrix', {
						in: 'SourceAlpha',
						type: 'matrix',
						values: '0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1',
						result: 'alpha'
					});
					const curve = svgEl(filter, 'feComponentTransfer', { in: 'alpha', result: 'weight' });
					for (const tag of ['feFuncR', 'feFuncG', 'feFuncB'] as const)
						svgEl(curve, tag, {
							type: 'gamma',
							amplitude: '1',
							exponent: String(EDGE),
							offset: '0'
						});
					// …so colour × (1 − dim + dim × weight), alpha unchanged.
					out.edge = svgEl(filter, 'feComposite', {
						in: 'SourceGraphic',
						in2: 'weight',
						operator: 'arithmetic',
						k1: '0',
						k2: '1',
						k3: '0',
						k4: '0',
						result: 'lit'
					});
				}
				if (blurred) out.blur = streakSteps(filter, edged ? 'lit' : 'SourceGraphic');
				return out;
			});
			if (edged) {
				parts.edge.setAttribute('k1', dim.toFixed(3));
				parts.edge.setAttribute('k2', (1 - dim).toFixed(3));
			}
			if (blurred) parts.blur.setAttribute('stdDeviation', deviation(streak!));
			return `url(#${id})`;
		},
		/** `filter` value for a motion blur of `amount` (px per axis); '' below the visible. */
		streak(name: string, amount: Amount | null | undefined): string {
			if (!seen(amount)) return '';
			const { id, parts } = get(`vf-streak-${name}`, (filter) => {
				region(filter, false);
				return { blur: streakSteps(filter, 'SourceGraphic') };
			});
			parts.blur.setAttribute('stdDeviation', deviation(amount));
			return `url(#${id})`;
		}
	};
}

/** The ring and the shadow of a camera window, as a `box-shadow`; '' without either. */
function windowShadow(layout: ShotLayout, size: [number, number]): string {
	const parts: string[] = [];
	if (layout.ring) parts.push(`0 0 0 ${layout.ring}px var(--brand-primary)`);
	if (layout.lift) {
		const k = Math.min(...size) / 1080;
		const r = (v: number) => Math.round(v * 100) / 100;
		parts.push(
			`0 ${r(24 * k * layout.lift)}px ${r(64 * k)}px rgba(0, 0, 0, ${r(0.55 * layout.lift)})`
		);
	}
	return parts.join(', ');
}

/** Places `el` at `rect` (absolute, stage pixels); writes only what changed. */
function place(el: HTMLElement, rect: Rect) {
	const box = `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
	if (el.dataset.box === box) return;
	el.dataset.box = box;
	Object.assign(el.style, {
		left: `${rect.x}px`,
		top: `${rect.y}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`
	});
}

/** The camera window: clips the picture to `layout.clip`, footage placed at `layout.camera`. */
function frameBox(pic: Picture, layout: ShotLayout) {
	const { clip, camera, radius, turn } = layout;
	place(pic.box, clip);
	pic.box.style.borderRadius = radius ? `${radius}px` : '';
	place(pic.img, {
		x: camera.x - clip.x,
		y: camera.y - clip.y,
		width: camera.width,
		height: camera.height
	});
	pic.img.style.transform = turn ? `rotate(${turn.rotation}deg)` : '';
	pic.img.style.transformOrigin = turn
		? `${turn.pivot.x - camera.x}px ${turn.pivot.y - camera.y}px`
		: '';
}

/** A hole layer of `s`, made on first use and inserted before `before` (or last). */
function sheet(s: Side, kind: 'hole' | 'cut', before: Element | null): Sheet {
	const made = s[kind];
	if (made) return made;
	const box = document.createElement('div');
	box.className = `vf-${kind}`;
	box.style.cssText = 'position:absolute;overflow:hidden;isolation:isolate';
	const canvas = document.createElement('canvas');
	canvas.style.cssText = 'position:absolute;max-width:none';
	box.appendChild(canvas);
	s.picture.insertBefore(box, before);
	return (s[kind] = { box, canvas });
}

/**
 * Places a sheet like `frameBox` places a picture. The canvas keeps its own size (`w` × `h`, the
 * footage's) and is scaled onto the camera with a transform: HTML-in-Canvas draws a canvas at
 * its own size whatever its CSS width and height say, but follows its transform.
 */
function frameSheet(sheet: Sheet, layout: ShotLayout, w: number, h: number) {
	const { clip, camera, radius, turn } = layout;
	place(sheet.box, clip);
	sheet.box.style.borderRadius = radius ? `${radius}px` : '';
	place(sheet.canvas, { x: camera.x - clip.x, y: camera.y - clip.y, width: w, height: h });
	const scale = `scale(${camera.width / w},${camera.height / h})`;
	const pivot = turn && { x: turn.pivot.x - camera.x, y: turn.pivot.y - camera.y };
	sheet.canvas.style.transformOrigin = '0 0';
	sheet.canvas.style.transform = pivot
		? `translate(${pivot.x}px,${pivot.y}px) rotate(${turn.rotation}deg) translate(${-pivot.x}px,${-pivot.y}px) ${scale}`
		: scale;
}

/** A sheet's 2D context, cleared, at `w` × `h`. */
function blank(sheet: Sheet, w: number, h: number): CanvasRenderingContext2D {
	if (sheet.canvas.width !== w || sheet.canvas.height !== h) {
		sheet.canvas.width = w;
		sheet.canvas.height = h;
	}
	const ctx = sheet.canvas.getContext('2d')!;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, w, h);
	return ctx;
}

/** Where a side's camera shows the footage, as a clip sees it (`clip.camera`). */
function cameraView(
	layout: ShotLayout,
	source: { width: number; height: number },
	slot: Rect | null
): CameraView {
	const ox = slot?.x ?? 0;
	const oy = slot?.y ?? 0;
	const { camera, turn } = layout;
	return {
		x: camera.x - ox,
		y: camera.y - oy,
		width: camera.width,
		height: camera.height,
		rotation: turn?.rotation ?? 0,
		pivot: turn
			? { x: turn.pivot.x - ox, y: turn.pivot.y - oy }
			: { x: camera.x - ox + camera.width / 2, y: camera.y - oy + camera.height / 2 },
		source: { width: source.width, height: source.height }
	};
}

const sameCamera = (a: CameraView | null, b: CameraView | null) =>
	a === b || (!!a && !!b && JSON.stringify(a) === JSON.stringify(b));

/** Shows `url` in `img`; resolves once the image is decoded. */
function show(img: HTMLImageElement, url: string): Promise<unknown> | null {
	img.style.display = '';
	if (img.src === url) return null;
	img.src = url;
	return img.decode();
}

const hide = (img: HTMLImageElement) => (img.style.display = 'none');

function clipError(id: string, error: unknown): Error {
	const message = (error as Error)?.message ?? String(error);
	return new Error(message.startsWith(`Clip "${id}"`) ? message : `Clip "${id}": ${message}`);
}

const endOf = (s: { startFrame: number; frames: number }) => s.startFrame + s.frames;
const px = (v: number) => Math.round(v * 100) / 100;
/**
 * The eyes below the top of the head the matte gives, in fractions of the footage height
 * (measured 0.21 and 0.24 on a medium and a close shot; the shots' face point, 0.1 down, is the
 * forehead).
 */
const EYES_DROP = 0.2;
const FULL = { shot: 'full', params: {} };
/** `frameFit` measures at most every this many frames: what it reads is slow to change. */
const FIT_STRIDE = 5;
/**
 * `textBehind` measures a clip at most every this many frames: reading the speaker's picture
 * back costs about 15 ms a frame.
 */
const BEHIND_STRIDE = 5;
/** Text boxes are sampled about every this many stage pixels (see `textPoints`). */
const TEXT_STEP = 16;
/** The subject picture is read back at this fraction of its size (see `textBehind`). */
const READ_SCALE = 0.25;
/** The block of the built-in captions. */
const CAPTIONS = '@visualfries/captions';
/** A region holding less of the subject than this share counts as empty. */
const EMPTY_SHARE = 0.002;

/**
 * Builds the layer tree in `stage` and mounts every clip of the segment. `animatable` holds what
 * each block exports as `animatable`; a keyed prop missing there is an error of the clip.
 */
export function createProgramScene(
	stage: HTMLDivElement,
	seg: StageSegment,
	blocks: Record<string, Component<Record<string, unknown>>>,
	animatable: Record<string, Animatable | undefined> = {}
): ProgramScene {
	// On the stage too: fills and transition overlays use the brand's colours.
	applyLook(stage, seg);
	// HTML-in-Canvas leaves a 2D canvas out of the captured frame unless it sits at the stage's
	// top left corner or contains its own paint: every canvas the stage, a hole or a block draws
	// contains it (a `<canvas layoutsubtree>` is left alone: it samples its own children).
	const canvases = document.createElement('style');
	canvases.textContent = '#vf-stage canvas:not([layoutsubtree]){contain:paint}';
	stage.appendChild(canvases);
	const a = side(stage, 'a');
	// Side b shows only inside a cut or shot transition window.
	const b = side(stage, 'b');
	b.el.style.display = 'none';
	// An insert draws its clip alone: the footage picture stays out, the subject only shows in
	// the holdout pass.
	if (seg.insert)
		for (const s of [a, b]) {
			s.fill.style.visibility = 'hidden';
			s.plate.box.style.visibility = 'hidden';
			s.subject.box.style.opacity = '0';
		}
	const under = layer(stage, 'vf-under', `${ISOLATED};pointer-events:none`);
	const front = layer(stage, 'vf-clips', ISOLATED);
	const overlay = layer(stage, 'vf-overlay', `${ISOLATED};pointer-events:none`);
	const player = createTransitionPlayer(overlay, seg.transitions, {
		size: seg.size,
		cls: seg.cls,
		under
	});
	const filters = shotFilters(stage);
	// Slotted clips get a box for motion blur only where a shot blurs its moves.
	const streaks = seg.shots.some((s) => shotModule(s.shot)?.blur);

	const mounted: Mounted[] = [];
	const ready: Promise<unknown>[] = [];
	try {
		for (const data of seg.clips) {
			const Block = blocks[data.block];
			if (!Block) throw new Error(`Block "${data.block}" is not in the bundle.`);
			// A slotted root is placed on every seek, where the shot puts its slot.
			const root = layer(
				data.layer === 'behind' ? a.behind : front,
				'vf-clip',
				data.slot
					? `position:absolute;left:0;top:0;width:${seg.size[0]}px;height:${seg.size[1]}px;isolation:isolate`
					: ISOLATED
			);
			root.dataset.clip = data.id;
			applyLook(root, seg);
			let tracks: KeyTracks;
			try {
				tracks = keyTracks(data.keys, {
					size: seg.size,
					animatable: animatable[data.block] ?? {},
					block: data.block
				});
			} catch (error) {
				throw clipError(data.id, error);
			}
			const streak = data.slot && streaks ? layer(root, 'vf-streak') : null;
			const keyed = tracks.placement ? layer(streak ?? root, 'vf-keys') : null;
			// Roots stay visible until the first seek: blocks may measure text when they mount.
			// Keyed props start at their value on the clip's first frame.
			const controller: ClipController = {
				clip: new Clip({
					...data,
					props: { ...data.props, ...tracks.props?.(data.startFrame) },
					footage: seg.footage,
					footageMap: seg.footageMap ?? undefined
				}),
				root,
				timelines: [],
				frameFns: [],
				ready: []
			};
			registerClipRoot(controller);
			let instance: ReturnType<typeof mount>;
			try {
				// The clip's reactive props: what changes `clip.props` later reaches the block.
				instance = mount(Block, {
					target: keyed ?? streak ?? root,
					props: controller.clip.props,
					context: new Map([[MOTION_CONTEXT_KEY, controller]])
				});
			} catch (error) {
				throw clipError(data.id, error);
			}
			mounted.push({ data, controller, instance, shown: null, tracks, keyed, streak });
			ready.push(...controller.ready);
		}
		flushSync();
	} catch (error) {
		for (const m of mounted) unmount(m.instance);
		throw error;
	}
	/** The plan of the frame last seeked. */
	let last: Plan | null = null;
	/** Scratch canvas for one rim among several holes (see `drawHoles`). */
	const rimSheet: Sheet = {
		box: document.createElement('div'),
		canvas: document.createElement('canvas')
	};
	/** Per clip, the run of checked frames where its region was empty (see `measure`). */
	const empty = new Map<string, { from: number; what: string; told: boolean }>();
	/** Per clip, the run of checked frames where its text covered the face (see `faceText`). */
	const overFace = new Map<string, { from: number; share: number }>();
	/** Clips already warned about text over the face: once per clip. */
	const toldFace = new Set<string>();
	/** Per clip and kind (`cut`, `safe`), the run of checked frames its content does not fit. */
	const misfit = new Map<string, { from: number; finding: FitFinding }>();
	/**
	 * Per clip covering the whole frame, the box its content reached while it showed (see
	 * `frameFit`): told when it leaves, or at the segment's last frame.
	 */
	const reached = new Map<string, { from: number; last: number; reach: Reach }>();
	/** Clips and kinds already warned about content that does not fit: once each. */
	const toldFit = new Set<string>();
	/** Per clip, the program frame `frameFit` last measured it at. */
	const fitAt = new Map<string, number>();
	/** The shot move each captions clip starts inside (see `moveAtStart`); null: none. */
	const moves = shotMoves(seg);
	const captionMoves = mounted.map((m) =>
		m.data.block === CAPTIONS ? moveAtStart(moves, m.data.startFrame) : null
	);
	/** Per captions clip, what it was drawn over during its move (see `movingCaptions`). */
	const inMove = new Map<string, { frame: number; panel: boolean; face: boolean; done: boolean }>();
	/** Per clip, the run of checked frames where the speaker covered its text behind them. */
	const behindRun = new Map<string, { from: number; share: number }>();
	/** Clips already warned about text the speaker covers: once per clip. */
	const toldBehind = new Set<string>();
	/** Per clip, the program frame `textBehind` last measured it at. */
	const behindAt = new Map<string, number>();
	/** Where `subjectSampler` reads the subject picture back. */
	let readBack: HTMLCanvasElement | null = null;

	/** The extracted frames of the source a view shows; null without them. */
	const framesOf = (view: FootageView | null) => (view ? (seg.footage[view.source] ?? null) : null);
	const framing = programFraming(seg);

	/** The layout of a side showing `view`: the shot track at `f`, or `shot` alone. */
	const layoutFor = (
		f: number,
		view: FootageView | null,
		shot?: Pick<ShotSpan, 'shot' | 'params' | 'keys'> & { id?: string }
	) => framing.layoutFor(f, view, shot);

	/** Which side a clip rides in transition `t`: out when it ends on the cut, in when it starts on it. */
	function rides(data: StageClip, t: ProgramTransition | null): 'a' | 'b' | null {
		if (!t) return null;
		if (t.cutFrame === data.startFrame) return 'b';
		if (t.cutFrame === endOf(data)) return 'a';
		return null;
	}

	function plan(f: number): Plan {
		let staged = player.at(f).find((t) => t.kind !== 'clip') ?? null;
		const both = staged
			? seg.footageMap
				? transitionSidesAt(seg.footageMap, staged, f)
				: { out: null, in: null }
			: null;
		if (!both) staged = null;
		let sides: Pick<Plan, 'a' | 'b'>;
		if (!staged || !both) {
			const view = seg.footageMap ? programFootageAt(seg.footageMap, f) : null;
			sides = { a: { view, layout: layoutFor(f, view) }, b: null };
		} else if (staged.kind === 'cut') {
			sides = {
				a: { view: both.out, layout: layoutFor(f, both.out) },
				b: { view: both.in, layout: layoutFor(f, both.in) }
			};
		} else {
			// Same footage under the previous and the new layout: each side holds its own shot's
			// layout on the other side of the cut.
			const shot = (id: string | null) => seg.shots.find((s) => s.id === id) ?? FULL;
			const before = f < staged.cutFrame;
			sides = {
				a: {
					view: both.out,
					layout: before ? layoutFor(f, both.out) : layoutFor(f, both.out, shot(staged.outgoing))
				},
				b: {
					view: both.in,
					layout: before ? layoutFor(f, both.in, shot(staged.owner)) : layoutFor(f, both.in)
				}
			};
		}
		const current = staged && f >= staged.cutFrame && sides.b ? sides.b : sides.a;
		const clips = mounted.map((m) => {
			let local = clipFrameAt(m.data, f);
			const side = sides.b ? rides(m.data, staged) : null;
			let slot: Rect | null = null;
			if (m.data.slot) {
				// A slot the shot does not free hides its clip.
				const layout =
					side === 'b' ? sides.b!.layout : side === 'a' ? sides.a.layout : current.layout;
				slot = layout.slots[m.data.slot] ?? null;
				if (!slot) local = null;
			}
			return { local, slot, side };
		});
		// Motion blur comes from the shot track alone, so only outside transition windows.
		return {
			f,
			staged,
			...sides,
			clips,
			streak: sides.b ? null : (sides.a.layout.motionBlur ?? null)
		};
	}

	/** Behind clips in project order inside the side they belong to (b: arriving on its cut). */
	function arrangeBehind(now: Plan) {
		for (const s of [a, b]) {
			const want = mounted
				.filter((m, i) => m.data.layer === 'behind' && (now.clips[i].side === 'b') === (s === b))
				.map((m) => m.controller.root);
			const have = [...s.behind.children];
			if (want.length !== have.length || want.some((el, i) => el !== have[i]))
				for (const el of want) s.behind.appendChild(el);
		}
	}

	/**
	 * The eyes on screen in a side (where its camera puts them), inside the camera window: what a
	 * transition centres on. Without a matte, the frame centre slightly high (see `facePoint`).
	 */
	function faceOf(side: SideView): Point | null {
		if (!framesOf(side.view) || !side.view) return null;
		const subject = framing.subjectOf(side.view);
		const face = subject
			? { x: subject.headX, y: Math.min(1, subject.headY + EYES_DROP) }
			: facePoint(null);
		const { camera, clip, turn } = side.layout;
		let x = camera.x + face.x * camera.width;
		let y = camera.y + face.y * camera.height;
		// A shot key's rotation turns the footage about its pivot: the eyes turn with it.
		if (turn) {
			const a = (turn.rotation * Math.PI) / 180;
			const dx = x - turn.pivot.x;
			const dy = y - turn.pivot.y;
			x = turn.pivot.x + dx * Math.cos(a) - dy * Math.sin(a);
			y = turn.pivot.y + dx * Math.sin(a) + dy * Math.cos(a);
		}
		const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
		return {
			x: clamp(x, clip.x, clip.x + clip.width),
			y: clamp(y, clip.y, clip.y + clip.height)
		};
	}

	/** The eyes on each side of transition `t` at the planned frame (under a clip: on both). */
	function focusOf(now: Plan, t: ProgramTransition): { out: Point | null; in: Point | null } {
		if (t.kind !== 'clip') return { out: faceOf(now.a), in: now.b ? faceOf(now.b) : null };
		const under = faceOf(now.b && now.f >= t.cutFrame ? now.b : now.a);
		return { out: under, in: under };
	}

	/** The elements leaving and arriving in transition `t` at the planned frame. */
	function sidesOf(now: Plan, t: ProgramTransition) {
		const onScreen = (m: Mounted, i: number) => now.clips[i].local !== null;
		if (t.kind !== 'clip') {
			const riders = (s: 'a' | 'b') =>
				mounted
					.filter((m, i) => m.data.layer === 'front' && onScreen(m, i) && now.clips[i].side === s)
					.map((m) => m.controller.root);
			return { out: [a.el, ...riders('a')], in: [b.el, ...riders('b')] };
		}
		const i = mounted.findIndex((m) => m.data.id === t.owner);
		const own = mounted[i];
		if (!own) return { out: [], in: [] };
		if (own.data.layer === 'behind') {
			const home = now.clips[i].side === 'b' ? b : a;
			return { out: [home.fill, home.plate.box], in: [own.controller.root] };
		}
		const below = mounted
			.filter((m, k) => m.data.layer === 'front' && m.data.z < own.data.z && onScreen(m, k))
			.map((m) => m.controller.root);
		return {
			out: [a.el, ...(now.b ? [b.el] : []), ...below],
			in: [own.controller.root]
		};
	}

	/** The side a clip is on at a planned frame: the one it rides, else the one on screen. */
	function sideOf(now: Plan, i: number): 'a' | 'b' {
		const rider = now.clips[i].side;
		if (rider) return rider;
		return now.b && now.staged && now.f >= now.staged.cutFrame ? 'b' : 'a';
	}

	/** Holes the clips on side `s` cut, placed at the frame the side shows. */
	function holesOn(now: Plan, s: 'a' | 'b', view: FootageView | null) {
		if (!view || seg.insert) return [];
		const out: { id: string; hole: NonNullable<ReturnType<HoleSource>> }[] = [];
		mounted.forEach((m, i) => {
			if (m.shown === null || !m.controller.holes?.length) return;
			if (sideOf(now, i) !== s) return;
			for (const source of m.controller.holes) {
				let hole: ReturnType<HoleSource>;
				try {
					hole = source({ source: view.source, frame: view.frame });
				} catch (error) {
					throw clipError(m.data.id, error);
				}
				if (hole) out.push({ id: m.data.id, hole });
			}
		});
		return out;
	}

	/**
	 * The holes of side `s`: the clean plate inside them (under the behind clips), and over the
	 * behind clips the subject with them cut out (when the subject is drawn) and their rims.
	 */
	async function drawHoles(
		s: Side,
		view: SideView,
		holes: ReturnType<typeof holesOn>,
		subjectOn: boolean
	) {
		const frames = framesOf(view.view)!;
		const { source, frame } = view.view!;
		if (!frames.clean)
			throw clipError(
				holes[0].id,
				new Error(
					`<Subject hole> needs a clean plate of footage "${source}" to show where the subject was. Add "clean": true to it.`
				)
			);
		const hole = sheet(s, 'hole', s.behind);
		const cut = sheet(s, 'cut', null);
		const rims = holes.some((h) => h.hole.rim);
		const masks = [...new Set(holes.flatMap((h) => (h.hole.mask ? [h.hole.mask] : [])))];
		const [clean, subject, ...loaded] = await Promise.all([
			loadPicture(sourceFrameUrl(frames, frame, 'clean')),
			subjectOn || rims ? loadPicture(sourceFrameUrl(frames, frame, 'subject')) : null,
			...masks.map(loadPicture)
		]);
		const maskOf = (url: string | null) => (url ? loaded[masks.indexOf(url)] : null);
		const { width: w, height: h } = frames;
		const under = blank(hole, w, h);
		for (const { hole: x } of holes)
			drawRegion(under, clean, x.shape, { mask: maskOf(x.mask), outside: x.outside });
		const over = blank(cut, w, h);
		if (subjectOn && subject) {
			over.drawImage(subject, 0, 0, w, h);
			for (const { hole: x } of holes)
				applyRegion(over, x.shape, x.outside ? 'in' : 'out', maskOf(x.mask));
		}
		if (!subject) return;
		for (const [i, { hole: x }] of holes.entries()) {
			if (!x.rim) continue;
			if (holes.length === 1) {
				drawRim(over, subject, x.shape, x.rim, x.near, maskOf(x.mask), x.outside);
				continue;
			}
			// With several holes, a rim is drawn on its own and kept out of the other holes.
			const own = blank(rimSheet, w, h);
			drawRim(own, subject, x.shape, x.rim, x.near, maskOf(x.mask), x.outside);
			holes.forEach(({ hole: other }, k) => {
				if (k !== i)
					applyRegion(own, other.shape, other.outside ? 'in' : 'out', maskOf(other.mask));
			});
			over.drawImage(rimSheet.canvas, 0, 0);
		}
	}

	function drawSide(
		s: Side,
		view: SideView,
		behind: boolean,
		pending: Promise<unknown>[],
		holes: ReturnType<typeof holesOn> = []
	) {
		const { layout } = view;
		s.fill.style.background = layout.fill ? surface(seg) : '';
		const opacity = layout.opacity;
		s.picture.style.opacity = opacity === undefined ? '' : String(opacity);
		frameBox(s.plate, layout);
		frameBox(s.subject, layout);
		s.plate.box.style.boxShadow = windowShadow(layout, seg.size);
		const room = !!layout.room && (layout.room.dim > 0 || layout.room.blur >= BLUR_MIN);
		s.plate.img.style.filter = filters.plate(s.name, layout.room, layout.motionBlur);
		s.subject.img.style.filter = filters.subject(s.name, layout.room?.dim ?? 0, layout.motionBlur);
		s.behind.style.filter = filters.streak(`behind-${s.name}`, layout.motionBlur);
		const frames = framesOf(view.view);
		const back = s.plate.back!;
		if (!view.view || !frames) {
			hide(s.plate.img);
			hide(back);
			hide(s.subject.img);
			for (const x of [s.hole, s.cut]) if (x) x.box.style.display = 'none';
			return;
		}
		const url = sourceFrameUrl(frames, view.view.frame, 'plate');
		const plate = seg.insert ? null : show(s.plate.img, url);
		if (plate) pending.push(plate);
		if (layout.backdrop && !seg.insert) {
			// The blurred copy under footage that leaves the camera window open (see `backdrop`).
			const { camera, blur, dim } = layout.backdrop;
			const { clip } = layout;
			place(back, { ...camera, x: px(camera.x - clip.x), y: px(camera.y - clip.y) });
			// Under a dimmed room the copy is part of the room: dimmed and blurred with it too.
			const roomDim = layout.room?.dim ?? 0;
			const look = {
				dim: px(1 - (1 - dim) * (1 - roomDim)),
				blur: px(Math.hypot(blur, layout.room?.blur ?? 0))
			};
			back.style.filter = filters.plate(`${s.name}-back`, look, layout.motionBlur);
			const copy = show(back, url);
			if (copy) pending.push(copy);
		} else hide(back);
		// The subject covers behind clips only while one is on screen, or a dimmed room; in an
		// insert it is only what a holdout cuts out.
		const subjectOn =
			(seg.insert ? seg.insert.holdout && behind : behind || room) && frames.subject;
		if (holes.length) {
			// The holes' layers draw the subject (cut) instead of its picture.
			hide(s.subject.img);
			const hole = sheet(s, 'hole', s.behind);
			const cut = sheet(s, 'cut', null);
			for (const x of [hole, cut]) {
				x.box.style.display = '';
				frameSheet(x, layout, frames.width, frames.height);
			}
			hole.canvas.style.filter = s.plate.img.style.filter;
			cut.canvas.style.filter = subjectOn ? s.subject.img.style.filter : '';
			pending.push(drawHoles(s, view, holes, subjectOn));
			return;
		}
		for (const x of [s.hole, s.cut]) if (x) x.box.style.display = 'none';
		if (subjectOn) {
			const subject = show(s.subject.img, sourceFrameUrl(frames, view.view.frame, 'subject'));
			if (subject) pending.push(subject);
		} else hide(s.subject.img);
	}

	/**
	 * Text over the speaker's face at the frame last drawn: the boxes of every visible text of a
	 * front clip (or of the opaque card it sits on), measured in the page, against the head's box
	 * where the shot puts it. A clip warns once, after its text has covered at least
	 * `FACE_TEXT_SHARE` of the face in the frames checked for `FACE_TEXT_SECONDS`. Left out: clips
	 * behind the subject, text under a subject layer that draws the speaker over most of the face,
	 * and frames where a clip paints over the whole frame. Cut and shot transition windows end a
	 * run.
	 */
	function faceText(f: number, read: () => TextReader): string[] {
		const now = last?.f === f ? last : null;
		const view = now && !now.b && !seg.insert ? now.a.view : null;
		const frames = framesOf(view);
		const box = frames && view ? sourceSubjectBox(frames, view.frame) : null;
		// Footage faded out by a shot key shows no face.
		const faded = (now?.a.layout.opacity ?? 1) < TEXT_OPACITY;
		const head = now && box && !faded ? headOnStage(box, now.a.layout) : null;
		if (!now || !head) {
			overFace.clear();
			return [];
		}
		const window = now.a.layout.clip;
		const page = read();
		/** Subject layers drawing the speaker over most of the face: text before them is under it. */
		let over: Element[] | null = null;
		const under = (node: Node) =>
			over!.some((o) => node.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING);
		const out: string[] = [];
		let hidden: boolean | null = null;
		for (const m of mounted) {
			const id = m.data.id;
			const root = m.controller.root;
			if (m.shown === null || toldFace.has(id) || m.data.layer === 'behind') {
				overFace.delete(id);
				continue;
			}
			let share = faceCovered(head, page.boxes(root), window);
			if (share >= FACE_TEXT_SHARE) {
				over ??= speakerOver(head, page);
				if (over.length) share = faceCovered(head, page.boxes(root, under), window);
			}
			if (share < FACE_TEXT_SHARE) {
				overFace.delete(id);
				continue;
			}
			const run = overFace.get(id) ?? { from: f, share };
			run.share = Math.max(run.share, share);
			overFace.set(id, run);
			if (f - run.from < FACE_TEXT_SECONDS * seg.fps) continue;
			// A full-frame card or picture over the head hides the face: the text is on the card.
			// Looked for only once a warning is due.
			hidden ??= mounted.some(
				(x) =>
					x.shown !== null && x.data.layer !== 'behind' && page.hidesHead(x.controller.root, head)
			);
			overFace.delete(id);
			if (hidden) continue;
			toldFace.add(id);
			out.push(
				textOverFaceMessage(
					{ clip: id, block: m.data.block, frame: run.from, share: run.share, head },
					seg.size,
					seg.fps
				)
			);
		}
		return out;
	}

	/**
	 * The subject layers of front clips that draw the speaker (not the clean plate or the plate)
	 * over at least half of the face, read from their canvases' pixels.
	 */
	function speakerOver(head: Rect, page: TextReader): Element[] {
		const points = facePoints(head);
		const found: Element[] = [];
		for (const m of mounted) {
			if (m.shown === null || m.data.layer === 'behind') continue;
			const layers = m.controller.root.querySelectorAll<HTMLElement>(
				'.vf-subject-layer[data-layer="subject"]'
			);
			for (const el of layers)
				if (page.opacityOf(el) >= 0.5 && drawnShare(el, points, stage, seg.size) >= 0.5)
					found.push(el);
		}
		return found;
	}

	/** The whole stage, in stage pixels. */
	const stageRect: Rect = { x: 0, y: 0, width: seg.size[0], height: seg.size[1] };
	/** The format's safe zone, when `check` warns about text outside it (`check --format`). */
	const safeRects = seg.checkSafe ? safeBoxes(seg.size, seg.format.safe) : null;
	const lastFrame = seg.startFrame + seg.frames - 1;
	const fitFormat = { size: seg.size, class: seg.format.class, safe: seg.format.safe };

	/**
	 * Content that does not fit the frame, measured at most every `FIT_STRIDE` frames from the
	 * boxes of what each clip paints (see `TextReader.content`). A clip warns once per kind: when
	 * `CUT_SHARE` of its content that reaches into the frame lies outside it for `FIT_SECONDS`;
	 * with `checkSafe`, when `SAFE_TEXT_SHARE` of its text inside the frame lies outside the safe
	 * zone as long; and when it covers the whole frame with a card or picture but its content,
	 * over every frame it does so, stays in the top (left) part as a layout for another size does
	 * (see `emptyPart`; told when the clip leaves, or at the segment's last frame). Cut and shot
	 * transition windows end a run.
	 */
	function frameFit(f: number, read: () => TextReader): string[] {
		const out: string[] = [];
		const now = last?.f === f ? last : null;
		if (!now || seg.insert) return out;
		for (const m of mounted) {
			if (m.shown !== null) continue;
			out.push(...emptyFrame(m));
			fitAt.delete(m.data.id);
			for (const kind of ['cut', 'safe']) misfit.delete(`${m.data.id}\u0000${kind}`);
		}
		if (now.b) misfit.clear();
		else
			for (const m of mounted) {
				if (m.shown === null) continue;
				const at = fitAt.get(m.data.id);
				if (at !== undefined && f - at < FIT_STRIDE && f !== lastFrame) continue;
				fitAt.set(m.data.id, f);
				out.push(...fitOf(m, f, read()));
			}
		if (f === lastFrame) for (const m of mounted) out.push(...emptyFrame(m));
		return out;
	}

	function fitOf(m: Mounted, f: number, page: TextReader): string[] {
		const id = m.data.id;
		const { boxes, text, covers, filled } = page.content(m.controller.root);
		const found: FitFinding[] = [];
		const cut = cutShare(boxes, stageRect);
		if (cut.share >= CUT_SHARE) found.push({ kind: 'cut', ...cut });
		if (safeRects) {
			const share = outsideSafe(text, stageRect, safeRects);
			if (share >= SAFE_TEXT_SHARE) found.push({ kind: 'safe', share });
		}
		const out: string[] = [];
		for (const kind of ['cut', 'safe'] as const) {
			const key = `${id}\u0000${kind}`;
			const finding = found.find((x) => x.kind === kind) as
				| Extract<FitFinding, { share: number }>
				| undefined;
			if (toldFit.has(key) || !finding) {
				misfit.delete(key);
				continue;
			}
			const run = misfit.get(key) as { from: number; finding: typeof finding } | undefined;
			if (!run) {
				misfit.set(key, { from: f, finding });
				continue;
			}
			if (finding.share > run.finding.share) run.finding = finding;
			if (f - run.from < FIT_SECONDS * seg.fps) continue;
			misfit.delete(key);
			toldFit.add(key);
			out.push(
				frameFitMessage(
					{ clip: id, block: m.data.block, frame: run.from, finding: run.finding },
					fitFormat,
					seg.fps
				)
			);
		}
		if (covers && !filled) {
			const r = reached.get(id) ?? { from: f, last: f, reach: newReach() };
			addReach(r.reach, boxes, stageRect);
			r.last = f;
			reached.set(id, r);
		}
		return out;
	}

	/** A clip that covered the frame and left most of it empty (see `frameFit`), once. */
	function emptyFrame(m: Mounted): string[] {
		const id = m.data.id;
		const r = reached.get(id);
		if (!r) return [];
		reached.delete(id);
		const key = `${id}\u0000empty`;
		if (toldFit.has(key) || r.last - r.from < FIT_SECONDS * seg.fps) return [];
		const empty = emptyPart(reachBox(r.reach, stageRect), seg.size);
		if (!empty) return [];
		toldFit.add(key);
		return [
			frameFitMessage(
				{ clip: id, block: m.data.block, frame: r.from, finding: { kind: 'empty', ...empty } },
				fitFormat,
				seg.fps
			)
		];
	}

	/**
	 * Captions drawn over a shot move they start inside (see `moveAtStart`): at the frames checked
	 * inside the move, whether their text lies over a panel (a slotted clip's slot,
	 * `PANEL_TEXT_SHARE` of the text) or covers the face (`FACE_TEXT_SHARE`) on either side; at
	 * the first frame checked after it that shows some of their text, whether they are clear.
	 * Drawn over something during the move and clear after it warns, once. Captions riding a side
	 * of a transition move with it and are left out.
	 */
	function movingCaptions(f: number, read: () => TextReader): string[] {
		const out: string[] = [];
		const now = last?.f === f ? last : null;
		if (!now || seg.insert) return out;
		mounted.forEach((m, i) => {
			const move = captionMoves[i];
			if (!move || m.shown === null || f < move.from) return;
			const id = m.data.id;
			const state = inMove.get(id) ?? { frame: -1, panel: false, face: false, done: false };
			inMove.set(id, state);
			if (state.done) return;
			if (now.clips[i].side) {
				state.done = true;
				return;
			}
			if (f >= move.to && state.frame < 0) {
				state.done = true;
				return;
			}
			const over = drawnOver(now, i, read());
			if (f < move.to) {
				if (!over.panel && !over.face) return;
				if (state.frame < 0) state.frame = f;
				state.panel ||= over.panel;
				state.face ||= over.face;
				return;
			}
			// After the move, the first frame checked that shows some of their text decides.
			if (!over.text) return;
			state.done = true;
			if (over.panel || over.face) return;
			out.push(
				captionsInMoveMessage(
					{
						clip: id,
						start: m.data.startFrame,
						move,
						over: { panel: state.panel, face: state.face },
						frame: state.frame
					},
					seg.fps
				)
			);
		});
		return out;
	}

	/** What the text of mounted clip `i` lies over at the planned frame: a panel, the face. */
	function drawnOver(now: Plan, i: number, page: TextReader) {
		const boxes = page.boxes(mounted[i].controller.root);
		const total = boxes.reduce((sum, b) => sum + b.width * b.height, 0);
		if (!total) return { panel: false, face: false, text: false };
		let onPanel = 0;
		now.clips.forEach((c, k) => {
			if (!c.slot || c.local === null || k === i) return;
			for (const b of boxes) {
				const o = intersect(b, c.slot);
				if (o) onPanel += o.width * o.height;
			}
		});
		let face = false;
		for (const side of now.b ? [now.a, now.b] : [now.a]) {
			const frames = framesOf(side.view);
			const box = frames && side.view ? sourceSubjectBox(frames, side.view.frame) : null;
			const shown = (side.layout.opacity ?? 1) >= TEXT_OPACITY;
			const head = box && shown ? headOnStage(box, side.layout) : null;
			if (head && faceCovered(head, boxes, side.layout.clip) >= FACE_TEXT_SHARE) face = true;
		}
		return { panel: onPanel / total >= PANEL_TEXT_SHARE, face, text: true };
	}

	/**
	 * Text behind the speaker that the speaker covers, at the frame last drawn (each clip at most
	 * every `BEHIND_STRIDE` frames): the text of a `"layer": "behind"` clip against the subject
	 * picture of side a, and text under a subject layer of a front clip against the layers drawn
	 * after it, sampled over its line boxes. A clip
	 * warns once, after the speaker has covered more than `BEHIND_TEXT_SHARE` of its text in the
	 * frames checked for `BEHIND_TEXT_SECONDS`, with the parts of the frame clear of the speaker.
	 * Left out: transition windows, footage faded out or without a matte, and frames with holes.
	 */
	function textBehind(f: number, read: () => TextReader): string[] {
		const now = last?.f === f ? last : null;
		const view = now && !now.b && !seg.insert ? now.a.view : null;
		const frames = framesOf(view);
		const holes = !!a.cut && a.cut.box.style.display !== 'none';
		const faded = (now?.a.layout.opacity ?? 1) < TEXT_OPACITY;
		if (!now || !view || !frames?.subject || holes || faded) {
			behindRun.clear();
			behindAt.clear();
			return [];
		}
		const out: string[] = [];
		let layers: HTMLElement[] | null = null;
		for (const m of mounted) {
			const id = m.data.id;
			if (m.shown === null || toldBehind.has(id)) {
				behindRun.delete(id);
				behindAt.delete(id);
				continue;
			}
			const at = behindAt.get(id);
			if (at !== undefined && f - at < BEHIND_STRIDE) continue;
			behindAt.set(id, f);
			let boxes: Rect[] = [];
			let sample: Sampler | null = null;
			if (m.data.layer === 'behind') {
				boxes = read().boxes(m.controller.root, undefined, false);
				if (boxes.length) sample = subjectSampler(now.a.layout);
			} else {
				layers ??= subjectLayers(read());
				const root = m.controller.root;
				const after = layers.filter(
					(l) =>
						root.contains(l) ||
						!!(root.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING)
				);
				if (after.length) {
					const under = (node: Node) =>
						after.some((l) => node.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING);
					boxes = read().boxes(root, (node) => !under(node), false);
					if (boxes.length) sample = layersSampler(after);
				}
			}
			const points = boxes.length ? textPoints(boxes) : [];
			const hits = sample && points.length ? sample(points) : null;
			const share = hits ? hits.filter(Boolean).length / points.length : 0;
			if (share <= BEHIND_TEXT_SHARE) {
				behindRun.delete(id);
				continue;
			}
			const run = behindRun.get(id) ?? { from: f, share };
			run.share = Math.max(run.share, share);
			behindRun.set(id, run);
			if (f - run.from < BEHIND_TEXT_SECONDS * seg.fps) continue;
			behindRun.delete(id);
			toldBehind.add(id);
			const clear = clearOfSpeaker(
				speakerMask(sample!),
				contentReach(boxes, stageRect) ?? boxes[0],
				seg.size
			);
			out.push(
				textBehindMessage(
					{ clip: id, block: m.data.block, frame: run.from, share: run.share, clear },
					seg.size,
					seg.fps
				)
			);
		}
		return out;
	}

	/** The subject layers of front clips on screen that draw the speaker, at least half opaque. */
	function subjectLayers(page: TextReader): HTMLElement[] {
		const found: HTMLElement[] = [];
		for (const m of mounted) {
			if (m.shown === null || m.data.layer === 'behind') continue;
			for (const el of m.controller.root.querySelectorAll<HTMLElement>(
				'.vf-subject-layer[data-layer="subject"]'
			))
				if (page.opacityOf(el) >= 0.5) found.push(el);
		}
		return found;
	}

	/** Whether any of `layers` draws the speaker at each point (see `canvasHits`). */
	function layersSampler(layers: HTMLElement[]): Sampler {
		return (points) => {
			const hits = points.map(() => false);
			for (const l of layers) {
				// A layer whose pixels cannot be read counts as drawn everywhere (see `drawnShare`).
				const own = canvasHits(l, points, stage, seg.size) ?? points.map(() => true);
				own.forEach((h, k) => (hits[k] ||= h));
			}
			return hits;
		};
	}

	/**
	 * Whether the subject picture of side a (the speaker cut out by the matte, as drawn over the
	 * behind clips) is at least half opaque at each point: the part of the picture under the
	 * points is read back at `READ_SCALE` of its size. Null when it is not drawn or cannot be read.
	 */
	function subjectSampler(layout: ShotLayout): Sampler | null {
		const img = a.subject.img;
		if (img.style.display === 'none' || !img.complete || !img.naturalWidth) return null;
		const { camera, clip, turn } = layout;
		const turnBack = turn ? (-turn.rotation * Math.PI) / 180 : 0;
		const w = img.naturalWidth;
		const h = img.naturalHeight;
		/** A stage point in picture pixels; null outside the camera window or the picture. */
		const onPicture = (p: { x: number; y: number }) => {
			if (p.x < clip.x || p.y < clip.y || p.x >= clip.x + clip.width || p.y >= clip.y + clip.height)
				return null;
			let { x, y } = p;
			if (turn) {
				const dx = x - turn.pivot.x;
				const dy = y - turn.pivot.y;
				x = turn.pivot.x + dx * Math.cos(turnBack) - dy * Math.sin(turnBack);
				y = turn.pivot.y + dx * Math.sin(turnBack) + dy * Math.cos(turnBack);
			}
			const u = (x - camera.x) / camera.width;
			const v = (y - camera.y) / camera.height;
			return u >= 0 && v >= 0 && u < 1 && v < 1 ? { x: u * w, y: v * h } : null;
		};
		return (points) => {
			const at = points.map(onPicture);
			const kept = at.filter((q): q is { x: number; y: number } => !!q);
			if (!kept.length) return points.map(() => false);
			const x0 = Math.floor(Math.min(...kept.map((q) => q.x)));
			const y0 = Math.floor(Math.min(...kept.map((q) => q.y)));
			const sw = Math.floor(Math.max(...kept.map((q) => q.x))) - x0 + 1;
			const sh = Math.floor(Math.max(...kept.map((q) => q.y))) - y0 + 1;
			const dw = Math.max(1, Math.ceil(sw * READ_SCALE));
			const dh = Math.max(1, Math.ceil(sh * READ_SCALE));
			readBack ??= document.createElement('canvas');
			if (readBack.width < dw || readBack.height < dh) {
				readBack.width = Math.max(readBack.width, dw);
				readBack.height = Math.max(readBack.height, dh);
			}
			// A GPU canvas: the picture is drawn from the GPU and only the small part under the points
			// comes back (a canvas read often would pull the whole picture to the CPU first).
			const ctx = readBack.getContext('2d');
			if (!ctx) return null;
			let data: Uint8ClampedArray;
			try {
				ctx.clearRect(0, 0, dw, dh);
				ctx.drawImage(img, x0, y0, sw, sh, 0, 0, dw, dh);
				data = ctx.getImageData(0, 0, dw, dh).data;
			} catch {
				return null;
			}
			return at.map((q) => {
				if (!q) return false;
				const px = Math.min(dw - 1, Math.floor(((q.x - x0) / sw) * dw));
				const py = Math.min(dh - 1, Math.floor(((q.y - y0) / sh) * dh));
				return data[(py * dw + px) * 4 + 3] >= 128;
			});
		};
	}

	/** Where `sample` finds the speaker on a grid over the whole stage (see `SpeakerMask`). */
	function speakerMask(sample: Sampler): SpeakerMask {
		const step = Math.max(8, Math.round(Math.min(...seg.size) / 60));
		const cols = Math.ceil(seg.size[0] / step);
		const rows = Math.ceil(seg.size[1] / step);
		const points: { x: number; y: number }[] = [];
		for (let r = 0; r < rows; r++)
			for (let c = 0; c < cols; c++) points.push({ x: (c + 0.5) * step, y: (r + 0.5) * step });
		return { step, cols, rows, hit: sample(points) ?? points.map(() => false) };
	}

	function inSegment(f: number) {
		if (f < seg.startFrame || f >= seg.startFrame + seg.frames)
			throw new Error(
				`Frame ${f} is outside segment "${seg.id}" (frames ${seg.startFrame}–${seg.startFrame + seg.frames - 1}).`
			);
	}

	return {
		fps: seg.fps,
		ready,
		seek(f) {
			inSegment(f);
			const now = plan(f);
			last = now;
			b.el.style.display = now.b ? '' : 'none';
			mounted.forEach((m, i) => {
				const { local, slot } = now.clips[i];
				if (slot) place(m.controller.root, slot);
				m.controller.root.style.display = local === null ? 'none' : '';
				m.shown = local;
				if (local === null) return;
				m.controller.clip.t = local / seg.fps;
				m.controller.clip.frame = local;
				// Where the footage is on screen for this clip (its side; a slot's own pixels).
				const side = sideOf(now, i) === 'b' ? now.b! : now.a;
				const frames = framesOf(side.view);
				const camera = frames ? cameraView(side.layout, frames, slot) : null;
				if (!sameCamera(m.controller.clip.camera, camera)) m.controller.clip.camera = camera;
				// Keys follow the frame the clip shows (held at its edges inside a window).
				const at = m.data.startFrame + local;
				if (m.tracks.props) Object.assign(m.controller.clip.props, m.tracks.props(at));
				if (m.keyed) {
					const p = m.tracks.placement!(at);
					m.keyed.style.transform = placementTransform(p);
					m.keyed.style.opacity = p.opacity === 1 ? '' : String(p.opacity);
				}
			});
			const streak = filters.streak(
				'clips',
				now.streak && {
					x: now.streak.x * CLIP_STREAK,
					y: now.streak.y * CLIP_STREAK
				}
			);
			for (const m of mounted) if (m.streak) m.streak.style.filter = streak;
			arrangeBehind(now);
			flushSync();
			// A block may set the point its placement keys turn about (`clip.pivot`), from what
			// this frame's seek just settled.
			for (const m of mounted) {
				if (m.shown === null || !m.keyed) continue;
				const p = m.controller.clip.pivot;
				const at = typeof p === 'function' ? p() : p;
				m.keyed.style.transformOrigin = at ? `${px(at.x)}px ${px(at.y)}px` : '';
			}
			for (const m of mounted) {
				if (m.shown === null) continue;
				try {
					for (const tl of m.controller.timelines) seekTimeline(tl, m.shown / seg.fps);
				} catch (error) {
					throw clipError(m.data.id, error);
				}
			}
			player.seek(f, (t) => ({ ...sidesOf(now, t), focus: focusOf(now, t) }));
		},
		async draw(f) {
			const pending: Promise<unknown>[] = [];
			const now = last?.f === f ? last : plan(f);
			const behindOn = (s: 'a' | 'b') =>
				mounted.some(
					(m, i) =>
						m.data.layer === 'behind' &&
						now.clips[i].local !== null &&
						(now.clips[i].side === 'b') === (s === 'b')
				);
			drawSide(a, now.a, behindOn('a'), pending, holesOn(now, 'a', now.a.view));
			if (now.b) drawSide(b, now.b, behindOn('b'), pending, holesOn(now, 'b', now.b.view));
			for (const m of mounted) {
				if (m.shown === null) continue;
				const { clip } = m.controller;
				for (const fn of m.controller.frameFns) {
					let result: unknown;
					try {
						result = fn({ t: clip.t, frame: clip.frame, clip });
					} catch (error) {
						throw clipError(m.data.id, error);
					}
					if (result && typeof (result as Promise<unknown>).then === 'function')
						pending.push(
							(result as Promise<unknown>).catch((e) => Promise.reject(clipError(m.data.id, e)))
						);
				}
			}
			await Promise.all(pending);
		},
		warnings(f) {
			const out: string[] = [];
			for (const t of seg.transitions) {
				// Right after the window the pushed-in clip is in place.
				if (t.kind !== 'clip' || t.type !== 'push' || f !== t.startFrame + t.frames) continue;
				const m = mounted.find((x) => x.data.id === t.owner);
				if (!m || m.shown === null || m.data.layer === 'behind' || m.data.slot) continue;
				if (!coversStage(m.controller.root, stage))
					out.push(
						`The push into clip "${t.owner}" slides everything below it off the frame, but the clip does not cover the frame: the empty stage shows around it. Use wipe, or give the clip a full-frame background.`
					);
			}
			return out;
		},
		async measure(f) {
			const out: string[] = [];
			for (const m of mounted) {
				if (m.shown === null || !m.controller.probes?.length) {
					empty.delete(m.data.id);
					continue;
				}
				let worst: { share: number; what: string } | null = null;
				for (const probe of m.controller.probes) {
					const got = await probe().catch((e) => Promise.reject(clipError(m.data.id, e)));
					if (got && (!worst || got.share < worst.share)) worst = got;
				}
				if (!worst || worst.share >= EMPTY_SHARE) {
					empty.delete(m.data.id);
					continue;
				}
				const run = empty.get(m.data.id) ?? { from: f, what: worst.what, told: false };
				empty.set(m.data.id, run);
				if (!run.told && f - run.from >= seg.fps / 2) {
					run.told = true;
					out.push(
						`Clip "${m.data.id}": ${run.what} holds none of the speaker in the frames checked from ${(run.from / seg.fps).toFixed(2)} s (program time) on, about half a second or more, so the subject layer draws nothing there. Move the line or path onto the speaker (a line's number counts head heights down from the top of the head), or check the matte.`
					);
				}
			}
			// One reader for every measure of this frame: what it learns about elements is shared.
			let page: TextReader | null = null;
			const read = () => (page ??= textReader(stage, seg.size));
			out.push(...faceText(f, read), ...textBehind(f, read));
			out.push(...frameFit(f, read), ...movingCaptions(f, read));
			return out;
		},
		holdout(on) {
			const shown = !!seg.insert?.holdout && a.subject.img.style.display !== 'none';
			if (on && !shown) return false;
			a.subject.box.style.opacity = on ? '' : '0';
			a.behind.style.opacity = on ? '0' : '';
			front.style.opacity = on ? '0' : '';
			under.style.opacity = on ? '0' : '';
			return on;
		},
		destroy() {
			for (const m of mounted) unmount(m.instance);
			mounted.length = 0;
			filters.dispose();
			canvases.remove();
		}
	};
}

/** What an element's ancestors do to the text inside it (see `textReader`). */
type TextLook = {
	/** Its opacity times its ancestors'. */
	opacity: number;
	/** What the ancestors that clip their overflow leave of it, in page pixels; null: nothing. */
	clip: Rect | null;
	/** The nearest opaque card it sits on (not one covering the whole stage), in page pixels. */
	card: Rect | null;
	/** Whether it or an ancestor paints its background through the text (`background-clip: text`). */
	clipsText: boolean;
	/**
	 * Like `clip`, from the ancestors smaller than the stage only: a block's frame-sized box with
	 * `overflow: hidden` hides what lies off the frame, which `frameFit` still counts.
	 */
	inner: Rect | null;
	/** Its computed style; null for the stage. */
	style: CSSStyleDeclaration | null;
};

type TextReader = ReturnType<typeof textReader>;

/** A background or fill this opaque or more is a card behind the text, or text itself. */
const CARD_ALPHA = 0.5;
/** An element this opaque or more over most of the stage hides the footage. */
const HIDES = 0.9;
/**
 * The share of the stage's area an element covers from which it is a full-frame card, not a card
 * a text sits on: a card inset from the frame edges or with round corners still fills the frame.
 */
const MOST = 0.8;

/** The alpha of a computed CSS colour (`rgb(…)`, `rgba(…)`, `transparent`). */
function alphaOf(color: string): number {
	if (!color || color === 'transparent') return 0;
	const parts = /\(([^)]+)\)/
		.exec(color)?.[1]
		.split(/[\s,/]+/)
		.filter(Boolean);
	return parts && parts.length >= 4 ? Number(parts[3]) : 1;
}

/**
 * The alpha of a computed CSS colour in any notation (`rgb(…)`, `rgba(…)`, `color(srgb … / a)`,
 * `oklab(… / a)`, `transparent`); 1 when it gives none.
 */
function colourAlpha(colour: string): number {
	const c = colour.trim();
	if (!c || c === 'transparent') return 0;
	const inner = /\(([^()]*)\)\s*$/.exec(c)?.[1];
	if (!inner) return 1;
	if (inner.includes('/')) return Number(inner.split('/').pop()!.trim()) || 0;
	const parts = inner.split(',');
	return /^rgba|^hsla/.test(c) || parts.length === 4 ? Number(parts[3] ?? 1) : 1;
}

/**
 * Whether a computed `background-image` is a gradient of opaque colours only: it paints its whole
 * box. A picture (`url(…)`) or a gradient with a transparent stop (a scrim) does not count.
 */
function opaqueGradient(image: string): boolean {
	if (!image || image === 'none' || /url\(/.test(image) || !/gradient\(/.test(image)) return false;
	const colours =
		image.match(/(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|\btransparent\b/g) ?? [];
	return colours.length > 0 && colours.every((c) => colourAlpha(c) >= HIDES);
}

/** Whether an element with `style` paints its box: a background, or a border on any side. */
function paintsBox(style: CSSStyleDeclaration): boolean {
	if (alphaOf(style.backgroundColor) > 0 || style.backgroundImage !== 'none') return true;
	return ['top', 'right', 'bottom', 'left'].some(
		(side) =>
			parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
			style.getPropertyValue(`border-${side}-style`) !== 'none' &&
			alphaOf(style.getPropertyValue(`border-${side}-color`)) > 0
	);
}

/**
 * Reads the text of clips in the page at the frame last drawn, in stage pixels, sharing what it
 * learns about elements between clips.
 */
function textReader(stage: HTMLElement, size: [number, number]) {
	const frame = stage.getBoundingClientRect();
	const sx = frame.width ? size[0] / frame.width : 1;
	const sy = frame.height ? size[1] / frame.height : 1;
	const rect = (r: DOMRect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });
	const page = rect(frame);
	/** Whether `r` (page pixels) covers at least `MOST` of the stage's area. */
	const most = (r: Rect) => {
		const on = intersect(r, page);
		return !!on && on.width * on.height >= MOST * page.width * page.height;
	};
	/** Whether `r` (page pixels) covers the whole stage. */
	const whole = (r: Rect) =>
		r.x <= page.x + 1 &&
		r.y <= page.y + 1 &&
		r.x + r.width >= page.x + page.width - 1 &&
		r.y + r.height >= page.y + page.height - 1;
	const looks = new Map<Element, TextLook>();
	const lookOf = (el: Element | null): TextLook => {
		if (!el || el === stage)
			return { opacity: 1, clip: null, card: null, clipsText: false, inner: null, style: null };
		const known = looks.get(el);
		if (known) return known;
		const up = lookOf(el.parentElement);
		const style = getComputedStyle(el);
		const opacity = up.opacity * Number(style.opacity || 1);
		let clip = up.clip;
		let inner = up.inner;
		let own: Rect | null = null;
		const cut = (to: Rect | null, by: Rect) =>
			to ? (intersect(to, by) ?? { ...by, width: 0, height: 0 }) : by;
		if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
			own = rect(el.getBoundingClientRect());
			clip = cut(clip, own);
			if (!whole(own)) inner = cut(inner, own);
		}
		let card = up.card;
		if (alphaOf(style.backgroundColor) >= CARD_ALPHA && style.visibility === 'visible') {
			own ??= rect(el.getBoundingClientRect());
			if (!most(own)) card = clip ? intersect(own, clip) : own;
		}
		const clipsText =
			up.clipsText ||
			style.backgroundClip === 'text' ||
			style.getPropertyValue('-webkit-background-clip') === 'text';
		const look = { opacity, clip, card, clipsText, inner, style };
		looks.set(el, look);
		return look;
	};
	const toStage = (r: Rect): Rect => ({
		x: (r.x - frame.x) * sx,
		y: (r.y - frame.y) * sy,
		width: r.width * sx,
		height: r.height * sy
	});
	const range = document.createRange();
	/**
	 * The line boxes of a text node that can be read (see `boxes`), cut to `cut`: the ancestors
	 * that clip their overflow (`clip`), only those smaller than the stage (`inner`), or replaced
	 * by the opaque card the text sits on (`card`).
	 */
	const textBoxes = (node: Text, cut: 'card' | 'clip' | 'inner'): Rect[] => {
		const parent = node.parentElement;
		if (!node.nodeValue?.trim() || !parent || /^(STYLE|SCRIPT)$/.test(parent.tagName)) return [];
		const look = lookOf(parent);
		if (look.opacity < TEXT_OPACITY) return [];
		const style = look.style ?? getComputedStyle(parent);
		if (style.visibility !== 'visible') return [];
		if (cut === 'card' && look.card) return [toStage(look.card)];
		const fill = style.getPropertyValue('-webkit-text-fill-color') || style.color;
		const stroke = parseFloat(style.getPropertyValue('-webkit-text-stroke-width')) || 0;
		if (alphaOf(fill) === 0 && stroke === 0 && !look.clipsText) return [];
		const within = cut === 'inner' ? look.inner : look.clip;
		const out: Rect[] = [];
		range.selectNodeContents(node);
		for (const r of range.getClientRects()) {
			const box = within ? intersect(rect(r), within) : rect(r);
			if (box) out.push(toStage(box));
		}
		return out;
	};
	return {
		/** The effective opacity of `el`: its own times its ancestors'. */
		opacityOf: (el: Element) => lookOf(el).opacity,
		/**
		 * The boxes of the text inside `root` that can be read: each line box of each text node,
		 * or the opaque card it sits on (unless `cards` is false), cut to the ancestors that clip
		 * their overflow. Hidden text, text under `TEXT_OPACITY` (its own opacity times its
		 * ancestors') and text with a transparent fill and no stroke (a typewriter's letters still
		 * to come) are left out, as is text `skip` returns true for.
		 */
		boxes(root: HTMLElement, skip?: (node: Node) => boolean, cards = true): Rect[] {
			if (!frame.width || !frame.height) return [];
			const out: Rect[] = [];
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				if (skip?.(node)) continue;
				out.push(...textBoxes(node as Text, cards ? 'card' : 'clip'));
			}
			return out;
		},
		/**
		 * What `root` shows that carries content, for `frameFit`, in stage pixels: the line boxes
		 * of its text (also in `text`), the boxes of its images and videos, and the boxes of the
		 * cards, panels and SVGs (elements with a background or border) that hold text, each cut
		 * only to the ancestors smaller than the stage that clip their overflow. Left out: what is
		 * hidden or under `TEXT_OPACITY`, decoration without text (glows, patterns, canvases), and
		 * planes over `MOST` of the stage. `covers` tells whether such a plane is an opaque card (a
		 * background colour, or a gradient of opaque colours, at least `HIDES` opaque in effect),
		 * `filled` whether an image, video, canvas or SVG lies over that much of the stage.
		 */
		content(root: HTMLElement): { boxes: Rect[]; text: Rect[]; covers: boolean; filled: boolean } {
			const boxes: Rect[] = [];
			const text: Rect[] = [];
			let covers = false;
			let filled = false;
			if (!frame.width || !frame.height) return { boxes, text, covers, filled };
			const visit = (el: Element) => {
				for (const child of el.childNodes) {
					if (child.nodeType === Node.TEXT_NODE) {
						const lines = textBoxes(child as Text, 'inner');
						boxes.push(...lines);
						text.push(...lines);
						continue;
					}
					if (!(child instanceof Element) || /^(STYLE|SCRIPT)$/.test(child.tagName)) continue;
					const look = lookOf(child);
					const style = look.style!;
					if (look.opacity < TEXT_OPACITY || style.display === 'none') continue;
					// What draws its own picture: its box, not its children.
					const picture =
						/^(IMG|CANVAS|VIDEO)$/.test(child.tagName) || child instanceof SVGSVGElement;
					if (style.visibility === 'visible' && (picture || paintsBox(style))) {
						const own = rect(child.getBoundingClientRect());
						const box = look.inner ? intersect(own, look.inner) : own;
						const media = /^(IMG|VIDEO)$/.test(child.tagName);
						if (box && most(box)) {
							// A picture over the frame fills it: what is on it is content.
							if (picture) filled = true;
							else if (
								look.opacity * colourAlpha(style.backgroundColor) >= HIDES ||
								(look.opacity >= HIDES && opaqueGradient(style.backgroundImage))
							)
								covers = true;
						} else if (
							box &&
							box.width > 0 &&
							box.height > 0 &&
							(media || (child.tagName !== 'CANVAS' && !!child.textContent?.trim()))
						)
							boxes.push(toStage(box));
					}
					if (!picture) visit(child);
				}
			};
			visit(root);
			return { boxes, text, covers, filled };
		},
		/**
		 * Whether something visible inside `root` is a full-frame card over the head and hides the
		 * footage: at least `HIDES` in effective opacity, over `MOST` of the stage's area and the
		 * whole head (stage pixels), with an opaque background colour, or a loaded image whose
		 * drawn picture does that (an `object-fit: contain` letterbox does not count). Canvases,
		 * videos and gradients do not count: the face may show through them.
		 */
		hidesHead(root: HTMLElement, head: Rect): boolean {
			const area: Rect = {
				x: frame.x + head.x / sx,
				y: frame.y + head.y / sy,
				width: head.width / sx,
				height: head.height / sy
			};
			const over = (r: Rect) =>
				most(r) &&
				r.x <= area.x + 1 &&
				r.y <= area.y + 1 &&
				r.x + r.width >= area.x + area.width - 1 &&
				r.y + r.height >= area.y + area.height - 1;
			for (const el of root.querySelectorAll<HTMLElement>('*')) {
				const box = rect(el.getBoundingClientRect());
				if (!over(box)) continue;
				const style = getComputedStyle(el);
				if (style.visibility !== 'visible' || lookOf(el).opacity < HIDES) continue;
				if (alphaOf(style.backgroundColor) >= HIDES) return true;
				if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0)
					if (over(pictureBox(el, box, style))) return true;
			}
			return false;
		}
	};
}

/**
 * Where an image draws its picture inside its box `box` (page pixels): the whole box for `fill`
 * and `cover`, the scaled picture placed by `object-position` for `contain`, `scale-down` and
 * `none`.
 */
function pictureBox(img: HTMLImageElement, box: Rect, style: CSSStyleDeclaration): Rect {
	const fit = style.objectFit;
	if (fit === 'fill' || fit === 'cover' || !img.naturalWidth || !img.naturalHeight) return box;
	// The box may be scaled by transforms: CSS pixels of the image's own width map onto it.
	const unit = img.offsetWidth ? box.width / img.offsetWidth : 1;
	const contain = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
	const scale = fit === 'none' ? unit : fit === 'scale-down' ? Math.min(unit, contain) : contain;
	const width = img.naturalWidth * scale;
	const height = img.naturalHeight * scale;
	// The computed `object-position` is two lengths or percentages ("50% 50%", "0px 20%").
	const [ox = '50%', oy = '50%'] = style.objectPosition.split(/\s+/);
	const offset = (v: string, room: number) =>
		v.endsWith('%') ? (parseFloat(v) / 100) * room : (parseFloat(v) || 0) * unit;
	return {
		x: box.x + offset(ox, box.width - width),
		y: box.y + offset(oy, box.height - height),
		width,
		height
	};
}

/**
 * The share of `points` (stage pixels) where a subject layer's canvas has drawn the speaker,
 * read from its pixels where the canvas sits on the page (its box, turns not followed). A canvas
 * whose pixels cannot be read counts as drawn everywhere.
 */
function drawnShare(
	layer: HTMLElement,
	points: { x: number; y: number }[],
	stage: HTMLElement,
	size: [number, number]
): number {
	if (!points.length) return 0;
	const hits = canvasHits(layer, points, stage, size);
	return hits ? hits.filter(Boolean).length / points.length : 1;
}

/**
 * Whether a subject layer's canvas has drawn the speaker at each of `points` (stage pixels; see
 * `drawnShare`); null when its pixels cannot be read.
 */
function canvasHits(
	layer: HTMLElement,
	points: { x: number; y: number }[],
	stage: HTMLElement,
	size: [number, number]
): boolean[] | null {
	const none = points.map(() => false);
	const canvas = layer.querySelector('canvas');
	const frame = stage.getBoundingClientRect();
	const box = canvas?.getBoundingClientRect();
	if (!canvas || !box?.width || !box.height || !canvas.width || !points.length) return none;
	const at = (p: { x: number; y: number }) => ({
		x: Math.floor(((frame.x + (p.x * frame.width) / size[0] - box.x) / box.width) * canvas.width),
		y: Math.floor(((frame.y + (p.y * frame.height) / size[1] - box.y) / box.height) * canvas.height)
	});
	const pixels = points.map(at);
	const inside = (p: { x: number; y: number }) =>
		p.x >= 0 && p.y >= 0 && p.x < canvas.width && p.y < canvas.height;
	const kept = pixels.filter(inside);
	if (!kept.length) return none;
	const x0 = Math.min(...kept.map((p) => p.x));
	const y0 = Math.min(...kept.map((p) => p.y));
	const w = Math.max(...kept.map((p) => p.x)) - x0 + 1;
	const h = Math.max(...kept.map((p) => p.y)) - y0 + 1;
	let data: Uint8ClampedArray;
	try {
		const ctx = canvas.getContext('2d');
		if (!ctx) return none;
		data = ctx.getImageData(x0, y0, w, h).data;
	} catch {
		return null;
	}
	return pixels.map((p) => inside(p) && data[((p.y - y0) * w + (p.x - x0)) * 4 + 3] >= 128);
}

/** Points spread over text boxes, about one per `TEXT_STEP` pixels each way. */
function textPoints(boxes: Rect[]): { x: number; y: number }[] {
	const out: { x: number; y: number }[] = [];
	for (const b of boxes) {
		const nx = Math.max(1, Math.min(32, Math.ceil(b.width / TEXT_STEP)));
		const ny = Math.max(1, Math.min(8, Math.ceil(b.height / TEXT_STEP)));
		for (let i = 0; i < nx; i++)
			for (let j = 0; j < ny; j++)
				out.push({ x: b.x + ((i + 0.5) * b.width) / nx, y: b.y + ((j + 0.5) * b.height) / ny });
	}
	return out;
}

/**
 * Whether something inside `root` paints over the whole stage: an element covering the stage's
 * box with an opaque background colour, a background image, or an image, canvas or video.
 */
function coversStage(root: HTMLElement, stage: HTMLElement): boolean {
	const frame = stage.getBoundingClientRect();
	const covers = (r: DOMRect) =>
		r.left <= frame.left + 1 &&
		r.top <= frame.top + 1 &&
		r.right >= frame.right - 1 &&
		r.bottom >= frame.bottom - 1;
	for (const el of root.querySelectorAll<HTMLElement>('*')) {
		if (!covers(el.getBoundingClientRect())) continue;
		if (/^(IMG|CANVAS|VIDEO)$/.test(el.tagName)) return true;
		const style = getComputedStyle(el);
		if (style.backgroundImage !== 'none') return true;
		const alpha = /rgba?\(([^)]+)\)/.exec(style.backgroundColor)?.[1].split(',')[3];
		if (style.backgroundColor !== 'transparent' && (alpha === undefined || Number(alpha) > 0.9))
			return true;
	}
	return false;
}
