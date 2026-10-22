/**
 * The clean plate: the footage with the subject removed, so that a part of the subject that
 * moves away (a region layer, a hole) leaves plausible background instead of black. Pure: frames
 * in, frames out, no I/O; `node.ts` decodes the footage and its matte, runs this per frame and
 * caches the result next to the extracted frames.
 *
 * `fill` (the default) inpaints every frame from its own background: the subject and its soft
 * edge are grown by `grow` px (the matte's fringe and a phone's sharpening halo go with them)
 * and the hole is filled by push-pull: the known pixels are averaged down a pyramid and the
 * coarse levels pulled back up into the hole, smoothly (bilinear) and from all sides. Sky, walls
 * and out-of-focus trees come out as a soft continuation of what surrounds the subject; detail
 * (a sharp branch, a window frame) does not continue into the hole. Outside the grown hole the
 * plate is the footage itself, pixel for pixel, so the plate can be drawn over the footage
 * anywhere without a seam.
 *
 * `image` takes the background from a picture the project supplies (a still of the empty
 * scene, from a tripod): the hole shows the picture, the rest stays the footage.
 */
export type CleanMethod = 'fill' | 'image';
export type CleanOptions = {
    /** Matte values (0–255) at or above this count as subject, its soft edge included. */
    threshold?: number;
    /** Pixels the hole grows by past the matte's soft edge. */
    grow?: number;
    /**
     * `image` method: the background picture, RGB at the frame's size. Without it the hole is
     * filled (`fill`).
     */
    image?: Uint8Array | null;
};
/** Defaults of `cleanPlate`, also part of the cache key. */
export declare const CLEAN_DEFAULTS: {
    readonly threshold: 6;
    readonly growShare: 0.011;
};
/**
 * Version of the plate algorithm, part of the cache key of every cleaned range: raise it when
 * the pixels it makes change.
 */
export declare const CLEAN_VERSION = 2;
/** Pixels the hole grows by for a frame `width` × `height` (about 12 px at 1080 × 1920). */
export declare const defaultGrow: (width: number, height: number) => number;
/**
 * The hole: matte at or above `threshold`, grown by `grow` px (a square, done as a max filter
 * along rows then columns, so it costs the same for any `grow`). 1 = hole.
 */
export declare function holeMask(matte: Uint8Array, width: number, height: number, threshold: number, grow: number): Uint8Array;
/**
 * The clean plate of one frame: `rgb` (RGB, `width` × `height`) where the matte is background,
 * and the background (filled, or the supplied picture) where the subject was, grown by `grow`.
 * Deterministic: the same frame and matte always give the same bytes.
 */
export declare function cleanPlate(rgb: Uint8Array, matte: Uint8Array, width: number, height: number, opts?: CleanOptions): Uint8Array;
