import { easeOf } from '../ease.js';
import { programFootageAt } from '../footage-map.js';
import { roundRect, SUBJECT_SMOOTH } from './layout.js';
/**
 * The speaker away from the frame: in a shot that draws the speaker cut out by the matte, an
 * `away` range slides the footage picture (the room, the cut-out, subject layers of clips) off
 * one edge of the frame and back. Behind clips, front clips and the shot's slots stay where
 * they are, so the world behind the speaker holds still while he leaves. Pure: the distance
 * comes from where the matte reaches at the frame, so the speaker just clears the frame in any
 * format, on top of the shot's keys and morphs.
 */
const AWAY_SIDES = ['left', 'right', 'bottom'];
/** The way out when the project does not say: fast, speeding up until he is gone. */
export const AWAY_EXIT = { seconds: 0.16, ease: 'power2.in' };
/** The way back in: fast, settling into place. */
export const AWAY_ENTER = { seconds: 0.22, ease: 'expo.out' };
/**
 * Room left between the speaker and the frame's edge once he is gone, as a share of the frame's
 * shorter side: the matte's soft edge and a stray hair stay out too.
 */
const MARGIN = 0.02;
/**
 * The last frame of a range's way back, where it decides its side: inside the shot even when
 * the speaker lands on its end.
 */
const landsAt = (until, enter) => until + Math.max(0, enter.frames - 1);
/** Where the speaker is at program frame `f` among `away` ranges; null: in place. */
export function awayAt(away, f) {
    for (const range of away ?? []) {
        const leaves = range.from - range.exit.frames;
        if (f < leaves && !range.atStart)
            return null;
        if (range.until === null || f < range.until) {
            const p = f >= range.from || range.atStart
                ? 1
                : easeOf(range.exit.ease)((f - leaves) / range.exit.frames);
            return { p, range, decide: leaves, look: range.looks?.exit };
        }
        const back = range.until + range.enter.frames;
        if (f < back)
            return {
                p: 1 - easeOf(range.enter.ease)((f - range.until) / range.enter.frames),
                range,
                decide: landsAt(range.until, range.enter),
                look: range.looks?.enter
            };
    }
    return null;
}
/**
 * The moves without a `side` that frames `span` show, as the program frame where each decides
 * its side and the picture there (see `ShotAway.looks`): what those frames draw depends on the
 * shot and the footage there too.
 */
export function awayMovesDuring(away, span) {
    const out = [];
    const end = span.startFrame + span.frames;
    const touches = (a, b) => a < end && span.startFrame < b;
    for (const range of away ?? []) {
        if (range.side)
            continue;
        const leaves = range.from - range.exit.frames;
        // A range from the shot's start is away before it too (see `ShotAway.atStart`).
        if (touches(range.atStart ? -Infinity : leaves, range.until ?? Infinity))
            out.push({ frame: leaves, look: range.looks?.exit });
        if (range.until !== null && touches(range.until, range.until + range.enter.frames))
            out.push({ frame: landsAt(range.until, range.enter), look: range.looks?.enter });
    }
    return out;
}
/** The program frames where the moves that frames `span` show decide their side. */
export const awayDecisions = (away, span) => awayMovesDuring(away, span).map((m) => m.frame);
/**
 * Sets the `looks` of the away ranges without a `side` from the whole program's footage `map`:
 * the picture where each of their moves decides it.
 */
export function awayLooks(shots, map, fps) {
    const reach = 2 * Math.round(SUBJECT_SMOOTH * fps);
    const look = (f) => {
        const view = programFootageAt(map, f);
        if (!view)
            return null;
        // The run of source frames around it, as far as the decision reads.
        const runs = (step) => {
            let k = 0;
            while (k < reach) {
                const g = f + step * (k + 1);
                const next = g >= 0 && g < map.frames ? programFootageAt(map, g) : null;
                if (next?.source !== view.source || next.frame !== view.frame + step * (k + 1))
                    break;
                k++;
            }
            return view.frame + step * k;
        };
        return { source: view.source, frame: view.frame, first: runs(-1), last: runs(1) };
    };
    for (const range of shots.flatMap((s) => s.away ?? []))
        if (!range.side)
            range.looks = {
                exit: look(range.from - range.exit.frames),
                enter: range.until === null ? null : look(landsAt(range.until, range.enter))
            };
}
/**
 * The speaker's box on the stage under `layout`: `reach` (fractions of the footage) where the
 * camera puts it, turned with the camera; without a reach, the whole picture.
 */
