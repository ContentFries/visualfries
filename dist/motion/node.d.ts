import { type MotionProject } from './project.js';
import { type MotionWord } from './transcript.js';
import { type ResolvedClip, type ResolvedProject } from './resolve.js';
export type LoadedMotionProject = {
    file: string;
    dir: string;
    project: MotionProject;
    words: MotionWord[] | null;
    /** Short hash of the transcript's words and times; changes with every re-take. */
    transcriptHash: string | null;
    resolved: ResolvedProject;
};
/** `transcript` overrides the project's transcript (e.g. a re-recorded voiceover); relative to cwd. */
export declare function loadMotionProject(file: string, opts?: {
    transcript?: string;
}): Promise<LoadedMotionProject>;
/** Throws when a requested clip id does not exist in the project. */
export declare function assertKnownClips(loaded: LoadedMotionProject, clipIds?: string[]): void;
/** Throws on errors of the given clips (all clips when omitted), including clips that failed to resolve. */
export declare function assertNoErrors(loaded: LoadedMotionProject, clipIds?: string[]): void;
type BundleResult = {
    dir: string;
    html: string;
};
/** Compile the project's blocks together with the stage runtime into one page. */
export declare function bundleMotionProject(loaded: LoadedMotionProject, clips: ResolvedClip[]): Promise<BundleResult>;
export declare function findChromium(): string | undefined;
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
    /** Set when the clip was rendered against another transcript than the newest render. */
    stale?: boolean;
};
export declare function renderMotionClips(loaded: LoadedMotionProject, opts: {
    output: string;
    clips?: string[];
    jobs?: number;
    invalidate?: string;
    keepFrames?: boolean;
    onProgress?: (msg: string) => void;
}): Promise<RenderedClip[]>;
export {};
