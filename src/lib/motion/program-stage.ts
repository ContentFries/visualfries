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
import type { ProgramTransition } from './program.js';
import { clipFrameAt, type StageClip, type StageSegment } from './segments.js';
import {
	shotLayout,
	shotLayoutAt,
	type Rect,
	type ShotInput,
	type ShotLayout,
	type ShotSpan
} from './shots/index.js';
import { SUBJECT_SMOOTH } from './shots/layout.js';
import { createTransitionPlayer } from './transitions/player.js';

/**
 * The program's layer tree on one stage, for a segment of the program:
 *
 *   #vf-stage
 *     .vf-side[a]  .vf-fill             style fill around a framed shot
 *                  .vf-plate > img      footage the cut list shows, in the shot's camera window
 *                  .vf-behind           clips with `layer: "behind"` (frame space)
 *                  .vf-subject > img    the subject cut out by its matte, over the behind clips
 *     .vf-side[b]  the same, for the incoming side of a cut or shot transition
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
 */

type Mounted = {
	data: StageClip;
	controller: ClipController;
	instance: ReturnType<typeof mount>;
	/** Clip frame shown at the current program frame; null: hidden. */
	shown: number | null;
};

type Picture = { box: HTMLDivElement; img: HTMLImageElement };

type Side = {
	el: HTMLDivElement;
	fill: HTMLDivElement;
	plate: Picture;
	behind: HTMLDivElement;
	subject: Picture;
};

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
	destroy(): void;
};

const LAYER = 'position:absolute;inset:0';

function layer(parent: HTMLElement, className: string, style = LAYER): HTMLDivElement {
	const el = document.createElement('div');
	el.className = className;
	el.style.cssText = style;
	parent.appendChild(el);
	return el;
}

/** An `<img>` in its own clipped box (the camera window); empty images stay hidden. */
function picture(parent: HTMLElement, className: string): Picture {
	// Placed by `frameBox` alone: an `inset` here would fight its left and top.
	const box = layer(parent, className, 'position:absolute;overflow:hidden');
	const img = document.createElement('img');
	img.alt = '';
	img.draggable = false;
	img.style.cssText = 'position:absolute;display:none;max-width:none';
	box.appendChild(img);
	return { box, img };
}

function side(stage: HTMLElement, name: 'a' | 'b'): Side {
	const el = layer(stage, 'vf-side');
	el.dataset.side = name;
	const fill = layer(el, 'vf-fill');
	const plate = picture(el, 'vf-plate');
	const behind = layer(el, 'vf-behind');
	const subject = picture(el, 'vf-subject');
	return { el, fill, plate, behind, subject };
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
	const { clip, camera, radius } = layout;
	place(pic.box, clip);
	pic.box.style.borderRadius = radius ? `${radius}px` : '';
	place(pic.img, {
		x: camera.x - clip.x,
		y: camera.y - clip.y,
		width: camera.width,
		height: camera.height
	});
}

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
const FULL = { shot: 'full', params: {} };

/** Builds the layer tree in `stage` and mounts every clip of the segment. */
export function createProgramScene(
	stage: HTMLDivElement,
	seg: StageSegment,
	blocks: Record<string, Component<Record<string, unknown>>>
): ProgramScene {
	// On the stage too: fills and transition overlays use the brand's colours.
	applyLook(stage, seg);
	const a = side(stage, 'a');
	// Side b shows only inside a cut or shot transition window.
	const b = side(stage, 'b');
	b.el.style.display = 'none';
	const front = layer(stage, 'vf-clips');
	const overlay = layer(stage, 'vf-overlay', `${LAYER};pointer-events:none`);
	const player = createTransitionPlayer(overlay, seg.transitions, { size: seg.size, cls: seg.cls });

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
					? `position:absolute;left:0;top:0;width:${seg.size[0]}px;height:${seg.size[1]}px`
					: LAYER
			);
			root.dataset.clip = data.id;
			applyLook(root, seg);
			// Roots stay visible until the first seek: blocks may measure text when they mount.
			const controller: ClipController = {
				clip: new Clip({ ...data, footage: seg.footage, footageMap: seg.footageMap ?? undefined }),
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
					target: root,
					props: controller.clip.props,
					context: new Map([[MOTION_CONTEXT_KEY, controller]])
				});
			} catch (error) {
				throw clipError(data.id, error);
			}
			mounted.push({ data, controller, instance, shown: null });
			ready.push(...controller.ready);
		}
		flushSync();
	} catch (error) {
		for (const m of mounted) unmount(m.instance);
		throw error;
	}
	/** The plan of the frame last seeked. */
	let last: Plan | null = null;

	/** The extracted frames of the source a view shows; null without them. */
	const framesOf = (view: FootageView | null) => (view ? (seg.footage[view.source] ?? null) : null);

	/** The layout of a side showing `view`: the shot track at `f`, or `shot` alone. */
	function layoutFor(
		f: number,
		view: FootageView | null,
		shot?: Pick<ShotSpan, 'shot' | 'params'>
	) {
		const frames = framesOf(view);
		const input: Omit<ShotInput, 'params'> = {
			cls: seg.cls,
			size: seg.size,
			footage: frames ? [frames.width, frames.height] : null,
			subject:
				frames && view
					? sourceSubjectBox(frames, view.frame, Math.round(SUBJECT_SMOOTH * seg.fps))
					: null
		};
		return shot ? shotLayout(shot, input) : shotLayoutAt(seg.shots, f, input);
	}

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
		return { f, staged, ...sides, clips };
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

	function drawSide(s: Side, view: SideView, behind: boolean, pending: Promise<unknown>[]) {
		s.fill.style.background = view.layout.fill ? surface(seg) : '';
		frameBox(s.plate, view.layout);
		frameBox(s.subject, view.layout);
		const frames = framesOf(view.view);
		if (!view.view || !frames) {
			hide(s.plate.img);
			hide(s.subject.img);
			return;
		}
		const plate = show(s.plate.img, sourceFrameUrl(frames, view.view.frame, 'plate'));
		if (plate) pending.push(plate);
		// The subject covers behind clips only while one is on screen.
		if (behind && frames.subject) {
			const subject = show(s.subject.img, sourceFrameUrl(frames, view.view.frame, 'subject'));
			if (subject) pending.push(subject);
		} else hide(s.subject.img);
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
			});
			arrangeBehind(now);
			flushSync();
			for (const m of mounted) {
				if (m.shown === null) continue;
				try {
					for (const tl of m.controller.timelines) seekTimeline(tl, m.shown / seg.fps);
				} catch (error) {
					throw clipError(m.data.id, error);
				}
			}
			player.seek(f, (t) => sidesOf(now, t));
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
			drawSide(a, now.a, behindOn('a'), pending);
			if (now.b) drawSide(b, now.b, behindOn('b'), pending);
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
		destroy() {
			for (const m of mounted) unmount(m.instance);
			mounted.length = 0;
		}
	};
}
