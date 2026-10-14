import type { Placed } from './placement.js';
export type PreviewOptions = {
    base: string;
    /** Clips with files (absolute or relative to `clipsDir`) and visible windows. */
    placed: (Placed & {
        file: string;
    })[];
    clipsDir: string;
    output: string;
    fps: number;
    size?: [number, number];
    /** Program length; default: the base video's duration. */
    duration?: number;
    chunkSeconds?: number;
    /** Extra audio mixed with the base audio (e.g. a sound-effects preview track). */
    mix?: string[];
    crf?: number;
    onProgress?: (msg: string) => void;
};
/** The chunks' overlay plans (exported for tests): which clips each chunk opens and when they show. */
export declare function previewChunks(placed: Placed[], duration: number, chunkSeconds: number): {
    t0: number;
    t1: number;
    clips: Placed[];
}[];
export declare function renderPreview(opts: PreviewOptions): Promise<{
    output: string;
    chunks: number;
    seconds: number;
}>;
