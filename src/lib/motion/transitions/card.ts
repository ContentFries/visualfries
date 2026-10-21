import { easeOf } from '../ease.js';
import { checkKnown, checkNumber, numberParam } from '../shots/layout.js';
import { checkChoice, choiceParam, isSolid, originOf, px, ramp, smooth } from './common.js';
import type { ScreenDirection, TransitionModule, TransitionSides } from './contract.js';

/**
 * Card: the incoming picture arrives as a card (smaller, with rounded corners and a shadow) that
 * slides in along `direction` or flips in, lands in the middle of the frame, and grows to fill
 * it while the outgoing picture dims behind it. `params.side: "out"` plays it backwards for the
 * outgoing picture: it shrinks into a card that slides or flips away over the incoming one.
 *
 * The picture under the card always fills the frame, so no corner of the stage shows; the card's
 * corners clip its own picture (the clips riding it move with it).
 *
 * Params: `side` ("in" or "out", default "in"; a clip transition always brings its clip in),
 * `motion` ("slide" or "flip"), `scale` (the card's size as a share of the frame, default 0.62),
 * `radius` (corner radius in pixels of a 1080 px frame, default 44), `shadow` (strength, 0–1,
 * default 0.4) and `dim` (how far the picture behind the card darkens, 0–1, default 0.45).
 */

/** The card lands halfway; then it grows to full frame (or, backwards, shrinks and leaves). */
const MID = 0.5;
const MOTIONS = ['slide', 'flip'] as const;
const SIDES = ['in', 'out'] as const;

const land = easeOf('power4.out');
const grow = easeOf('power3.inOut');
/** Points per rounded corner of the outline; the camera distance of a flip, px of a 1080 px frame. */
const ARC = 8;
/** How far past the frame edge the card starts, in frame lengths along the travel. */
const AWAY = 0.25;
const PERSPECTIVE = 2400;
const horizontal = (d: ScreenDirection | null) => d === 'left' || d === 'right' || d === null;
/** +1 when the travel runs right or down. */
const sign = (d: ScreenDirection | null) => (d === 'right' || d === 'down' ? 1 : -1);

/** Where the card is and how it looks, for `a` from 0 (away) through `MID` (landed) to 1 (frame). */
export type CardPose = {
	/** Offset from the frame's centre, pixels. */
	x: number;
	y: number;
	scale: number;
	/** Degrees about the axis across the travel (flip only). */
	turn: number;
	/** Screen pixels at the card's size. */
	radius: number;
	/** 0–1: how much of the shadow shows. */
	lift: number;
};

/**
 * The card's pose at `a` (0: off the frame or edge on, `MID`: landed, 1: the full frame). The
 * same curve read backwards is the outgoing card of `side: "out"`.
 */
export function cardPose(
	a: number,
	o: {
		motion: 'slide' | 'flip';
		direction: ScreenDirection | null;
		size: [number, number];
		scale: number;
		radius: number;
	}
): CardPose {
	const { motion, direction, size, scale, radius } = o;
	const arrive = Math.min(1, a / MID);
	const expand = Math.max(0, (a - MID) / (1 - MID));
	const s = scale + (1 - scale) * grow(expand);
	const pose: CardPose = {
		x: 0,
		y: 0,
		scale: s,
		turn: 0,
		radius: radius * (1 - grow(expand)),
		lift: 1 - smooth(expand)
	};
	if (motion === 'flip') {
		// Edge on at the start, facing the camera when it lands.
		pose.turn = 90 * (1 - land(arrive)) * sign(direction);
		return pose;
	}
	// From past the frame edge it travels from, against the travel: far enough that on the first
	// frame of a window (and, backwards, the last) at most a sliver of it shows.
	const along = horizontal(direction) ? size[0] : size[1];
	const away = -sign(direction) * along * (0.5 + scale / 2 + AWAY);
	// Plus zero: a landed card sits at 0, never -0.
	const offset = away * (1 - land(arrive)) + 0;
	if (horizontal(direction)) pose.x = offset;
	else pose.y = offset;
	return pose;
}

