import type { SubjectBox } from './resolve.js';
import type { Rect, ShotLayout } from './shots/layout.js';

/**
 * Text over the speaker's face: where the matte puts the head on the stage, how much of it the
 * text boxes of a clip cover, and the `check` warning that says so. Pure geometry; the stage
 * measures the text boxes in the page (see `measure` in `program-stage.ts`).
 */

/**
 * The matte measures the chin this many head widths below the head's widest row (see
 * `measureSubject`): the head's box is about this much taller than it is wide.
 */
const HEAD_RATIO = 1.4;
/** Head height, as a share of the footage height, when the matte did not measure one. */
const HEAD_GUESS = 0.22;
/**
 * Share of the face covered by text from which `check` warns. The face is the ellipse inside
 * the head's box and a text box is its line box (taller than the glyphs): below a tenth, the
 * glyphs touch the hair, an ear or the room beside the chin, not the eyes or the mouth.
 */
export const FACE_TEXT_SHARE = 0.1;
/** Seconds the text must stay over the face: a word flying past it on its way in is fine. */
export const FACE_TEXT_SECONDS = 0.5;
/** Text at less opacity than this is not read: fading in or out, or hidden. */
export const TEXT_OPACITY = 0.1;
/** Samples across each axis of the head's box when measuring how much of the face is covered. */
const GRID = 24;

/**
 * The head's box on the stage, in stage pixels: the matte's head (top, chin, a head's width
 * around its column) where the shot's camera puts the footage, turned with a shot key's rotation
 * (about its middle, keeping its size). Null when none of it is inside the camera window; the
 * box itself is not cut to the window (see `faceCovered`).
 */
export function headOnStage(
	box: SubjectBox,
	layout: Pick<ShotLayout, 'camera' | 'clip' | 'turn'>
): Rect | null {
	const { camera, clip, turn } = layout;
	const height = (box.headHeight || HEAD_GUESS) * camera.height;
	const width = height / HEAD_RATIO;
	let cx = camera.x + box.headX * camera.width;
	let cy = camera.y + box.headY * camera.height + height / 2;
	if (turn) {
		const a = (turn.rotation * Math.PI) / 180;
		const dx = cx - turn.pivot.x;
		const dy = cy - turn.pivot.y;
		cx = turn.pivot.x + dx * Math.cos(a) - dy * Math.sin(a);
		cy = turn.pivot.y + dx * Math.sin(a) + dy * Math.cos(a);
	}
	const head = { x: cx - width / 2, y: cy - height / 2, width, height };
	return intersect(head, clip) ? head : null;
}

