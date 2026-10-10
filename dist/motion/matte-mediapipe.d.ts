import type { MatteProvider } from './matte.js';
export type MediaPipeModel = 'selfie' | 'selfie-landscape';
type ModelEntry = {
    file: string;
    url: string;
    sha256: string;
    /** Input size of the network; frames are scaled to it before they reach the page. */
    width: number;
    height: number;
};
/** Apache-2.0 models published by Google; pinned to version 1 and checked by hash. */
export declare const MEDIAPIPE_MODELS: Record<MediaPipeModel, ModelEntry>;
/** `$VISUALFRIES_CACHE_DIR`, else the platform cache folder, plus `visualfries`. */
export declare function visualfriesCacheDir(): string;
/**
 * Path of a model file in `dir`, downloaded on first use. A cached file is used only when its
 * hash matches; a download is checked before it replaces anything.
 */
export declare function ensureModelFile(entry: Pick<ModelEntry, 'file' | 'url' | 'sha256'>, dir: string, doFetch?: typeof fetch): Promise<string>;
/** Picks the network whose input shape is closer to the video's. */
export declare function pickMediaPipeModel(width: number, height: number): MediaPipeModel;
/**
 * MediaPipe selfie segmentation, free and local: no key, no Python. Runs the
 * `@mediapipe/tasks-vision` WASM build (optional peer dependency) in headless Chromium through
 * Playwright, about 70 frames per second per piece on one CPU core. The model (≈250 KB,
 * Apache-2.0) is downloaded once into `cacheDir`. Edges are softer than BiRefNet's and hair
 * is rougher, which suits small cut-outs and picture-in-picture.
 *
 *   mediapipeMatte({ model: 'selfie', smoothing: 0.5 })
 */
export declare function mediapipeMatte(opts?: {
    /**
     * `selfie` (256×256 network) or `selfie-landscape` (256×144, faster, for wide video).
     * Default: whichever matches the video's shape.
     */
    model?: MediaPipeModel | 'auto';
    /**
     * Blends each mask with the previous one to calm flickering edges: 0 = off, 0.5 by
     * default (halves the edge flicker on a talking head); above 0.7 fast moves leave a
     * trail. Restarts at every piece.
     */
    smoothing?: number;
    /** Pieces running at once, each in its own browser. Default: a third of the CPU cores, 1–4. */
    parallel?: number;
    /** Where downloaded models are kept. Default: `visualfriesCacheDir()`. */
    cacheDir?: string;
    /** Injected in tests. */
    fetch?: typeof fetch;
}): MatteProvider;
export {};
