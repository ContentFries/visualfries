import { type FootageMap } from '../footage-map.js';
import type { SubjectBox } from '../resolve.js';
import { type Rect, type ShotLayout } from './layout.js';
/**
 * The speaker away from the frame: in a shot that draws the speaker cut out by the matte, an
 * `away` range slides the footage picture (the room, the cut-out, subject layers of clips) off
 * one edge of the frame and back. Behind clips, front clips and the shot's slots stay where
 * they are, so the world behind the speaker holds still while he leaves. Pure: the distance
 * comes from where the matte reaches at the frame, so the speaker just clears the frame in any
 * format, on top of the shot's keys and morphs.
 */
declare const AWAY_SIDES: readonly ["left", "right", "bottom"];
type AwaySide = (typeof AWAY_SIDES)[number];
/** The way out when the project does not say: fast, speeding up until he is gone. */
export declare const AWAY_EXIT: {
    seconds: number;
    ease: string;
};
/** The way back in: fast, settling into place. */
export declare const AWAY_ENTER: {
    seconds: number;
    ease: string;
};
/**
 * A source frame: the picture the program shows at a frame, and the source frames around it
 * (`first`–`last`) the program shows in one run with it, at most two subject smoothing windows
 * either way. A decision reads the matte of those frames only: every program extracts them, so
 * a full program and its excerpts decide alike, whatever else each extracts.
 */
export type AwayLook = {
    source: string;
    frame: number;
    first: number;
    last: number;
};
/** A resolved away range of a shot, in program frames. */
export type ShotAway = {
    /** From this frame the speaker is wholly off the frame: the exit ends here. */
    from: number;
    /** The frame the way back in starts; null: away to the shot's end (and through a morph out). */
    until: number | null;
    /** Null: the edge nearest to the speaker where each move starts (see `awayAt`). */
    side: AwaySide | null;
    /** A range from the shot's first frame has no exit (0 frames): it starts away. */
    exit: {
        frames: number;
        ease: string;
    };
    enter: {
        frames: number;
        ease: string;
    };
    /**
     * Without a `side`: the picture the whole program shows where each move decides it (see
     * `awayAt`), so a segment or an excerpt that does not show that frame decides the same way.
     * Null where there is no footage, or no way back (`until` null). Set by `awayLooks`.
     */
    looks?: {
        exit: AwayLook | null;
        enter: AwayLook | null;
    };
};
/** A box in 0–1 fractions of the footage frame. */
export type Box = Pick<SubjectBox, 'x' | 'y' | 'width' | 'height'>;
type AwayState = {
    /** How far along the way off the frame: 0 in place, 1 wholly off. */
    p: number;
    range: ShotAway;
    /**
     * The program frame whose speaker decides the side when the range does not give one: where
     * the exit starts (also through the hold), or where the way back in ends.
     */
    decide: number;
    /** The picture at `decide` (see `ShotAway.looks`); undefined: not resolved. */
    look?: AwayLook | null;
};
/** Where the speaker is at program frame `f` among `away` ranges; null: in place. */
export declare function awayAt(away: readonly ShotAway[] | undefined, f: number): AwayState | null;
/**
 * The moves without a `side` that frames `span` show, as the program frame where each decides
 * its side and the picture there (see `ShotAway.looks`): what those frames draw depends on the
 * shot and the footage there too.
 */
export declare function awayMovesDuring(away: readonly ShotAway[] | undefined, span: {
    startFrame: number;
    frames: number;
}): {
    frame: number;
    look: AwayLook | null | undefined;
}[];
/** The program frames where the moves that frames `span` show decide their side. */
export declare const awayDecisions: (away: readonly ShotAway[] | undefined, span: {
    startFrame: number;
    frames: number;
}) => number[];
/**
 * Sets the `looks` of the away ranges without a `side` from the whole program's footage `map`:
 * the picture where each of their moves decides it.
 */
export declare function awayLooks(shots: readonly {
    away?: ShotAway[];
}[], map: FootageMap, fps: number): void;
/**
 * How far the picture moves toward `side` for the speaker to clear the frame, with a margin:
 * the speaker of the footage and, under footage that leaves its window open, the speaker of its
 * blurred copy (bigger, so often further in), which moves with it.
 */
export declare function awayDistance(layout: ShotLayout, reach: Box | null, side: AwaySide, size: [number, number]): number;
/** The edge the speaker leaves by the shortest way (ties: left, right, bottom). */
export declare function nearestSide(layout: ShotLayout, reach: Box | null, size: [number, number]): AwaySide;
/** A move of the picture on the stage, in pixels. */
export type AwayOffset = {
    dx: number;
    dy: number;
};
/** The move `distance` toward `side`. */
export declare const awayOffset: (side: AwaySide, distance: number) => AwayOffset;
/**
 * `layout` with its picture moved by `offset`: the footage, its blurred copy and the pivot of a
 * keyed turn. The camera window, the slots and the room's look stay.
 */
export declare function moveAway(layout: ShotLayout, { dx, dy }: AwayOffset): ShotLayout;
/**
 * Where `check` reads the cut-out back under a turned camera: the part of the visible window
 * `view` the turned picture covers, and how many canvas pixels per stage pixel (the picture's
 * own resolution where it fits, so a one-pixel arm stays a pixel, but never more pixels than
 * the frame has). Null when the picture lies wholly outside the view: nothing to read.
 */
export declare function turnedReadback(layout: Pick<ShotLayout, 'camera' | 'turn'>, view: Rect, picture: [number, number], size: [number, number]): {
    region: Rect;
    scale: number;
} | null;
/**
 * Of the frame's area, the share of speaker pixels from which `check` says he is still in the
 * frame while away: a matte's stray speck stays under it, a hand or a lock of hair does not.
 */
export declare const AWAY_SEEN_SHARE = 0.00002;
/** The speaker found in the frame while a range has him wholly off it (see `awayInFrameMessage`). */
export type AwaySeen = {
    shot: string;
    kind: string;
    /** 1-based, as written. */
    range: number;
    /** Program frames of the range: gone from `from`, back from `until` (null: the shot's end). */
    from: number;
    until: number | null;
    /** The program frame he was found at. */
    frame: number;
    /** Stage pixels of him drawn in the frame, and their box. */
    area: number;
    box: Rect;
};
/**
 * A `check` warning for a speaker still in the frame inside an `away` range, where he should be
 * wholly off it. It stays a hint: the agent looks at a still and decides.
 */
export declare function awayInFrameMessage(found: AwaySeen, size: [number, number], fps: number): string;
/** The shot and range a speaker-still-in-the-frame warning names; null for any other message. */
export declare function awayInFrameKey(message: string): string | null;
export {};
