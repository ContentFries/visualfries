import { easeOf } from '../ease.js';
import { programFootageAt, type FootageMap } from '../footage-map.js';
import type { SubjectBox } from '../resolve.js';
import { roundRect, SUBJECT_SMOOTH, type Rect, type ShotLayout } from './layout.js';

/**
 * The speaker away from the frame: in a shot that draws the speaker cut out by the matte, an
 * `away` range slides the footage picture (the room, the cut-out, subject layers of clips) off
 * one edge of the frame and back. Behind clips, front clips and the shot's slots stay where
 * they are, so the world behind the speaker holds still while he leaves. Pure: the distance
 * comes from where the matte reaches at the frame, so the speaker just clears the frame in any
 * format, on top of the shot's keys and morphs.
 */

const AWAY_SIDES = ['left', 'right', 'bottom'] as const;
type AwaySide = (typeof AWAY_SIDES)[number];

/** The way out when the project does not say: fast, speeding up until he is gone. */
export const AWAY_EXIT = { seconds: 0.16, ease: 'power2.in' };
/** The way back in: fast, settling into place. */
export const AWAY_ENTER = { seconds: 0.22, ease: 'expo.out' };

/**
 * Room left between the speaker and the frame's edge once he is gone, as a share of the frame's
 * shorter side: the matte's soft edge and a stray hair stay out too.
 */
const MARGIN = 0.02;

/**
 * A source frame: the picture the program shows at a frame, and the source frames around it
 * (`first`–`last`) the program shows in one run with it, at most two subject smoothing windows
 * either way. A decision reads the matte of those frames only: every program extracts them, so
 * a full program and its excerpts decide alike, whatever else each extracts.
 */
export type AwayLook = { source: string; frame: number; first: number; last: number };

/** A resolved away range of a shot, in program frames. */
export type ShotAway = {
	/** From this frame the speaker is wholly off the frame: the exit ends here. */
	from: number;
	/** The frame the way back in starts; null: away to the shot's end (and through a morph out). */
	until: number | null;
	/** Null: the edge nearest to the speaker where each move starts (see `awayAt`). */
	side: AwaySide | null;
	/** A range from the shot's first frame has no exit (0 frames): it starts away. */
	exit: { frames: number; ease: string };
	enter: { frames: number; ease: string };
	/**
	 * Without a `side`: the picture the whole program shows where each move decides it (see
	 * `awayAt`), so a segment or an excerpt that does not show that frame decides the same way.
	 * Null where there is no footage, or no way back (`until` null). Set by `awayLooks`.
	 */
	looks?: { exit: AwayLook | null; enter: AwayLook | null };
};

/** A box in 0–1 fractions of the footage frame. */
export type Box = Pick<SubjectBox, 'x' | 'y' | 'width' | 'height'>;

type AwayState = {
	/** How far along the way off the frame: 0 in place, 1 wholly off. */
	p: number;
	range: ShotAway;
	/**
	 * The program frame whose speaker decides the side when the range does not give one: where
	 * the exit starts (also through the hold), or where the way back in ends.
	 */
	decide: number;
	/** The picture at `decide` (see `ShotAway.looks`); undefined: not resolved. */
	look?: AwayLook | null;
};

/** Where the speaker is at program frame `f` among `away` ranges; null: in place. */
export function awayAt(away: readonly ShotAway[] | undefined, f: number): AwayState | null {
	for (const range of away ?? []) {
		const leaves = range.from - range.exit.frames;
		if (f < leaves) return null;
		if (range.until === null || f < range.until) {
			const p = f >= range.from ? 1 : easeOf(range.exit.ease)((f - leaves) / range.exit.frames);
			return { p, range, decide: leaves, look: range.looks?.exit };
		}
		const back = range.until + range.enter.frames;
		if (f < back)
			return {
				p: 1 - easeOf(range.enter.ease)((f - range.until) / range.enter.frames),
				range,
				decide: back,
				look: range.looks?.enter
			};
	}
	return null;
}

/**
 * The moves without a `side` that frames `span` show, as the program frame where each decides
 * its side and the picture there (see `ShotAway.looks`): what those frames draw depends on the
 * shot and the footage there too.
 */
export function awayMovesDuring(
	away: readonly ShotAway[] | undefined,
	span: { startFrame: number; frames: number }
): { frame: number; look: AwayLook | null | undefined }[] {
	const out: { frame: number; look: AwayLook | null | undefined }[] = [];
	const end = span.startFrame + span.frames;
	const touches = (a: number, b: number) => a < end && span.startFrame < b;
	for (const range of away ?? []) {
		if (range.side) continue;
		const leaves = range.from - range.exit.frames;
		if (touches(leaves, range.until ?? Infinity))
			out.push({ frame: leaves, look: range.looks?.exit });
		if (range.until !== null && touches(range.until, range.until + range.enter.frames))
			out.push({ frame: range.until + range.enter.frames, look: range.looks?.enter });
	}
	return out;
}

