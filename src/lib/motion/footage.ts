import type { FootageFrames } from './resolve.js';

export type FootageLayer = 'plate' | 'subject';

/**
 * URL of the footage frame shown at `programFrame`. Frames outside the extracted range hold the
 * nearest one, so a delayed copy (`offset`) at the clip start still has a picture.
 */
export function footageFrameUrl(
	footage: FootageFrames,
	programFrame: number,
	layer: FootageLayer
): string {
	const index = Math.min(footage.last, Math.max(footage.first, programFrame - footage.startFrame));
	const name = String(index).padStart(6, '0');
	return layer === 'subject'
		? `${footage.url}subject/${name}.png`
		: `${footage.url}plate/${name}.jpg`;
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
