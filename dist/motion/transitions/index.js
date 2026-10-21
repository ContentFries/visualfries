import { parseEase } from '../ease.js';
import { blinds } from './blinds.js';
import { card } from './card.js';
import { push } from './push.js';
import { shapeMask } from './shape-mask.js';
import { wipe } from './wipe.js';
import { zoomThrough } from './zoom-through.js';
export { wipeBarAt, wipeBox } from './wipe.js';
export { blindsCount, blindsSlatAt } from './blinds.js';
export { cardOutline, cardPose } from './card.js';
export { shapeAt, shapePath } from './shape-mask.js';
/**
 * The transition registry and the pure parts of the engine: progress per program frame, the
 * screen direction per format class, and the events in program frames. The stage side lives in
 * `player.ts`.
 */
/** Built-in transitions that are drawn. The other names `TRANSITIONS` lists cut until built. */
export const TRANSITION_MODULES = {
    push,
    wipe,
    'zoom-through': zoomThrough,
    'shape-mask': shapeMask,
    blinds,
    card
};
/** The module drawing `name`; null for a transition not built yet or a custom file. */
export function transitionModule(name) {
    return Object.hasOwn(TRANSITION_MODULES, name) ? TRANSITION_MODULES[name] : null;
}
/**
 * The screen direction of a written direction in a format class. `forward` (the default) moves
 * like a swipe to the next page: left in landscape and square, up in portrait; `back` the other
 * way. An explicit screen direction stays as written.
 */
export function screenDirection(direction, cls) {
    if (direction === 'left' || direction === 'right' || direction === 'up' || direction === 'down')
        return direction;
    const back = direction === 'back';
    if (cls === 'portrait')
        return back ? 'down' : 'up';
    return back ? 'right' : 'left';
}
/** Whether program frame `f` is inside the window. */
export const inWindow = (t, f) => f >= t.startFrame && f < t.startFrame + t.frames;
/**
 * Progress at program frame `f`, strictly inside 0–1 over the window: the frame before the
 * window is p = 0 (outgoing only) and the frame after it p = 1 (incoming only).
 */
export function transitionProgress(t, f) {
    return (f - t.startFrame + 1) / (t.frames + 1);
}
/** The window frame whose progress is nearest `at` (see `transitionProgress`). */
export function frameAtProgress(t, at) {
    const k = Math.round(at * (t.frames + 1)) - 1;
    return t.startFrame + Math.max(0, Math.min(t.frames - 1, k));
}
/**
 * Events of a transition in program frames: the module's own, or one `transition` on the cut for
 * a transition that is not drawn yet.
 */
export function transitionEvents(t) {
    const module = transitionModule(t.type);
    if (!module)
        return [{ kind: 'transition', frame: t.cutFrame }];
    return module.events.map((e) => ({ kind: e.kind, frame: frameAtProgress(t, e.at) }));
}
/**
 * Frames of handle a cut transition shows on each side of its cut: the incoming side from the
 * first window frame it shows on up to the cut, the outgoing side from the cut to the last frame
 * it shows on (see `TransitionModule.shows`). Without `shows`, the whole window on both sides.
 */
export function transitionHandles(t) {
    const end = t.startFrame + t.frames;
    const module = transitionModule(t.type);
    const shows = module?.shows?.(t.params);
    if (!module || !shows)
        return { in: t.cutFrame - t.startFrame, out: end - t.cutFrame };
    const ease = parseEase(t.ease ?? module.ease) ?? ((x) => x);
    let first = end;
    let last = t.startFrame - 1;
    for (let f = t.startFrame; f < end; f++) {
        const eased = ease(transitionProgress(t, f));
        if (eased >= shows.in && first === end)
            first = f;
        if (eased < shows.out)
            last = f;
    }
    return { in: Math.max(0, t.cutFrame - first), out: Math.max(0, last + 1 - t.cutFrame) };
}
