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
/** A resolved away range of a shot, in program frames. */
export type ShotAway = {
    /** From this frame the speaker is wholly off the frame: the exit ends here. */
    from: number;
    /** The frame the way back in starts; null: away to the shot's end (and through a morph out). */
    until: number | null;
    /** Null: the edge nearest to the speaker where each move starts (see `awayAt`). */
    side: AwaySide | null;
    exit: {
        frames: number;
        ease: string;
    };
    enter: {
        frames: number;
        ease: string;
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
};
/** Where the speaker is at program frame `f` among `away` ranges; null: in place. */
export declare function awayAt(away: readonly ShotAway[] | undefined, f: number): AwayState | null;
/** How far the picture moves toward `side` for the speaker to clear the frame, with a margin. */
export declare function awayDistance(layout: ShotLayout, reach: Box | null, side: AwaySide, size: [number, number]): number;
/** The edge the speaker leaves by the shortest way (ties: left, right, bottom). */
export declare function nearestSide(layout: ShotLayout, reach: Box | null, size: [number, number]): AwaySide;
/**
 * `layout` with its picture moved `distance` toward `side`: the footage, its blurred copy and
 * the pivot of a keyed turn. The camera window, the slots and the room's look stay.
 */
export declare function moveAway(layout: ShotLayout, side: AwaySide, distance: number): ShotLayout;
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
