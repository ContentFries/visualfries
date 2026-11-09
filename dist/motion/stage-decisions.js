/**
 * The yes/no and number decisions behind `drawSide` and `textBehind` in the program stage, kept
 * apart from the page so Node tests can pin them. They take plain numbers and objects; the
 * stage keeps every DOM and canvas call.
 */
const round2 = (v) => Math.round(v * 100) / 100;
/** Whether a shot's room (the dimmed, blurred surround) changes the picture at all. */
export function roomShown(room, blurMin) {
    return !!room && (room.dim > 0 || room.blur >= blurMin);
}
/**
 * The look of the blurred copy under footage that leaves the camera window open. Under a dimmed
 * room the copy is part of the room: dimmed and blurred with it too.
 */
export function backdropLook(backdrop, room) {
    const roomDim = room?.dim ?? 0;
    return {
        dim: round2(1 - (1 - backdrop.dim) * (1 - roomDim)),
        blur: round2(Math.hypot(backdrop.blur, room?.blur ?? 0))
    };
}
/**
 * Whether the subject picture draws over the behind clips. It covers them only while one is on
 * screen, a dimmed room or a room cut away; in an insert it is only what a holdout cuts out.
 */
export function subjectDrawn(o) {
    const wanted = o.insert ? o.insert.holdout && o.behind : o.behind || o.room || o.cutAway;
    return wanted && o.hasSubject;
}
/** Whether `textBehind` can measure this frame: one drawn side with a matte, no holes, not faded. */
export function behindMeasurable(o) {
    return o.planned && o.hasView && o.hasSubject && !o.holes && !o.faded;
}
/** Whether a clip was measured too recently to measure again at frame `f`. */
export function measuredRecently(at, f, stride) {
    return at !== undefined && f - at < stride;
}
/** The share of sampled points the speaker covers; none when nothing was sampled. */
export function coveredShare(hits, pointCount) {
    return hits ? hits.filter(Boolean).length / pointCount : 0;
}
/** A run of frames with the speaker over the text: started at `f` or carried on, share = peak. */
export function extendRun(run, f, share) {
    const next = run ?? { from: f, share };
    next.share = Math.max(next.share, share);
    return next;
}
/** Whether a run has lasted `seconds` at frame `f`. */
export function runLongEnough(run, f, seconds, fps) {
    return f - run.from >= seconds * fps;
}
