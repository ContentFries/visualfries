import type { ResolvedKey } from './program.js';
/**
 * Chunks: the pieces of the program a render draws, encodes and caches on their own. The
 * program is cut on a fixed grid of program frames, whatever its segments (the ranges one page
 * draws): a chunk holds the parts of every segment inside it, each hashed by what its page sets
 * up for the segment and by the key states of the frames it draws. An edit draws and encodes
 * again only the chunks it changes; the video is the chunks joined as they are.
 */
type Span = {
    startFrame: number;
    frames: number;
};
/**
 * Seconds of a chunk unless the project (`chunkSeconds`) or the render says otherwise: short
 * enough that a small fix draws little again, long enough that each chunk's first frame, a
 * keyframe of the encoded video, costs little.
 */
export declare const CHUNK_SECONDS = 15;
/** Frames of a chunk at `fps`. */
export declare const chunkFrames: (fps: number, seconds?: number) => number;
/**
 * The parts of `span` (a segment): cut at every multiple of the chunk length in program frames,
 * so the grid stays put when the segment's edges move.
 */
export declare function chunkSpans(span: Span, fps: number, seconds?: number): Span[];
/** A part of a segment: the frames of one segment inside one chunk. */
export type SegmentPart = Span & {
    id: string;
    hash: string;
};
/** A chunk of the grid and the segment parts it is drawn from, in program order. */
export type ProgramChunk = Span & {
    id: string;
    /** Covers the chunk's frames and the hash of every part: it changes when one of them does. */
    hash: string;
    parts: (SegmentPart & {
        segment: string;
    })[];
};
/**
 * The chunks of a program of `frames` frames from the parts of its segments (see `chunkSpans`
 * with the same grid).
 */
export declare function programChunks(segments: readonly {
    id: string;
    parts: readonly SegmentPart[];
}[], frames: number, fps: number, seconds?: number): ProgramChunk[];
/**
 * What keys make of program frames `[from, to)`, as runs of equal states: per keyed property,
 * the value held before the first key or after the last, the one value two equal keys mix to,
 * or the two keys around the frame and the frame itself. Equal states draw equal values (the
 * same as `createTrack` interpolates), so keys moved elsewhere leave the states of these frames
 * alone.
 */
export declare function keyStates(keys: readonly ResolvedKey[], from: number, to: number): unknown[];
export {};
