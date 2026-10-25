import type { SafeInsets } from './format.js';
import type { Rect } from './shots/layout.js';
/**
 * Whether a clip's content fits the frame: how much of what it paints the frame edge cuts off,
 * how much of its text lies outside the format's safe zone, and whether a clip that covers the
 * whole frame leaves most of it empty. A block written in fixed pixels for one frame size shows
 * all three in another. Pure geometry on boxes in stage pixels; the stage measures the boxes in
 * the page (see `measure` in `program-stage.ts`).
 */
/** Share of a clip's content that reaches into the frame and lies outside it, from which `check` warns. */
export declare const CUT_SHARE = 0.25;
/** Share of a clip's text outside the safe zone (and inside the frame) from which `check` warns. */
export declare const SAFE_TEXT_SHARE = 0.5;
/** Seconds the content must stay so: a card sliding in or out passes the edge for less. */
export declare const FIT_SECONDS = 1;
/**
 * A clip that covers the frame looks laid out for another size when its content starts within
 * `EMPTY_START` of the top (left) edge and ends before `EMPTY_REACH` of the frame's height
 * (width): a 1920 × 1080 layout in a 1080 × 1920 frame fills the top half and stops.
 */
export declare const EMPTY_START = 0.12;
export declare const EMPTY_REACH = 0.6;
export type Edge = 'left' | 'right' | 'top' | 'bottom';
/**
 * The share (0–1) of the area of `boxes` that lies outside `frame`, counting only boxes that
 * reach into it (content parked off the frame, such as the next panel of a pan or a card
 * waiting to slide in, is left out), and the frame edges the cut content lies past, most first.
 * Nested boxes count each.
 */
export declare function cutShare(boxes: Rect[], frame: Rect): {
    share: number;
    edges: Edge[];
};
/**
 * The safe zone of a format as boxes in stage pixels: above `notchY` the right inset is
 * `rightUpper`, below it `right` (see `SafeInsets`).
 */
export declare function safeBoxes(size: [number, number], safe: SafeInsets): Rect[];
/**
 * The share (0–1) of the area of the text boxes `boxes` inside `frame` that lies outside the
 * safe zone `safe` (boxes, see `safeBoxes`). Text outside the frame is left to `cutShare`.
 */
export declare function outsideSafe(boxes: Rect[], frame: Rect, safe: Rect[]): number;
/** The box around the parts of `boxes` inside `frame`; null when none is inside. */
export declare function contentReach(boxes: Rect[], frame: Rect): Rect | null;
/**
 * The share of a clip's content area at each end of an axis that `reachBox` leaves out: a
 * small label in a corner does not stretch a layout's reach over the whole frame.
 */
export declare const REACH_TRIM = 0.05;
/** A clip's content area summed over the frames it shows, per bin across each axis. */
export type Reach = {
    x: number[];
    y: number[];
};
export declare const newReach: () => Reach;
/** Adds the area of the parts of `boxes` inside `frame` to `reach`, spread over the bins. */
export declare function addReach(reach: Reach, boxes: Rect[], frame: Rect): void;
/**
 * The box holding all but `REACH_TRIM` of the content area summed in `reach` at each end of each
 * axis, in the coordinates of `frame`; null without content.
 */
export declare function reachBox(reach: Reach, frame: Rect): Rect | null;
/**
 * Whether content reaching `reach` (see `reachBox`) leaves most of a frame of `size` empty
 * the way a layout for another size does (see `EMPTY_START`): the axis and the share left empty
 * past the content, or null.
 */
export declare function emptyPart(reach: Rect | null, size: [number, number]): {
    axis: 'x' | 'y';
    from: number;
    to: number;
    empty: number;
} | null;
export type FitFinding = {
    kind: 'cut';
    share: number;
    edges: Edge[];
} | {
    kind: 'safe';
    share: number;
} | {
    kind: 'empty';
    axis: 'x' | 'y';
    from: number;
    to: number;
    empty: number;
};
/**
 * A `check` warning for a clip whose content does not fit the frame, worded for a block laid
 * out in fixed pixels for another size. It stays a warning: the agent looks at a still and
 * decides.
 */
export declare function frameFitMessage(found: {
    clip: string;
    block: string;
    frame: number;
    finding: FitFinding;
}, format: {
    size: [number, number];
    class: string;
    safe: SafeInsets;
}, fps: number): string;
/** The clip and the kind of a frame-fit warning; null for any other message. */
export declare function frameFitKey(message: string): string | null;
