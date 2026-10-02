import type { FootageFrames } from './resolve.js';
export type FootageLayer = 'plate' | 'subject';
/**
 * URL of the footage frame shown at `programFrame`. Frames outside the extracted range hold the
 * nearest one, so a delayed copy (`offset`) at the clip start still has a picture.
 */
export declare function footageFrameUrl(footage: FootageFrames, programFrame: number, layer: FootageLayer): string;
/** Footage frames a set of clips needs, in footage frame numbers; `margin` frames on both sides. */
export declare function footageFrameRange(clips: {
    startFrame: number;
    frames: number;
}[], startFrame: number, totalFrames: number, margin: number): {
    first: number;
    last: number;
} | null;
