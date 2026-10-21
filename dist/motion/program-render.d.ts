import { type LoadedMotionProject } from './node.js';
export type RenderedSegment = {
    id: string;
    startFrame: number;
    frames: number;
    hash: string;
    /** The lossless intermediate in the segment cache. */
    file: string;
    /** True when the intermediate came from an earlier render. */
    cached: boolean;
    /** Seconds spent drawing and encoding it (0 when cached). */
    seconds: number;
};
export type RenderedProgram = {
    file: string;
    /** The resolved program saved beside the video (`<name>.program.json`). */
    program: string;
    format: string;
    fps: number;
    frames: number;
    /** `speech`: the cut list's sound, placed per cut (no music, effects or loudness yet). */
    audio: 'speech' | 'silent';
    mode: string;
    segments: RenderedSegment[];
    /** Seconds for the whole render, and for the final join and encode alone. */
    seconds: number;
    encodeSeconds: number;
};
export type ProgramRenderOptions = {
    /** A `.mp4` file, or a directory that gets `<project name>[.<format>].mp4`. */
    output: string;
    /** `WIDTHxHEIGHT`; the project size when omitted. */
    format?: string;
    jobs?: number;
    invalidate?: string;
    /** Draw every segment again, replacing what the cache holds. */
    fresh?: boolean;
    /**
     * How pages share the work: `auto` (whole segments per page when there are at least as many
     * segments to draw as jobs, none much longer than its share), or always `segments` or always
     * `frames`. For measurements.
     */
    schedule?: 'auto' | 'segments' | 'frames';
    onProgress?: (msg: string) => void;
};
/** Renders the program of a project with `cuts` or `shots` into one video. */
export declare function renderProgramVideo(loaded: LoadedMotionProject, opts: ProgramRenderOptions): Promise<RenderedProgram>;
