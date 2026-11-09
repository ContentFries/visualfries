import { type ShotModule } from './layout.js';
/** Where the speaker sits in the frame. */
export declare const CUTOUT_ANCHORS: readonly ["bottom-left", "bottom", "bottom-right", "left", "center", "right"];
export type CutoutAnchor = (typeof CUTOUT_ANCHORS)[number];
/**
 * How far the shoulders reach on each side of the head's centre, in head heights: the
 * speaker's box beside the head, from the head alone, so the speaker holds still while the
 * hands move (a matte's box would follow every gesture).
 */
export declare const SHOULDER = 1.2;
/** The anchor param, or the default (bottom middle). */
export declare const anchorParam: (params: Record<string, unknown>) => CutoutAnchor;
/** The frame edges an anchor sits the speaker against. */
export declare function anchoredEdges(anchor: CutoutAnchor): ('left' | 'right' | 'bottom')[];
/**
 * Only the speaker, cut out by the matte, over the style's fill: no room, no plate. Clips with
 * `"layer": "behind"` go between the fill and the speaker. `anchor` is where the speaker sits:
 * `bottom-left`, `bottom` (default), `bottom-right` with the body on the frame's bottom edge, or
 * `left`, `center`, `right` with the speaker's box (head top to the matte's bottom) centred on
 * the frame's height. `size` is how tall the head is (top to chin) as a share of the frame height
 * (default 0.2 landscape, 0.15 square, 0.11 portrait): measured from the matte over the whole
 * shot, so the speaker comes out the same size whatever the recording's framing. `margin` is the
 * space to the anchored side edges, of the frame's shorter side (default 0.05).
 *
 * Across, the head's centre sits `SHOULDER` head heights in from the margin (in the middle for
 * `bottom` and `center`), so the shoulders stay in and the speaker holds still while the hands
 * move; at most 0.35 of the frame width in from the margin, so a speaker too big for both
 * shoulders runs off the anchored edge rather than drifting to the middle. A negative `margin`
 * moves the speaker past the anchored side edges. Down, a matte that reaches the recording's
 * bottom edge (a seated speaker, a medium shot) puts that edge on the frame's bottom edge,
 * whatever the margin, so the cut body runs out of the frame; a matte that ends above it (feet)
 * stands a margin above the frame's edge (on it with a negative margin).
 *
 * A `panel` slot takes the empty part of the frame: above the speaker for `bottom` and, in
 * portrait and square, for `bottom-left` and `bottom-right` (from the top of the safe area to a
 * margin above how high the head gets over the shot); beside the speaker otherwise (the other
 * side of the frame, full height). `center` has none. Needs footage with a matte.
 */
export declare const cutout: ShotModule;
