import { type GridBeat } from './beat-grid.js';
/** Cue names every clip has; projects cannot redefine them. */
export declare const RESERVED_CUES: readonly ["start", "end"];
type CueTimes = Record<string, {
    start: number;
    end: number;
}>;
export type MomentContext = {
    id: string;
    cues: CueTimes;
    duration: number;
    fps: number;
    /** The clip's music beats in clip-local seconds (`time`). */
    beats?: GridBeat[];
    /** Why the clip has no beats, for the error message. */
    noBeats?: string;
};
/**
 * The one grammar for "a moment in a clip", shared by blocks (`clip.at`) and the CLI (`--at`):
 * - cue: `extra`, `extra.end`, `extra+0.4`, `extra.end - 0.2`, and the built-in `start` / `end`
 * - clip-local seconds: `2.5s` or `2.5` (a plain number from code works too)
 * - clip-local frame: `f120`
 * - `mid`: the middle of the clip
 * - music beats: `beat 17`, `bar 5`, `bar 5.3` (beat 3 of bar 5), `downbeat > extra` (first
 *   downbeat at or after a moment), `beat < end` (last beat at or before it)
 * - any of these plus or minus seconds (`+0.4`) or beats (`- 1b`); after `>` / `<` the offset
 *   belongs to the moment on the right
 * Returns clip-local seconds.
 */
export declare function resolveMoment(at: string | number, ctx: MomentContext): number;
export {};
