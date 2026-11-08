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
    /**
     * How tall the subject's head is over the whole shot (top to chin, a high percentile of the
     * matte's measure, in fractions of the footage height): one size per shot, so a shot that
     * backs off to fit the head does not breathe with every lean. Absent, layouts take the
     * subject's own (smoothed) `headHeight`.
     */
    head?: number | null;
    /**
     * How high the top of the head gets around this frame (fractions of the footage height): a
     * quick lean or bob the smoothed `subject` lags behind still keeps its headroom. Absent,
     * layouts take the subject's (smoothed) `headY`.
     */
    headTop?: number | null;
    /**
     * How high the top of the head gets over the whole shot (a low percentile of the matte's head
     * tops, in fractions of the footage height): one line per shot, so a slot beside the head
     * holds still while the head moves. Absent, layouts take the subject's (smoothed) `headY`.
     */
    shotTop?: number | null;
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
     * How much of the room is gone, 0–1: the footage plate is drawn at `1 - cutout` opacity and
     * the subject, cut out by its matte, over the fill and the behind clips. Absent: 0.
     */
    cutout?: number;
    /**
     * Motion blur along each axis in pixels (standard deviation) on the footage and the clips in
     * slots; only inside a morph into or out of a shot that blurs its moves (see `ShotModule.blur`).
     */
    motionBlur?: {
        x: number;
        y: number;
    };
    /**
     * Where the footage leaves part of the camera window open (backed off to fit a head, or a
     * key that scales down): the same footage at `camera`, covering the window, blurred by `blur`
     * pixels and darkened by `dim` (0–1), under the sharp picture. Absent while the footage
     * covers the window.
     */
    backdrop?: {
        camera: Rect;
        blur: number;
        dim: number;
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
    /**
     * The layout reads the shot-wide head measures (`ShotInput.head` and `shotTop`) whatever its
     * params; other shots read them only with `headroom`. `shotTop` is measured only for such a
     * shot.
     */
    measuresHead?: boolean;
};
/**
 * Seconds of subject track averaged on each side of a frame before a shot frames it, so the
 * camera follows the head calmly instead of every twitch of the matte.
 */
export declare const SUBJECT_SMOOTH = 0.5;
/**
 * A good `headroom` to start from (the share of the camera window's height kept above the
 * head); shots keep the whole head only when a program sets it.
 */
export declare const HEADROOM = 0.06;
/** The blurred copy under footage that leaves its window open: blur per 1080 px, and dimming. */
export declare const BACKDROP: {
    blur: number;
    dim: number;
};
/**
 * How a shot keeps the head in its camera window: `headroom` is the share of the window kept
 * above the head (false: the face mark alone, the default); `head` the head's height over the
 * shot (see `ShotInput.head`).
 */
export type HeadFraming = {
    headroom: number | false;
    head?: number | null;
    /** See `ShotInput.headTop`. */
    top?: number | null;
};
/**
 * The `headroom` param of a shot (see `HeadFraming`): off (false) unless the program sets it.
 * Whether a head needs it depends on the footage (a close selfie does, a medium shot does not),
 * so the program decides per shot; `check` warns where a head is cut.
 */
export declare function headroomParam(params: Record<string, unknown>): number | false;
/** The head framing of a shot's input: its `headroom` param and the shot's head size. */
export declare const headFraming: (input: ShotInput) => HeadFraming;
/** Messages for a `headroom` that is not a share from 0 to 0.3. */
export declare function checkHeadroom(params: Record<string, unknown>): string[];
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
 *
 * With a `headroom` (see `HeadFraming`; a shot's `headroom` param, off by default) and a matte
 * the whole head stays in the window: the
 * footage moves down until `headroom` of the window is free above the head, or up until the chin
 * is in, whichever the face mark breaks. A head too tall for the window at that scale makes the
 * camera back off (to `MIN_FIT` of covering at most), and a window the footage then leaves open
 * gets a blurred copy under it (see `ShotLayout.backdrop`). Footage with less room above the
 * head than `headroom` keeps covering the window: the head touches its top, uncut.
 */
export declare function frameOnHead(clip: Rect, footage: [number, number] | null, subject: SubjectBox | null, zoom?: number, framing?: HeadFraming): Rect;
/** Whether the footage at `camera` covers the camera window `clip` (to a hundredth of a pixel). */
export declare const coversClip: (camera: Rect, clip: Rect) => boolean;
/**
 * Where the blurred copy goes under footage at `camera` that leaves part of `clip` open: the
 * footage scaled about its own centre until it covers the window with a margin, so what is
 * blurred around the picture continues what is in it and the blur's soft edge stays outside.
 */
export declare function backdropCamera(camera: Rect, clip: Rect): Rect;
/** The frame as a rectangle. */
export declare const frameRect: ([width, height]: [number, number]) => Rect;
/** A number param, or `fallback`; the check reports anything else. */
export declare function numberParam(params: Record<string, unknown>, name: string, fallback: number): number;
/** Messages for params that are not numbers within `[min, max]`. */
export declare function checkNumber(params: Record<string, unknown>, name: string, min: number, max: number): string[];
/** Messages for unknown params. */
export declare function checkKnown(params: Record<string, unknown>, known: string[]): string[];
