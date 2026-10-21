import type { SubjectBox } from '../resolve.js';
import type { FormatClass } from '../program.js';
export type { FormatClass };
/**
 * The contract of a shot: a pure layout function per format class. Given the frame, the footage
 * size and where the subject is, a shot says where the camera window sits, where the footage
 * sits inside it, which slots it frees for clips and whether the style fill shows around it.
 * Nothing here reads the DOM or the clock, so the stage, the tests and editor adapters (which
 * sample shots as keyframes) all get the same numbers.
 */
/** Stage pixels, origin top left. */
export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** Motion energy of a style; shots take their defaults from it once styles exist. */
export type Energy = 'calm' | 'balanced' | 'punchy';
export type ShotInput = {
    cls: FormatClass;
    /** Format frame in pixels. */
    size: [number, number];
    /** Size of the footage on screen in pixels; null without footage. */
    footage: [number, number] | null;
    /** Where the subject is in that footage (smoothed); null without a matte. */
    subject: SubjectBox | null;
    params: Record<string, unknown>;
    /** The style's energy; null without a style. */
    energy?: Energy | null;
};
export type ShotLayout = {
    /** Where the whole footage frame sits, in stage pixels (it is cropped to `clip`). */
    camera: Rect;
    /** The camera window: footage shows only inside it. */
    clip: Rect;
    /** Corner radius of the camera window in pixels. */
    radius: number;
    /** Areas the shot frees for clips (`slot: "panel"`), in stage pixels. */
    slots: Record<string, Rect>;
    /** Where each slot sits while it is closed, so it slides in and out with a morph. */
    closed: Record<string, Rect>;
    /** What shows around the camera window: the style's surface, or nothing. */
    fill: 'surface' | null;
    /**
     * Shot keys: the footage turned by `rotation` degrees about `pivot` (stage pixels, the face)
     * and drawn at `opacity`. Absent without such keys.
     */
    turn?: {
        rotation: number;
        pivot: {
            x: number;
            y: number;
        };
    };
    opacity?: number;
};
/** A program frame where something happens in a shot (a sound can land on it). */
export type ShotEvent = {
    kind: string;
    frame: number;
};
/** Seconds and ease of a morph between two layouts. */
export type Morph = {
    seconds: number;
    ease: string;
};
export type ShotModule = {
    name: string;
    /** The morph into this shot when the project does not set `morph`. */
    enter: Morph;
    /** The morph out of this shot, when it differs from the next shot's `enter`. */
    leave?: Morph;
    layout(input: ShotInput): ShotLayout;
    /** Events of the shot, in frames from its start; `prev` is the shot before it, if any. */
    events(ctx: {
        prev: string | null;
        morphFrames: number;
        frames: number;
    }): ShotEvent[];
    /** Problems with `params`, as messages. */
    check?(params: Record<string, unknown>): string[];
};
/**
 * Seconds of subject track averaged on each side of a frame before a shot frames it, so the
 * camera follows the head calmly instead of every twitch of the matte.
 */
export declare const SUBJECT_SMOOTH = 0.5;
export declare const roundRect: (r: Rect) => Rect;
/** The face in 0–1 fractions of the footage frame. */
export declare function facePoint(subject: SubjectBox | null): {
    x: number;
    y: number;
};
/**
 * The footage covering `clip`, `zoom` times closer, with the face centred and a third from the
 * top. The footage never leaves an edge of the window uncovered, so near an edge the face moves
 * off its mark instead. Same aspect and no zoom: the footage fills the window exactly.
 */
export declare function frameOnHead(clip: Rect, footage: [number, number] | null, subject: SubjectBox | null, zoom?: number): Rect;
/** The frame as a rectangle. */
export declare const frameRect: ([width, height]: [number, number]) => Rect;
/** A number param, or `fallback`; the check reports anything else. */
export declare function numberParam(params: Record<string, unknown>, name: string, fallback: number): number;
/** Messages for params that are not numbers within `[min, max]`. */
export declare function checkNumber(params: Record<string, unknown>, name: string, min: number, max: number): string[];
/** Messages for unknown params. */
export declare function checkKnown(params: Record<string, unknown>, known: string[]): string[];
