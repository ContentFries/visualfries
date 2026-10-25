import { type SoundInfo } from './cutlist.js';
import { type FootageRun, type FrameRange } from './footage-map.js';
import type { AudioPiece, ProgramClip, ResolvedProgram } from './program.js';
/**
 * Excerpts: a range of the program as a video of its own (a teaser), sliced from the whole
 * program after it resolved, so every phrase, `until` and repeated phrase lands exactly where it
 * does in the full video and nothing in the slice goes missing. Pure, like `resolveProgram`.
 *
 * At the edges, items keep their own time: a clip, shot or transition running across `from` or
 * `until` shows the frames it shows there in the full video (a clip mid-way through its
 * animation, a shot mid-way through its move). Cuts are trimmed to the slice. Sound is trimmed
 * with short fades (see `EDGE_FADE`). An end card plays after the slice over its last frame,
 * held: from the card's first frame on, the footage, shots and clips stay as they are on the
 * slice's last frame and only the card moves (`StageSegment.hold`).
 */
/** The built-in end card (`@visualfries/end-card`), the default block of `end`. */
export declare const END_CARD_BLOCK = "@visualfries/end-card";
/**
 * Seconds of the fades where an excerpt's edge cuts a sound: speech and effects get an
 * anti-click fade, music a short fade-in at `from` and its own `fade.out` (at least this) where
 * the excerpt ends.
 */
export declare const EDGE_FADE: {
    readonly speech: 0.01;
    readonly music: 0.25;
};
/** An excerpt as resolved in the whole program. */
export type ProgramExcerpt = {
    id: string;
    /** Frames of the whole program the excerpt shows: from `startFrame`, `frames` long. */
    startFrame: number;
    frames: number;
    /** The frame size it renders in ("1080x1920"). */
    format: string;
    /** The end card after the slice: its clip and length in frames; null without one. */
    end: {
        clip: string;
        frames: number;
    } | null;
    /** In the excerpt's own program: the whole program's footage its framing reads. */
    footage?: ExcerptFootage;
};
/**
 * What of the whole program's footage an excerpt's framing reads, so it frames as the full video
 * does; part of its segments' hashes, so a re-cut outside the range that changes it draws them
 * again.
 */
export type ExcerptFootage = {
    /**
     * Source frames the whole program shows around the excerpt's edges (two subject smoothing
     * windows and a second): the smoothed subject and how high the head gets read them.
     */
    around: Record<string, FrameRange[]>;
    /**
     * The picture over the whole shot, in the whole program, of each shot with `headroom` that
     * runs across an edge: its one head size is measured over it (`headOfRuns`).
     */
    heads: Record<string, FootageRun[]>;
};
/**
 * The excerpt `excerpt` of program `full`: every item on screen in the range, moved so that the
 * range starts at frame 0, plus the end card's clip and sound. Segments are left to the caller
 * (they hash the sliced items). `sounds` gives each effect's hit offset, so an effect stays in the
 * excerpt exactly when its hit lands inside it. `field` names the excerpt in diagnostics
 * (`excerpts[0]`).
 */
export declare function sliceProgram(full: Omit<ResolvedProgram, 'segments'>, excerpt: ProgramExcerpt, end: {
    clip: ProgramClip | null;
    sound: AudioPiece | null;
}, sounds?: Record<string, SoundInfo | null>, field?: string): Omit<ResolvedProgram, 'segments'>;
