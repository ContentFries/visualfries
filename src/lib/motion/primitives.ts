/**
 * Motion primitives: named entrances, exits and emphasis moves as pure functions of clip time.
 * Nothing here touches the DOM; `motion.ts` splits text, applies poses and records events.
 */
import { clamp, easeFn, lerp, type At, type Ease, type Energy } from './runtime.svelte.js';

export type Entrance =
	| 'fade'
	| 'pop'
	| 'slide'
	| 'scale'
	| 'rise'
	| 'drop'
	| 'reveal'
	| 'blur-in'
	| 'spring'
	| 'typewriter'
	| 'draw';
export type Emphasis =
	| 'pulse'
	| 'shake'
	| 'wiggle'
	| 'punch'
	| 'highlight'
	| 'underline'
	| 'strike'
	| 'glow';
/** The side a move comes from. */
export type Direction = 'left' | 'right' | 'up' | 'down';
export type Split = 'words' | 'chars' | 'lines';

export type EmphasisSpec = {
	move: Emphasis;
	/** Default: when the entrance has landed, or `at` without an entrance. */
	at?: At;
	duration?: number;
	/** Colour of highlight, underline, strike and glow. */
	color?: string;
};

export type CountSpec = {
	from?: number;
	to: number;
	/** Digits after the decimal point; default: as many as `to` has. */
	decimals?: number;
	/** Turns the value into text; default: en-US grouping ("12,400"). */
	format?: (value: number) => string;
};

export type MotionOptions = {
	enter?: Entrance;
	/** When the entrance (or, without one, the emphasis or count) starts. Default "start". */
	at?: At;
	/** Exits mirror the entrances; `draw` erases. */
	exit?: Entrance;
	/** When the element is gone. Default "end". */
	until?: At;
	emphasis?: Emphasis | EmphasisSpec | (Emphasis | EmphasisSpec)[];
	/** Seconds of the entrance and exit; default from the energy. */
	duration?: number;
	direction?: Direction;
	/** Seconds between split items (or drawn strokes); default from the energy. */
	stagger?: number;
	split?: Split;
	/** Multiplies distances, scales and shakes. Default 1. */
	intensity?: number;
	ease?: Ease;
	/** Overrides the clip's energy. */
	energy?: Energy;
	/** Count the element's text up to a number. */
	count?: number | CountSpec;
	/** Default colour of highlight, underline, strike and glow. */
	color?: string;
};

type EnergyRow = {
	/** Entrance seconds; exits take 0.8 of it and emphasis moves scale with it. */
	duration: number;
	/** Seconds between split items. */
	stagger: Record<Split, number>;
	/** Seconds per typed character. */
	type: number;
	/** Distance, scale and shake amplitude. */
	amount: number;
	ease: string;
	/** Strength of the overshoot in `pop`. */
	overshoot: number;
};

/** The one place where style energy changes motion. */
export const ENERGY: Record<Energy, EnergyRow> = {
	calm: {
		duration: 0.8,
		stagger: { words: 0.12, chars: 0.04, lines: 0.22 },
		type: 0.06,
		amount: 0.6,
		ease: 'power2.out',
		overshoot: 1.1
	},
	balanced: {
		duration: 0.55,
		stagger: { words: 0.08, chars: 0.025, lines: 0.15 },
		type: 0.045,
		amount: 1,
		ease: 'power3.out',
		overshoot: 1.7
	},
	punchy: {
		duration: 0.35,
		stagger: { words: 0.05, chars: 0.015, lines: 0.09 },
		type: 0.03,
		amount: 1.5,
		ease: 'expo.out',
		overshoot: 2.6
	}
};

/** Distances are fractions of the shorter clip side, so a resize keeps the same feel. */
const DIST = { slide: 0.3, rise: 0.08, drop: 0.1, blur: 0.02, shake: 0.012, glow: 0.02 };
/** Room a mask leaves around its box for italic overhang and descenders. */
export const MASK_OVERHANG = '0.35em';

/** What a moment of motion looks like; poses combine (offsets add, scales multiply). */
export type Pose = {
	x: number;
	y: number;
	scale: number;
	rotate: number;
	opacity: number;
	/** px */
	blur: number;
	/** Glow radius in px. */
	glow: number;
	/** Hidden fraction of each side (top, right, bottom, left), drawn as a clip-path. */
	hide: [number, number, number, number];
	/** Visible stretch of a stroke, as fractions of its length; null leaves the stroke alone. */
	draw: [number, number] | null;
	/** Not shown at all (typewriter). */
	hidden: boolean;
	/** Highlight, underline and strike sweeps: drawn fraction and where they start. */
	marks: { kind: 'highlight' | 'underline' | 'strike'; f: number; from: 'left' | 'right' }[];
	glowColor?: string;
	markColor?: Partial<Record<'highlight' | 'underline' | 'strike', string>>;
};

