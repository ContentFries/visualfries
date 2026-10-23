import type { SubjectBox } from './resolve.js';
import type { Rect, ShotLayout } from './shots/layout.js';
/**
 * Share of the face covered by text from which `check` warns. The face is the ellipse inside
 * the head's box and a text box is its line box (taller than the glyphs): below a tenth, the
 * glyphs touch the hair, an ear or the room beside the chin, not the eyes or the mouth.
 */
export declare const FACE_TEXT_SHARE = 0.1;
/** Seconds the text must stay over the face: a word flying past it on its way in is fine. */
export declare const FACE_TEXT_SECONDS = 0.5;
/** Text at less opacity than this is not read: fading in or out, or hidden. */
export declare const TEXT_OPACITY = 0.1;
/**
 * The head's box on the stage, in stage pixels: the matte's head (top, chin, a head's width
 * around its column) where the shot's camera puts the footage, turned with a shot key's rotation
 * (about its middle, keeping its size). Null when none of it is inside the camera window; the
 * box itself is not cut to the window (see `faceCovered`).
 */
export declare function headOnStage(box: SubjectBox, layout: Pick<ShotLayout, 'camera' | 'clip' | 'turn'>): Rect | null;
/** The overlap of two boxes; null when they do not overlap. */
export declare function intersect(a: Rect, b: Rect): Rect | null;
/** Points spread evenly over the face, the ellipse inside `head`. */
export declare function facePoints(head: Rect): {
    x: number;
    y: number;
}[];
/**
 * The share (0–1) of the face, the ellipse inside `head`, that `boxes` cover together: sampled on
 * a grid, so overlapping boxes count once. With `within` (the camera window), only the face
 * inside it can be covered: text over a sliver of a head the window cuts off covers little.
 */
export declare function faceCovered(head: Rect, boxes: Rect[], within?: Rect): number;
/** The wider side of the frame beside the head, and its span in stage pixels. */
export declare function freeSide(head: Rect, size: [number, number]): {
    side: 'left' | 'right';
    from: number;
    to: number;
};
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
export declare function textOverFaceMessage(found: TextOverFace, size: [number, number], fps: number): string;
/** The clip a text-over-face warning names; null for any other message. */
export declare function textOverFaceClip(message: string): string | null;
