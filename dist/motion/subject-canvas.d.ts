import type { Point, RegionShape } from './subject-region.js';
/**
 * The picture at `url`, decoded (ready to draw). Shared by every layer on the page, so a frame
 * drawn by the stage and by a block decodes once.
 */
export declare function loadPicture(url: string): Promise<HTMLImageElement>;
/** A shape's path in the canvas's current transform; false for a mask (no path). */
export declare function traceRegion(ctx: CanvasRenderingContext2D, shape: RegionShape, size: Point): boolean;
/**
 * Keeps (`in`) or removes (`out`) what is drawn on `ctx` inside the shape, by compositing: the
 * canvas must hold only what the region applies to. `mask` is the decoded picture of a mask shape.
 */
export declare function applyRegion(ctx: CanvasRenderingContext2D, shape: RegionShape, mode: 'in' | 'out', mask?: HTMLImageElement | null): void;
/** Draws `picture` (footage-sized) onto `ctx` inside the shape only (`outside`: outside it). */
export declare function drawRegion(ctx: CanvasRenderingContext2D, picture: CanvasImageSource, shape: RegionShape, opts?: {
    outside?: boolean;
    mask?: HTMLImageElement | null;
}): void;
/**
 * The look of the cut edge on the subject that stays: a band of `width` px along the cut, on the
 * subject only. For a line, `opening` (0–1) draws the open top of a cartoon head instead: an
 * ellipse across the subject as wide as it is along the line, `opening` times as tall as it is
 * wide at most, `inside` within and the rim colour around.
 */
export type Rim = {
    /** Colour of the band or ring; default the subject's own colour just inside the cut. */
    color?: string;
    /** Band or ring width in footage px; default 1 % of the footage's short side. */
    width?: number;
    /** Half-planes only: draw an opening of this depth (ellipse height over width). */
    opening?: number;
    /** The opening's inside, dark at its far side; default a deep red-brown. */
    inside?: string;
};
/**
 * How the subject crosses a line: the run of subject (alpha above half) along it that contains
 * the point nearest `near`, as distances along `dir` from `at`, and the subject's mean colour
 * `inset` px on the side away from the region. Null when the line misses the subject there.
 */
export declare function crossing(subject: CanvasImageSource, size: Point, shape: Extract<RegionShape, {
    kind: 'half';
}>, near: Point, inset: number): {
    from: number;
    to: number;
    color: [number, number, number];
} | null;
/**
 * Draws the rim of `shape` on `ctx` (footage pixels) over the subject that stays: `subject` is
 * the subject picture of the same frame. `near` picks which part of the subject a line crosses
 * (the head) for an opening.
 */
export declare function drawRim(ctx: CanvasRenderingContext2D, subject: CanvasImageSource, shape: RegionShape, rim: Rim, near: Point | null, mask?: HTMLImageElement | null): void;
/**
 * How much of the subject lies inside the shape, as a share of the subject (0–1), measured on
 * a small copy (`check` warns when a region stays empty). 0 without a subject.
 */
export declare function regionShare(subject: CanvasImageSource, size: Point, shape: RegionShape, mask?: HTMLImageElement | null): number;
