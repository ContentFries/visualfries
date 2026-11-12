import { opaqueGradient } from './color.js';
import { intersect } from './text-over-face.js';
/**
 * Flash frames: a few frames of footage between full-screen clips, or between a full-screen clip
 * and a cut, that the edit never meant to show (a card fading its own opacity at its end over the
 * camera, two cards that leave a gap, a card edge a few frames off a cut). `check` warns; the
 * engine moves nothing unless a clip or shot asks for `"snap": "cut"`. The page measures how much
 * of the frame each clip hides (see `covers` in `program-stage.ts`); the decisions live here.
 */
/** A clip whose cover reaches this hides the footage under it: it is full-screen there. */
export const FULL_COVER = 0.98;
/** Footage shown for less than this next to a full-screen clip reads as a flash. */
export const FLASH_SECONDS = 0.8;
/**
 * An edge this close to a cut (but not on it) is meant to be on it; also how far `"snap": "cut"`
 * reaches.
 */
export const SNAP_SECONDS = 0.4;
/** How much of the footage an element over the whole frame hides (0–1). */
export function planeCover(plane) {
    if (!plane.visible)
        return 0;
    const fill = plane.media ? 1 : Math.max(plane.color, imageFill(plane.image));
    return plane.opacity * fill;
}
/**
 * A background image hides what is under it when it is an opaque gradient. A picture
 * (`url(…)`) does not count: whether it has transparent parts is not known from its style, and a
 * clip wrongly taken for full-screen gives false warnings, while one missed only goes unchecked.
 */
function imageFill(image) {
    if (image === 'none' || !image || image.includes('url('))
        return 0;
    return opaqueGradient(image, FULL_COVER) ? 1 : 0;
}
/**
 * Whether RGBA pixels read from a picture (an image or a video frame drawn small) are all
 * opaque: a picture with transparent parts (an overlay, a cut-out, a frame) does not hide the
 * footage.
 */
export function opaquePixels(data) {
    if (!data.length)
        return false;
    for (let i = 3; i < data.length; i += 4)
        if (data[i] < 250)
            return false;
    return true;
}
/**
 * Whether a computed CSS `transform` keeps boxes axis-aligned (scale and move only): a turned,
 * skewed or perspective box can have a bounding box over the frame and leave its corners open.
 */
export function axisAligned(transform) {
    if (!transform || transform === 'none')
        return true;
    const values = /\(([^)]*)\)/.exec(transform)?.[1].split(',').map(Number) ?? [];
    const off = transform.startsWith('matrix3d') ? [1, 2, 3, 4, 6, 7, 8, 9, 11] : [1, 2];
    return values.length > 0 && off.every((i) => Math.abs(values[i] ?? 1) < 1e-6);
}
/**
 * Whether an element's box (page pixels) covers the whole stage, cut to `clip` (the ancestors
 * that clip their overflow; null: none). A box that is turned or skewed (`tilted`, itself or an
 * ancestor) never counts: its bounding box says nothing about its corners.
 */
export function coversFrame(box, clip, stage, tilted) {
    if (tilted)
        return false;
    const shown = clip ? intersect(box, clip) : box;
    if (!shown)
        return false;
    return (shown.x <= stage.x + 1 &&
        shown.y <= stage.y + 1 &&
        shown.x + shown.width >= stage.x + stage.width - 1 &&
        shown.y + shown.height >= stage.y + stage.height - 1);
}
/**
 * Where an image or video draws its picture inside its box `box` (page pixels): the whole box
 * for `fill` and `cover`, the scaled picture placed by `object-position` for `contain`,
 * `scale-down` and `none`. `size` is the picture's own size (a video's frame size) and the
 * element's CSS width.
 */
