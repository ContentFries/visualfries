import { full } from './full.js';
import { punch } from './punch.js';
import { strip } from './strip.js';
import { windowShot } from './window.js';
import { behind } from './behind.js';
import { whip } from './whip.js';
import { easeOf } from '../ease.js';
import { keyTracks } from '../keys.js';
import { facePoint, roundRect } from './layout.js';
export { facePoint, frameOnHead } from './layout.js';
export { DEFAULT_PUNCH_SCALE, PUNCH_SCALE } from './punch.js';
/**
 * The shot engine: the registry of built-in shots and the layout on screen at any program frame,
 * morphing from the previous shot's layout over the shot's first `morphFrames` frames. Pure:
 * every frame is a function of the shot track, the frame and the subject at that frame.
 */
/** Built-in shots that are drawn. */
export const SHOT_MODULES = {
    full,
    punch,
    strip,
    window: windowShot,
    behind,
    whip
};
/** The module drawing `name`; null for a shot not built yet or a custom file. */
export function shotModule(name) {
    return Object.hasOwn(SHOT_MODULES, name) ? SHOT_MODULES[name] : null;
}
/**
 * The morph into shot `next` when the project does not set one: the previous shot's `leave`
 * (a punch-in settles slower than it hits), else the next shot's `enter`. Null with nothing
 * before it.
 */
export function defaultMorph(prev, next) {
    if (prev === null)
        return null;
    return shotModule(prev)?.leave ?? (shotModule(next) ?? full).enter;
}
/**
 * Events of a shot in program frames (see `ShotModule.events`). After a shot with a
 * `leaveEvent` (a whip) that event marks the middle of the morph in place of a `shot` event,
 * and the shot's other events inside the morph move to its end, where the camera lands.
 */
export function shotEvents(shot, prev) {
    const module = shotModule(shot.shot);
    let local = module
        ? module.events({ prev, morphFrames: shot.morphFrames, frames: shot.frames })
        : [{ kind: 'shot', frame: 0 }];
    const leave = prev ? shotModule(prev)?.leaveEvent : undefined;
    if (leave && shot.morphFrames > 0) {
        const inMorph = (e) => e.frame < shot.morphFrames;
        const lands = Math.min(shot.morphFrames, shot.frames - 1);
        const mid = { kind: leave, frame: Math.floor(shot.morphFrames / 2) };
        local = [
            ...(local.some((e) => e.kind === leave && inMorph(e)) ? [] : [mid]),
            ...local
                .filter((e) => !(e.kind === 'shot' && inMorph(e)))
                .map((e) => (inMorph(e) && e.kind !== leave ? { ...e, frame: lands } : e))
        ];
    }
    return local.map((e) => ({ kind: e.kind, frame: shot.startFrame + e.frame }));
}
const FULL = { shot: 'full', params: {} };
const endOf = (s) => s.startFrame + s.frames;
/**
 * The shot on screen at program frame `f`, the one it morphs from, and how far the morph has
 * gone (eased, 0–1). Frames outside every shot are framed `full`; a shot after a gap morphs
 * from `full`.
 */
export function shotAt(shots, f) {
    const i = shots.findIndex((s) => f >= s.startFrame && f < endOf(s));
    if (i < 0)
        return { shot: FULL, prev: null, p: 1 };
    const shot = shots[i];
    const local = f - shot.startFrame;
    if (shot.morphFrames <= 0 || local >= shot.morphFrames)
        return { shot, prev: null, p: 1 };
    const before = shots[i - 1];
    const prev = before && endOf(before) === shot.startFrame ? before : FULL;
    return { shot, prev, p: easeOf(shot.morphEase)(local / shot.morphFrames) };
}
/**
 * The shots that decide the layout inside `span`: those overlapping it, and the shot the first
 * of them morphs from.
 */
export function shotsDuring(shots, span) {
    const on = (s) => s.startFrame < endOf(span) && span.startFrame < endOf(s);
    return shots.filter((s, i) => on(s) || (i + 1 < shots.length && on(shots[i + 1])));
}
/**
 * The layout of one shot, alone. Shots not built yet are framed `full`. With program frame `f`
 * the shot's keys at that frame move its camera (see `keyCamera`).
 */
export function shotLayout(shot, input, f) {
    const layout = (shotModule(shot.shot) ?? full).layout({ ...input, params: shot.params });
    if (f === undefined || !shot.keys?.length)
        return layout;
    const placement = keyTracks(shot.keys, { size: input.size }).placement;
    return placement ? keyCamera(layout, placement(f), input.subject) : layout;
}
/**
 * The layout on screen at program frame `f` (see `shotAt`), keys included: inside a morph both
 * shots' keys apply at `f` (a shot's keys hold their last value after its last key).
 */
