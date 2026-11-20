import type { ResolvedBrand } from './brand.js';
import type { ResolvedProgram } from './program.js';
import type { FootageFrames, SubjectBox } from './resolve.js';
import { type StageSegment } from './segments.js';
import type { StageFont } from './stage.js';
/**
 * A live preview folder (`visualfries live`): everything a page needs to play a program in real
 * time, with no extracted frames. `manifest.json` names every other file relative to itself, so
 * the folder can be served from anywhere; `resolveLiveManifest` makes those names URLs.
 */
/** Version of `manifest.json`; a player refuses other versions. */
export declare const LIVE_MANIFEST_VERSION = 1;
/**
 * A proxy video of one footage source, at the project frame rate (frame n of the video is
 * source frame n). `packed`: the picture in the left half and its matte in the right half of the
 * same frame, so the subject cut-out can never be a frame off its picture.
 */
export type LiveSource = {
    url: string;
    packed: boolean;
    /** Size of the picture (one half of a packed proxy). */
    size: [number, number];
    /** Frames of the whole source at the project rate, and its own size. */
    total: number;
    width: number;
    height: number;
};
/**
 * The source frames of a footage the program draws, as `extract` would cut them (same ranges,
 * so frames outside them hold the same edge), with the subject box of each frame when the
 * footage has a matte.
 */
export type LiveRange = {
    first: number;
    last: number;
    boxes?: (SubjectBox | null)[];
};
export type LiveManifest = {
    version: typeof LIVE_MANIFEST_VERSION;
    fps: number;
    frames: number;
    /** Seconds. */
    duration: number;
    size: [number, number];
    /** The ES module with the blocks and the player (`createPlayer`). */
    bundle: string;
    /** Its stylesheet, when blocks import CSS; null otherwise. */
    styles: string | null;
    /** The whole program as one stage segment; its `footage` comes from `footage` and `boxes`. */
    segment: StageSegment;
    footage: Record<string, LiveSource>;
    boxes: Record<string, LiveRange[]>;
    fonts: StageFont[];
    /** The project's CSS. */
    css: string;
    /** The program's sound mix; null when it has no sound. */
    audio: string | null;
    /** Files the segment and the CSS name (fonts, images), relative to the manifest. */
    files: string[];
};
/**
 * The manifest with every file it names as a URL against `base` (the manifest's own URL): the
 * bundle, proxies, sound, fonts, and the files the segment's props, brand tokens and CSS name.
 */
export declare function resolveLiveManifest(manifest: LiveManifest, base: string): LiveManifest;
/**
 * Footage frames for the stage from proxies and ranges instead of extracted files: no URLs (the
 * live pictures draw from the videos), the same ranges and subject boxes as extraction.
 */
export declare function liveFootageFrames(footage: Record<string, LiveSource>, boxes?: Record<string, LiveRange[]>): Record<string, FootageFrames>;
/** A resolved program, not yet a stage segment (see `liveSegment`). */
export type LiveProgram = Pick<ResolvedProgram, 'fps' | 'frames' | 'format' | 'background' | 'shots' | 'clips' | 'transitions' | 'excerpt' | 'sources' | 'cuts'>;
/**
 * The segment a live player draws: a stage segment as it is, or a whole resolved program as one
 * segment (`brand` its tokens), with the footage frames of the proxies.
 */
export declare function liveSegment(input: StageSegment | LiveProgram, footage: Record<string, LiveSource>, boxes?: Record<string, LiveRange[]>, brand?: ResolvedBrand): StageSegment;