/** The program frames where the moves that frames `span` show decide their side. */
export const awayDecisions = (
	away: readonly ShotAway[] | undefined,
	span: { startFrame: number; frames: number }
): number[] => awayMovesDuring(away, span).map((m) => m.frame);

/**
 * Sets the `looks` of the away ranges without a `side` from the whole program's footage `map`:
 * the picture where each of their moves decides it.
 */
export function awayLooks(
	shots: readonly { away?: ShotAway[] }[],
	map: FootageMap,
	fps: number
): void {
	const reach = 2 * Math.round(SUBJECT_SMOOTH * fps);
	const look = (f: number): AwayLook | null => {
		const view = programFootageAt(map, f);
		if (!view) return null;
		// The run of source frames around it, as far as the decision reads.
		const runs = (step: 1 | -1) => {
			let k = 0;
			while (k < reach) {
				const g = f + step * (k + 1);
				const next = g >= 0 && g < map.frames ? programFootageAt(map, g) : null;
				if (next?.source !== view.source || next.frame !== view.frame + step * (k + 1)) break;
				k++;
			}
			return view.frame + step * k;
		};
		return { source: view.source, frame: view.frame, first: runs(-1), last: runs(1) };
	};
	for (const range of shots.flatMap((s) => s.away ?? []))
		if (!range.side)
			range.looks = {
				exit: look(range.from - range.exit.frames),
				enter: range.until === null ? null : look(range.until + range.enter.frames)
			};
}

/**
 * The speaker's box on the stage under `layout`: `reach` (fractions of the footage) where the
 * camera puts it, turned with the camera; without a reach, the whole picture.
 */
