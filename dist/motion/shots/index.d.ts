import type { ProgramShot } from '../program.js';
import type { Morph, ShotEvent, ShotInput, ShotLayout, ShotModule } from './layout.js';
export type { Energy, FormatClass, Morph, Rect, ShotEvent, ShotInput, ShotLayout, ShotModule } from './layout.js';
export { facePoint, frameOnHead } from './layout.js';
export { DEFAULT_PUNCH_SCALE, PUNCH_SCALE } from './punch.js';
/**
 * The shot engine: the registry of built-in shots and the layout on screen at any program frame,
 * morphing from the previous shot's layout over the shot's first `morphFrames` frames. Pure:
 * every frame is a function of the shot track, the frame and the subject at that frame.
 */
/** Built-in shots that are drawn. The other names `SHOTS` lists draw as `full` until built. */
export declare const SHOT_MODULES: Readonly<Record<string, ShotModule>>;
/** The module drawing `name`; null for a shot not built yet or a custom file. */
export declare function shotModule(name: string): ShotModule | null;
/** What the engine reads of a resolved shot. */
export type ShotSpan = Pick<ProgramShot, 'id' | 'shot' | 'startFrame' | 'frames' | 'params' | 'morphFrames' | 'morphEase'>;
/**
 * The morph into shot `next` when the project does not set one: the previous shot's `leave`
 * (a punch-in settles slower than it hits), else the next shot's `enter`. Null with nothing
 * before it.
 */
export declare function defaultMorph(prev: string | null, next: string): Morph | null;
/** Events of a shot in program frames (see `ShotModule.events`). */
export declare function shotEvents(shot: ShotSpan, prev: string | null): ShotEvent[];
type Framed = Pick<ShotSpan, 'shot' | 'params'>;
/**
 * The shot on screen at program frame `f`, the one it morphs from, and how far the morph has
 * gone (eased, 0–1). Frames outside every shot are framed `full`; a shot after a gap morphs
 * from `full`.
 */
export declare function shotAt(shots: readonly ShotSpan[], f: number): {
    shot: Framed;
    prev: Framed | null;
    p: number;
};
/**
 * The shots that decide the layout inside `span`: those overlapping it, and the shot the first
 * of them morphs from.
 */
export declare function shotsDuring<T extends ShotSpan>(shots: readonly T[], span: {
    startFrame: number;
    frames: number;
}): T[];
/** The layout of one shot, alone. Shots not built yet are framed `full`. */
export declare function shotLayout(shot: Framed, input: Omit<ShotInput, 'params'>): ShotLayout;
/** The layout on screen at program frame `f` (see `shotAt`). */
export declare function shotLayoutAt(shots: readonly ShotSpan[], f: number, input: Omit<ShotInput, 'params'>): ShotLayout;
/**
 * The layout `t` of the way from `a` to `b`. Rectangles move straight, so the face moves in a
 * line between its two marks. A slot only one side frees slides between its open and closed
 * rectangles; the fill shows while either side has it.
 */
export declare function mixLayouts(a: ShotLayout, b: ShotLayout, t: number): ShotLayout;
