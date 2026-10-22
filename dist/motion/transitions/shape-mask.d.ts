import { type Point } from './common.js';
import type { TransitionModule } from './contract.js';
/**
 * Shape mask: the incoming picture shows through a shape that grows from a point (the outgoing
 * picture's face by default) until it covers the frame, a ring in the brand's accent riding its
 * edge. The outgoing picture drifts a little closer behind it and the incoming one settles from a
 * little closer, so the reveal has depth.
 *
 * Both sides only scale up, so the frame is always covered. Clips that leave with the outgoing
 * side (they sit above both sides) are cut out where the shape is, so they never cover the
 * incoming picture.
 *
 * Params: `shape` ("circle" or "rect", a rectangle with rounded corners), `at` ("face", "center"
 * or [x, y] in fractions of the frame), `ring` (width of the ring in pixels of a 1080 px frame,
 * default 10; 0: none), `color` (the ring's colour, default the brand's accent) and `radius`
 * (corner radius of "rect" at its start, pixels of a 1080 px frame, default 64).
 */
declare const SHAPES: readonly ["circle", "rect"];
type Shape = {
    kind: 'circle';
    c: Point;
    r: number;
} | {
    kind: 'rect';
    c: Point;
    hw: number;
    hh: number;
    r: number;
};
/** The shape's outline as SVG path data, shifted by `-o` (into an element's own box). */
export declare function shapePath(shape: Shape, o?: Point): string;
/**
 * The shape at eased progress `e`, from nothing at `c` to past every corner of the frame (and of
 * the ring around it) at 1.
 */
export declare function shapeAt(kind: (typeof SHAPES)[number], c: Point, e: number, size: [number, number], margin: number, radius: number): Shape;
export declare const shapeMask: TransitionModule;
export {};
