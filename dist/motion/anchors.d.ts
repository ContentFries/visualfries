import { type MotionAnchor } from './project.js';
import { type MotionWord } from './transcript.js';
import { type MusicBeats } from './beat-grid.js';
export declare class AnchorError extends Error {
}
export type Window = {
    from: number;
    to: number;
};
/** The music beat anchors may use, and the item's choice among several (a clip's `music`). */
export type BeatContext = {
    music: MusicBeats[];
    clip: string | undefined;
};
/** No music: beat anchors and beat offsets fail with "add music". */
export declare const NO_BEATS: BeatContext;
/**
 * Where an anchor is resolved. Program contexts search program words; item-local contexts
 * (cues, keys) search inside the item window and read numbers relative to `localBase`; cut
 * points search the transcript of their source.
 */
export type AnchorContext = {
    words: MotionWord[] | null;
    fps: number;
    /** Phrases are searched only here; null: everywhere. */
    window: Window | null;
    /** Numbers and `{ frame }` are relative to this; null: absolute. */
    localBase: number | null;
    /** What the window is called in messages. Default "clip". */
    scope?: string;
    /** How to get a transcript when there is none. Default: set "transcript" in the project. */
    needs?: string;
    /** Music beats for beat anchors and `"-1b"` offsets (program time). Default: none. */
    beats?: BeatContext;
    /**
     * The program end in seconds, for `"end"` and `{ program: "end" }`. Undefined: not a program
     * context, so `"end"` is a phrase; null: a program whose length is not fixed yet.
     */
    end?: number | null;
    /**
     * Program seconds of an event a clip's block declares (`{ event, clip }`). Undefined: event
     * anchors do not work here.
     */
    event?: (name: string, clip: string) => number;
    /** How a phrase said more than once resolves here; absent: it is ambiguous (see `PhraseOrder`). */
    order?: PhraseOrder;
};
/**
 * Program order for a repeated phrase: items written one after another (shots, clips, sfx) are
 * read in program order, so a phrase said more than once resolves to its first occurrence that
 * starts, or puts the item, at or after `after` (the previous item of the same kind, or the
 * item's own start for `until`) instead of being ambiguous. `what` names that point in messages;
 * null `after`: there is none (the first item), so the phrase stays ambiguous. `picked` gets a
 * hint naming the other occurrences, for `check`. An explicit `occurrence` always wins.
 */
export type PhraseOrder = {
    after: number | null;
    what: string;
    picked?: (hint: string) => void;
};
export type AnchorHit = {
    time: number;
    end: number;
    words: MotionWord[];
    /** Where the phrase the anchor stands on starts (also around a nearest beat), for `orderPoint`. */
    said?: number;
};
/**
 * Where an item stands in program order, for the next item's `PhraseOrder.after`: where its
 * phrase is said, or its time when that is earlier (a phrase anchor with `"offset": 0.5`, or a
 * downbeat after a phrase, still counts from the phrase, so the next item may use it too).
 */
export declare function orderPoint(hit: AnchorHit): number;
/** Says why the program end cannot be read: it is not fixed before the program is resolved. */
export declare const OPEN_END = "The program end is not fixed yet: it needs \"cuts\" (or footage) or \"duration\".";
/** Where event anchors work, for anchors used anywhere else. */
export declare const EVENT_ELSEWHERE = "An event anchor ({ \"event\", \"clip\" }) works in sfx \"at\", shots and music keys, not here: the clip it names is placed first.";
/** Whether an anchor is the program end: `"end"` in a program context, or `{ program: "end" }`. */
export declare function isProgramEnd(anchor: MotionAnchor, ctx: Pick<AnchorContext, 'end'>): boolean;
/** `lands`: where an occurrence puts the item (edge and offset applied), for `ctx.order`. */
export declare function resolvePhrase(say: string, ctx: AnchorContext, occurrence: number | undefined, lands?: (hit: {
    start: number;
    end: number;
    words: MotionWord[];
}) => number): {
    start: number;
    end: number;
    words: MotionWord[];
};
/** Returns seconds: absolute, or relative to `ctx.localBase` for numeric anchors when it is set. */
export declare function resolveAnchor(anchor: MotionAnchor, ctx: AnchorContext, defaultEdge: 'start' | 'last' | 'end'): AnchorHit;
