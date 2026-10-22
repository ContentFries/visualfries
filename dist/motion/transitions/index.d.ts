import type { FormatClass, ProgramTransition } from '../program.js';
import type { ScreenDirection, TransitionModule } from './contract.js';
export type { Point, ScreenDirection, TransitionEvent, TransitionFrame, TransitionModule, TransitionSetup, TransitionSides } from './contract.js';
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
export declare const TRANSITION_MODULES: Readonly<Record<string, TransitionModule>>;
/** The module drawing `name`; null for a transition not built yet or a custom file. */
export declare function transitionModule(name: string): TransitionModule | null;
/**
 * The screen direction of a written direction in a format class. `forward` (the default) moves
 * like a swipe to the next page: left in landscape and square, up in portrait; `back` the other
 * way. An explicit screen direction stays as written.
 */
export declare function screenDirection(direction: string | null, cls: FormatClass): ScreenDirection;
type Window = Pick<ProgramTransition, 'startFrame' | 'frames'>;
/** Whether program frame `f` is inside the window. */
export declare const inWindow: (t: Window, f: number) => boolean;
/**
 * Progress at program frame `f`, strictly inside 0–1 over the window: the frame before the
 * window is p = 0 (outgoing only) and the frame after it p = 1 (incoming only).
 */
export declare function transitionProgress(t: Window, f: number): number;
/** The window frame whose progress is nearest `at` (see `transitionProgress`). */
export declare function frameAtProgress(t: Window, at: number): number;
/**
 * Events of a transition in program frames: the module's own, or one `transition` on the cut for
 * a transition that is not drawn yet.
 */
export declare function transitionEvents(t: Window & Pick<ProgramTransition, 'type' | 'cutFrame'>): {
    kind: string;
    frame: number;
}[];
/**
 * Frames of handle a cut transition shows on each side of its cut: the incoming side from the
 * first window frame it shows on up to the cut, the outgoing side from the cut to the last frame
 * it shows on (see `TransitionModule.shows`). Without `shows`, the whole window on both sides.
 */
export declare function transitionHandles(t: Window & Pick<ProgramTransition, 'type' | 'cutFrame' | 'ease' | 'params'>): {
    in: number;
    out: number;
};
