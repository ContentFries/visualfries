import type { ResolvedKey } from './program.js';
/**
 * Chunks: the pieces a render draws and caches on their own. A segment is the range one page
 * draws; a long one (a block across the whole program) is cut into chunks, each hashed by what
 * its own frames show, so an edit draws again only the chunks it changes.
 */
type Span = {
    startFrame: number;
    frames: number;
};
/** Seconds of a chunk: long enough that opening a page is a small share of drawing it. */
export declare const CHUNK_SECONDS = 4;
/**
 * The chunks of `span`: cut at every multiple of `CHUNK_SECONDS` in program frames, so the grid
 * stays put when the segment's edges move. A piece shorter than half a chunk at either edge
 * joins its neighbour.
 */
export declare function chunkSpans(span: Span, fps: number): Span[];
/**
 * What keys make of program frames `[from, to)`, as runs of equal states: per keyed property,
 * the value held before the first key or after the last, the one value two equal keys mix to,
 * or the two keys around the frame and the frame itself. Equal states draw equal values (the
 * same as `createTrack` interpolates), so keys moved elsewhere leave the states of these frames
 * alone.
 */
export declare function keyStates(keys: readonly ResolvedKey[], from: number, to: number): unknown[];
export {};
