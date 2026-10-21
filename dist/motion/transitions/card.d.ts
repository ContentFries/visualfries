import type { ScreenDirection, TransitionModule } from './contract.js';
/** Where the card is and how it looks, for `a` from 0 (away) through `MID` (landed) to 1 (frame). */
export type CardPose = {
    /** Offset from the frame's centre, pixels. */
    x: number;
    y: number;
    scale: number;
    /** Degrees about the axis across the travel (flip only). */
    turn: number;
    /** Screen pixels at the card's size. */
    radius: number;
    /** 0–1: how much of the shadow shows. */
    lift: number;
};
/**
 * The card's pose at `a` (0: off the frame or edge on, `MID`: landed, 1: the full frame). The
 * same curve read backwards is the outgoing card of `side: "out"`.
 */
export declare function cardPose(a: number, o: {
    motion: 'slide' | 'flip';
    direction: ScreenDirection | null;
    size: [number, number];
    scale: number;
    radius: number;
}): CardPose;
/**
 * The card's outline on screen, `inset` pixels inside its edge, as a polygon: its rounded
 * rectangle (the frame, scaled about its centre) turned and projected the way `cardTransform`
 * draws it.
 */
export declare function cardOutline(pose: CardPose, direction: ScreenDirection | null, size: [number, number], unit: number, inset?: number): [number, number][];
export declare const card: TransitionModule;
