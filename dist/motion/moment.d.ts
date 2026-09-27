/** Cue names every clip has; projects cannot redefine them. */
export declare const RESERVED_CUES: readonly ["start", "end"];
type CueTimes = Record<string, {
    start: number;
    end: number;
}>;
/**
 * The one grammar for "a moment in a clip", shared by blocks (`clip.at`) and the CLI (`--at`):
 * - cue: `extra`, `extra.end`, `extra+0.4`, `extra.end - 0.2`, and the built-in `start` / `end`
 * - clip-local seconds: `2.5s` (or a plain number from code)
 * - clip-local frame: `f120`
 * - `mid`: the middle of the clip
 * Returns clip-local seconds.
 */
export declare function resolveMoment(at: string | number, ctx: {
    id: string;
    cues: CueTimes;
    duration: number;
    fps: number;
}): number;
export {};
