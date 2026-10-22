import type { MotionClip, MotionProject } from './project.js';
import type { MotionWord } from './transcript.js';
import { type MotionBeatRef, type MusicBeats } from './beat-grid.js';
import type { FootageMap } from './footage-map.js';
import { type ResolvedBrand } from './brand.js';
import { type ResolvedStyle } from './style.js';
import { type ResolvedFormat } from './format.js';
export type MotionWordRef = MotionWord & {
    /** Seconds relative to the clip start. */
    localStart: number;
    localEnd: number;
};
export type ResolvedCue = {
    /** Clip-local seconds. */
    start: number;
    end: number;
    /** Clip-local frame of `start`. */
    frame: number;
    words: MotionWordRef[];
};
export type ResolvedClip = {
    id: string;
    block: string;
    fps: number;
    size: [number, number];
    /** Program seconds, frame-aligned. */
    start: number;
    end: number;
    startFrame: number;
    frames: number;
    duration: number;
    cues: Record<string, ResolvedCue>;
    words: Record<string, MotionWordRef[]>;
    props: Record<string, unknown>;
    alpha: boolean;
    background: string | null;
    /** Footage whose sound the render muxes into this clip. */
    audio: string | null;
    /**
     * Every beat of the clip's music (also those outside the clip), for beat moments,
     * `clip.beats` and `clip.pulse()`. Absent when the project has no music with beats, so
     * such projects resolve exactly as before; `noBeats` says why a clip with music has none.
     */
    beats?: MotionBeatRef[];
    noBeats?: string;
    /** The project's brand (the neutral brand when it names none). */
    brand: ResolvedBrand;
    /** The project's style after layering. */
    style: ResolvedStyle;
    /** Format class and safe insets of the project size. */
    format: ResolvedFormat;
    /** Frames of the project's footage, filled in by the node tooling before a page loads. */
    footage?: Record<string, FootageFrames>;
    /** Program mode: which source frame the program shows when (filled in with `footage`). */
    footageMap?: FootageMap;
    /** Program mode: the area of the frame the clip fills (see `ProgramClip`). */
    slot?: string | null;
};
/** One extracted range of footage frames, in its own folder. */
export type FootageRange = {
    /** URL prefix; frames are `<url>plate/000123.jpg` and `<url>subject/000123.png`. */
    url: string;
    /** First and last extracted footage frame (inclusive). */
    first: number;
    last: number;
    /** Subject box of every frame of the range (`first`…`last`), measured on the matte. */
    boxes?: (SubjectBox | null)[];
};
/** Extracted frames of one footage, served to the page (see `<Footage>`). */
export type FootageFrames = {
    /** URL prefix of the first range (see `ranges`). */
    url: string;
    /** First and last frame of the first range (see `ranges`). */
    first: number;
    last: number;
    /**
     * Every extracted range, in order. Inserts mode extracts one; program mode one per stretch of
     * the source the program shows (none for a source it never shows). Without it the one range
     * is `url`, `first`, `last` and `boxes`.
     */
    ranges?: FootageRange[];
    /** Frames in the whole footage (at the project frame rate). */
    total: number;
    width: number;
    height: number;
    /** Program frame at which footage frame 0 plays. */
    startFrame: number;
    /** Whether a matte was given, so `subject` frames exist. */
    subject: boolean;
    /** Subject boxes of the first range (see `ranges`). */
    boxes?: (SubjectBox | null)[];
};
/**
 * Where the subject is in a footage frame, from its matte. Coordinates are fractions of the
 * footage frame (0–1, origin top left). `headX`/`headY` is the top of the subject's head,
 * `headHeight` how far down from there the chin is, in fractions of the footage height
 * (estimated from the head's width; absent in boxes measured before it existed).
 */
export type SubjectBox = {
    x: number;
    y: number;
    width: number;
    height: number;
    headX: number;
    headY: number;
    headHeight?: number;
};
export type MotionDiagnostic = {
    level: 'error' | 'warning' | 'info';
    clip?: string;
    field: string;
    message: string;
};
export type ResolvedProject = {
    fps: number;
    size: [number, number];
    clips: ResolvedClip[];
    diagnostics: MotionDiagnostic[];
};
/** Brand and style resolved from their files (node side); neutral when the project names none. */
export type ProjectLook = {
    brand?: ResolvedBrand;
    style?: ResolvedStyle;
};
/**
 * In a program: its end in seconds (`"end"` anchors, and clips are cut there), or null while
 * its length is not fixed. Absent in inserts mode, where `"end"` is a phrase.
 */
export type ProgramEnd = {
    end?: number | null;
};
export declare function resolveMotionClip(clip: MotionClip, project: Pick<MotionProject, 'fps' | 'size' | 'background' | 'safeZone'>, words: MotionWord[] | null, diagnostics: MotionDiagnostic[], music?: MusicBeats[], look?: ProjectLook & ProgramEnd & {
    format?: ResolvedFormat;
}): ResolvedClip | null;
/** `music`: beats of the project's music items, placed in the program (see `programBeats`). */
export declare function resolveMotionProject(project: MotionProject, words: MotionWord[] | null, music?: MusicBeats[], look?: ProjectLook & ProgramEnd): ResolvedProject;
