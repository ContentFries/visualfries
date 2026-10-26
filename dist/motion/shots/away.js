import { easeOf } from '../ease.js';
import { roundRect } from './layout.js';
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
/** Where the speaker is at program frame `f` among `away` ranges; null: in place. */
export function awayAt(away, f) {
    for (const range of away ?? []) {
        const leaves = range.from - range.exit.frames;
        if (f < leaves)
            return null;
        if (range.until === null || f < range.until) {
            const p = f >= range.from ? 1 : easeOf(range.exit.ease)((f - leaves) / range.exit.frames);
            return { p, range, decide: leaves };
        }
        const back = range.until + range.enter.frames;
        if (f < back)
            return {
                p: 1 - easeOf(range.enter.ease)((f - range.until) / range.enter.frames),
                range,
                decide: back
            };
    }
    return null;
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
/** What of the camera window the frame shows. */
function visible(clip, size) {
    return {
        left: Math.max(0, clip.x),
        right: Math.min(size[0], clip.x + clip.width),
        bottom: Math.min(size[1], clip.y + clip.height)
    };
}
/** How far the picture moves toward `side` for the speaker to clear the frame, with a margin. */
export function awayDistance(layout, reach, side, size) {
    const s = speakerOnStage(layout, reach);
    const v = visible(layout.clip, size);
    const margin = MARGIN * Math.min(...size);
    const past = side === 'left' ? s.x + s.width - v.left : side === 'right' ? v.right - s.x : v.bottom - s.y;
    return Math.max(0, past) + margin;
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
/**
 * `layout` with its picture moved `distance` toward `side`: the footage, its blurred copy and
 * the pivot of a keyed turn. The camera window, the slots and the room's look stay.
 */
export function moveAway(layout, side, distance) {
    const dx = side === 'left' ? -distance : side === 'right' ? distance : 0;
    const dy = side === 'bottom' ? distance : 0;
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
