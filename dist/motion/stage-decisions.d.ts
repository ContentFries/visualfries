/**
 * The yes/no and number decisions behind `drawSide` and `textBehind` in the program stage, kept
 * apart from the page so Node tests can pin them. They take plain numbers and objects; the
 * stage keeps every DOM and canvas call.
 */
/** Whether a shot's room (the dimmed, blurred surround) changes the picture at all. */
export declare function roomShown(room: {
    dim: number;
    blur: number;
} | undefined, blurMin: number): boolean;
/**
 * The look of the blurred copy under footage that leaves the camera window open. Under a dimmed
 * room the copy is part of the room: dimmed and blurred with it too.
 */
export declare function backdropLook(backdrop: {
    dim: number;
    blur: number;
}, room: {
    dim: number;
    blur: number;
} | undefined): {
    dim: number;
    blur: number;
};
/**
 * Whether the subject picture draws over the behind clips. It covers them only while one is on
 * screen, or a dimmed room; in an insert it is only what a holdout cuts out.
 */
export declare function subjectDrawn(o: {
    insert: {
        holdout: boolean;
    } | null | undefined;
    behind: boolean;
    room: boolean;
    hasSubject: boolean;
}): boolean;
/** Whether `textBehind` can measure this frame: one drawn side with a matte, no holes, not faded. */
export declare function behindMeasurable(o: {
    planned: boolean;
    hasView: boolean;
    hasSubject: boolean;
    holes: boolean;
    faded: boolean;
}): boolean;
/** Whether a clip was measured too recently to measure again at frame `f`. */
export declare function measuredRecently(at: number | undefined, f: number, stride: number): boolean;
/** The share of sampled points the speaker covers; none when nothing was sampled. */
export declare function coveredShare(hits: boolean[] | null, pointCount: number): number;
export type CoverRun = {
    from: number;
    share: number;
};
/** A run of frames with the speaker over the text: started at `f` or carried on, share = peak. */
export declare function extendRun(run: CoverRun | undefined, f: number, share: number): CoverRun;
/** Whether a run has lasted `seconds` at frame `f`. */
export declare function runLongEnough(run: CoverRun, f: number, seconds: number, fps: number): boolean;