export const REST: Pose = {
	x: 0,
	y: 0,
	scale: 1,
	rotate: 0,
	opacity: 1,
	blur: 0,
	glow: 0,
	hide: [0, 0, 0, 0],
	draw: null,
	hidden: false,
	marks: []
};

export function combine(a: Pose, b: Partial<Pose>): Pose {
	return {
		x: a.x + (b.x ?? 0),
		y: a.y + (b.y ?? 0),
		scale: a.scale * (b.scale ?? 1),
		rotate: a.rotate + (b.rotate ?? 0),
		opacity: a.opacity * (b.opacity ?? 1),
		blur: a.blur + (b.blur ?? 0),
		glow: Math.max(a.glow, b.glow ?? 0),
		hide: b.hide ? (a.hide.map((h, i) => Math.max(h, b.hide![i])) as Pose['hide']) : a.hide,
		draw:
			b.draw && a.draw
				? [Math.max(a.draw[0], b.draw[0]), Math.min(a.draw[1], b.draw[1])]
				: (b.draw ?? a.draw),
		hidden: a.hidden || !!b.hidden,
		marks: b.marks ? [...a.marks, ...b.marks] : a.marks,
		glowColor: b.glowColor ?? a.glowColor,
		markColor: b.markColor ? { ...a.markColor, ...b.markColor } : a.markColor
	};
}

type Ctx = { dir: Direction; amount: number; unit: number; flip: boolean };
type MoveSpec = {
	ease: (r: EnergyRow) => string;
	/** Fraction of the move where its sound lands. */
	hit: number;
	/** Event names when entering and when leaving. */
	sound: [string, string];
	/** Duration relative to the energy's. */
	time?: number;
	/** Side it comes from; `direction` changes it only for slide and reveal. */
	from?: Direction;
	directional?: boolean;
	/** Exits keep travelling the same way (slide out the far side) instead of reversing. */
	through?: boolean;
	/** Pose at linear progress `p` and eased progress `e`: 0 = not yet in, 1 = at rest. */
	pose: (p: number, e: number, k: Ctx) => Partial<Pose>;
};

const shift = (dir: Direction, d: number) =>
	dir === 'left' ? { x: -d } : dir === 'right' ? { x: d } : dir === 'up' ? { y: -d } : { y: d };
const opposite = (dir: Direction): Direction =>
	({ left: 'right', right: 'left', up: 'down', down: 'up' })[dir] as Direction;
const inOut = (r: EnergyRow) => r.ease.replace('.out', '.inOut');

export const ENTRANCES: Record<Entrance, MoveSpec> = {
	fade: {
		ease: () => 'power1.out',
		hit: 0,
		sound: ['enter', 'exit'],
		pose: (_p, e) => ({ opacity: e })
	},
	pop: {
		ease: (r) => `back.out(${r.overshoot})`,
		hit: 0.35,
		sound: ['pop', 'pop'],
		pose: (p, e, k) => ({
			scale: lerp(Math.max(0, 1 - 0.5 * k.amount), 1, e),
			opacity: clamp(p * 4)
		})
	},
	slide: {
		ease: (r) => r.ease,
		hit: 0.4,
		sound: ['whoosh', 'whoosh'],
		from: 'left',
		directional: true,
		through: true,
		pose: (p, e, k) => ({
			...shift(k.dir, (1 - e) * DIST.slide * k.unit * k.amount),
			opacity: clamp(p * 3)
		})
	},
	scale: {
		ease: (r) => r.ease,
		hit: 0,
		sound: ['enter', 'exit'],
		pose: (p, e) => ({ scale: Math.max(0, e), opacity: clamp(p * 3) })
	},
	rise: {
		ease: (r) => r.ease,
		hit: 0,
		sound: ['enter', 'exit'],
		from: 'down',
		through: true,
		pose: (p, e, k) => ({
			...shift(k.dir, (1 - e) * DIST.rise * k.unit * k.amount),
			opacity: clamp(p * 2.5)
		})
	},
	drop: {
		ease: () => 'power3.in',
		hit: 1,
		sound: ['slam', 'whoosh'],
		from: 'up',
		through: true,
		pose: (p, e, k) => ({
			...shift(k.dir, (1 - e) * DIST.drop * k.unit * k.amount),
			opacity: clamp(p * 3)
		})
	},
	reveal: {
		ease: inOut,
		hit: 0,
		sound: ['wipe', 'wipe'],
		from: 'left',
		directional: true,
		through: true,
		// Coming from the left hides the right part, shrinking towards the right edge.
		pose: (_p, e, k) => ({ hide: hideSide(opposite(k.dir), 1 - clamp(e)) })
	},
	'blur-in': {
		ease: (r) => r.ease,
		hit: 0,
		sound: ['enter', 'exit'],
		pose: (_p, e, k) => ({
			opacity: clamp(e),
			blur: (1 - clamp(e)) * DIST.blur * k.unit * k.amount,
			scale: 1 + 0.06 * k.amount * (1 - e)
		})
	},
	spring: {
		ease: (r) => `elastic.out(${Math.max(1, r.amount)}, 0.4)`,
		hit: 0.15,
		time: 1.8,
		sound: ['pop', 'pop'],
		pose: (p, e, k) => ({
			scale: lerp(Math.max(0, 1 - 0.6 * k.amount), 1, e),
			opacity: clamp(p * 5)
		})
	},
	typewriter: {
		ease: () => 'none',
		hit: 0,
		sound: ['type', 'type'],
		pose: (p) => ({ hidden: p <= 0 })
	},
	draw: {
		ease: inOut,
		hit: 0,
		time: 1.8,
		sound: ['draw', 'draw'],
		through: true,
		// Exits erase from the start, so the stroke leaves the way it was drawn.
		pose: (_p, e, k) => ({ draw: k.flip ? [1 - clamp(e), 1] : [0, clamp(e)] })
	}
};