export function shotLayoutAt(shots, f, input) {
    const { shot, prev, p } = shotAt(shots, f);
    const to = shotLayout(shot, input, f);
    if (!prev)
        return to;
    const out = mixLayouts(shotLayout(prev, input, f), to, p);
    // A shot that blurs its moves blurs the morphs into and out of it, most at the middle.
    const peak = (s) => shotModule(s.shot)?.blur?.({ ...input, params: s.params });
    const a = peak(prev);
    const b = peak(shot);
    if (a || b) {
        const rise = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
        const x = px(Math.max(a?.x ?? 0, b?.x ?? 0) * rise);
        const y = px(Math.max(a?.y ?? 0, b?.y ?? 0) * rise);
        if (x > 0 || y > 0)
            out.motionBlur = { x, y };
    }
    return out;
}
/**
 * Shot keys composed on the camera: the footage scaled by `scale` about the face (the subject's
 * head, else the point a shot frames when there is no matte), moved by `x`/`y`, turned by
 * `rotation` about the face and drawn at `opacity`. The camera window stays where the shot put
 * it, so a key moves the picture inside it like a camera operator would.
 */
export function keyCamera(layout, key, subject) {
    const { camera } = layout;
    const face = facePoint(subject);
    const fx = camera.x + face.x * camera.width;
    const fy = camera.y + face.y * camera.height;
    const moved = roundRect({
        x: fx - (fx - camera.x) * key.scale + key.x,
        y: fy - (fy - camera.y) * key.scale + key.y,
        width: camera.width * key.scale,
        height: camera.height * key.scale
    });
    const out = { ...layout, camera: moved };
    if (key.rotation)
        out.turn = { rotation: key.rotation, pivot: { x: px(fx + key.x), y: px(fy + key.y) } };
    if (key.opacity !== 1)
        out.opacity = key.opacity;
    return out;
}
const px = (v) => Math.round(v * 100) / 100;
const mix = (a, b, t) => Math.round((a + (b - a) * t) * 100) / 100;
const mixRect = (a, b, t) => ({
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    width: mix(a.width, b.width, t),
    height: mix(a.height, b.height, t)
});
/**
 * The layout `t` of the way from `a` to `b`. Rectangles move straight, so the face moves in a
 * line between its two marks. A slot only one side frees slides between its open and closed
 * rectangles; the fill shows while either side has it.
 */
export function mixLayouts(a, b, t) {
    const slots = {};
    const closed = {};
    for (const name of new Set([...Object.keys(a.slots), ...Object.keys(b.slots)])) {
        const from = a.slots[name] ?? b.closed[name] ?? b.slots[name];
        const to = b.slots[name] ?? a.closed[name] ?? a.slots[name];
        slots[name] = mixRect(from, to, t);
        const shut = b.closed[name] ?? a.closed[name];
        if (shut)
            closed[name] = shut;
    }
    const out = {
        camera: mixRect(a.camera, b.camera, t),
        clip: mixRect(a.clip, b.clip, t),
        radius: mix(a.radius, b.radius, t),
        slots,
        closed,
        fill: a.fill ?? b.fill
    };
    // Keyed turns and fades blend like the rectangles; an unkeyed side counts as still.
    if (a.turn || b.turn) {
        const pivot = (l) => l.turn?.pivot ?? (a.turn ?? b.turn).pivot;
        out.turn = {
            rotation: mix(a.turn?.rotation ?? 0, b.turn?.rotation ?? 0, t),
            pivot: { x: mix(pivot(a).x, pivot(b).x, t), y: mix(pivot(a).y, pivot(b).y, t) }
        };
    }
    if (a.opacity !== undefined || b.opacity !== undefined)
        out.opacity = mix(a.opacity ?? 1, b.opacity ?? 1, t);
    // A window's ring and shadow, and a dimmed room, fade in and out with the move.
    if (a.ring || b.ring)
        out.ring = mix(a.ring ?? 0, b.ring ?? 0, t);
    if (a.lift || b.lift)
        out.lift = mix(a.lift ?? 0, b.lift ?? 0, t);
    if (a.room || b.room)
        out.room = {
            dim: mix(a.room?.dim ?? 0, b.room?.dim ?? 0, t),
            blur: mix(a.room?.blur ?? 0, b.room?.blur ?? 0, t)
        };
    return out;
}
