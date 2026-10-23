import type { MotionProject } from './project.js';
import { type Transition } from './timeline.js';
import type { MotionWord } from './transcript.js';
import type { MusicBeats } from './beat-grid.js';
import { type MusicTrack } from './music.js';
import type { ProjectFiles, ProjectLook } from './resolve.js';
import type { AnimatableKind } from './interpolate.js';
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
    /**
     * Music beats already in program time, for beat anchors. Ignored when `tracks` is given: the
     * resolver then places the music itself.
     */
    music?: MusicBeats[];
    /**
     * Each music item's beats in seconds of its file (node tooling reads the beats files). The
     * resolver places them in the program through the item's `from`, `in` and `until`.
     */
    tracks?: MusicTrack[];
    /** Brand and style resolved from their files; neutral when absent. */
    look?: ProjectLook;
    /**
     * Sound files named by sfx items, transitions and music items, by the name as written: the
     * seconds into the file where its hit sits (0 unless a sound library's `sounds.json` says),
     * or null when the file does not exist. Absent: not looked up.
     */
    sounds?: Record<string, SoundInfo | null>;
    /** Project files clip props name as `{ "file": … }` (see `ProjectFiles`). Absent: not checked. */
    files?: ProjectFiles['files'];
    /**
     * What each block named by a clip marks animatable (`export const animatable` in its
     * `<script module>`), by the name as written; `error` when the declaration cannot be read.
     * Absent: not looked up, so keyed props are not checked against it.
     */
    animatable?: Record<string, BlockAnimatable>;
    /**
     * The events each block named by a clip declares (`export const events` in its `<script
     * module>`), by the name as written, for `{ event, clip }` anchors. Absent: none read.
     */
    blockEvents?: Record<string, BlockEvents>;
    /**
     * The speech measured at the audio edit points (node tooling, from the decoded sound). Where
     * an edge is measured, it decides whether a word is cut through; elsewhere the transcript does.
     */
    speechEdges?: SpeechEdge[];
};
/**
 * The voice at one edge of a cut's sound, measured on its source: `in` where the cut's sound
 * starts, `out` where it stops. `clean` when the voice does not run through the point; else
 * `move` is how far the point must go (seconds, later for `out`, earlier for `in`) to reach
 * quiet, null when that is more than a second away.
 */
export type SpeechEdge = {
    /** Index of the cut. */
    cut: number;
    side: 'in' | 'out';
    source: string;
    /** Source seconds of the point. */
    at: number;
    /** dBFS: the voice level around the point, and the quieter side right at it. */
    voice: number;
    level: number;
    clean: boolean;
    move: number | null;
};
/** A block's declared events (moments of its clip, or clip seconds), as read from its source. */
export type BlockEvents = {
    events: Record<string, string | number>;
} | {
    error: string;
};
/** A block's animatable props as `check` reads them from its source. */
export type BlockAnimatable = {
    props: Record<string, AnimatableKind>;
} | {
    error: string;
};
/**
 * `warning`: why the hit offset could not be read (it is then 0); `error`: the file has no
 * readable sound.
 */
export type SoundInfo = {
    hit: number;
    /** Seconds of sound in the file, when it was probed. */
    duration?: number;
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
    /** Program frames, the hold included. */
    startFrame: number;
    frames: number;
    /** Program frames at the end of the cut that hold its last source frame, silent. */
    hold: number;
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
/**
 * The program end in seconds for `"end"` anchors: the cut list's length, else `duration`; null
 * when a program has neither (its length then comes from its clips), undefined in inserts mode.
 */
export declare function programEnd(project: Pick<MotionProject, 'duration' | 'fps'>, cutList: Pick<CutList, 'mode' | 'frames'>): number | null | undefined;
/**
 * Program seconds where cut `i`'s sound ends: the next edit point, or where its hold starts
 * when that comes first (a hold is silent).
 */
export declare const soundEnd: (cuts: ResolvedCut[], i: number, end: number, fps: number) => number;
