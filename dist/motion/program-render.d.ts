import { type LoadedMotionProject } from './node.js';
import { type MixReport, type StemName } from './audio.js';
/** A chunk of a segment as the render drew or found it (`id` is the chunk's). */
export type RenderedSegment = {
    id: string;
    /** The segment it belongs to: the page that draws it. */
    segment: string;
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
    /** `mixed`: speech, effects and music, normalised; `silent`: the program has no sound. */
    audio: 'mixed' | 'silent';
    /** Levels and loudness of the mix; null when silent. */
    mix: MixReport | null;
    /** With `stems`: the WAV file of each stem beside the video. */
    stems: Record<StemName, string> | null;
    mode: string;
    /** Every chunk of every segment, in program order. */
    segments: RenderedSegment[];
    /** Seconds for the whole render, and for the final join and encode alone. */
    seconds: number;
    encodeSeconds: number;
};
export type ProgramRenderOptions = {
    /**
     * A `.mp4` file, or a directory that gets `<project name>[.<format>].mp4`
     * (`<project name>.<excerpt>[.<format>].mp4` for an excerpt).
     */
    output: string;
    /** `WIDTHxHEIGHT`; the project size (an excerpt's own format) when omitted. */
    format?: string;
    /** An excerpt's id: that range of the program, sliced from the whole (see `excerpt.ts`). */
    excerpt?: string;
    jobs?: number;
    invalidate?: string;
    /** Draw every segment again, replacing what the cache holds. */
    fresh?: boolean;
    /**
     * Also write the stems beside the video (`<name>.speech.wav`, `.sfx.wav`, `.music.wav`):
     * 48 kHz 32-bit float, with the master gain and limiter applied, so they add up to the mix
     * before encoding (within about 1e-5). Without it, stems of that name are removed.
     */
    stems?: boolean;
    /**
     * How pages share the work: `auto` (whole chunks per page when there are at least as many
     * chunks to draw as jobs, none much longer than its share), or always `segments` (whole
     * chunks) or always `frames`. For measurements.
     */
    schedule?: 'auto' | 'segments' | 'frames';
    onProgress?: (msg: string) => void;
};
/** Renders the program of a project with `cuts` or `shots` into one video. */
export declare function renderProgramVideo(loaded: LoadedMotionProject, opts: ProgramRenderOptions): Promise<RenderedProgram>;
