import type { MotionProject } from './project.js';
import { type Transition } from './timeline.js';
import type { MotionWord } from './transcript.js';
import type { MusicBeats } from './beat-grid.js';
import type { ProjectLook } from './resolve.js';
/** A word of the program transcript and where it came from. */
export type ProgramWord = MotionWord & {
    /** Footage the word was spoken in; null for a project-level transcript without footage. */
    source: string | null;
    /** Index in that source's transcript. */
    sourceIndex: number | null;
    /** Index of the cut that plays it. */
    cut: number | null;
    /** Source seconds. */
    sourceStart: number | null;
    sourceEnd: number | null;
};
export type ProgramDiagnostic = {
    level: 'error' | 'warning' | 'info';
    /** Cut, shot, transition, music or sfx id. */
    item?: string;
    /** Clip id, as in `ResolvedProject` diagnostics. */
    clip?: string;
    field: string;
    message: string;
};
/** What the node tooling probed about a footage file. */
export type SourceInfo = {
    /** Frames at the project frame rate. */
    frames: number;
    /** Seconds. */
    duration: number;
    width: number;
    height: number;
    /** The file's own frame rate. */
    fps: number;
    /** Whether it has a sound track. */
    audio: boolean;
    /**
     * Seconds of sound: the length of the footage's `audio` file when it has one, else of the
     * file's own sound track. Unknown: the picture's length.
     */
    audioDuration?: number;
};
/** Seconds of sound a probed source has; Infinity when it was not probed. */
export declare const soundLength: (info: SourceInfo | undefined) => number;
export type ProgramInputs = {
    /** Project-level transcript, in program time. */
    words: MotionWord[] | null;
    /** Transcripts of single footage sources, in source time. */
    transcripts?: Record<string, MotionWord[]>;
    /** Probed footage; a source missing here could not be read. */
    sources?: Record<string, SourceInfo>;
    /** Music beats in program time (node tooling reads the beats files), for beat anchors. */
    music?: MusicBeats[];
    /** Brand and style resolved from their files; neutral when absent. */
    look?: ProjectLook;
    /**
     * Sound files named by sfx items, transitions and music items, by the name as written: the
     * seconds into the file where its hit sits (0 unless a sound library's `sounds.json` says),
     * or null when the file does not exist. Absent: not looked up.
     */
    sounds?: Record<string, SoundInfo | null>;
};
/**
 * `warning`: why the hit offset could not be read (it is then 0); `error`: the file has no
 * readable sound.
 */
export type SoundInfo = {
    hit: number;
    warning?: string;
    error?: string;
};
export type ResolvedCut = {
    id: string;
    index: number;
    source: string;
    /** Source frames (at the project frame rate) of the first and after the last frame. */
    srcIn: number;
    srcOut: number;
    /** Program frames. */
    startFrame: number;
    frames: number;
    /** Program seconds where this cut's sound starts (its first frame plus the J/L split). */
    edit: number;
    split: number;
    crossfade: number;
    /** dB. */
    gain: number;
    mute: boolean;
    transition: Transition | null;
    native: boolean | null;
    /** `in`/`out` given as source seconds or frames: they do not follow a retake. */
    numeric: ('in' | 'out')[];
};
export type CutList = {
    /** inserts: clips only, as before the cut list existed; program: the whole program. */
    mode: 'inserts' | 'program';
    cuts: ResolvedCut[];
    /** Program frames the cut list covers; null without cuts. */
    frames: number | null;
    /** Program transcript; null without any transcript. */
    words: ProgramWord[] | null;
    diagnostics: ProgramDiagnostic[];
};
/** Audio times are kept to the microsecond (a 48 kHz sample is ~21 µs): no float noise in files. */
export declare const micro: (seconds: number) => number;
/** Default anti-click crossfade at every audio edit point, seconds. */
export declare const DEFAULT_CROSSFADE = 0.01;
/**
 * Resolves the cut list: cut points in source time (phrases against the source's transcript,
 * `out` searched from `in`, frame-rounded), program positions, audio edit points and the program
 * transcript. Projects without `cuts` or `shots` stay in inserts mode: their transcript is
 * program time, untouched.
 */
export declare function resolveCutList(project: MotionProject, inputs: ProgramInputs): CutList;
