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
    /**
     * The format's safe insets in pixels (no platform UI inside them); absent where the caller
     * does not know them, and a shot falls back to its own margins.
     */
    safe?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
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
    /**
     * Slots that ride the camera: in a morph to or from a shot without them they move and scale
     * with the footage (a word behind the head leaves with the head) instead of sliding to
     * `closed`.
     */
    riding?: string[];
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
    /** A ring of this many pixels in the brand's primary colour around the camera window. */
    ring?: number;
    /** How strongly the camera window casts a shadow on what is under it, 0–1. */
    lift?: number;
    /**
     * The room around the subject: the footage plate darkened by `dim` (0–1) and blurred by
     * `blur` pixels, with the subject cut out by its matte drawn over it untouched.
     */
    room?: {
        dim: number;
        blur: number;
    };
    /**
     * Motion blur along each axis in pixels (standard deviation) on the footage and the clips in
     * slots; only inside a morph into or out of a shot that blurs its moves (see `ShotModule.blur`).
     */
    motionBlur?: {
        x: number;
        y: number;
    };
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
    /** The morph into this shot from `prev`, when it depends on the shot before (else `enter`). */
    enterFrom?(prev: string): Morph;
    /** A warning when this shot follows `prev` directly (a move that cannot be seen); else null. */
    follows?(prev: string): string | null;
    layout(input: ShotInput): ShotLayout;
    /** Events of the shot, in frames from its start; `prev` is the shot before it, if any. */
    events(ctx: {
        prev: string | null;
        morphFrames: number;
        frames: number;
    }): ShotEvent[];
    /** Problems with `params`, as messages. */
    check?(params: Record<string, unknown>): string[];
    /**
     * The event the morph out of this shot makes halfway (a whip back). It stands in for the next
     * shot's `shot` event in that morph; the next shot's other events in it move to its end,
     * where the camera lands.
     */
    leaveEvent?: string;
    /**
     * Peak motion blur in pixels along each axis of the morphs into and out of this shot; it
     * rises and falls with the move (see `shotLayoutAt`).
     */
    blur?(input: ShotInput): {
        x: number;
        y: number;
    };
    /** The shot draws the subject cut out by its matte, so the footage on screen needs a matte. */
    needsMatte?: boolean;
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
