import type { MotionProject } from './project.js';
import type { ProgramClip, ProgramDiagnostic, ResolvedProgram } from './program.js';
import type { FootageFrames } from './resolve.js';
import type { FootageMap } from './footage-map.js';
import type { ResolvedBrand } from './brand.js';
import { type StageSegment } from './segments.js';
/**
 * The inserts export of a program (`render --export inserts`): one file per clip, for an editor
 * to lay over the rough cut. An insert is the clip exactly as the program draws it, alone:
 *
 * - **Time:** the clip's program window plus handles (default 10 frames each side, never past
 *   the program's ends), in which the clip holds its first or last frame, as it does inside a
 *   transition window.
 * - **Place:** frame coordinates. The file has the program's frame size and the clip sits where
 *   the program draws it: placement keys move it, and a clip in a shot's slot follows the slot
 *   wherever the shot puts it (morphs and whips included). Over the program's own picture every
 *   insert lines up pixel for pixel, except where a transition moves the clip in the program (a
 *   behind clip rides the footage's side; `insertNotes` names those frames). A slotted clip shows
 *   only while the shot frees its slot, in the handles too.
 * - **Alpha:** every clip of a program is drawn over the footage, so inserts are transparent
 *   (ProRes 4444, straight alpha) unless the clip says `"alpha": false`; it is then drawn over
 *   its `background` as an opaque H.264 file. Behind clips are always transparent.
 * - **Behind:** a clip with `"layer": "behind"` becomes a holdout insert: its alpha is cut out
 *   wherever the subject is, as the program draws the subject over it (alpha × (1 − subject)).
 *   Laid over the footage it sits behind the speaker.
 *
 * Not in inserts: the cut list itself, shots (framing, fills, dimmed rooms, motion blur of the
 * footage) and transitions; they stay in the program render. `insertNotes` says where a program
 * relies on them.
 */
/** Frames of handle before and after each insert unless `--handles` says otherwise. */
export declare const DEFAULT_INSERT_HANDLES = 10;
/** Program frames `[startFrame, startFrame + frames)` show source frames `[srcIn, srcOut)`. */
export type InsertSourceRange = {
    cut: string;
    source: string;
    startFrame: number;
    frames: number;
    srcIn: number;
    srcOut: number;
};
export type InsertPlan = {
    id: string;
    clip: ProgramClip;
    /** Program frames the file covers: the clip and its handles. */
    startFrame: number;
    frames: number;
    /** Frames of the file before the clip's first frame and after its last. */
    handles: {
        before: number;
        after: number;
    };
    alpha: boolean;
    /** The colour an opaque insert is drawn over; null for transparent ones. */
    background: string | null;
    /** `layer: "behind"`: the subject is cut out of the insert's alpha. */
    holdout: boolean;
    /** The cut list under the file, piece by piece. */
    sources: InsertSourceRange[];
    /** What the insert leaves to the program render (see `insertNotes`). */
    notes: string[];
};
/** The pieces of the cut list under program frames `[startFrame, startFrame + frames)`. */
export declare function cutListUnder(program: Pick<ResolvedProgram, 'cuts'>, startFrame: number, frames: number): InsertSourceRange[];
/**
 * Where a program relies on what inserts cannot carry: transitions a clip rides or owns, slots
 * and holdouts under shots that reframe the footage, and (once) the shots and cut transitions
 * left to the program render, as info; what the project asks for and an insert does not do
 * (`"alpha": false` on a behind clip), as warnings. For `check --export inserts` and the render.
 */
export declare function insertNotes(program: ResolvedProgram, project: MotionProject): ProgramDiagnostic[];
/**
 * One plan per clip (or per clip in `clips`, in program order): the file's program frames with
 * handles, alpha, holdout, the cut list under it and its notes.
 */
export declare function planInserts(program: ResolvedProgram, project: MotionProject, opts?: {
    handles?: number;
    clips?: string[];
}): InsertPlan[];
/**
 * The page data that draws one insert: the program's stage with this clip alone, no footage
 * picture, no transitions, the clip on screen (holding its edge frames) over the whole file.
 * Shots stay: they place the clip's slot and the subject a holdout cuts out.
 */
export declare function insertStage(program: ResolvedProgram, plan: InsertPlan, footage: {
    frames: Record<string, FootageFrames>;
    map: FootageMap | null;
}, brand?: ResolvedBrand): StageSegment;
/**
 * A clip with `"layer": "behind"` in a project without `cuts` or `shots`: the footage whose
 * matte its holdout uses (the one footage with a matte), or why it has none. Null for other
 * clips. Rendered as #82 did: ffmpeg multiplies the clip's alpha by the inverse of that matte,
 * aligned to the program frame by the footage's `start`.
 */
export declare function holdoutFootage(project: Pick<MotionProject, 'footage' | 'clips'>, clipId: string): {
    footage: string;
} | {
    error: string;
} | null;
