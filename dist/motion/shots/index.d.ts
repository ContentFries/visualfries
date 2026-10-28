import type { ProgramShot } from '../program.js';
import { type Placement } from '../keys.js';
import { type AwayLook, type Box } from './away.js';
import { type Morph, type ShotEvent, type ShotInput, type ShotLayout, type ShotModule } from './layout.js';
export type { Energy, FormatClass, Morph, Rect, ShotEvent, ShotInput, ShotLayout, ShotModule } from './layout.js';
export { facePoint, frameOnHead, HEADROOM } from './layout.js';
export { DEFAULT_PUNCH_SCALE, PUNCH_SCALE } from './punch.js';
export { AWAY_ENTER, AWAY_EXIT, awayAt, awayDecisions, awayLooks, awayMovesDuring, turnedReadback, type AwayLook, type Box, type ShotAway } from './away.js';
/**
 * The shot engine: the registry of built-in shots and the layout on screen at any program frame,
 * morphing from the previous shot's layout over the shot's first `morphFrames` frames. Pure:
 * every frame is a function of the shot track, the frame and the subject at that frame.
 */
/** Built-in shots that are drawn. */
export declare const SHOT_MODULES: Readonly<Record<string, ShotModule>>;
/** The module drawing `name`; null for a shot not built yet or a custom file. */
export declare function shotModule(name: string): ShotModule | null;
/** What the engine reads of a resolved shot. */
export type ShotSpan = Pick<ProgramShot, 'id' | 'shot' | 'startFrame' | 'frames' | 'params' | 'morphFrames' | 'morphEase'> & Partial<Pick<ProgramShot, 'keys' | 'away'>>;
/**
 * The morph into shot `next` when the project does not set one: the previous shot's `leave`
 * (a punch-in settles slower than it hits), else the next shot's `enter`. Null with nothing
 * before it.
 */
export declare function defaultMorph(prev: string | null, next: string): Morph | null;
/**
 * Events of a shot in program frames (see `ShotModule.events`). After a shot with a
 * `leaveEvent` (a whip) that event marks the middle of the morph in place of a `shot` event,
 * and the shot's other events inside the morph move to its end, where the camera lands.
 */
export declare function shotEvents(shot: ShotSpan, prev: string | null): ShotEvent[];
type Framed = Pick<ShotSpan, 'shot' | 'params' | 'keys' | 'away'> & {
    id?: string;
};
/**
 * What the engine needs to lay out shots at a frame: a shot's input without its params, and
 * `headOf`, the head size over a whole shot (see `ShotInput.head`; absent: each frame's own).
 * Shots with `away` ranges also read `reach`, how far the matte reaches around this frame (the
 * boxes of the frames `subject` is smoothed over, joined; absent: the subject's box), and `at`,
 * the input of the program's picture at another program frame, where a range decides its side:
 * `look` when the range carries it (see `ShotAway.looks`), else the picture at that frame
 * (absent: this frame's input).
 */
export type LayoutInput = Omit<ShotInput, 'params' | 'head'> & {
    headOf?: (shot: Framed) => number | null;
    reach?: Box | null;
    at?: (f: number, look?: AwayLook | null) => LayoutInput;
};
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
/**
 * The layout of one shot, alone. Shots not built yet are framed `full`. With program frame `f`
 * the shot's keys at that frame move its camera (see `keyCamera`), and its `away` ranges slide
 * the picture off the frame (see `awayMove`). In a shot with `headroom`, footage that leaves
 * the camera window open (backed off to fit the head, or scaled down by a key) gets a blurred
 * copy under it (`backdrop`).
 */
export declare function shotLayout(shot: Framed, input: LayoutInput, f?: number): ShotLayout;
/**
 * The layout on screen at program frame `f` (see `shotAt`), keys included: inside a morph both
 * shots' keys apply at `f` (a shot's keys hold their last value after its last key).
 */
export declare function shotLayoutAt(shots: readonly ShotSpan[], f: number, input: LayoutInput): ShotLayout;
/**
 * Shot keys composed on the camera: the footage scaled by `scale` about the face (the subject's
 * head, else the point a shot frames when there is no matte), moved by `x`/`y`, turned by
 * `rotation` about the face and drawn at `opacity`. The camera window stays where the shot put
 * it, so a key moves the picture inside it like a camera operator would.
 */
export declare function keyCamera(layout: ShotLayout, key: Placement, subject: ShotInput['subject']): ShotLayout;
/**
 * The layout `t` of the way from `a` to `b`. Rectangles move straight, so the face moves in a
 * line between its two marks. A slot only one side frees slides between its open and closed
 * rectangles; the fill shows while either side has it.
 */
export declare function mixLayouts(a: ShotLayout, b: ShotLayout, t: number): ShotLayout;
