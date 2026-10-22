import { checkHeadroom, checkKnown, checkNumber, frameOnHead, headFraming, headroomParam, numberParam, roundRect } from './layout.js';
/** Share of the frame the camera keeps, by format class (width side by side, height stacked). */
const CAMERA_SHARE = { landscape: 1 / 3, square: 0.4, portrait: 0.45 };
/** In portrait the default share grows up to this for a head too tall for the strip. */
const PORTRAIT_GROW = 0.55;
/**
 * The camera narrows into a strip while a `panel` slot opens beside it, both moving together.
 * Landscape and square: camera left, panel right (`side: "right"` swaps them). Portrait: camera
 * on top, panel below (`side: "right"` puts the camera at the bottom). `size` is the camera's
 * share of the frame. The surface fill shows under the panel. `headroom` keeps the whole head in
 * the strip (see `frameOnHead`); with it, in portrait and without `size`, the strip also grows
 * from 0.45 up to 0.55 of the frame height for the shot's head (a close selfie), so the footage
 * still fills the strip's width instead of backing off; a head taller still makes it back off.
 */
export const strip = {
    name: 'strip',
    enter: { seconds: 0.7, ease: 'expo.inOut' },
    layout(input) {
        const { cls, size: [W, H], footage, subject, params } = input;
        const first = params.side !== 'right';
        const share = numberParam(params, 'size', defaultShare(input));
        let clip;
        let panel;
        let closed;
        if (cls === 'portrait') {
            const cam = Math.round(H * share);
            const rest = H - cam;
            clip = { x: 0, y: first ? 0 : rest, width: W, height: cam };
            panel = { x: 0, y: first ? cam : 0, width: W, height: rest };
            // The panel slides in from the bottom (or top) edge.
            closed = { ...panel, y: first ? H : -rest };
        }
        else {
            const cam = Math.round(W * share);
            const rest = W - cam;
            clip = { x: first ? 0 : rest, y: 0, width: cam, height: H };
            panel = { x: first ? cam : 0, y: 0, width: rest, height: H };
            closed = { ...panel, x: first ? W : -rest };
        }
        clip = roundRect(clip);
        return {
            camera: frameOnHead(clip, footage, subject, 1, headFraming(input)),
            clip,
            radius: 0,
            slots: { panel: roundRect(panel) },
            closed: { panel: roundRect(closed) },
            fill: 'surface'
        };
    },
    // Nothing moves on the program's first frame.
    events: ({ prev, morphFrames }) => prev === null ? [] : [{ kind: 'shot', frame: Math.floor(morphFrames / 2) }],
    check: (params) => [
        ...checkKnown(params, ['side', 'size', 'headroom']),
        ...(params.side === undefined || params.side === 'left' || params.side === 'right'
            ? []
            : [`"side" must be "left" or "right" (got ${JSON.stringify(params.side)}).`]),
        ...checkNumber(params, 'size', 0.2, 0.8),
        ...checkHeadroom(params)
    ]
};
/**
 * The camera's share of the frame without `size`: the class's share; with `headroom`, in
 * portrait, grown (up to `PORTRAIT_GROW`) until the shot's head fits the strip with its headroom
 * while the footage covers the strip's width. Only the shot's one head size counts (`ShotInput.head`), never the
 * frame's, so the strip and its panel hold still through the shot.
 */
function defaultShare({ cls, size: [W, H], footage, head, params }) {
    const base = CAMERA_SHARE[cls];
    const headroom = headroomParam(params);
    if (cls !== 'portrait' || !footage || !head || headroom === false)
        return base;
    // Footage covering the strip's width is this tall; landscape footage needs no more anyway.
    const tall = (footage[1] * W) / footage[0];
    const need = (head * tall) / (1 - headroom) / H;
    // Rounded up: a strip a hair too short would make the camera back off by a hair.
    return Math.ceil(clamp(need, base, PORTRAIT_GROW) * 1000) / 1000;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