/** The card's transform, about the frame's centre. */
function cardTransform(pose: CardPose, direction: ScreenDirection | null, unit: number): string {
	const axis = horizontal(direction) ? 'rotateY' : 'rotateX';
	const flip = pose.turn
		? ` perspective(${px(PERSPECTIVE * unit)}px) ${axis}(${pose.turn.toFixed(3)}deg)`
		: '';
	return `translate(${px(pose.x)}px, ${px(pose.y)}px)${flip} scale(${pose.scale.toFixed(4)})`;
}

/** Corner radius and shadow, drawn before the scale: divided by it to get screen pixels. */
function cardLook(el: HTMLElement, pose: CardPose, shadow: number, unit: number) {
	// Every property on every frame, neutral values included: the order styles are written in
	// stays the same whatever frame came before.
	const round = pose.radius > 0.05;
	el.style.borderRadius = round ? `${px(pose.radius / pose.scale)}px` : '0px';
	el.style.overflow = round ? 'hidden' : 'visible';
	const a = shadow * pose.lift;
	el.style.boxShadow =
		a > 0.005
			? `0px ${px((24 * unit) / pose.scale)}px ${px((120 * unit) / pose.scale)}px rgba(0, 0, 0, ${a.toFixed(3)})`
			: 'none';
}

/**
 * The card's outline on screen, `inset` pixels inside its edge, as a polygon: its rounded
 * rectangle (the frame, scaled about its centre) turned and projected the way `cardTransform`
 * draws it.
 */
export function cardOutline(
	pose: CardPose,
	direction: ScreenDirection | null,
	size: [number, number],
	unit: number,
	inset = 0
): [number, number][] {
	const [w, h] = size;
	const i = inset / pose.scale;
	const r = Math.max(0, Math.min(pose.radius / pose.scale - i, w / 2 - i, h / 2 - i));
	const corners: [number, number, number][] = [
		[w - i - r, i + r, -90],
		[w - i - r, h - i - r, 0],
		[i + r, h - i - r, 90],
		[i + r, i + r, 180]
	];
	const local: [number, number][] = [];
	for (const [cx, cy, from] of corners)
		for (let k = 0; k <= ARC; k++) {
			const a = ((from + (90 * k) / ARC) * Math.PI) / 180;
			local.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
		}
	const t = (pose.turn * Math.PI) / 180;
	const p = PERSPECTIVE * unit;
	const across = horizontal(direction);
	return local.map(([x, y]) => {
		const qx = (x - w / 2) * pose.scale;
		const qy = (y - h / 2) * pose.scale;
		// rotateY: x cos t, depth −x sin t; rotateX: y cos t, depth y sin t; then perspective.
		const z = across ? -qx * Math.sin(t) : qy * Math.sin(t);
		const d = pose.turn ? 1 - z / p : 1;
		const X = (across ? qx * Math.cos(t) : qx) / d;
		const Y = (across ? qy : qy * Math.cos(t)) / d;
		return [px(w / 2 + X + pose.x), px(h / 2 + Y + pose.y)];
	});
}

