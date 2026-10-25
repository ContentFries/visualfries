import type { SafeInsets } from './format.js';
import type { Rect } from './shots/layout.js';
import { intersect } from './text-over-face.js';

/**
 * Whether a clip's content fits the frame: how much of what it paints the frame edge cuts off,
 * how much of its text lies outside the format's safe zone, and whether a clip that covers the
 * whole frame leaves most of it empty. A block written in fixed pixels for one frame size shows
 * all three in another. Pure geometry on boxes in stage pixels; the stage measures the boxes in
 * the page (see `measure` in `program-stage.ts`).
 */

/** Share of a clip's content that reaches into the frame and lies outside it, from which `check` warns. */
export const CUT_SHARE = 0.25;
/** Share of a clip's text outside the safe zone (and inside the frame) from which `check` warns. */
export const SAFE_TEXT_SHARE = 0.5;
/** Seconds the content must stay so: a card sliding in or out passes the edge for less. */
export const FIT_SECONDS = 1;
/**
 * A clip that covers the frame looks laid out for another size when, along the frame's long
 * axis, its content starts within `EMPTY_START` of the edge and ends before `EMPTY_REACH` of the
 * frame and before the length of its short side (where a frame of the other orientation would
 * end), while it spans at least `EMPTY_FILL` of the short side across and reaches at least
 * `EMPTY_FILL` of its length along: a 1920 × 1080 layout in a 1080 × 1920 frame fills the width
 * of the top half and stops. A short list or a headline in a corner is not a layout.
 */
export const EMPTY_START = 0.12;
export const EMPTY_REACH = 0.6;
export const EMPTY_FILL = 0.5;

const area = (r: Rect) => r.width * r.height;
const endX = (r: Rect) => r.x + r.width;
const endY = (r: Rect) => r.y + r.height;

export type Edge = 'left' | 'right' | 'top' | 'bottom';

/**
 * The share (0–1) of the area of `boxes` that lies outside `frame`, counting only boxes that
 * reach into it (content parked off the frame, such as the next panel of a pan or a card
 * waiting to slide in, is left out), and the frame edges the cut content lies past, most first.
 * Nested boxes count each.
 */
export function cutShare(boxes: Rect[], frame: Rect): { share: number; edges: Edge[] } {
	let total = 0;
	let inside = 0;
	const past: Record<Edge, number> = { left: 0, right: 0, top: 0, bottom: 0 };
	for (const b of boxes) {
		const on = intersect(b, frame);
		if (!on || !area(b)) continue;
		total += area(b);
		inside += area(on);
		past.left += Math.max(0, frame.x - b.x) * b.height;
		past.right += Math.max(0, endX(b) - endX(frame)) * b.height;
		past.top += Math.max(0, frame.y - b.y) * b.width;
		past.bottom += Math.max(0, endY(b) - endY(frame)) * b.width;
	}
	const edges = (Object.keys(past) as Edge[])
		.filter((e) => past[e] > 0)
		.sort((a, b) => past[b] - past[a]);
	return { share: total ? 1 - inside / total : 0, edges };
}

/**
 * The safe zone of a format as boxes in stage pixels: above `notchY` the right inset is
 * `rightUpper`, below it `right` (see `SafeInsets`).
 */
export function safeBoxes(size: [number, number], safe: SafeInsets): Rect[] {
	const [w, h] = size;
	const bottom = h - safe.bottom;
	const notch = Math.max(safe.top, Math.min(bottom, safe.notchY));
	const boxes: Rect[] = [
		{ x: safe.left, y: safe.top, width: w - safe.left - safe.rightUpper, height: notch - safe.top },
		{ x: safe.left, y: notch, width: w - safe.left - safe.right, height: bottom - notch }
	];
	return boxes.filter((b) => b.width > 0 && b.height > 0);
}

/**
 * The share (0–1) of the area of the text boxes `boxes` inside `frame` that lies outside the
 * safe zone `safe` (boxes, see `safeBoxes`). Text outside the frame is left to `cutShare`.
 */
