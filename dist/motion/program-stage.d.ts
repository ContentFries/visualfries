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
     * Measures what `check` cannot see from the plan at the frame last drawn (frames checked in
     * ascending order): subject region layers whose region holds none of the speaker for half a
     * second or more, text that covers the speaker's face (see `faceText`), content that does not
     * fit the frame (see `frameFit`), captions drawn over a shot move (see `movingCaptions`) and
     * text behind the speaker that the speaker covers (see `textBehind`).
     */
    measure(f: number): Promise<string[]>;
    /**
     * A holdout insert's second pass: `true` shows the subject alone (as drawn at the frame last
     * drawn) and returns whether there is one to cut out; `false` shows the clips again.
     */
    holdout(on: boolean): boolean;
    /**
     * A holdout insert's third pass, for a clip with a front part (see `<Front>`): `true` shows
     * the front part alone and returns whether it is on screen; `false` hides it again. The front
     * part of a holdout insert stays out of the first two passes, so the holdout never cuts it.
     */
    frontPass(on: boolean): boolean;
    destroy(): void;
};
/**
 * Builds the layer tree in `stage` and mounts every clip of the segment. `animatable` holds what
 * each block exports as `animatable`; a keyed prop missing there is an error of the clip.
 */
export declare function createProgramScene(stage: HTMLDivElement, seg: StageSegment, blocks: Record<string, Component<Record<string, unknown>>>, animatable?: Record<string, Animatable | undefined>): ProgramScene;