export const card: TransitionModule = {
	name: 'card',
	defaultDuration: 0.9,
	ease: 'none',
	directional: true,
	events: [{ kind: 'transition', at: MID }],
	check: (params) => [
		...checkKnown(params, ['side', 'motion', 'scale', 'radius', 'shadow', 'dim']),
		...checkChoice(params, 'side', [...SIDES]),
		...checkChoice(params, 'motion', [...MOTIONS]),
		...checkNumber(params, 'scale', 0.2, 0.95),
		...checkNumber(params, 'radius', 0, 300),
		...checkNumber(params, 'shadow', 0, 1),
		...checkNumber(params, 'dim', 0, 1)
	],
	setup(overlay) {
		// The outgoing card's shadow, above the incoming picture (`side: "out"`): an outer shadow
		// paints only outside its box, so the card itself stays clear.
		const shadow = document.createElement('div');
		shadow.dataset.shadow = '';
		shadow.style.cssText = 'position:absolute;inset:0';
		overlay.appendChild(shadow);
	},
	apply({ eased, direction, params, out, in: incoming, kind, size, overlay }) {
		const unit = Math.min(size[0], size[1]) / 1080;
		const options = {
			motion: choiceParam(params, 'motion', MOTIONS, 'slide'),
			direction,
			size,
			scale: numberParam(params, 'scale', 0.62),
			radius: numberParam(params, 'radius', 44) * unit
		};
		const shadow = numberParam(params, 'shadow', 0.4);
		const dim = numberParam(params, 'dim', 0.45);
		// A clip transition always brings its clip in: the layers below it stay.
		const backwards = kind !== 'clip' && choiceParam(params, 'side', SIDES, 'in') === 'out';
		/** Everything but the card, in `el`'s own box (a pixel inside the card's edge). */
		const outside = (el: HTMLElement, pose: CardPose) => {
			const o = originOf(el);
			const [w, h] = size;
			const hole = cardOutline(pose, direction, size, unit, 1)
				.map(([x, y], k) => `${k ? 'L' : 'M'}${px(x - o.x)} ${px(y - o.y)}`)
				.join('');
			return `path(evenodd, 'M${-o.x} ${-o.y}H${w - o.x}V${h - o.y}H${-o.x}Z${hole}Z')`;
		};
		const shading = (shade: number) => (shade < 0.999 ? `brightness(${shade.toFixed(4)})` : '');
		if (!backwards) {
			const pose = cardPose(eased, options);
			for (const el of incoming) {
				el.style.transform = cardTransform(pose, direction, unit);
				if (isSolid(el)) cardLook(el, pose, shadow, unit);
			}
			if (kind === 'clip') return;
			// Dims as the card arrives, brightens as it fills the frame. Clips leaving with the
			// outgoing side sit above the card: they are cut where it is, as if under it.
			const shade = 1 - dim * (Math.min(1, eased / MID) * (1 - smooth(ramp(eased, MID, 1))));
			for (const el of out) {
				el.style.filter = shading(shade);
				if (!isSolid(el)) el.style.clipPath = outside(el, pose);
			}
			return;
		}
		// Backwards: the outgoing picture shrinks into the card (the curve from 1 down to MID),
		// then leaves the way it would have come in (MID down to 0). The incoming side (and the
		// clips arriving with it) is drawn above it, so it shows the card through a hole of the
		// card's shape, a pixel smaller: the card's own edge stays under the incoming picture,
		// never over the empty stage. The overlay draws the card's shadow around the hole.
		const pose = cardPose(1 - eased, options);
		pose.x = -pose.x;
		pose.y = -pose.y;
		pose.turn = -pose.turn;
		const transform = cardTransform(pose, direction, unit);
		for (const el of out) {
			el.style.transform = transform;
			if (isSolid(el)) cardLook(el, { ...pose, lift: 0 }, 0, unit);
		}
		const shade = 1 - dim * (1 - smooth(ramp(eased, MID, 1)));
		for (const el of incoming) {
			el.style.clipPath = outside(el, pose);
			el.style.filter = shading(shade);
		}
		const lifted = overlay.querySelector<HTMLElement>('[data-shadow]')!;
		lifted.style.transform = transform;
		cardLook(lifted, pose, shadow, unit);
	},
	release({ out, in: incoming }: TransitionSides) {
		for (const el of [...out, ...incoming]) {
			el.style.transform = '';
			el.style.borderRadius = '';
			el.style.overflow = '';
			el.style.boxShadow = '';
			el.style.filter = '';
			el.style.clipPath = '';
		}
	}
};