function speakerOnStage(layout, reach) {
    const { camera, turn } = layout;
    const box = reach ?? { x: 0, y: 0, width: 1, height: 1 };
    let corners = [
        [box.x, box.y],
        [box.x + box.width, box.y],
        [box.x, box.y + box.height],
        [box.x + box.width, box.y + box.height]
    ].map(([u, v]) => ({ x: camera.x + u * camera.width, y: camera.y + v * camera.height }));
    if (turn) {
        const a = (turn.rotation * Math.PI) / 180;
        const { x: px, y: py } = turn.pivot;
        corners = corners.map(({ x, y }) => ({
            x: px + (x - px) * Math.cos(a) - (y - py) * Math.sin(a),
            y: py + (x - px) * Math.sin(a) + (y - py) * Math.cos(a)
        }));
    }
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
/**
 * How far a Gaussian blur carries a bright edge, in deviations: past 3 σ less than a level of
 * 255 is left.
 */
const BLUR_REACH = 3;
/** What of the camera window the frame shows. */
function visible(clip, size) {
    return {
        left: Math.max(0, clip.x),
        right: Math.min(size[0], clip.x + clip.width),
        bottom: Math.min(size[1], clip.y + clip.height)
    };
}
/**
 * How far the picture moves toward `side` for the speaker to clear the frame, with a margin:
 * the speaker of the footage and, under footage that leaves its window open, the speaker of its
 * blurred copy (bigger, so often further in), which moves with it.
 */
export function awayDistance(layout, reach, side, size) {
    const v = visible(layout.clip, size);
    const margin = MARGIN * Math.min(...size);
    const past = (s) => side === 'left' ? s.x + s.width - v.left : side === 'right' ? v.right - s.x : v.bottom - s.y;
    // A blurred room still shows the speaker drawn in it (no clean plate) as far as its blur
    // reaches; the copy is blurred with the room too.
    const room = layout.room?.blur ?? 0;
    const copy = layout.backdrop
        ? past(speakerOnStage({ camera: layout.backdrop.camera }, reach)) +
            BLUR_REACH * Math.hypot(layout.backdrop.blur, room)
        : -Infinity;
    return Math.max(0, past(speakerOnStage(layout, reach)) + BLUR_REACH * room, copy) + margin;
}
/** The edge the speaker leaves by the shortest way (ties: left, right, bottom). */
export function nearestSide(layout, reach, size) {
    let best = AWAY_SIDES[0];
    for (const side of AWAY_SIDES)
        if (awayDistance(layout, reach, side, size) < awayDistance(layout, reach, best, size))
            best = side;
    return best;
}
const px = (v) => Math.round(v * 100) / 100;
/** The move `distance` toward `side`. */
export const awayOffset = (side, distance) => ({
    dx: side === 'left' ? -distance : side === 'right' ? distance : 0,
    dy: side === 'bottom' ? distance : 0
});
/**
 * `layout` with its picture moved by `offset`: the footage, its blurred copy and the pivot of a
 * keyed turn. The camera window, the slots and the room's look stay.
 */
export function moveAway(layout, { dx, dy }) {
    const move = (r) => roundRect({ ...r, x: r.x + dx, y: r.y + dy });
    const out = { ...layout, camera: move(layout.camera) };
    if (layout.backdrop)
        out.backdrop = { ...layout.backdrop, camera: move(layout.backdrop.camera) };
    if (layout.turn)
        out.turn = {
            ...layout.turn,
            pivot: { x: px(layout.turn.pivot.x + dx), y: px(layout.turn.pivot.y + dy) }
        };
    return out;
}
/**
 * Where `check` reads the cut-out back under a turned camera: the part of the visible window
 * `view` the turned picture covers, and how many canvas pixels per stage pixel (the picture's
 * own resolution where it fits, so a one-pixel arm stays a pixel, but never more pixels than
 * the frame has). Null when the picture lies wholly outside the view: nothing to read.
 */
export function turnedReadback(layout, view, picture, size) {
    const s = speakerOnStage(layout, null);
    const x0 = Math.max(view.x, Math.floor(s.x));
    const y0 = Math.max(view.y, Math.floor(s.y));
    const x1 = Math.min(view.x + view.width, Math.ceil(s.x + s.width));
    const y1 = Math.min(view.y + view.height, Math.ceil(s.y + s.height));
    if (x1 <= x0 || y1 <= y0)
        return null;
    const region = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    const own = Math.max(1, picture[0] / layout.camera.width, picture[1] / layout.camera.height);
    const cap = Math.sqrt((size[0] * size[1]) / (region.width * region.height));
    return { region, scale: Math.max(1, Math.min(own, cap)) };
}
/**
 * Of the frame's area, the share of speaker pixels from which `check` says he is still in the
 * frame while away: a matte's stray speck stays under it, a hand or a lock of hair does not.
 */
export const AWAY_SEEN_SHARE = 0.00002;
const STILL_THERE = 'the speaker is still partly in the frame';
/**
 * A `check` warning for a speaker still in the frame inside an `away` range, where he should be
 * wholly off it. It stays a hint: the agent looks at a still and decides.
 */
export function awayInFrameMessage(found, size, fps) {
    const s = (f) => (f / fps).toFixed(2);
    const range = found.until === null
        ? `from ${s(found.from)} s to the shot's end`
        : `${s(found.from)}–${s(found.until)} s`;
    const b = found.box;
    const where = `x ${Math.round(b.x)}–${Math.round(b.x + b.width)}, y ${Math.round(b.y)}–${Math.round(b.y + b.height)} of the ${size[0]}×${size[1]} frame`;
    return `Shot "${found.shot}" (${found.kind}), away range ${found.range} (${range}): ${STILL_THERE} at ${s(found.frame)} s (program time), though he should be wholly off it: about ${Math.round(found.area)} px² of him show at ${where}. The matte reaches further there than the boxes it measures (a raised arm, loose hair, a speck it keeps). Look at a still at ${s(found.frame)} s; if he shows, give the range another "side", or clean up the matte.`;
}
/** The shot and range a speaker-still-in-the-frame warning names; null for any other message. */
export function awayInFrameKey(message) {
    const m = /^Shot "(.*?)" \(.*?\), away range (\d+) \(/.exec(message);
    return m && message.includes(`: ${STILL_THERE} at `) ? `${m[1]}\u0000${m[2]}` : null;
}
