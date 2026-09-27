import type { MotionWordRef, ResolvedClip, ResolvedCue } from './resolve.js';
/**
 * Where a moment in the clip is: a cue name ("extra"), a cue edge ("extra.end"),
 * a cue with an offset ("extra+0.4", "extra.end-0.2") or clip-local seconds (1.5).
 */
export type At = string | number;
export type Ease = string | ((x: number) => number);
declare const CONTEXT_KEY: unique symbol;
export declare class Clip {
    /** Clip-local time in seconds. Reactive: use it directly in markup. */
    t: number;
    /** Clip-local frame. Reactive. */
    frame: number;
    readonly id: string;
    readonly fps: number;
    readonly frames: number;
    readonly duration: number;
    readonly width: number;
    readonly height: number;
    readonly cue: Record<string, ResolvedCue>;
    readonly words: Record<string, MotionWordRef[]>;
    readonly props: Record<string, unknown>;
    /** Program time of the clip start, for showing transcript timestamps. */
    readonly programStart: number;
    constructor(data: ResolvedClip);
    /**
     * Resolve an `At` to clip-local seconds. Besides project cues, `start` (0) and `end`
     * (clip length) always exist, so exits follow the clip when a new voiceover stretches it.
     */
    at(at: At): number;
    /** Eased 0→1 progress starting at `at`, lasting `duration` seconds. */
    p(at: At, duration?: number, ease?: Ease): number;
    /** Eased 1→0 (for exits). */
    out(at: At, duration?: number, ease?: Ease): number;
    after(at: At): boolean;
    before(at: At): boolean;
    between(a: At, b: At): boolean;
    /** Index of the last passed moment, -1 before the first: `clip.step('a', 'b', 'c')`. */
    step(...moments: At[]): number;
    /**
     * Piecewise-linear map from clip time to a value; equal values create a hold.
     * `clip.map([[0, 0], ['small', 1.2], ['agent', 5.1]])`
     */
    map(points: [At, number][], ease?: Ease): number;
    /** The word is being spoken now. */
    speaking(word: MotionWordRef): boolean;
    /** The word has started. */
    spoken(word: MotionWordRef): boolean;
    /** The word belongs to the word binding `name`, or else to the words of cue `name`. */
    has(name: string, word: MotionWordRef): boolean;
}
export declare const clamp: (x: number, a?: number, b?: number) => number;
export declare const lerp: (a: number, b: number, p: number) => number;
/**
 * Deterministic noise in [0, 1) for any combination of keys, e.g. `noise(i, clip.frame)`.
 * Safe anywhere, including per-frame code: the same keys always give the same value.
 */
export declare function noise(...keys: number[]): number;
/**
 * Seeded generator for building things once (at setup). Do not call it per frame:
 * its sequence depends on call order, so seeking would change the result. Use `noise`.
 */
export declare function random(seed?: number): () => number;
type TimelineBuild = (ctx: {
    tl: gsap.core.Timeline;
    at: (at: At) => number;
    /** Elements of this clip matching `selector`. */
    q: (selector: string) => Element[];
    clip: Clip;
}) => void;
type FrameFn = (ctx: {
    t: number;
    frame: number;
    clip: Clip;
}) => void;
export type ClipController = {
    clip: Clip;
    root: HTMLElement;
    timelines: gsap.core.Timeline[];
    frameFns: FrameFn[];
    ready: Promise<unknown>[];
};
/** The current clip: time, cues, bound transcript words, helpers. */
export declare function useClip(): Clip;
/**
 * Build a paused GSAP timeline in clip seconds. VisualFries seeks it to every frame,
 * so there is no wall-clock playback. Selectors via `q` are scoped to this clip.
 */
export declare function useTimeline(build: TimelineBuild): void;
/** Imperative per-frame drawing (canvas, procedural SVG, third-party engines). */
export declare function useFrame(fn: FrameFn): void;
/** Delay the first frame until `promise` settles (asset decoding, engine setup). */
export declare function useReady(promise: Promise<unknown>): void;
export { CONTEXT_KEY as MOTION_CONTEXT_KEY };
