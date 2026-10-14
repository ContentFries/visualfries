/**
 * Pure helpers behind the motion-recipe blocks (`@visualfries/kinetic`, `arrows`, `wall`,
 * `screen`, `zoom-through`). Kept free of Svelte so they are unit-tested and reusable in custom
 * blocks.
 */
export type Rect = [x: number, y: number, w: number, h: number];
export type Camera = {
    s: number;
    tx: number;
    ty: number;
};
/** Scale + translate that fits `rect` (source px) centred in a `viewW`×`viewH` view. */
export declare function fitRect(rect: Rect, viewW: number, viewH: number): {
    s: number;
    cx: number;
    cy: number;
};
/**
 * Camera over a source of `srcW`×`srcH` shown in a `viewW`×`viewH` view, gliding through `stops`
 * (each with an eased progress 0–1 and a rect). Starts on the whole source. Apply as
 * `transform: translate(tx px, ty px) scale(s)` with `transform-origin: 0 0`.
 */
export declare function cameraAt(stops: {
    e: number;
    r: Rect;
}[], srcW: number, srcH: number, viewW: number, viewH: number): Camera;
/**
 * Quadratic arrow from `a` to `b`, bent sideways by `bend` (fraction of the length, + = left of
 * the direction of travel). Returns the SVG path, its approximate length (for a draw-on dash) and
 * the angle of the head in degrees.
 */
export declare function arrowPath(a: [number, number], b: [number, number], bend?: number): {
    d: string;
    length: number;
    angle: number;
    control: [number, number];
};
/**
 * Splits bound words into phrases by word index ranges `[first, last]` (inclusive), counted from
 * the first word whose text starts with `first` (so the selection may include a word or two of
 * the clip's handle).
 */
export declare function phraseWords<W extends {
    text: string;
}>(words: W[], ranges: [number, number][], first?: string): W[][];
/** Extruded-letter look: stacked text shadows going down-right, darker with depth. */
export declare function extrude(color: string, depth?: number): string;
/** Slots of a 3×3 wall around the centre tile, side columns shifted for a masonry feel. */
export declare function wallSlots(w: number, h: number, gap: number, masonry?: number): {
    x: number;
    y: number;
}[];
