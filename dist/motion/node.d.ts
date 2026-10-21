import { type MotionFont, type MotionMusic, type MotionProject } from './project.js';
import { type ResolvedBrand } from './brand.js';
import { type ResolvedStyle } from './style.js';
import { type MotionWord } from './transcript.js';
import { type CutList, type ProgramInputs } from './cutlist.js';
import { type ResolvedProgram } from './program.js';
import { type ResolvedClip, type ResolvedProject } from './resolve.js';
import { type BarRow, type BeatsFile, type MusicBeats } from './beat-grid.js';
import { type FootageMap, type FrameRange } from './footage-map.js';
import type { FootageFrames, SubjectBox } from './resolve.js';
export type LoadedMotionProject = {
    file: string;
    dir: string;
    project: MotionProject;
    /** Program-time words the clips resolve against (the program transcript in program mode). */
    words: MotionWord[] | null;
    /** Short hash of the transcript's words and times; changes with every re-take. */
    transcriptHash: string | null;
    /** The project's music items with their beats (corrected and placed in the program). */
    music: LoadedMusic[];
    /**
     * Short hash of every beats file and its corrections (`from`, `until`, `shift`, `downbeat`,
     * `tempo`); null without music beats. Beat-anchored clips move when it changes.
     */
    musicHash: string | null;
    brand: LoadedBrand;
    style: LoadedStyle;
    resolved: ResolvedProject;
    /**
     * What the program resolves from: the project-level transcript, transcripts of single footage
     * sources (`footage.<name>.transcript`, source time) and, in program mode only, the probed
     * footage files whose lengths the cut list needs.
     */
    inputs: ProgramInputs;
    /**
     * Short hashes: project file, transcripts by source, footage picture files (video and matte,
     * size and time; the sound is mixed fresh on every render).
     */
    hashes: {
        project: string;
        transcript: string | null;
        transcripts: Record<string, string>;
        sources: Record<string, string>;
    };
    cutList: CutList;
};
export type LoadedMusic = {
    music: MotionMusic;
    /** Absolute path of the beats file; null when the item has none. */
    beatsFile: string | null;
    analysis: BeatsFile | null;
    /** SHA-256 of the beats file as read; null when the item has none. */
    beatsHash: string | null;
    beats: MusicBeats | null;
    /** Bars in program seconds, for the `check` grid. */
    bars: BarRow[];
};
export type LoadedBrand = {
    resolved: ResolvedBrand;
    /** Short hash of the brand's values and the contents of its font and logo files; null without a brand. */
    hash: string | null;
    /** The brand file, null for an inline brand or none. */
    file: string | null;
    /** Font faces to load, with absolute paths. */
    fonts: MotionFont[];
    /** Absolute paths of every file the brand references (fonts, logos), served to the page. */
    assets: string[];
};
export type LoadedStyle = {
    resolved: ResolvedStyle;
    /** Short hash of the layered style; null without a style. */
    hash: string | null;
};
/** Read and resolve the project's brand: a file next to the project or an inline object. */
export declare function loadBrand(project: MotionProject, dir: string): Promise<LoadedBrand>;
/** Resolve the project's style through its `extends` chain (built-ins, style files, inline). */
export declare function loadStyle(project: MotionProject, dir: string): LoadedStyle;
/** `transcript` overrides the project's transcript (e.g. a re-recorded voiceover); relative to cwd. */
export declare function loadMotionProject(file: string, opts?: {
    transcript?: string;
}): Promise<LoadedMotionProject>;
/**
 * The bar grid of each music item with beats, as text for `check`: one line per bar with its
 * program time, tempo, energy and first beats. A BPM column at twice (or half) the tempo you
 * hear means the analyzer chose the wrong level: set `"tempo": "half"` (or `"double"`).
 */
export declare function describeMusicGrid(loaded: LoadedMotionProject): string;
/**
 * The resolved program for one format (see `resolveProgram`), with the hashes of the files
 * behind it. `write` also saves it as `.visualfries/program/<format>.json` next to the project.
 */