export function pictureBox(size, box, style) {
    const fit = style.objectFit;
    if (fit === 'fill' || fit === 'cover' || !size.naturalWidth || !size.naturalHeight)
        return box;
    // The box may be scaled by transforms: CSS pixels of the element's own width map onto it.
    const unit = size.offsetWidth ? box.width / size.offsetWidth : 1;
    const contain = Math.min(box.width / size.naturalWidth, box.height / size.naturalHeight);
    const scale = fit === 'none' ? unit : fit === 'scale-down' ? Math.min(unit, contain) : contain;
    const width = size.naturalWidth * scale;
    const height = size.naturalHeight * scale;
    // The computed `object-position` is two lengths or percentages ("50% 50%", "0px 20%").
    const [ox = '50%', oy = '50%'] = style.objectPosition.split(/\s+/);
    const offset = (v, room) => v.endsWith('%') ? (parseFloat(v) / 100) * room : (parseFloat(v) || 0) * unit;
    return {
        x: box.x + offset(ox, box.width - width),
        y: box.y + offset(oy, box.height - height),
        width,
        height
    };
}
/** Whether a clip can hide the footage: in front of the speaker and not in a shot's slot. */
export function coverable(clip) {
    return clip.layer !== 'behind' && !clip.slot;
}
/** Program frames where the footage changes: every cut's start, and the end of the last. */
export function cutEdges(cuts) {
    if (!cuts.length)
        return [];
    const last = cuts[cuts.length - 1];
    const all = [...cuts.map((c) => c.startFrame), last.startFrame + last.frames];
    return [...new Set(all)].sort((a, b) => a - b);
}
/**
 * Cut edges between two cuts: the program's first and last frame are no cuts to land on, so an
 * item a few frames inside them is not off a cut.
 */
const between = (edges) => edges.slice(1, -1);
/**
 * Reads whether a picture has no transparent pixels, from a `size`×`size` copy drawn into a
 * canvas that `make` creates. A picture that cannot be read (a cross-origin image taints the
 * canvas) counts as see-through, and the tainted canvas is dropped: a later picture gets a clean
 * one, since clearing never cleans a tainted canvas.
 */
export function alphaReader(make, size = 32) {
    let ctx = null;
    return (picture) => {
        ctx ??= make();
        if (!ctx)
            return false;
        try {
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(picture, 0, 0, size, size);
            return opaquePixels(ctx.getImageData(0, 0, size, size).data);
        }
        catch {
            ctx = null;
            return false;
        }
    };
}
/** The cut an edge lands a few frames off (`off` frames, negative before it); null on or far. */
export function offCut(frame, edges, fps) {
    const reach = Math.round(SNAP_SECONDS * fps);
    let best = null;
    for (const e of edges)
        if (best === null || Math.abs(e - frame) < Math.abs(best - frame))
            best = e;
    if (best === null)
        return null;
    const off = frame - best;
    return off === 0 || Math.abs(off) > reach ? null : { cut: best, off };
}
const sec = (frame, fps) => `${(frame / fps).toFixed(2)} s`;
const framesText = (n) => `${n} frame${n === 1 ? '' : 's'}`;
/** "3 frames (0.12 s) before the cut at 80.00 s". */
function offText(at, fps) {
    const n = Math.abs(at.off);
    return `${framesText(n)} (${(n / fps).toFixed(2)} s) ${at.off < 0 ? 'before' : 'after'} the cut at ${sec(at.cut, fps)}`;
}
/**
 * `check` warnings for shot edges a few frames off a cut: a shot change just beside a cut reads
 * as a second, tiny cut. An edge two shots share is told once, as the later shot's `from`.
 */
export function shotsOffCut(shots, edges, fps) {
    const starts = new Set(shots.map((s) => s.startFrame));
    const cuts = between(edges);
    const out = [];
    const warn = (i, edge, frame) => {
        const at = offCut(frame, cuts, fps);
        if (!at)
            return;
        const before = edge === 'from' ? shots.find((s) => s.startFrame + s.frames === frame) : null;
        out.push({
            level: 'warning',
            item: shots[i].id,
            field: `shots[${i}].${edge}`,
            message: shotOffCutMessage(shots[i].id, edge, at, fps, before?.id)
        });
    };
    shots.forEach((s, i) => {
        warn(i, 'from', s.startFrame);
        const end = s.startFrame + s.frames;
        if (!starts.has(end))
            warn(i, 'until', end);
    });
    return out;
}
/**
 * The warning for a shot edge off a cut. An edge the shot shares with the shot before it (the
 * chain) moves only when both shots snap it: snapping one alone leaves the other where it was.
 */
