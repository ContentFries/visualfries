import { type Component } from 'svelte';
import { type StageSegment } from './segments.js';
import { type Animatable } from './keys.js';
export type ProgramScene = {
    readonly fps: number;
    /** `useReady` promises of every clip. */
    readonly ready: Promise<unknown>[];
    /** Sets every clip's time for program frame `f`, shows and hides roots, seeks timelines. */
    seek(f: number): void;
    /** Draws the footage and runs `useFrame` of the clips on screen; resolves once all settle. */
    draw(f: number): Promise<void>;
    /** What `check` should warn about at the frame last drawn (see `pushGaps`). */
    warnings(f: number): string[];
    destroy(): void;
};
/**
 * Builds the layer tree in `stage` and mounts every clip of the segment. `animatable` holds what
 * each block exports as `animatable`; a keyed prop missing there is an error of the clip.
 */
export declare function createProgramScene(stage: HTMLDivElement, seg: StageSegment, blocks: Record<string, Component<Record<string, unknown>>>, animatable?: Record<string, Animatable | undefined>): ProgramScene;
