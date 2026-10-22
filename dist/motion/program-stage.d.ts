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
    /**
     * Measures what `check` cannot see from the plan at the frame last drawn: subject region
     * layers whose region holds none of the speaker for half a second or more (frames checked in
     * ascending order).
     */
    measure(f: number): Promise<string[]>;
    /**
     * A holdout insert's second pass: `true` shows the subject alone (as drawn at the frame last
     * drawn) and returns whether there is one to cut out; `false` shows the clips again.
     */
    holdout(on: boolean): boolean;
    destroy(): void;
};
/**
 * Builds the layer tree in `stage` and mounts every clip of the segment. `animatable` holds what
 * each block exports as `animatable`; a keyed prop missing there is an error of the clip.
 */
export declare function createProgramScene(stage: HTMLDivElement, seg: StageSegment, blocks: Record<string, Component<Record<string, unknown>>>, animatable?: Record<string, Animatable | undefined>): ProgramScene;
