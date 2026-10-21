import { type BrowserLike, type BundleResult, type ClipCheck, type LoadedMotionProject, type MotionPage } from './node.js';
import { type ResolvedProgram } from './program.js';
import { type StageSegment } from './segments.js';
/**
 * Program mode in Node: pages that draw segments of the program (`loadSegment`), and the
 * `still` and `check` commands on top of them. A page holds one segment, or the whole program
 * when a check compares the two.
 */
type Span = {
    id: string;
    startFrame: number;
    frames: number;
};
/** One page with a segment of the program loaded; `capture` takes program frames. */
export declare function openSegment(browser: BrowserLike, bundle: BundleResult, program: ResolvedProgram, segment: Span, opts?: {
    invalidate?: string;
    timeout?: number;
}): Promise<MotionPage & {
    segment: StageSegment;
}>;
/** Throws when the program has errors: its frames are not defined until they are fixed. */
export declare function assertProgramRenders(program: ResolvedProgram): void;
/**
 * Program frame of a moment: program-wide ("2.5s", "f120", "mid", "end", seconds), or inside a
 * clip when `clip` is given ("extra+0.3", the clip's own "end").
 */
export declare function programFrameForAt(program: ResolvedProgram, at: string, clip?: string): number;
/** Moments for a program contact sheet: the start, the middle and first frame of every cut, the end. */
export declare function defaultProgramMoments(program: ResolvedProgram): string[];
/**
 * Stills of the program: each request is drawn on the page of the segment holding its frame,
 * one page per segment.
 */
export declare function renderProgramStills(loaded: LoadedMotionProject, requests: {
    at: string;
    clip?: string;
}[], opts?: {
    invalidate?: string;
}): Promise<{
    clip?: string;
    at: string;
    frame: number;
    png: Buffer;
    mode: string;
}[]>;
/**
 * Captures `frames` of the program in the given order, on segment pages (default) or on one page
 * holding the whole program. Returns PNGs by program frame. Mainly for tests and checks.
 */
export declare function captureProgramFrames(loaded: LoadedMotionProject, frames: number[], opts?: {
    whole?: boolean;
    invalidate?: string;
}): Promise<Map<number, Buffer>>;
/**
 * Checks a program on segment pages: runs every clip's logic at the frames around cuts, clip
 * edges, cues and transitions, and with `determinism` captures a sample of frames forward,
 * backward and scrambled on the segment's page and once more on a page holding the whole
 * program; all four must give identical pixels. One result per segment; `clips` limits the
 * check to the segments those clips are on screen in.
 */
export declare function checkProgram(loaded: LoadedMotionProject, opts?: {
    clips?: string[];
    determinism?: boolean;
}): Promise<ClipCheck[]>;
export {};
