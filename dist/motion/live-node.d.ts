import { type LoadedMotionProject } from './node.js';
/**
 * `visualfries live`: a folder a page plays the program from in real time (see `LiveManifest`
 * and `live-player.ts`), with no frames extracted. Proxies are cached by source next to the
 * project, so a new revision of the same program costs a bundle, a mix and the subject boxes.
 */
export type LivePreviewOptions = {
    output: string;
    format?: string;
    onProgress?: (message: string) => void;
};
export type LivePreviewReport = {
    output: string;
    manifest: string;
    fps: number;
    frames: number;
    duration: number;
    size: [number, number];
    footage: Record<string, {
        proxy: string;
        packed: boolean;
        size: [number, number];
        cached: boolean;
    }>;
    /** The program's sound: VisualFries's own mix (the render's), or null without sound. */
    audio: {
        file: string;
        source: 'visualfries-mix';
        lufs: number | null;
    } | null;
    files: number;
    seconds: number;
};
/** Writes the live preview folder of a program project to `opts.output` (replacing it). */
export declare function writeLivePreview(loaded: LoadedMotionProject, opts: LivePreviewOptions): Promise<LivePreviewReport>;
