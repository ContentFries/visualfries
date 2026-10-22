import type { SubjectBox } from './resolve.js';
/**
 * Regions of the subject: which part of the speaker a subject layer takes (`<Subject region>`,
 * the `@visualfries/subject` block) and a hole leaves behind. Pure geometry in footage pixels, so
 * the stage, the component and the tests place a region the same way at any frame.
 */
export type Point = {
    x: number;
    y: number;
};
/**
 * A line across the footage.
 * - a number `k`, or `{ head: k, tilt }`: level with the top of the head plus `k` head heights
 *   (0.3 is about the forehead, 0.45 the eyes), through the head's column, turned `tilt` degrees
 *   (clockwise); it follows the head from frame to frame;
 * - `{ through: [[x1, y1], [x2, y2]] }`: through two points in footage pixels.
 */
export type RegionLine = number | {
    head: number;
    tilt?: number;
} | {
    through: [[number, number], [number, number]];
};
/**
 * A region of the footage.
 * - `"all"`: the whole subject;
 * - `{ above: line }`, `{ below: line }`: the half of the picture on that side of the line;
 * - `{ path: "M… Z" }`: an SVG path in footage pixels (`origin: "head"`: from the top of the
 *   head, so it follows the head);
 * - `{ mask: url, x, y, width, height }`: a picture whose alpha is the region, placed in footage
 *   pixels (default: covering the footage; `origin: "head"` as for a path).
 */
export type SubjectRegion = 'all' | {
    above: RegionLine;
} | {
    below: RegionLine;
} | {
    path: string;
    origin?: 'frame' | 'head';
} | {
    mask: string;
    origin?: 'frame' | 'head';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
};
/** A region placed at one frame, in footage pixels. */
export type RegionShape = {
    kind: 'all';
} | {
    kind: 'half';
    side: 'above' | 'below';
    /** A point on the line, and its direction (unit vector, left to right). */
    at: Point;
    dir: Point;
    /** The half-plane as a polygon reaching far past the footage on every side. */
    polygon: Point[];
} | {
    kind: 'path';
    d: string;
    dx: number;
    dy: number;
} | {
    kind: 'mask';
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
};
/** What placing a region needs: the footage size and the subject box of that frame. */
export type RegionFrame = {
    width: number;
    height: number;
    box: SubjectBox | null;
};
/** Where the head is in footage pixels: the top of its column, and its height. */
export declare function headOf(frame: RegionFrame): {
    top: Point;
    height: number;
} | null;
/**
 * `region` placed at one frame. Null when it follows the head and the frame has no subject (the
 * matte found none), so there is nothing to take or leave.
 */
export declare function placeRegion(region: SubjectRegion, frame: RegionFrame): RegionShape | null;
/** The other half of a half-plane (what `outside` leaves of `{ above }` is `{ below }`). */
export declare function otherHalf(shape: Extract<RegionShape, {
    kind: 'half';
}>): RegionShape;
export declare const REGION_HELP = "A region is \"all\", { \"above\": line }, { \"below\": line }, { \"path\": \"M\u2026 Z\" } or { \"mask\": url }; a line is a number (head heights below the top of the head), { \"head\": k, \"tilt\": degrees } or { \"through\": [[x1, y1], [x2, y2]] }.";
/** Which side of the line `p` is on: true when inside the half-plane. */
export declare function insideHalf(shape: Extract<RegionShape, {
    kind: 'half';
}>, p: Point): boolean;
/**
 * A point to turn and scale a region's layer about, in footage pixels: for a half-plane, on the
 * head's column halfway between the line and the head's top (above) or below the line by as much
 * (below); for the whole subject, the middle of its box; null for paths and masks (their own
 * bounds decide, see `<Subject>`) and without a subject.
 */
export declare function regionPivot(shape: RegionShape, frame: RegionFrame): Point | null;