function hideSide(side: Direction, f: number): Pose['hide'] {
	const i = { up: 0, right: 1, down: 2, left: 3 }[side];
	const hide: Pose['hide'] = [0, 0, 0, 0];
	hide[i] = f;
	return hide;
}

type EmphasisMove = {
	time: number;
	hit: number;
	sound: string;
	/** Stays after it is drawn (a highlight), instead of settling back. */
	lasting?: boolean;
	ease?: string;
	pose: (p: number, u: number, e: number, k: Ctx, color?: string) => Partial<Pose>;
};

const mark =
	(kind: 'highlight' | 'underline' | 'strike') =>
	(_p: number, _u: number, e: number, k: Ctx, color?: string): Partial<Pose> => ({
		marks: [{ kind, f: clamp(e), from: k.dir === 'right' ? 'right' : 'left' }],
		markColor: color ? { [kind]: color } : undefined
	});

export const EMPHASES: Record<Emphasis, EmphasisMove> = {
	pulse: {
		time: 0.5,
		hit: 0.5,
		sound: 'pulse',
		pose: (p, _u, _e, k) => ({ scale: 1 + 0.1 * k.amount * Math.sin(Math.PI * p) })
	},
	punch: {
		time: 0.45,
		hit: 0.12,
		sound: 'slam',
		pose: (p, _u, _e, k) => ({
			scale:
				1 +
				0.22 *
					k.amount *
					(p < 0.12 ? Math.sin((p / 0.12) * (Math.PI / 2)) : (1 - (p - 0.12) / 0.88) ** 2)
		})
	},
	shake: {
		time: 0.5,
		hit: 0,
		sound: 'shake',
		pose: (p, u, _e, k) => ({
			x: DIST.shake * k.unit * k.amount * (1 - p) * Math.sin(2 * Math.PI * 11 * u),
			y: 0.5 * DIST.shake * k.unit * k.amount * (1 - p) * Math.sin(2 * Math.PI * 17 * u + 1)
		})
	},
	wiggle: {
		time: 0.7,
		hit: 0,
		sound: 'wiggle',
		pose: (p, _u, _e, k) => ({ rotate: 6 * k.amount * (1 - p) * Math.sin(2 * Math.PI * 2.5 * p) })
	},
	highlight: {
		time: 0.45,
		hit: 0,
		sound: 'highlight',
		lasting: true,
		ease: 'power2.inOut',
		pose: mark('highlight')
	},
	underline: {
		time: 0.4,
		hit: 0,
		sound: 'underline',
		lasting: true,
		ease: 'power2.inOut',
		pose: mark('underline')
	},
	strike: {
		time: 0.35,
		hit: 0,
		sound: 'strike',
		lasting: true,
		ease: 'power3.out',
		pose: mark('strike')
	},
	glow: {
		time: 0.5,
		hit: 0,
		sound: 'glow',
		lasting: true,
		ease: 'power2.out',
		pose: (_p, _u, e, k, color) => ({
			glow: clamp(e) * DIST.glow * k.unit * k.amount,
			glowColor: color
		})
	}
};

