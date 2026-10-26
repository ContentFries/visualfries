import { checkKnown, checkNumber, frameRect, numberParam, roundRect } from './layout.js';
/** Where the speaker sits in the frame. */
export const CUTOUT_ANCHORS = [
    'bottom-left',
    'bottom',
    'bottom-right',
    'left',
    'center',
    'right'
];
/** The head's height (top to chin) as a share of the frame height, by format class. */
const SIZE = { landscape: 0.2, square: 0.15, portrait: 0.11 };
/** Space between the speaker and the frame edges it sits against, of the frame's shorter side. */
const MARGIN = 0.05;
/**
 * How far the shoulders reach on each side of the head's centre, in head heights: the
 * speaker's box beside the head, from the head alone, so the speaker holds still while the
 * hands move (a matte's box would follow every gesture).
 */
export const SHOULDER = 1.2;
/**
 * The furthest the head's centre sits in from the margin, of the frame width: a speaker too big
 * for both shoulders runs off the anchored edge instead of drifting to the middle.
 */
const SIDE = 0.35;
/** The head's height, of the footage height, when the matte gives none. */
const HEAD = 0.2;
/** In portrait a panel stays inside these shares of the frame height without the safe insets. */
const PORTRAIT_TOP = 0.15;
const PORTRAIT_BOTTOM = 0.35;
/** A speaker standing in for the matte where there is none (no footage, a frame it missed). */
const STAND_IN = {
    x: 0.3,
    y: 0.1,
    width: 0.4,
    height: 0.9,
    headX: 0.5,
    headY: 0.1,
    headHeight: HEAD
};
/** Footage standing in where there is none, so the panel has a place to go. */
const NO_FOOTAGE = [1920, 1080];
/** The anchor param, or the default (bottom middle). */
export const anchorParam = (params) => CUTOUT_ANCHORS.includes(params.anchor)
    ? params.anchor
    : 'bottom';
/** The frame edges an anchor sits the speaker against. */
export function anchoredEdges(anchor) {
    const edges = [];
    if (anchor.startsWith('bottom'))
        edges.push('bottom');
    if (anchor.endsWith('left'))
        edges.push('left');
    if (anchor.endsWith('right'))
        edges.push('right');
    return edges;
}
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
 * moves the speaker past the anchored edges. Down, a matte that reaches the recording's bottom edge (a seated speaker, a medium shot)
 * puts that edge on the frame's bottom edge, so the cut body runs out of the frame; a matte that
 * ends above it (feet) stands a margin above the frame's edge.
 *
 * A `panel` slot takes the empty part of the frame: above the speaker for `bottom` and, in
 * portrait and square, for `bottom-left` and `bottom-right` (from the top of the safe area to a
 * margin above how high the head gets over the shot); beside the speaker otherwise (the other
 * side of the frame, full height). `center` has none. Needs footage with a matte.
 */
export const cutout = {
    name: 'cutout',
    enter: { seconds: 0.7, ease: 'expo.inOut' },
    needsMatte: true,
    measuresHead: true,
    layout(input) {
        const { cls, size: [W, H], params, safe } = input;
        const anchor = anchorParam(params);
        const footage = input.footage ?? NO_FOOTAGE;
        const subject = (input.footage && input.subject) || STAND_IN;
        const m = numberParam(params, 'margin', MARGIN) * Math.min(W, H);
        // Between the speaker and a panel: the default margin, whatever the anchored edges get.
        const gap = MARGIN * Math.min(W, H);
        const headPx = numberParam(params, 'size', SIZE[cls]) * H;
        const k = headPx / ((input.head ?? subject.headHeight ?? HEAD) * footage[1]);
        const width = footage[0] * k;
        const height = footage[1] * k;
        const reach = SHOULDER * headPx;
        const headX = anchor.endsWith('left')
            ? m + Math.min(reach, W * SIDE)
            : anchor.endsWith('right')
                ? W - m - Math.min(reach, W * SIDE)
                : W / 2;
        const bottom = subject.y + subject.height;
        let y;
        if (anchor.startsWith('bottom')) {
            // The cut body runs out of the frame; feet stand a margin above its edge.
            const below = Math.max(0, 1 - bottom) * height;
            y = H - Math.min(m, below) - bottom * height;
        }
        else
            y = H / 2 - ((subject.headY + bottom) / 2) * height;
        const camera = roundRect({ x: headX - subject.headX * width, y, width, height });
        const slots = {};
        const closed = {};
        const high = cls === 'portrait' ? Math.round(safe?.top ?? H * PORTRAIT_TOP) : 0;
        const low = cls === 'portrait' ? H - Math.round(safe?.bottom ?? H * PORTRAIT_BOTTOM) : H;
        const side = anchor === 'left' || anchor === 'right' || (cls === 'landscape' && anchor !== 'bottom');
        if (anchor === 'center') {
            // Nothing is left beside or above a speaker in the middle.
        }
        else if (side) {
            const left = anchor.endsWith('left');
            const edge = left ? headX + reach + gap : headX - reach - gap;
            const panel = left
                ? { x: edge, y: high, width: Math.max(0, W - edge), height: low - high }
                : { x: 0, y: high, width: Math.max(0, edge), height: low - high };
            slots.panel = roundRect(panel);
            // It slides in from the frame edge it sits against.
            closed.panel = roundRect({ ...panel, x: left ? W : -panel.width });
        }
        else {
            // Up to a margin above how high the head gets over the shot.
            const top = camera.y + (input.shotTop ?? subject.headY) * camera.height;
            const panel = {
                x: 0,
                y: high,
                width: W,
                height: Math.max(0, Math.min(top - gap, low) - high)
            };
            slots.panel = roundRect(panel);
            closed.panel = roundRect({ ...panel, y: -panel.height });
        }
        return {
            camera: input.footage ? camera : frameRect(input.size),
            clip: frameRect(input.size),
            radius: 0,
            slots,
            closed,
            fill: 'surface',
            cutout: 1
        };
    },
    // Nothing moves on the program's first frame.
    events: ({ prev, morphFrames }) => prev === null ? [] : [{ kind: 'shot', frame: Math.floor(morphFrames / 2) }],
    check: (params) => [
        ...checkKnown(params, ['anchor', 'size', 'margin']),
        ...(params.anchor === undefined ||
            CUTOUT_ANCHORS.includes(params.anchor)
            ? []
            : [
                `"anchor" must be one of ${CUTOUT_ANCHORS.join(', ')} (got ${JSON.stringify(params.anchor)}): where the speaker sits; a body cut by the recording's bottom edge belongs on a bottom anchor.`
            ]),
        ...checkNumber(params, 'size', 0.03, 0.5),
        ...checkNumber(params, 'margin', -0.25, 0.25)
    ]
};