function shotOffCutMessage(id, edge, at, fps, before) {
    const verb = edge === 'from' ? 'starts' : 'ends';
    const head = `Shot "${id}" ${verb} ${offText(at, fps)}`;
    const why = 'a shot change just beside a cut reads as a second, tiny cut.';
    if (before === undefined)
        return `${head}: ${why} Put the edge on the cut with { "${edge}": "cut" } in "snap" on the shot, unless that is meant.`;
    return `${head} (where shot "${before}" ends): ${why} Put the edge on the cut on both shots, { "until": "cut" } on "${before}" and { "from": "cut" } on "${id}" (snapping one alone breaks the chain), unless that is meant.`;
}
/**
 * A span in seconds with the edges `snap` asks for moved onto the nearest cut edge within
 * `SNAP_SECONDS`. An edge with no cut that near stays, and `note` says so; without a cut list
 * (`edges` null or empty) nothing moves and `note` says why, once.
 */
export function snapSpan(snap, span, edges, fps, note) {
    if (!snap)
        return span;
    if (!edges?.length) {
        note(snap === 'cut' || snap.from ? 'from' : 'until', '"snap": "cut" needs a cut list ("cuts") to snap to; the edges stay where they are.');
        return span;
    }
    const asked = snap === 'cut' ? { from: true, until: true } : { from: !!snap.from, until: !!snap.until };
    const move = (edge, time) => asked[edge] ? snapTime(edge, time, edges, fps, note) : time;
    const snapped = { start: move('from', span.start), end: move('until', span.end) };
    // Frames decide: a span whose edges round to one frame has none left.
    if (Math.round(snapped.end * fps) > Math.round(snapped.start * fps))
        return snapped;
    note('until', `"snap": "cut" would put both edges on the cut at ${snapped.start.toFixed(2)} s (the span is too short to reach two cuts); the edges stay where they are. Snap one edge, or make the span longer.`);
    return span;
}
/** `time` on the nearest cut edge within reach, or as it is after a note. */
function snapTime(edge, time, edges, fps, note) {
    const frame = Math.round(time * fps);
    const nearest = edges.reduce((a, b) => (Math.abs(b - frame) < Math.abs(a - frame) ? b : a));
    if (Math.abs(nearest - frame) <= Math.round(SNAP_SECONDS * fps))
        return nearest / fps;
    note(edge, `"snap": "cut" found no cut within ${SNAP_SECONDS} s of "${edge}" (${time.toFixed(2)} s); the nearest is at ${sec(nearest, fps)}. The edge stays where it is.`);
    return time;
}
/** One minus what shows through all the clips: covers of clips over each other add up. */
function combined(sample) {
    let through = 1;
    for (const c of Object.values(sample.clips))
        through *= 1 - Math.min(1, Math.max(0, c));
    return 1 - through;
}
/** The clip that hides most at a sample. */
function top(sample) {
    return Object.entries(sample.clips).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
/** Samples in frame order, one per frame, without those inside a transition window. */
function usable(program, samples) {
    const inWindow = (f) => program.transitions.some((t) => f >= t.startFrame && f < t.startFrame + t.frames);
    const byFrame = new Map(samples.map((s) => [s.frame, s]));
    return [...byFrame.values()].filter((s) => !inWindow(s.frame)).sort((a, b) => a.frame - b.frame);
}
/** Clips that hide the whole footage at some sample. */
function fullScreen(samples) {
    const out = new Set();
    for (const s of samples)
        for (const [id, c] of Object.entries(s.clips))
            if (c >= FULL_COVER)
                out.add(id);
    return out;
}
/** The piece of footage (between two cut edges) a frame is in. */
const pieceOf = (frame, edges) => edges.filter((e) => e <= frame).length;
/**
 * Stretches where the footage shows, each inside one piece of footage, bounded on both sides by
 * a sample where clips hide it (the bound is the frame after it, or the frame of it on the right)
 * or by a cut edge.
 */
function footageRuns(samples, edges) {
    const runs = [];
    const covered = (s) => combined(s) >= FULL_COVER;
    let i = 0;
    while (i < samples.length) {
        if (covered(samples[i])) {
            i++;
            continue;
        }
        const piece = pieceOf(samples[i].frame, edges);
        let j = i;
        while (j + 1 < samples.length &&
            !covered(samples[j + 1]) &&
            pieceOf(samples[j + 1].frame, edges) === piece)
            j++;
        const same = (s) => !!s && pieceOf(s.frame, edges) === piece;
        const left = bound(samples[i - 1], same(samples[i - 1]), edges[piece - 1], 1);
        const right = bound(samples[j + 1], same(samples[j + 1]), edges[piece], 0);
        if (left && right)
            runs.push({ left, right, shown: samples.slice(i, j + 1) });
        i = j + 1;
    }
    return runs;
}
/**
 * The bound a neighbouring sample makes: the clip hiding the footage there when it is in the
 * same piece (`after` frames past it), else the cut edge between (`edge`); null at the end of the
 * samples.
 */
function bound(next, same, edge, after) {
    if (!next)
        return null;
    if (same && combined(next) >= FULL_COVER)
        return { frame: next.frame + after, clip: top(next), cut: null };
    return edge === undefined ? null : { frame: edge, clip: null, cut: edge };
}
/**
 * `check` warnings for flash frames, from cover samples of the page in program frames (any
 * order, any segments; frames inside transition windows are left out: a declared transition is
 * meant):
 * - a full-screen clip edge a few frames off a cut (see `offCut`);
 * - footage that shows for less than `FLASH_SECONDS` between full-screen clips, or between a
 *   full-screen clip and a cut, naming the clip that fades its own opacity when one does.
 * Footage beside one full-screen clip that stays on screen longer (a card fading out over the
 * camera that goes on) is a dissolve and passes.
 */
export function flashFrames(program, samples) {
    const list = usable(program, samples);
    const full = fullScreen(list);
    const edges = cutEdges(program.cuts);
    const told = new Set();
    const out = clipsOffCut(program, { full, list }, edges, told);
    const limit = FLASH_SECONDS * program.fps;
    for (const run of footageRuns(list, edges)) {
        const length = run.right.frame - run.left.frame;
        if (length >= limit || (run.left.clip === null && run.right.clip === null))
            continue;
        if (toldAtCut(run, told))
            continue;
        out.push({ frame: run.left.frame, message: runMessage(program, run, full) });
    }
    return out.sort((a, b) => a.frame - b.frame);
}
/**
 * Whether other clips hide the footage on every sample between a clip's edge and the cut it
 * missed: then nothing shows there, whichever way the edge is off.
 */
function hiddenByOthers(list, id, frame, at) {
    const [from, to] = frame < at.cut ? [frame, at.cut] : [at.cut, frame];
    const between = list.filter((s) => s.frame >= from && s.frame < to);
    const others = (s) => combined({ ...s, clips: { ...s.clips, [id]: 0 } });
    return between.length > 0 && between.every((s) => others(s) >= FULL_COVER);
}
/** Whether an off-cut warning already names the clip and cut that bound a run. */
function toldAtCut(run, told) {
    const cut = run.left.cut ?? run.right.cut;
    const clip = run.left.clip ?? run.right.clip;
    return cut !== null && told.has(`${clip}\u0000${cut}`);
}
/**
 * Warnings for full-screen clip edges a few frames off a cut; `told` gets clip and cut. An edge
 * counts only where the clip hides the footage on its own frame next to the edge (its first or
 * last): an edge inside a transition window (no sample there) or after the clip faded itself is
 * left to the footage runs.
 */
function clipsOffCut(program, seen, edges, told) {
    const out = [];
    const at = new Map(seen.list.map((s) => [s.frame, s]));
    const hides = (id, frame) => (at.get(frame)?.clips[id] ?? 0) >= FULL_COVER;
    for (const clip of program.clips.filter((c) => seen.full.has(c.id)))
        for (const [verb, frame, inside] of [
            ['starts', clip.startFrame, clip.startFrame],
            ['ends', clip.startFrame + clip.frames, clip.startFrame + clip.frames - 1]
        ]) {
            const at = offCut(frame, between(edges), program.fps);
            if (!at || !hides(clip.id, inside) || hiddenByOthers(seen.list, clip.id, frame, at))
                continue;
            told.add(`${clip.id}\u0000${at.cut}`);
            out.push({ frame, message: offCutMessage(clip, verb, at, program.fps) });
        }
    return out;
}
function offCutMessage(clip, verb, at, fps) {
    const n = framesText(Math.abs(at.off));
    // Starting after a cut or ending before it shows the footage; the other way covers the cut.
    const shows = (verb === 'starts') === at.off > 0;
    const what = shows
        ? `the footage under it shows for ${n} there: a flash of the shot.`
        : `it covers the cut by ${n}, so the cut happens under it.`;
    return `Clip "${clip.id}" (${clip.block}) is full-screen and ${verb} ${offText(at, fps)}: ${what} Put the edge on the cut with "snap": "cut" on the clip (or { "${verb === 'starts' ? 'from' : 'until'}": "cut" } for this edge alone), unless that is meant.`;
}
/** A full-screen clip partly see-through in a run: it fades its own opacity there. */
function fading(run, full) {
    for (const s of run.shown)
        for (const [id, cover] of Object.entries(s.clips))
            if (full.has(id) && cover > 0.02 && cover < FULL_COVER)
                return { id, cover, frame: s.frame };
    return null;
}
/** What bounds a run on one side, in words. */
function boundText(b, fps) {
    return b.clip !== null ? `"${b.clip}"` : `the cut at ${sec(b.cut, fps)}`;
}
function runMessage(program, run, full) {
    const { fps } = program;
    const { left, right } = run;
    const n = framesText(right.frame - left.frame);
    const span = `${sec(left.frame, fps).slice(0, -2)}–${sec(right.frame, fps)}`;
    const fade = fading(run, full);
    if (fade) {
        const clip = program.clips.find((c) => c.id === fade.id);
        const other = left.clip === fade.id ? right : left;
        const edge = left.clip === fade.id ? 'last' : 'first';
        return `Clip "${fade.id}" (${clip?.block ?? 'block'}) is full-screen but ${Math.round(fade.cover * 100)} % opaque at ${sec(fade.frame, fps)} (program frame ${fade.frame}), next to ${boundText(other, fps)}: the footage under it shows through for up to ${n} (${span}), a flash of the shot. Full-screen clips hand over with a hard cut: keep its opacity at 1 to its ${edge} frame, or give the handover a transition.`;
    }
    const between = left.clip !== null && right.clip !== null
        ? `full-screen clips "${left.clip}" and "${right.clip}"`
        : `full-screen clip ${boundText(left.clip !== null ? left : right, fps)} and ${boundText(left.clip !== null ? right : left, fps)}`;
    return `The footage shows for ${n} (${span}, program frames ${left.frame}–${right.frame - 1}) between ${between}: a flash of the shot underneath. Make the clips meet (one starts where the other ends, or both on the cut with "snap": "cut"), or keep the footage on screen for ${FLASH_SECONDS} s or more.`;
}
/** The clip a nested 3D warning names; null for any other message. */
export function nested3dClip(message) {
    return /^Clip "(.*?)" \(.*?\): nested CSS 3D/.exec(message)?.[1] ?? null;
}
/** A `check` warning for nested `transform-style: preserve-3d` in HTML-in-Canvas capture. */
export function nested3dMessage(found) {
    return `Clip "${found.clip}" (${found.block}): nested CSS 3D (transform-style: preserve-3d inside preserve-3d, at ${found.path}) can draw flattened or mirrored in HTML-in-Canvas capture. Look at a still; if it is wrong, keep one 3D level (2D flips for the inner parts) or draw the 3D with WebGL (Three.js).`;
}
