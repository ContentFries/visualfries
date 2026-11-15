import { type FrameRange } from './footage-map.js';
import type { ResolvedProgram } from './program.js';
/**
 * Where a program reads the mattes of its footage, so `visualfries matte <project>` mattes only
 * those frames and `check` and `render` refuse a partial matte that misses one. Pure: the program
 * and a few facts about its blocks decide it.
 *
 * A program reads a matte where it draws the subject's picture (a shot that needs a matte, a dim
 * or blurred room, a room cut away, a clip behind the speaker, a block that draws or measures the
 * subject) and where the subject decides the framing. The framing is not listed shot by shot: the
 * shot engine lays every frame out for a few made-up subjects, and a frame whose layout changes
 * with the subject reads the matte. A shot framed by the head reads it over the whole shot (its
 * one head size comes from all of its frames).
 */
export type MatteReadOptions = {
    /** Whether a clip's block draws or measures the subject (`<Subject>`, `subject()`, …). */
    readsSubject: (block: string) => boolean;
    /** Source frames around what a subject-reading clip shows (its `offset` reach), by source. */
    margins?: Record<string, number>;
    /** More program frames whose picture reads the matte (an inserts export's holdout handles). */
    extra?: {
        startFrame: number;
        frames: number;
    }[];
};
type Program = Pick<ResolvedProgram, 'fps' | 'frames' | 'format' | 'background' | 'sources' | 'cuts' | 'shots' | 'clips' | 'transitions' | 'excerpt'>;
/**
 * Source frames each matte is read at, by footage name (only footage with a matte), as sorted
 * inclusive ranges in source frames at the project rate. Frames around each read that the
 * subject's smoothing reaches are included.
 */
export declare function matteReads(program: Program, opts: MatteReadOptions): Record<string, FrameRange[]>;
/** A word of the footage's transcript, in seconds of the footage. */
type Word = {
    start: number;
    end: number;
};
export type MattePlanOptions = {
    /** Frames of the matte video (the footage's own frames). */
    total: number;
    /** The footage's own frame rate. */
    fps: number;
    /** Seconds kept on each side of every read. Default 1. */
    margin?: number;
    /** Ranges closer than this many seconds are matted as one. Default 3. */
    gap?: number;
    /** The footage's transcript: bounds move out of words into the pause before or after. */
    words?: readonly Word[] | null;
};
/**
 * Default seconds kept around every read, merged across, matted before a stretch to warm up, and
 * per cached block.
 */
export declare const MATTE_PLAN: {
    readonly margin: 1;
    readonly gap: 3;
    readonly warmup: 1;
    readonly block: 2;
};
/**
 * Converts source frames at the project rate to frames of a footage at its own rate, rounding
 * outward so every frame the conversion may pick is inside.
 */
export declare function toFootageFrames(ranges: readonly FrameRange[], projectFps: number, fps: number, total: number): FrameRange[];
/**
 * The ranges to matte for the reads of one footage (in its own frames): each widened by
 * `margin` seconds, its bounds moved out of any word into the pause next to it, ranges closer
 * than `gap` seconds joined, all inside the footage.
 */
export declare function planMatteRanges(reads: readonly FrameRange[], opts: MattePlanOptions): FrameRange[];
/** The parts of `needed` outside `covered` (both sorted inclusive ranges). */
export declare function uncovered(needed: readonly FrameRange[], covered: readonly FrameRange[]): FrameRange[];
/**
 * What `visualfries matte <project>` writes next to a matte it made for part of a footage
 * (`<matte>.ranges.json`): the footage it was made from, the matte it describes and the frames
 * it covers. Outside them the matte is black. A matte without this file covers the whole footage.
 */
export type MatteRangesFile = {
    version: 2;
    /** The footage file (its name), its fingerprint (see `fileFingerprint`), frames and rate. */
    source: {
        file: string;
        fingerprint: string;
        frames: number;
        fps: number;
    };
    /** Fingerprint of the matte this file describes: any other file at that path is not it. */
    matte: {
        fingerprint: string;
    };
    /** Frames of the footage (its own rate) the matte covers, as inclusive `[first, last]`. */
    ranges: [number, number][];
    provider: string;
    /** Hash of everything that made the matte: the same key writes the same matte. */
    key: string;
};
export declare const rangesFileOf: (matte: string) => string;
/** Checks a parsed ranges file; returns the problem, or null when it can be used. */
export declare function rangesFileProblem(file: unknown, now: {
    source: {
        fingerprint: string;
        frames: number;
    };
    matte: {
        fingerprint: string;
    };
}): string | null;
/** Inclusive frame ranges as readable seconds, "12.40–13.10 s, 20.00–21.00 s". */
export declare function rangeSeconds(ranges: readonly FrameRange[], fps: number): string;
export {};