export declare function motionProgram(loaded: LoadedMotionProject, opts?: {
    format?: string;
    write?: boolean;
}): Promise<{
    program: ResolvedProgram;
    file: string | null;
}>;
/** Throws when a requested clip id does not exist in the project. */
export declare function assertKnownClips(loaded: LoadedMotionProject, clipIds?: string[]): void;
/** Throws on errors of the given clips (all clips when omitted), including clips that failed to resolve. */
export declare function assertNoErrors(loaded: LoadedMotionProject, clipIds?: string[]): void;
/**
 * What the page may read: whole `roots` (the bundle and extracted footage) and single `files`
 * (declared fonts and assets the project CSS points to). Nothing else in the project is served.
 */
export type BundleResult = {
    dir: string;
    html: string;
    roots: string[];
    files: string[];
    /** Extracted footage and, in program mode, the map from program to source frames. */
    footage: {
        frames: Record<string, FootageFrames>;
        map: FootageMap | null;
    };
    /** The project's brand; the program stage sets its tokens on the whole stage. */
    brand: ResolvedBrand;
};
/** Compile the project's blocks together with the stage runtime into one page. */
export declare function bundleMotionProject(loaded: LoadedMotionProject, clips: ResolvedClip[]): Promise<BundleResult>;
export declare function findChromium(): string | undefined;
type RouteLike = {
    request(): {
        url(): string;
    };
    fulfill(response: {
        status: number;
        body?: Buffer | string;
        contentType?: string;
    }): Promise<void>;
};
type PageLike = {
    goto(url: string): Promise<unknown>;
    route(url: string, handler: (route: RouteLike) => unknown): Promise<void>;
    evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
    locator(sel: string): {
        screenshot(opts: {
            omitBackground?: boolean;
            type?: 'png';
        }): Promise<Buffer>;
    };
    on(event: 'pageerror' | 'console' | 'crash', fn: (e: any) => void): void;
    close(): Promise<void>;
};
export type BrowserLike = {
    newPage(opts: object): Promise<PageLike>;
    close(): Promise<void>;
};
export declare function launch(): Promise<BrowserLike>;
export type MotionPage = {
    mode: 'html-in-canvas' | 'dom';
    capture(frame: number): Promise<Buffer>;
    check(frames: number[]): Promise<{
        errors: {
            frame: number;
            message: string;
        }[];
        warnings: {
            frame: number;
            message: string;
        }[];
    }>;
    close(): Promise<void>;
};
/** One page with one clip loaded (see `openStagePage`). Exported for tests. */
export declare function openClip(browser: BrowserLike, bundle: Pick<BundleResult, 'html' | 'roots' | 'files'>, clip: ResolvedClip, opts?: {
    invalidate?: string;
    timeout?: number;
}): Promise<MotionPage>;
/** What a page loads: one clip (`load`) or a segment of the program (`loadSegment`). */
export type StageTarget = {
    /** How errors name it: `Clip "intro"`, `Segment "seg2"`. */
    name: string;
    size: [number, number];
    alpha: boolean;
    load: 'load' | 'loadSegment';
    data: unknown;
};
/**
 * One page with a clip or a segment loaded. Every call fails as soon as the page crashes or
 * stops answering: Playwright leaves a call to a crashed page pending forever, so without this a
 * renderer crash would hang `render` instead of failing it.
 */
export declare function openStagePage(browser: BrowserLike, bundle: Pick<BundleResult, 'html' | 'roots' | 'files'>, target: StageTarget, opts?: {
    invalidate?: string;
    timeout?: number;
}): Promise<MotionPage>;
type VideoInfo = {
    width: number;
    height: number;
    fps: number;
    frames: number;
    /** Seconds from the first frame to the end of the last one. */
    duration: number;
    /** False when the frame intervals are not all equal (variable frame rate, dropped frames). */
    constant: boolean;
};
export declare function probeVideo(file: string): Promise<VideoInfo>;
/**
 * Cache key of one extracted range: source, matte, their sizes and times, frame rate and range.
 * Inserts mode has always used it for its one range, so existing caches stay valid.
 */
export declare function footageCacheKey(input: {
    src: string;
    matte: string | null;
    sizes: ([number, number] | null)[];
    fps: number;
    range: FrameRange;
}): string;
/**
 * Extracts the footage frames the given clips need (with a margin) into
 * `<project>/.visualfries/footage/`, attaches them to the clips and returns the folders to serve.
 * Inserts mode extracts one range per footage around the clips. Program mode extracts every
 * range of every source the program shows (cuts, the handles their transitions need, shots with
 * a source) plus the margin around what the clips show, each range on its own, and attaches the
 * footage map that turns program frames into source frames. Each range is cached by source,
 * matte, frame rate and range.
 */