export function outsideSafe(boxes: Rect[], frame: Rect, safe: Rect[]): number {
	let total = 0;
	let inside = 0;
	for (const b of boxes) {
		const on = intersect(b, frame);
		if (!on) continue;
		total += area(on);
		for (const s of safe) {
			const kept = intersect(on, s);
			if (kept) inside += area(kept);
		}
	}
	return total ? 1 - inside / total : 0;
}

/** The box around the parts of `boxes` inside `frame`; null when none is inside. */
export function contentReach(boxes: Rect[], frame: Rect): Rect | null {
	let out: Rect | null = null;
	for (const b of boxes) {
		const on = intersect(b, frame);
		if (!on) continue;
		if (!out) {
			out = on;
			continue;
		}
		const x = Math.min(out.x, on.x);
		const y = Math.min(out.y, on.y);
		out = {
			x,
			y,
			width: Math.max(endX(out), endX(on)) - x,
			height: Math.max(endY(out), endY(on)) - y
		};
	}
	return out;
}

/** Bins across each axis of the frame where `addReach` sums a clip's content area. */
const REACH_BINS = 48;
/**
 * The share of a clip's content area at each end of an axis that `reachBox` leaves out: a
 * small label in a corner does not stretch a layout's reach over the whole frame.
 */
export const REACH_TRIM = 0.05;

/** A clip's content area summed over the frames it shows, per bin across each axis. */
export type Reach = { x: number[]; y: number[] };

export const newReach = (): Reach => ({
	x: new Array(REACH_BINS).fill(0),
	y: new Array(REACH_BINS).fill(0)
});

/** Adds the area of the parts of `boxes` inside `frame` to `reach`, spread over the bins. */
export function addReach(reach: Reach, boxes: Rect[], frame: Rect) {
	const spread = (bins: number[], from: number, to: number, length: number, weight: number) => {
		const bin = length / REACH_BINS;
		const last = Math.min(REACH_BINS - 1, Math.floor(to / bin));
		for (let i = Math.max(0, Math.floor(from / bin)); i <= last; i++) {
			const overlap = Math.min(to, (i + 1) * bin) - Math.max(from, i * bin);
			if (overlap > 0) bins[i] += overlap * weight;
		}
	};
	for (const b of boxes) {
		const on = intersect(b, frame);
		if (!on) continue;
		spread(reach.x, on.x - frame.x, endX(on) - frame.x, frame.width, on.height);
		spread(reach.y, on.y - frame.y, endY(on) - frame.y, frame.height, on.width);
	}
}

/**
 * The box holding all but `REACH_TRIM` of the content area summed in `reach` at each end of each
 * axis, in the coordinates of `frame`; null without content.
 */
export function reachBox(reach: Reach, frame: Rect): Rect | null {
	const span = (bins: number[], length: number): [number, number] | null => {
		const total = bins.reduce((s, v) => s + v, 0);
		if (!total) return null;
		const bin = length / REACH_BINS;
		const at = (share: number) => {
			let sum = 0;
			for (let i = 0; i < bins.length; i++) {
				if (bins[i] && sum + bins[i] >= share * total)
					return (i + (share * total - sum) / bins[i]) * bin;
				sum += bins[i];
			}
			return length;
		};
		return [at(REACH_TRIM), at(1 - REACH_TRIM)];
	};
	const x = span(reach.x, frame.width);
	const y = span(reach.y, frame.height);
	if (!x || !y) return null;
	return { x: frame.x + x[0], y: frame.y + y[0], width: x[1] - x[0], height: y[1] - y[0] };
}

/**
 * Whether content reaching `reach` (see `reachBox`) leaves most of a frame of `size` empty the
 * way a layout for another size does (see `EMPTY_START`): the long axis, the content's span on
 * it and the share left empty past it, or null. A square frame has no other orientation.
 */
