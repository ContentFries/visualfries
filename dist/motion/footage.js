import { programFootageAt, sourceFrameAt } from './footage-map.js';
/** The extracted ranges; footage frames without `ranges` have the one in their own fields. */
function rangesOf(footage) {
    if (footage.ranges)
        return footage.ranges;
    const { url, first, last, boxes } = footage;
    return [{ url, first, last, ...(boxes ? { boxes } : {}) }];
}
/** The extracted range holding source frame `frame`, or the nearest one. */
function rangeNear(footage, frame) {
    let best = null;
    let distance = Infinity;
    for (const range of rangesOf(footage)) {
        const d = frame < range.first ? range.first - frame : frame > range.last ? frame - range.last : 0;
        if (d < distance)
            [best, distance] = [range, d];
    }
    return best;
}
/**
 * URL of source frame `frame` of the footage. A frame that was not extracted is an error:
 * raise the footage's `margin` (it happens with an `offset` larger than the margin).
 */
export function sourceFrameUrl(footage, frame, layer) {
    const ranges = rangesOf(footage);
    const range = ranges.find((r) => frame >= r.first && frame <= r.last);
    if (!range) {
        const have = ranges.map((r) => `${r.first}–${r.last}`).join(', ') || 'none';
        throw new Error(`Footage frame ${frame} was not extracted (frames ${have}). Raise the footage's "margin" to cover the offset.`);
    }
    const name = String(frame).padStart(6, '0');
    return layer === 'subject' ? `${range.url}subject/${name}.png` : `${range.url}plate/${name}.jpg`;
}
/**
 * URL of the footage frame shown at `programFrame` in inserts mode (footage placed by its
 * `start`). Before the footage starts and after it ends the nearest frame holds.
 */
export function footageFrameUrl(footage, programFrame, layer) {
    const wanted = Math.min(footage.total - 1, Math.max(0, programFrame - footage.startFrame));
    return sourceFrameUrl(footage, wanted, layer);
}
/**
 * Subject box at source frame `frame` (see `SubjectBox`), averaged over `smooth` frames on each
 * side; frames outside the extracted range hold its edge. Null without a matte or with the
 * subject out of frame.
 */
export function sourceSubjectBox(footage, frame, smooth = 0) {
    const range = rangeNear(footage, frame);
    if (!range?.boxes)
        return null;
    const keys = ['x', 'y', 'width', 'height', 'headX', 'headY'];
    const sum = { x: 0, y: 0, width: 0, height: 0, headX: 0, headY: 0 };
    let n = 0;
    for (let f = frame - smooth; f <= frame + smooth; f++) {
        const i = Math.min(range.last, Math.max(range.first, f)) - range.first;
        const box = range.boxes[i];
        if (!box)
            continue;
        for (const k of keys)
            sum[k] += box[k];
        n++;
    }
    if (!n)
        return null;
    for (const k of keys)
        sum[k] /= n;
    return sum;
}
/**
 * Where the subject is at `programFrame` in inserts mode (see `SubjectBox`), averaged over
 * `smooth` frames on each side so text that follows it does not jitter. Null when the footage
 * has no matte or the subject is out of frame.
 */
export function subjectBox(footage, programFrame, smooth = 0) {
    const at = Math.min(footage.total - 1, Math.max(0, programFrame - footage.startFrame));
    return sourceSubjectBox(footage, at, smooth);
}
/**
 * The frame `<Footage>` draws at `programFrame`: source `name`, or with `name` null whatever
 * the program shows. With a footage map (program mode) the program decides which source frame
 * is on screen, and `name` must be on screen then; `offsetFrames` shifts inside that source.
 * Without one (inserts mode) footage plays from its `start` and `offsetFrames` shifts program
 * time, as before cut lists existed.
 */
export function footageFrameAt(footage, map, name, programFrame, layer, offsetFrames = 0) {
    if (!map) {
        const names = Object.keys(footage);
        const source = name ?? (names.length === 1 ? names[0] : null);
        if (source === null)
            throw new Error(`<Footage program> needs a cut list ("cuts") to know what is on screen, or exactly one footage (the project has ${names.length}).`);
        const frames = known(footage, source);
        return {
            source,
            footage: frames,
            url: footageFrameUrl(frames, programFrame + offsetFrames, layer)
        };
    }
    const view = name === null ? programFootageAt(map, programFrame) : sourceFrameAt(map, name, programFrame);
    if (!view) {
        const shown = programFootageAt(map, programFrame);
        throw new Error(name === null
            ? `No footage is on screen at program frame ${programFrame}.`
            : `Footage "${name}" is not on screen at program frame ${programFrame}${shown ? ` (${shown.owner} shows "${shown.source}")` : ''}. <Footage name="${name}"> draws a source only while a cut or shot shows it; <Footage program> draws whatever is on screen.`);
    }
    const frames = known(footage, view.source);
    if (layer === 'subject' && !frames.subject)
        throw new Error(`Footage "${view.source}" has no matte, so it has no subject layer. Add "matte" to it.`);
    const frame = Math.min(frames.total - 1, Math.max(0, view.frame + offsetFrames));
    return { source: view.source, footage: frames, url: sourceFrameUrl(frames, frame, layer) };
}
function known(footage, name) {
    const frames = footage[name];
    if (!frames)
        throw new Error(`Unknown footage "${name}". Footage: ${Object.keys(footage).join(', ') || 'none (add "footage" to the project)'}`);
    return frames;
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
