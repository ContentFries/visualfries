import type { ProgramTransition } from './program.js';
import type { ShotSpan } from './shots/index.js';
/**
 * Shot moves and the captions that start inside them: a morph into a shot (a strip's panel
 * rising, a whip), a fast move of a shot's keys, or a cut or shot transition. Captions that
 * start on the same anchor as such a move are drawn over the moving panel or the face until it
 * lands. Pure: the windows come from the program data; the stage measures the overlap (see
 * `measure` in `program-stage.ts`) and `check` says when the move ends. Nothing moves on its own.
 */
/** Two shot keys at most this far apart move the camera fast enough to count as a move. */
export declare const FAST_KEY_SECONDS = 1;
/**
 * Share of the captions' text area over a moving panel from which they count as drawn over it:
 * below a fifth, the panel's edge only grazes a line.
 */
export declare const PANEL_TEXT_SHARE = 0.2;
export type ShotMove = {
    /** What moves, as the warning names it: `the strip shot "auto" morphing in`. */
    what: string;
    /** Program frames of the move: `[from, to)`. */
    from: number;
    to: number;
};
/**
 * The moves of a program (or a segment of it), in program order: every shot morph, every pair
 * of shot keys at most `FAST_KEY_SECONDS` apart that moves the camera, and every cut or shot
 * transition window.
 */
export declare function shotMoves(data: {
    shots: readonly ShotSpan[];
    transitions: readonly ProgramTransition[];
    fps: number;
}): ShotMove[];
/**
 * The move a clip starting at `startFrame` starts on: the first move whose window holds the
 * clip's first frame (or that starts up to `LEAD_FRAMES` after it), joined with every move that
 * overlaps or touches it, so the frame it ends on is clear of all of them. Null when the clip
 * starts on none.
 */
export declare function moveAtStart(moves: readonly ShotMove[], startFrame: number): ShotMove | null;
export type CaptionsInMove = {
    clip: string;
    /** The clip's first frame. */
    start: number;
    move: ShotMove;
    /** What the captions were drawn over during the move. */
    over: {
        panel: boolean;
        face: boolean;
    };
    /** First program frame checked inside the move with the captions over something. */
    frame: number;
};
/**
 * A `check` warning for captions that start inside a shot move and are drawn over the moving
 * panel or the face until it lands, with the frame the move ends on. It stays a hint: the agent
 * looks at stills and decides.
 */
export declare function captionsInMoveMessage(found: CaptionsInMove, fps: number): string;
/** The clip a captions-in-a-move warning names; null for any other message. */
export declare function captionsInMoveClip(message: string): string | null;