/** The overlap of two boxes; null when they do not overlap. */
export function intersect(a: Rect, b: Rect): Rect | null {
	const x = Math.max(a.x, b.x);
	const y = Math.max(a.y, b.y);
	const right = Math.min(a.x + a.width, b.x + b.width);
	const bottom = Math.min(a.y + a.height, b.y + b.height);
	return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

/** Points spread evenly over the face, the ellipse inside `head`. */
export function facePoints(head: Rect): { x: number; y: number }[] {
	const out: { x: number; y: number }[] = [];
	if (head.width <= 0 || head.height <= 0) return out;
	for (let i = 0; i < GRID; i++)
		for (let j = 0; j < GRID; j++) {
			const u = (i + 0.5) / GRID - 0.5;
			const v = (j + 0.5) / GRID - 0.5;
			if (u * u + v * v <= 0.25)
				out.push({ x: head.x + (u + 0.5) * head.width, y: head.y + (v + 0.5) * head.height });
		}
	return out;
}

/**
 * The share (0–1) of the face, the ellipse inside `head`, that `boxes` cover together: sampled on
 * a grid, so overlapping boxes count once. With `within` (the camera window), only the face
 * inside it can be covered: text over a sliver of a head the window cuts off covers little.
 */
export function faceCovered(head: Rect, boxes: Rect[], within?: Rect): number {
	const near = boxes.filter((b) => intersect(b, head));
	const points = facePoints(head);
	if (!near.length || !points.length) return 0;
	const inBox = (p: { x: number; y: number }, b: Rect) =>
		p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
	const covered = points.filter(
		(p) => (!within || inBox(p, within)) && near.some((b) => inBox(p, b))
	).length;
	return covered / points.length;
}

/** The wider side of the frame beside the head, and its span in stage pixels. */
export function freeSide(
	head: Rect,
	size: [number, number]
): { side: 'left' | 'right'; from: number; to: number } {
	const left = Math.max(0, head.x);
	const right = Math.max(0, size[0] - (head.x + head.width));
	return left >= right
		? { side: 'left', from: 0, to: Math.round(left) }
		: { side: 'right', from: Math.round(size[0] - right), to: size[0] };
}

const COVERS = "its text covers the speaker's face";

export type TextOverFace = {
	clip: string;
	block: string;
	/** Program frame the text first covers the face in the frames checked. */
	frame: number;
	/** The largest share of the face covered (0–1) over the frames checked until the warning. */
	share: number;
	/** The head's box on the stage at the warning's frame. */
	head: Rect;
};

/**
 * A `check` warning for text over the face, worded so an agent knows where there is room. It
 * stays a warning: the engine moves nothing, the agent looks at a still and decides.
 */
export function textOverFaceMessage(found: TextOverFace, size: [number, number], fps: number) {
	const at = `${(found.frame / fps).toFixed(2)} s`;
	const free = freeSide(found.head, size);
	const room =
		free.to - free.from > 0
			? `The ${free.side} side of the frame (x ${free.from}–${free.to} of ${size[0]} px) is clear of the head.`
			: 'The head spans the whole width of the frame there.';
	const tries = [
		free.to - free.from > 0
			? `move it to the ${free.side} side (a smaller size if it must fit there)`
			: 'move it above or below the face',
		'"layer": "behind" to put it behind the speaker',
		'a shot that frees a slot beside the speaker ("strip" or "window") for it'
	];
	return `Clip "${found.clip}" (${found.block}): ${COVERS} from ${at} (program time) on, up to ${Math.round(found.share * 100)} % of the face in the frames checked. ${room} If the text is not meant to sit on the face, try: ${tries.join('; ')}. Look at a still at ${at} before deciding.`;
}

/** The clip a text-over-face warning names; null for any other message. */
export function textOverFaceClip(message: string): string | null {
	const m = /^Clip "(.*?)" \(.*?\): (.*?) from /.exec(message);
	return m && m[2] === COVERS ? m[1] : null;
}

/**
 * Share of a text behind the speaker (a `"layer": "behind"` clip, or text under a subject layer)
 * that the speaker covers, from which `check` warns: the head over part of a word is the look,
 * over most of it the word cannot be read.
 */
export const BEHIND_TEXT_SHARE = 0.5;
/** Seconds the speaker must cover it: a word passing behind the head on its way in is fine. */
export const BEHIND_TEXT_SECONDS = 0.5;
/** A clear band narrower than this (stage pixels) is not worth naming. */
const CLEAR_MIN = 40;

/**
 * Where the speaker is on the stage, sampled on a grid: `hit[row * cols + col]` tells whether
 * the speaker is drawn at the point (`(col + 0.5) * step`, `(row + 0.5) * step`).
 */
export type SpeakerMask = { step: number; cols: number; rows: number; hit: boolean[] };

/**
 * The parts of a frame of `size` clear of the speaker that a text at `text` could move to: the
 * band above the speaker (its height in stage pixels), and beside the speaker at the text's
 * height, the clear span on the left (`0`–`left`) and on the right (`right`–width). Null where
 * there is none worth naming.
 */
export function clearOfSpeaker(
	mask: SpeakerMask,
	text: Rect,
	size: [number, number]
): { above: number | null; left: number | null; right: number | null } {
	const { step, cols, rows, hit } = mask;
	let top: number | null = null;
	for (let r = 0; r < rows && top === null; r++)
		for (let c = 0; c < cols; c++)
			if (hit[r * cols + c]) {
				top = r * step;
				break;
			}
	if (top === null) return { above: size[1], left: null, right: null };
	let minX = Infinity;
	let maxX = -Infinity;
	for (let r = 0; r < rows; r++) {
		const y = (r + 0.5) * step;
		if (y < text.y || y > text.y + text.height) continue;
		for (let c = 0; c < cols; c++)
			if (hit[r * cols + c]) {
				minX = Math.min(minX, c * step);
				maxX = Math.max(maxX, (c + 1) * step);
			}
	}
	const left = Number.isFinite(minX) && minX >= CLEAR_MIN ? Math.round(minX) : null;
	const right =
		Number.isFinite(maxX) && size[0] - maxX >= CLEAR_MIN
			? Math.round(Math.min(size[0], maxX))
			: null;
	return { above: top >= CLEAR_MIN ? Math.round(top) : null, left, right };
}

export type TextBehind = {
	clip: string;
	block: string;
	/** Program frame the speaker first covers more than half of the text in the frames checked. */
	frame: number;
	/** The largest share of the text covered (0–1) over the frames checked until the warning. */
	share: number;
	clear: ReturnType<typeof clearOfSpeaker>;
};

const BEHIND = 'the speaker covers its text behind them';

/**
 * A `check` warning for text behind the speaker that the head or body covers, worded so an agent
 * knows where it would show. It stays a warning: the engine moves nothing, the agent looks at a
 * still and decides.
 */
export function textBehindMessage(found: TextBehind, size: [number, number], fps: number) {
	const at = `${(found.frame / fps).toFixed(2)} s`;
	const { above, left, right } = found.clear;
	const room = [
		above !== null ? `the top ${above} px of the frame, above the speaker` : '',
		left !== null ? `x 0–${left} px on the left at the text's height` : '',
		right !== null ? `x ${right}–${size[0]} px on the right at the text's height` : ''
	].filter(Boolean);
	const where = room.length
		? `Clear of the speaker there: ${room.join('; ')}.`
		: 'The speaker fills the frame around the text there.';
	return `Clip "${found.clip}" (${found.block}): ${BEHIND} from ${at} (program time) on, up to ${Math.round(found.share * 100)} % of it in the frames checked (more than half for ${BEHIND_TEXT_SECONDS} s or more). ${where} If the words are meant to be read, try: move them into a clear part (aligned to the top, or a smaller size if they must fit); bring them in front of the speaker. Look at a still at ${at} before deciding.`;
}

/** The clip a text-behind warning names; null for any other message. */
export function textBehindClip(message: string): string | null {
	const m = /^Clip "(.*?)" \(.*?\): (.*?) from /.exec(message);
	return m && m[2] === BEHIND ? m[1] : null;
}
