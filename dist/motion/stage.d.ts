import { type Component } from 'svelte';
import type { ResolvedClip } from './resolve.js';
import type { StageSegment } from './segments.js';
import type { Animatable } from './keys.js';
export type StageFont = {
    family: string;
    url: string;
    weight?: string | number;
    style?: string;
};
export type StageOptions = {
    blocks: Record<string, Component<Record<string, unknown>>>;
    /** What each block exports as `animatable` (program mode: keyed props). */
    animatable?: Record<string, Animatable | undefined>;
    fonts?: StageFont[];
    css?: string;
    /** Paint wait in ms before a frame fails. */
    paintTimeout?: number;
    /** How each seek forces a fresh raster (see frame()). */
    invalidate?: 'filters' | 'reattach' | 'none';
};
export type FrameResult = {
    frame: number;
    t: number;
    image?: string;
    paintMs: number;
    mode: CaptureMode;
};
export type CaptureMode = 'html-in-canvas' | 'dom';
export type CheckIssue = {
    frame: number;
    message: string;
};
/**
 * Browser side of motion rendering. Everything that decides pixels lives here so
 * preview, local export and server export run the same code.
 */
export declare function createMotionStage(options: StageOptions): {
    mode: CaptureMode;
    load: (data: ResolvedClip) => Promise<{
        mode: CaptureMode;
        frames: number;
        fps: number;
    }>;
    loadSegment: (data: StageSegment) => Promise<{
        mode: CaptureMode;
        frames: number;
        fps: number;
        startFrame: number;
    }>;
    frame: (n: number, capture?: boolean) => Promise<FrameResult>;
    check: (frames: number[]) => Promise<{
        errors: CheckIssue[];
        warnings: CheckIssue[];
    }>;
    unload: () => void;
    events: () => import("./runtime.svelte.js").ClipEvent[];
};