export function emptyPart(
	reach: Rect | null,
	size: [number, number]
): { axis: 'x' | 'y'; from: number; to: number; empty: number } | null {
	if (!reach) return null;
	const [w, h] = size;
	if (Math.max(w, h) / Math.min(w, h) < 1.1) return null;
	const axis = h > w ? 'y' : 'x';
	const long = Math.max(w, h);
	const short = Math.min(w, h);
	const from = axis === 'y' ? reach.y : reach.x;
	const to = axis === 'y' ? endY(reach) : endX(reach);
	const across = axis === 'y' ? reach.width : reach.height;
	const laidOut = across >= EMPTY_FILL * short && to >= EMPTY_FILL * short;
	if (!laidOut || from > EMPTY_START * long || to > Math.min(EMPTY_REACH * long, short))
		return null;
	return { axis, from: Math.round(from), to: Math.round(to), empty: 1 - to / long };
}

export type FitFinding =
	| { kind: 'cut'; share: number; edges: Edge[] }
	| { kind: 'safe'; share: number }
	| { kind: 'empty'; axis: 'x' | 'y'; from: number; to: number; empty: number };

const CUT = 'of its content lies outside the frame';
const SAFE = 'of its text lies outside the safe zone';
const EMPTY = 'it covers the whole frame but leaves';

/**
 * A `check` warning for a clip whose content does not fit the frame, worded for a block laid
 * out in fixed pixels for another size. It stays a warning: the agent looks at a still and
 * decides.
 */
export function frameFitMessage(
	found: { clip: string; block: string; frame: number; finding: FitFinding },
	format: { size: [number, number]; class: string; safe: SafeInsets },
	fps: number
): string {
	const at = `${(found.frame / fps).toFixed(2)} s`;
	const [w, h] = format.size;
	const head = `Clip "${found.clip}" (${found.block}):`;
	const when = `from ${at} (program time) on, for ${FIT_SECONDS} s or more in the frames checked`;
	const look = `Look at a still at ${at} before deciding.`;
	const sized = `Lay it out from the clip's size instead of fixed pixels (percentages or container units, the --safe-* insets, or its own layout for clip.format.class "${format.class}").`;
	const f = found.finding;
	if (f.kind === 'cut')
		return `${head} ${Math.round(f.share * 100)} % ${CUT} (past the ${f.edges.slice(0, 2).join(' and ')} edge${f.edges.length > 1 ? 's' : ''} of the ${w}×${h} frame) ${when}. Content that only reaches into the frame is cut by its edge; it looks laid out for another frame size. ${sized} ${look}`;
	if (f.kind === 'safe') {
		const s = format.safe;
		const notch =
			s.rightUpper !== s.right ? `, ${s.rightUpper} px on the right above y ${s.notchY}` : '';
		return `${head} ${Math.round(f.share * 100)} % ${SAFE} of the ${w}×${h} format (insets: top ${s.top}, right ${s.right}, bottom ${s.bottom}, left ${s.left} px${notch}) ${when}; platform buttons and captions may cover it there. Keep text inside the --safe-* insets. ${look}`;
	}
	const span = f.axis === 'y' ? `y ${f.from}–${f.to} of ${h} px` : `x ${f.from}–${f.to} of ${w} px`;
	const side = f.axis === 'y' ? 'bottom' : 'right';
	return `${head} ${EMPTY} the ${side} ${Math.round(f.empty * 100)} % of it empty: its content only reaches ${span} ${when}. It looks laid out for another frame size. ${sized} ${look}`;
}

/** The clip and the kind of a frame-fit warning; null for any other message. */
export function frameFitKey(message: string): string | null {
	const m = /^Clip "(.*?)" \(.*?\): (.*)$/s.exec(message);
	if (!m) return null;
	const kind = [CUT, SAFE, EMPTY].find((k) => m[2].includes(k));
	return kind ? `${m[1]}\u0000${kind}` : null;
}
