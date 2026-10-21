import type { FootageFrames, SubjectBox } from './resolve.js';
import { type FootageMap } from './footage-map.js';
export type FootageLayer = 'plate' | 'subject';
/**
 * URL of source frame `frame` of the footage. A frame that was not extracted is an error:
 * raise the footage's `margin` (it happens with an `offset` larger than the margin).
 */
export declare function sourceFrameUrl(footage: FootageFrames, frame: number, layer: FootageLayer): string;
/**
 * URL of the footage frame shown at `programFrame` in inserts mode (footage placed by its
 * `start`). Before the footage starts and after it ends the nearest frame holds.
 */
export declare function footageFrameUrl(footage: FootageFrames, programFrame: number, layer: FootageLayer): string;
/**
 * Subject box at source frame `frame` (see `SubjectBox`), averaged over `smooth` frames on each
 * side; frames outside the extracted range hold its edge. Null without a matte or with the
 * subject out of frame.
 */
export declare function sourceSubjectBox(footage: FootageFrames, frame: number, smooth?: number): SubjectBox | null;
/**
 * Where the subject is at `programFrame` in inserts mode (see `SubjectBox`), averaged over
 * `smooth` frames on each side so text that follows it does not jitter. Null when the footage
 * has no matte or the subject is out of frame.
 */
export declare function subjectBox(footage: FootageFrames, programFrame: number, smooth?: number): SubjectBox | null;
/** What `<Footage>` draws at a program frame. */
export type FootageFrame = {
    source: string;
    footage: FootageFrames;
    url: string;
};
/**
 * The frame `<Footage>` draws at `programFrame`: source `name`, or with `name` null whatever
 * the program shows. With a footage map (program mode) the program decides which source frame
 * is on screen, and `name` must be on screen then; `offsetFrames` shifts inside that source.
 * Without one (inserts mode) footage plays from its `start` and `offsetFrames` shifts program
 * time, as before cut lists existed.
 */
export declare function footageFrameAt(footage: Record<string, FootageFrames>, map: FootageMap | null, name: string | null, programFrame: number, layer: FootageLayer, offsetFrames?: number): FootageFrame;
/** Footage frames a set of clips needs, in footage frame numbers; `margin` frames on both sides. */
export declare function footageFrameRange(clips: {
    startFrame: number;
    frames: number;
}[], startFrame: number, totalFrames: number, margin: number): {
    first: number;
    last: number;
} | null;