function speakerOnStage(layout: Pick<ShotLayout, 'camera' | 'turn'>, reach: Box | null): Rect {
	const { camera, turn } = layout;
	const box = reach ?? { x: 0, y: 0, width: 1, height: 1 };
	let corners = [
		[box.x, box.y],
		[box.x + box.width, box.y],
		[box.x, box.y + box.height],
		[box.x + box.width, box.y + box.height]
	].map(([u, v]) => ({ x: camera.x + u * camera.width, y: camera.y + v * camera.height }));
	if (turn) {
		const a = (turn.rotation * Math.PI) / 180;
		const { x: px, y: py } = turn.pivot;
		corners = corners.map(({ x, y }) => ({
			x: px + (x - px) * Math.cos(a) - (y - py) * Math.sin(a),
			y: py + (x - px) * Math.sin(a) + (y - py) * Math.cos(a)
		}));
	}
	const xs = corners.map((c) => c.x);
	const ys = corners.map((c) => c.y);
	const x = Math.min(...xs);
	const y = Math.min(...ys);
	return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/**
 * How far a Gaussian blur carries a bright edge, in deviations: past 3 σ less than a level of
 * 255 is left.
 */
const BLUR_REACH = 3;

/** What of the camera window the frame shows. */
function visible(clip: Rect, size: [number, number]) {
	return {
		left: Math.max(0, clip.x),
		right: Math.min(size[0], clip.x + clip.width),
		bottom: Math.min(size[1], clip.y + clip.height)
	};
}

/**
 * How far the picture moves toward `side` for the speaker to clear the frame, with a margin:
 * the speaker of the footage and, under footage that leaves its window open, the speaker of its
 * blurred copy (bigger, so often further in), which moves with it.
 */
export function awayDistance(
	layout: ShotLayout,
	reach: Box | null,
	side: AwaySide,
	size: [number, number]
): number {
	const v = visible(layout.clip, size);
	const margin = MARGIN * Math.min(...size);
	const past = (s: Rect) =>
		side === 'left' ? s.x + s.width - v.left : side === 'right' ? v.right - s.x : v.bottom - s.y;
	// A blurred room still shows the speaker drawn in it (no clean plate) as far as its blur
	// reaches; the copy is blurred with the room too.
	const room = layout.room?.blur ?? 0;
	const copy = layout.backdrop
		? past(speakerOnStage({ camera: layout.backdrop.camera }, reach)) +
			BLUR_REACH * Math.hypot(layout.backdrop.blur, room)
		: -Infinity;
	return Math.max(0, past(speakerOnStage(layout, reach)) + BLUR_REACH * room, copy) + margin;
}

/** The edge the speaker leaves by the shortest way (ties: left, right, bottom). */
export function nearestSide(
	layout: ShotLayout,
	reach: Box | null,
	size: [number, number]
): AwaySide {
	let best: AwaySide = AWAY_SIDES[0];
	for (const side of AWAY_SIDES)
		if (awayDistance(layout, reach, side, size) < awayDistance(layout, reach, best, size))
			best = side;
	return best;
}

const px = (v: number) => Math.round(v * 100) / 100;

/** A move of the picture on the stage, in pixels. */
export type AwayOffset = { dx: number; dy: number };

/** The move `distance` toward `side`. */
export const awayOffset = (side: AwaySide, distance: number): AwayOffset => ({
	dx: side === 'left' ? -distance : side === 'right' ? distance : 0,
	dy: side === 'bottom' ? distance : 0
});

/**
 * `layout` with its picture moved by `offset`: the footage, its blurred copy and the pivot of a
 * keyed turn. The camera window, the slots and the room's look stay.
 */
export function moveAway(layout: ShotLayout, { dx, dy }: AwayOffset): ShotLayout {
	const move = (r: Rect) => roundRect({ ...r, x: r.x + dx, y: r.y + dy });
	const out: ShotLayout = { ...layout, camera: move(layout.camera) };
	if (layout.backdrop) out.backdrop = { ...layout.backdrop, camera: move(layout.backdrop.camera) };
	if (layout.turn)
		out.turn = {
			...layout.turn,
			pivot: { x: px(layout.turn.pivot.x + dx), y: px(layout.turn.pivot.y + dy) }
		};
	return out;
}

/**
 * Where `check` reads the cut-out back under a turned camera: the part of the visible window
 * `view` the turned picture covers, and how many canvas pixels per stage pixel (the picture's
 * own resolution where it fits, so a one-pixel arm stays a pixel, but never more pixels than
 * the frame has). Null when the picture lies wholly outside the view: nothing to read.
 */
export function turnedReadback(
	layout: Pick<ShotLayout, 'camera' | 'turn'>,
	view: Rect,
	picture: [number, number],
	size: [number, number]
): { region: Rect; scale: number } | null {
	const s = speakerOnStage(layout, null);
	const x0 = Math.max(view.x, Math.floor(s.x));
	const y0 = Math.max(view.y, Math.floor(s.y));
	const x1 = Math.min(view.x + view.width, Math.ceil(s.x + s.width));
	const y1 = Math.min(view.y + view.height, Math.ceil(s.y + s.height));
	if (x1 <= x0 || y1 <= y0) return null;
	const region = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
	const own = Math.max(1, picture[0] / layout.camera.width, picture[1] / layout.camera.height);
	const cap = Math.sqrt((size[0] * size[1]) / (region.width * region.height));
	return { region, scale: Math.max(1, Math.min(own, cap)) };
}

/**
 * Of the frame's area, the share of speaker pixels from which `check` says he is still in the
 * frame while away: a matte's stray speck stays under it, a hand or a lock of hair does not.
 */
export const AWAY_SEEN_SHARE = 0.00002;

/** The speaker found in the frame while a range has him wholly off it (see `awayInFrameMessage`). */
export type AwaySeen = {
	shot: string;
	kind: string;
	/** 1-based, as written. */
	range: number;
	/** Program frames of the range: gone from `from`, back from `until` (null: the shot's end). */
	from: number;
	until: number | null;
	/** The program frame he was found at. */
	frame: number;
	/** Stage pixels of him drawn in the frame, and their box. */
	area: number;
	box: Rect;
};

const STILL_THERE = 'the speaker is still partly in the frame';

/**
 * A `check` warning for a speaker still in the frame inside an `away` range, where he should be
 * wholly off it. It stays a hint: the agent looks at a still and decides.
 */
export function awayInFrameMessage(found: AwaySeen, size: [number, number], fps: number): string {
	const s = (f: number) => (f / fps).toFixed(2);
	const range =
		found.until === null
			? `from ${s(found.from)} s to the shot's end`
			: `${s(found.from)}–${s(found.until)} s`;
	const b = found.box;
	const where = `x ${Math.round(b.x)}–${Math.round(b.x + b.width)}, y ${Math.round(b.y)}–${Math.round(b.y + b.height)} of the ${size[0]}×${size[1]} frame`;
	return `Shot "${found.shot}" (${found.kind}), away range ${found.range} (${range}): ${STILL_THERE} at ${s(found.frame)} s (program time), though he should be wholly off it: about ${Math.round(found.area)} px² of him show at ${where}. The matte reaches further there than the boxes it measures (a raised arm, loose hair, a speck it keeps). Look at a still at ${s(found.frame)} s; if he shows, give the range another "side", or clean up the matte.`;
}

/** The shot and range a speaker-still-in-the-frame warning names; null for any other message. */
export function awayInFrameKey(message: string): string | null {
	const m = /^Shot "(.*?)" \(.*?\), away range (\d+) \(/.exec(message);
	return m && message.includes(`: ${STILL_THERE} at `) ? `${m[1]}\u0000${m[2]}` : null;
}
