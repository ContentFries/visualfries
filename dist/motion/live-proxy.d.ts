import type { FrameRange } from './footage-map.js';
import type { SubjectBox } from './resolve.js';
import type { LiveRange } from './live-manifest.js';
/**
 * The decisions of `writeLivePreview` (`live-node.ts`) apart from the files: proxy sizes and
 * encodes, their cache keys, and the relative names the preview folder gives project files.
 */
/** Longest side of a proxy picture: a 1920×1080 source becomes 960×540 (1920×540 packed). */
export declare const PROXY_LONGEST = 960;
/** Raise when the proxy encode changes, so cached proxies are made again. */
export declare const PROXY_VERSION = 1;
/** Frames between keyframes: a seek decodes at most this many. */
export declare const PROXY_GOP = 12;
/** The proxy picture size of a `width`×`height` source: its aspect, longest side `longest`. */
export declare function proxySize(width: number, height: number, longest?: number): [number, number];
export type ProxySpec = {
    src: string;
    matte: string | null;
    /** Size and mtime of the source and the matte, as the footage cache keys them. */
    sizes: ([number, number] | null)[];
    fps: number;
    total: number;
    size: [number, number];
};
export declare function proxyCacheKey(spec: ProxySpec): string;
/**
 * ffmpeg arguments of one proxy: every source frame at the project rate (frame n of the proxy is
 * source frame n, as `extract` numbers them), the picture alone or picture|matte side by side
 * (the matte padded like extraction pads it), H.264 with a short GOP so seeks are quick, and the
 * index first so a page can start before the whole file is in.
 */
export declare function proxyArgs(spec: ProxySpec, output: string): string[];
/**
 * The live ranges of one footage: the ranges extraction would cut, each with its frames' subject
 * boxes from `boxes` (measured over the whole matte; null without a matte).
 */
export declare function liveRanges(ranges: FrameRange[], boxes: (SubjectBox | null)[] | null): LiveRange[];
/** Names inside the preview folder for project files: `assets/<n>-<file name>`, one per file. */
export declare function assetNames(files: string[]): Map<string, string>;
/**
 * `text` with every served URL of `names` (see `originUrl`) replaced by the file's name in the
 * folder; throws when one is left, so a preview never points at a page-only URL.
 */
export declare function relativeUrls(text: string, names: Map<string, string>, served: (abs: string) => string, origin: string): string;
/** The progress line of one footage: from the cache, or how long its proxy took. */
export declare function proxyLine(name: string, cached: boolean, ms: number): string;
/** The report of a preview's sound: VisualFries's mix at `file`, or null without sound. */
export declare function liveAudio(mix: {
    report: {
        delivered?: {
            lufs: number;
        };
    };
} | null, file: string): {
    file: string;
    source: 'visualfries-mix';
    lufs: number | null;
} | null;
