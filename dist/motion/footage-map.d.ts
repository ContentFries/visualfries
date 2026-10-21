import type { ResolvedProgram } from './program.js';
/**
 * Which source frame the program shows at each program frame. Pure and shared by the node
 * tooling (what to extract) and the page (what to draw), so both always agree.
 *
 * Inside a cut, program frame f shows source frame `srcIn + (f − startFrame)`. The same formula
 * runs on into the handles a transition window shows before and after the cut, and where the
 * source runs out its edge frame holds. A shot with its own `source` frames that source instead
 * of the cut list's, from its `in` at the shot start.
 */
/** A program range where one source is the picture: a cut, or a shot with its own source. */
export type FootageSpan = {
    /** Cut or shot id. */
    owner: string;
    kind: 'cut' | 'shot';
    source: string;
    /** Program frames where it is the picture. */
    startFrame: number;
    frames: number;
    /** Source frame shown at `startFrame` (project rate). */
    srcIn: number;
};
/** A cut or shot transition: both sides are on screen from `startFrame` for `frames`. */
export type FootageWindow = {
    kind: 'cut' | 'shot';
    startFrame: number;
    frames: number;
    /** First frame of the incoming item. */
    cutFrame: number;
    /** Span owners of the two sides; null: whatever the cut list shows then. */
    out: string | null;
    in: string | null;
};
export type FootageMap = {
    /** Program frames; frames before 0 and after the end show the nearest program frame. */
    frames: number;
    /** Source lengths in frames at the project rate; null: unknown (no hold at the end). */
    totals: Record<string, number | null>;
    spans: FootageSpan[];
    windows: FootageWindow[];
};
/** One source frame on screen at a program frame. */
export type FootageView = {
    source: string;
    /** Source frame (project rate). */
    frame: number;
    /** Cut or shot that shows it. */
    owner: string;
    /** True when the source ran out and its edge frame holds. */
    held: boolean;
};
/** An inclusive range of source frames. */
export type FrameRange = {
    first: number;
    last: number;
};
type Span = {
    startFrame: number;
    frames: number;
};
/** The map of a resolved program; `totals` overrides the probed source lengths. */
export declare function footageMap(program: Pick<ResolvedProgram, 'frames' | 'sources' | 'cuts' | 'shots' | 'transitions'>, totals?: Record<string, number | null>): FootageMap;
/**
 * Every source frame on screen at program frame `f`: the picture first, then the other side
 * of a transition window. A shot with its own source covers the cut list under it.
 */
export declare function footageAt(map: FootageMap, programFrame: number): FootageView[];
/**
 * The footage on each side of a cut or shot transition at program frame `f` (inside or outside
 * its window): the outgoing cut run on into its handle and the incoming cut started early from
 * its handle, edge frames held where the source runs out; for a shot transition, the footage of
 * the shot before and the shot itself (the cut list when a shot has no source of its own). Null
 * when a shot with its own source covers a cut transition: nothing of it is on screen.
 */
export declare function transitionSidesAt(map: FootageMap, t: {
    kind: 'cut' | 'shot' | 'clip';
    outgoing: string | null;
    owner: string;
}, programFrame: number): {
    out: FootageView | null;
    in: FootageView | null;
} | null;
/** The picture at program frame `f`: what `<Footage program>` draws. Null with no footage. */
export declare function programFootageAt(map: FootageMap, programFrame: number): FootageView | null;
/** The frame of source `name` on screen at program frame `f`; null when it is not on screen. */
export declare function sourceFrameAt(map: FootageMap, name: string, programFrame: number): FootageView | null;
/**
 * Source frames to extract, per source, as sorted inclusive ranges: every frame the program
 * shows (cuts, the handles their transitions need, shots with a source, held edge frames) and,
 * around every source frame a clip window shows, `margins[source]` frames on each side (for
 * `offset`). Ranges closer than `gap` frames are merged.
 */
export declare function footageRanges(map: FootageMap, clips: Span[], margins?: Record<string, number>, gap?: number): Record<string, FrameRange[]>;
export {};
