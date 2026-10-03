import type { MotionClip, MotionProject } from './project.js';
import { type MotionWord } from './transcript.js';
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
    /** Frames of the project's footage, filled in by the node tooling before a page loads. */
    footage?: Record<string, FootageFrames>;
};
/** Extracted frames of one footage, served to the page (see `<Footage>`). */
export type FootageFrames = {
    /** URL prefix; frames are `<url>plate/000123.jpg` and `<url>subject/000123.png`. */
    url: string;
    /** First and last extracted footage frame (inclusive). */
    first: number;
    last: number;
    /** Frames in the whole footage (at the project frame rate). */
    total: number;
    width: number;
    height: number;
    /** Program frame at which footage frame 0 plays. */
    startFrame: number;
    /** Whether a matte was given, so `subject` frames exist. */
    subject: boolean;
    /** Subject box of every extracted frame (`first`…`last`), measured on the matte. */
    boxes?: (SubjectBox | null)[];
};
/**
 * Where the subject is in a footage frame, from its matte. Coordinates are fractions of the
 * footage frame (0–1, origin top left). `headX`/`headY` is the top of the subject's head.
 */
export type SubjectBox = {
    x: number;
    y: number;
    width: number;
    height: number;
    headX: number;
    headY: number;
};
export type MotionDiagnostic = {
    level: 'error' | 'warning';
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
export declare function resolveMotionClip(clip: MotionClip, project: Pick<MotionProject, 'fps' | 'size' | 'background'>, words: MotionWord[] | null, diagnostics: MotionDiagnostic[]): ResolvedClip | null;
export declare function resolveMotionProject(project: MotionProject, words: MotionWord[] | null): ResolvedProject;
