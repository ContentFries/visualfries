import type { FootageFrames, SubjectBox } from './resolve.js';

export type FootageLayer = 'plate' | 'subject';

/**
 * URL of the footage frame shown at `programFrame`. Before the footage starts and after it ends
 * the nearest frame holds. A frame inside the footage that was not extracted is an error: raise
 * the footage's `margin` (it happens with an `offset` larger than the margin).
 */
export function footageFrameUrl(
	footage: FootageFrames,
	programFrame: number,
	layer: FootageLayer
): string {
	const wanted = Math.min(footage.total - 1, Math.max(0, programFrame - footage.startFrame));
	if (wanted < footage.first || wanted > footage.last) {
		throw new Error(
			`Footage frame ${wanted} was not extracted (frames ${footage.first}–${footage.last}). Raise the footage's "margin" to cover the offset.`
		);
	}
	const name = String(wanted).padStart(6, '0');
	return layer === 'subject'
		? `${footage.url}subject/${name}.png`
		: `${footage.url}plate/${name}.jpg`;
}

/**
 * Where the subject is at `programFrame` (see `SubjectBox`), averaged over `smooth` frames on
 * each side so text that follows it does not jitter. Null when the footage has no matte or the
 * subject is out of frame.
 */
export function subjectBox(
	footage: FootageFrames,
	programFrame: number,
	smooth = 0
): SubjectBox | null {
	if (!footage.boxes) return null;
	const at = Math.min(footage.total - 1, Math.max(0, programFrame - footage.startFrame));
	const keys = ['x', 'y', 'width', 'height', 'headX', 'headY'] as const;
	const sum = { x: 0, y: 0, width: 0, height: 0, headX: 0, headY: 0 };
	let n = 0;
	for (let f = at - smooth; f <= at + smooth; f++) {
		const i = Math.min(footage.last, Math.max(footage.first, f)) - footage.first;
		const box = footage.boxes[i];
		if (!box) continue;
		for (const k of keys) sum[k] += box[k];
		n++;
	}
	if (!n) return null;
	for (const k of keys) sum[k] /= n;
	return sum;
}

/** Footage frames a set of clips needs, in footage frame numbers; `margin` frames on both sides. */
export function footageFrameRange(
	clips: { startFrame: number; frames: number }[],
	startFrame: number,
	totalFrames: number,
	margin: number
): { first: number; last: number } | null {
	if (!clips.length || totalFrames <= 0) return null;
	const from = Math.min(...clips.map((c) => c.startFrame)) - startFrame - margin;
	const to = Math.max(...clips.map((c) => c.startFrame + c.frames)) - startFrame + margin;
	const first = Math.max(0, from);
	const last = Math.min(totalFrames - 1, to);
	return last >= first ? { first, last } : null;
}
