import type { FootageFrames, SubjectBox } from './resolve.js';
export type FootageLayer = 'plate' | 'subject';
/**
 * URL of the footage frame shown at `programFrame`. Before the footage starts and after it ends
 * the nearest frame holds. A frame inside the footage that was not extracted is an error: raise
 * the footage's `margin` (it happens with an `offset` larger than the margin).
 */
export declare function footageFrameUrl(footage: FootageFrames, programFrame: number, layer: FootageLayer): string;
/**
 * Where the subject is at `programFrame` (see `SubjectBox`), averaged over `smooth` frames on
 * each side so text that follows it does not jitter. Null when the footage has no matte or the
 * subject is out of frame.
 */
export declare function subjectBox(footage: FootageFrames, programFrame: number, smooth?: number): SubjectBox | null;
/** Footage frames a set of clips needs, in footage frame numbers; `margin` frames on both sides. */
export declare function footageFrameRange(clips: {
    startFrame: number;
    frames: number;
}[], startFrame: number, totalFrames: number, margin: number): {
    first: number;
    last: number;
} | null;