/** One phase of a plan: the same move on every item, item `i` starting at `starts[i]`. */
type Phase = {
	move: Entrance;
	spec: MoveSpec;
	starts: number[];
	duration: number;
	ease: (x: number) => number;
	ctx: Ctx;
};

type PlannedEmphasis = {
	move: Emphasis;
	start: number;
	duration: number;
	ease: (x: number) => number;
	color?: string;
};

export type MotionPlan = {
	items: number;
	enter: Phase | null;
	exit: Phase | null;
	emphasis: PlannedEmphasis[];
	count: {
		start: number;
		duration: number;
		from: number;
		to: number;
		ease: (x: number) => number;
		format: (v: number) => string;
	} | null;
	ctx: Ctx;
	energy: Energy;
	amount: number;
	/** Whether the entrance or exit transforms items (so they cannot stay `display: inline`). */
	transforms: boolean;
};

export type PlanClip = {
	id: string;
	at: (at: At) => number;
	width: number;
	height: number;
	energy: Energy;
};

const ENTRANCE_NAMES = Object.keys(ENTRANCES) as Entrance[];
const EMPHASIS_NAMES = Object.keys(EMPHASES) as Emphasis[];
const SPLITS: Split[] = ['words', 'chars', 'lines'];
const DIRECTIONS: Direction[] = ['left', 'right', 'up', 'down'];

function known<T extends string>(clipId: string, what: string, value: unknown, list: T[]): T {
	if (!list.includes(value as T))
		throw new Error(
			`Clip "${clipId}": unknown ${what} ${JSON.stringify(value)}. Use ${list.join(', ')}.`
		);
	return value as T;
}

/** Every default the options leave open, resolved once at setup. */
export function planMotion(clip: PlanClip, o: MotionOptions, items: number): MotionPlan {
	const energy = o.energy
		? known(clip.id, 'energy', o.energy, Object.keys(ENERGY) as Energy[])
		: clip.energy;
	const row = ENERGY[energy];
	const amount = row.amount * (o.intensity ?? 1);
	const unit = Math.min(clip.width, clip.height);
	if (o.split !== undefined) known(clip.id, 'split', o.split, SPLITS);
	if (o.direction !== undefined) known(clip.id, 'direction', o.direction, DIRECTIONS);
	const stagger =
		o.stagger ??
		(o.enter === 'typewriter' || o.exit === 'typewriter'
			? row.type
			: o.split
				? row.stagger[o.split]
				: row.stagger.words);
	const at = clip.at(o.at ?? 'start');

	const phase = (name: Entrance, leaving: boolean): Phase => {
		const move = known(clip.id, leaving ? 'exit' : 'entrance', name, ENTRANCE_NAMES);
		const spec = ENTRANCES[move];
		const base = spec.from ?? 'left';
		const dir = spec.directional ? (o.direction ?? base) : base;
		const duration =
			move === 'typewriter'
				? 0
				: (o.duration ?? row.duration * (spec.time ?? 1) * (leaving ? 0.8 : 1));
		const starts = Array.from({ length: items }, (_, i) => {
			if (!leaving) return at + i * stagger;
			// Everything is gone at `until`; typing backs out from the last character.
			const until = clip.at(o.until ?? 'end');
			const order = move === 'typewriter' ? items - 1 - i : i;
			return until - duration - (items - 1 - order) * stagger;
		});
		return {
			move,
			spec,
			starts,
			duration,
			ease: easeFn(o.ease ?? spec.ease(row)),
			ctx: {
				dir: leaving && spec.through ? opposite(dir) : dir,
				amount,
				unit,
				flip: leaving && !!spec.through
			}
		};
	};
	const enter = o.enter ? phase(o.enter, false) : null;
	const exit = o.exit ? phase(o.exit, true) : null;
	const landed = enter ? at + enter.duration + (items - 1) * stagger : at;
	const scale = row.duration / ENERGY.balanced.duration;

	const list =
		o.emphasis === undefined ? [] : Array.isArray(o.emphasis) ? o.emphasis : [o.emphasis];
	const emphasis = list.map((e): PlannedEmphasis => {
		const s: EmphasisSpec = typeof e === 'string' ? { move: e } : e;
		const move = known(clip.id, 'emphasis', s.move, EMPHASIS_NAMES);
		const m = EMPHASES[move];
		return {
			move,
			start: s.at !== undefined ? clip.at(s.at) : landed,
			duration: s.duration ?? m.time * scale,
			ease: easeFn(m.ease ?? 'none'),
			color: s.color ?? o.color
		};
	});

	let count: MotionPlan['count'] = null;
	if (o.count !== undefined) {
		const c: CountSpec = typeof o.count === 'number' ? { to: o.count } : o.count;
		if (typeof c.to !== 'number' || !Number.isFinite(c.to))
			throw new Error(`Clip "${clip.id}": count needs a number to count to.`);
		const decimals = c.decimals ?? String(c.to).split('.')[1]?.length ?? 0;
		const fmt = new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		});
		count = {
			start: at,
			duration: o.duration ?? row.duration * 2.2,
			from: c.from ?? 0,
			to: c.to,
			ease: easeFn(o.ease ?? row.ease),
			format: c.format ?? ((v) => fmt.format(v))
		};
	}

	// Fade, reveal, typewriter and draw leave the box alone, so inline text can stay inline.
	const transforms = [enter?.move, exit?.move].some(
		(m) => m && !['fade', 'reveal', 'typewriter', 'draw'].includes(m)
	);
	return {
		items,
		enter,
		exit,
		emphasis,
		count,
		ctx: { dir: o.direction ?? 'left', amount, unit, flip: false },
		energy,
		amount,
		transforms
	};
}

