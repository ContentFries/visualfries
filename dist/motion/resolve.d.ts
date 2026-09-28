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
