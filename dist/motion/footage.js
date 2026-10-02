/**
 * URL of the footage frame shown at `programFrame`. Before the footage starts and after it ends
 * the nearest frame holds. A frame inside the footage that was not extracted is an error: raise
 * the footage's `margin` (it happens with an `offset` larger than the margin).
 */
export function footageFrameUrl(footage, programFrame, layer) {
    const wanted = Math.min(footage.total - 1, Math.max(0, programFrame - footage.startFrame));
    if (wanted < footage.first || wanted > footage.last) {
        throw new Error(`Footage frame ${wanted} was not extracted (frames ${footage.first}–${footage.last}). Raise the footage's "margin" to cover the offset.`);
    }
    const name = String(wanted).padStart(6, '0');
    return layer === 'subject'
        ? `${footage.url}subject/${name}.png`
        : `${footage.url}plate/${name}.jpg`;
}
/** Footage frames a set of clips needs, in footage frame numbers; `margin` frames on both sides. */
export function footageFrameRange(clips, startFrame, totalFrames, margin) {
    if (!clips.length || totalFrames <= 0)
        return null;
    const from = Math.min(...clips.map((c) => c.startFrame)) - startFrame - margin;
    const to = Math.max(...clips.map((c) => c.startFrame + c.frames)) - startFrame + margin;
    const first = Math.max(0, from);
    const last = Math.min(totalFrames - 1, to);
    return last >= first ? { first, last } : null;
}