export declare function prepareFootage(loaded: LoadedMotionProject, clips: ResolvedClip[]): Promise<string[]>;
/** Subject box of one greyscale matte frame, in 0–1 coordinates. Exported for tests. */
export declare function measureSubject(gray: Uint8Array, w: number, h: number): SubjectBox | null;
export type StillRequest = {
    clip: string;
    at: string;
};
/** Frame for "extra", "extra.end+0.3", "2.5s", "f120", "end", "mid". */
export declare function frameForAt(clip: ResolvedClip, at: string): number;
export type ClipCheck = {
    id: string;
    ok: boolean;
    mode?: string;
    errors: {
        frame?: number;
        message: string;
    }[];
    warnings: {
        frame?: number;
        message: string;
    }[];
    /** Frames whose pixels differed between two seek orders (with `determinism`). */
    nondeterministic?: number[];
};
/**
 * Mount every block and run its logic across the clip without rendering video: resolution
 * errors, runtime errors (unknown cue, bad ease, map order), wall-clock CSS animations and,
 * optionally, whether sampled frames come out identical in two seek orders.
 */
export declare function checkMotionProject(loaded: LoadedMotionProject, opts?: {
    clips?: string[];
    determinism?: boolean;
}): Promise<ClipCheck[]>;
/**
 * Colour literals in a block's source (hex, rgb(), hsl()), each listed once. Black, white and
 * their transparent shades (shadows, scrims) and fallbacks inside `var(--x, …)` are left out.
 */
export declare function hardCodedColors(source: string): string[];
/** Moments worth checking: start, each cue + 0.6 s settle, end. */
export declare function defaultMoments(clip: ResolvedClip): string[];
export declare function renderStills(loaded: LoadedMotionProject, requests: StillRequest[], opts?: {
    invalidate?: string;
}): Promise<{
    clip: string;
    at: string;
    frame: number;
    png: Buffer;
    mode: string;
}[]>;
/** One labelled grid image so an agent can review many moments in a single look. */
export declare function composeSheet(images: {
    label: string;
    png: Buffer;
}[], opts?: {
    columns?: number;
    width?: number;
}): Promise<Buffer>;
export type RenderedClip = {
    id: string;
    file: string;
    frames: number;
    programStartFrame: number;
    programStart: number;
    programEnd: number;
    alpha: boolean;
    mode: string;
    seconds: number;
    /** Transcript the clip was timed against. */
    transcript: string | null;
    /** Music beats and corrections the clip was timed against (`musicHash`); absent without music. */
    music?: string;
    /** Hash of the brand the clip was rendered with (null: no brand). */
    brand: string | null;
    /** Hash of the layered style the clip was rendered with (null: no style). */
    style: string | null;
    /** Set when the clip was rendered against another transcript or music beats than the newest render. */
    stale?: boolean;
};
/** The encoder went away while frames were being piped; the frames themselves were fine. */
export declare class FramePipeError extends Error {
}
type FrameSink = {
    write(png: Buffer): Promise<void>;
    end(): Promise<void>;
    kill(): void;
};
/**
 * ffmpeg reading PNG frames from stdin, in order. `write` resolves once ffmpeg has taken the
 * frame (back-pressure), so at most a few frames are held in memory whatever the clip length.
 */
export declare function ffmpegFramePipe(args: string[]): FrameSink;
/**
 * Pages take frames in turn (page j renders j, j + jobs, …) and a reorder buffer hands them to
 * ffmpeg in order. A page waits while it is more than a few frames ahead of the encoder, so
 * memory stays flat; frames are deterministic in any order, which `check --determinism` proves.
 */
export declare function pipeFrames(frames: number, jobs: number, open: () => Promise<Pick<MotionPage, 'capture' | 'close'>>, sink: FrameSink): Promise<void>;
export declare function renderMotionClips(loaded: LoadedMotionProject, opts: {
    output: string;
    clips?: string[];
    jobs?: number;
    invalidate?: string;
    keepFrames?: boolean;
    onProgress?: (msg: string) => void;
}): Promise<RenderedClip[]>;
export {};
