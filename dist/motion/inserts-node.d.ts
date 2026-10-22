import { type LoadedMotionProject, type RenderedClip } from './node.js';
/**
 * `render <program> --export inserts`: every clip of the program as its own file (see
 * `inserts.ts` for what an insert is), drawn on the program's stage with the clip alone, plus
 * `manifest.json` with each insert's program frames, handles and the cut list under it.
 */
export declare function renderProgramInserts(loaded: LoadedMotionProject, opts: {
    output: string;
    clips?: string[];
    jobs?: number;
    /** Frames before and after each clip (default 10). */
    handles?: number;
    invalidate?: string;
    keepFrames?: boolean;
    onProgress?: (msg: string) => void;
}): Promise<RenderedClip[]>;
