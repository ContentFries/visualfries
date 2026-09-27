import { type MotionProject } from './project.js';
import { type MotionWord } from './transcript.js';
import { type ResolvedClip, type ResolvedProject } from './resolve.js';
export type LoadedMotionProject = {
    file: string;
    dir: string;
    project: MotionProject;
    words: MotionWord[] | null;
    resolved: ResolvedProject;
};
/** `transcript` overrides the project's transcript (e.g. a re-recorded voiceover); relative to cwd. */
export declare function loadMotionProject(file: string, opts?: {
    transcript?: string;
}): Promise<LoadedMotionProject>;
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
    close(): Promise<void>;
};
export type StillRequest = {
    clip: string;
    at: string;
};
/** Frame for "extra", "extra.end+0.3", "2.5s", "f120", "end", "mid". */
export declare function frameForAt(clip: ResolvedClip, at: string): number;
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