function phasePose(ph: Phase, item: number, t: number, leaving: boolean): Partial<Pose> {
	const start = ph.starts[item];
	let p: number;
	if (ph.duration > 0) p = clamp((t - start) / ph.duration);
	else p = t >= start ? 1 : 0;
	// An exit is its entrance played backwards: progress runs from rest (1) to gone (0).
	if (leaving) p = 1 - p;
	return ph.spec.pose(p, ph.duration > 0 ? ph.ease(p) : p, ph.ctx);
}

/** Pose of split item `item` at clip time `t`: entrance and exit. */
export function itemPose(plan: MotionPlan, item: number, t: number): Pose {
	let pose = REST;
	if (plan.enter) pose = combine(pose, phasePose(plan.enter, item, t, false));
	if (plan.exit) pose = combine(pose, phasePose(plan.exit, item, t, true));
	return pose;
}

/** Pose of the element itself at clip time `t`: emphasis moves. */
export function emphasisPose(plan: MotionPlan, t: number): Pose {
	let pose = REST;
	for (const e of plan.emphasis) {
		const m = EMPHASES[e.move];
		const u = t - e.start;
		if (u < 0 || (!m.lasting && u >= e.duration)) continue;
		const p = e.duration > 0 ? clamp(u / e.duration) : 1;
		pose = combine(pose, m.pose(p, u, e.ease(p), plan.ctx, e.color));
	}
	return pose;
}

/** Text of a counter at clip time `t`. */
export function countText(plan: MotionPlan, t: number): string | null {
	const c = plan.count;
	if (!c) return null;
	const p = c.duration > 0 ? clamp((t - c.start) / c.duration) : t >= c.start ? 1 : 0;
	return c.format(lerp(c.from, c.to, c.ease(p)));
}

export type PlannedEvent = {
	name: string;
	t: number;
	move: string;
	phase: 'enter' | 'exit' | 'emphasis' | 'count';
	item?: number;
	items?: number;
	intensity: number;
};

/** The events a plan emits: one per item and phase, one per emphasis, a tick per counter change. */
export function planEvents(plan: MotionPlan, fps: number): PlannedEvent[] {
	const out: PlannedEvent[] = [];
	const intensity = plan.amount;
	for (const [ph, leaving] of [
		[plan.enter, false],
		[plan.exit, true]
	] as const) {
		if (!ph) continue;
		ph.starts.forEach((start, item) => {
			// Played backwards, an exit lands its hit mirrored.
			const hit = leaving ? 1 - ph.spec.hit : ph.spec.hit;
			out.push({
				name: ph.spec.sound[leaving ? 1 : 0],
				t: start + ph.duration * hit,
				move: ph.move,
				phase: leaving ? 'exit' : 'enter',
				item,
				items: plan.items,
				intensity
			});
		});
	}
	for (const e of plan.emphasis) {
		const m = EMPHASES[e.move];
		out.push({
			name: m.sound,
			t: e.start + e.duration * m.hit,
			move: e.move,
			phase: 'emphasis',
			intensity
		});
	}
	const c = plan.count;
	if (c) {
		// A tick on every frame where the shown number changes.
		let last = countText(plan, c.start);
		const first = Math.ceil(c.start * fps - 1e-9);
		const lastFrame = Math.ceil((c.start + c.duration) * fps);
		for (let f = first + 1; f <= lastFrame; f++) {
			const text = countText(plan, f / fps);
			if (text !== last)
				out.push({ name: 'tick', t: f / fps, move: 'count', phase: 'count', intensity });
			last = text;
		}
	}
	return out;
}
