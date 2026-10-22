/**
 * Seconds of subject track averaged on each side of a frame before a shot frames it, so the
 * camera follows the head calmly instead of every twitch of the matte.
 */
export const SUBJECT_SMOOTH = 0.5;
/**
 * The face, below the top of the head the matte gives, in fractions of the footage height.
 * Measured against a hand-checked head track of a medium shot (about 0.1 throughout).
 */
const FACE_DROP = 0.1;
/** Where the face sits in a camera window: centred, about a third from the top. */
const FACE_AT = { x: 0.5, y: 0.36 };
/** Without a matte the frame centre, slightly high, stands in for the face. */
const NO_FACE = { x: 0.5, y: 0.35 };
/**
 * A good `headroom` to start from (the share of the camera window's height kept above the
 * head); shots keep the whole head only when a program sets it.
 */
export const HEADROOM = 0.06;
/**
 * The furthest a shot backs off to fit a head, as a share of the scale that covers its window;
 * past it the chin is cut instead (the top of the head never is while the footage has it).
 */
const MIN_FIT = 0.7;
/**
 * Backing off by less than this share of the covering scale would open slivers too thin to read
 * as anything but a seam: the footage keeps covering and the chin may touch the edge instead.
 */
const FIT_SLACK = 0.03;
/** The blurred copy under footage that leaves its window open: blur per 1080 px, and dimming. */
export const BACKDROP = { blur: 40, dim: 0.3 };
/** How much further than covering the window the blurred copy reaches, so its edge never shows. */
const BACKDROP_BLEED = 1.06;
const FACE_ONLY = { headroom: false };
/**
 * The `headroom` param of a shot (see `HeadFraming`): off (false) unless the program sets it.
 * Whether a head needs it depends on the footage (a close selfie does, a medium shot does not),
 * so the program decides per shot; `check` warns where a head is cut.
 */
export function headroomParam(params) {
    const v = params.headroom;
    return typeof v === 'number' && Number.isFinite(v) ? v : false;
}
/** The head framing of a shot's input: its `headroom` param and the shot's head size. */
export const headFraming = (input) => ({
    headroom: headroomParam(input.params),
    head: input.head,
    top: input.headTop
});
/** Messages for a `headroom` that is not a share from 0 to 0.3. */
export function checkHeadroom(params) {
    const v = params.headroom;
    if (v === undefined || (typeof v === 'number' && v >= 0 && v <= 0.3))
        return [];
    return [
        `"headroom" must be a number from 0 to 0.3: the share of the camera window kept free above the head, ${HEADROOM} is a good start (got ${JSON.stringify(v)}).`
    ];
}
/** Whole hundredths of a pixel: the same numbers on every page, smooth motion between frames. */
const px = (v) => Math.round(v * 100) / 100;
export const roundRect = (r) => ({
    x: px(r.x),
    y: px(r.y),
    width: px(r.width),
    height: px(r.height)
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** The face in 0–1 fractions of the footage frame. */
export function facePoint(subject) {
    if (!subject)
        return NO_FACE;
    return { x: subject.headX, y: Math.min(1, subject.headY + FACE_DROP) };
}
/**
 * Where a picture `length` long goes along one axis of a window from `start`, `size` long,
 * wanting `v`: covering the window when it can, else wholly inside it.
 */
const place = (v, start, size, length) => length >= size ? clamp(v, start + size - length, start) : clamp(v, start, start + size - length);
/**
 * The footage covering `clip`, `zoom` times closer, with the face centred and a third from the
 * top. The footage never leaves an edge of the window uncovered, so near an edge the face moves
 * off its mark instead. Same aspect and no zoom: the footage fills the window exactly.
 *
 * With a `headroom` (see `HeadFraming`; a shot's `headroom` param, off by default) and a matte
 * the whole head stays in the window: the
 * footage moves down until `headroom` of the window is free above the head, or up until the chin
 * is in, whichever the face mark breaks. A head too tall for the window at that scale makes the
 * camera back off (to `MIN_FIT` of covering at most), and a window the footage then leaves open
 * gets a blurred copy under it (see `ShotLayout.backdrop`). Footage with less room above the
 * head than `headroom` keeps covering the window: the head touches its top, uncut.
 */
export function frameOnHead(clip, footage, subject, zoom = 1, framing = FACE_ONLY) {
    if (!footage)
        return roundRect(clip);
    const [fw, fh] = footage;
    const cover = Math.max(clip.width / fw, clip.height / fh);
    let scale = cover * zoom;
    // The scale holds through frames the matte misses (the shot's head size still applies); only
    // the head's place needs this frame's subject.
    const room = framing.headroom === false ? null : framing.headroom * clip.height;
    const span = room === null ? null : (framing.head ?? subject?.headHeight ?? null);
    if (room !== null && span) {
        let fit = (clip.height - room) / (span * fh);
        if (fit < cover && fit >= cover * (1 - FIT_SLACK))
            fit = cover;
        scale = Math.max(Math.min(scale, fit), Math.min(scale, cover * MIN_FIT));
    }
    const width = fw * scale;
    const height = fh * scale;
    const face = facePoint(subject);
    const x = clip.x + clip.width * FACE_AT.x - face.x * width;
    let y = clip.y + clip.height * FACE_AT.y - face.y * height;
    if (room !== null && subject) {
        // No higher than `room` below the window's top for the head; no lower than the window's
        // bottom for the chin. The top of the head wins when both cannot hold.
        const lowest = span ? clip.y + clip.height - (subject.headY + span) * height : y;
        const top = Math.min(subject.headY, framing.top ?? subject.headY);
        y = Math.max(clip.y + room - top * height, Math.min(y, lowest));
    }
    return roundRect({
        x: place(x, clip.x, clip.width, width),
        y: place(y, clip.y, clip.height, height),
        width,
        height
    });
}
/** Whether the footage at `camera` covers the camera window `clip` (to a hundredth of a pixel). */
export const coversClip = (camera, clip) => camera.x <= clip.x + 0.01 &&
    camera.y <= clip.y + 0.01 &&
    camera.x + camera.width >= clip.x + clip.width - 0.01 &&
    camera.y + camera.height >= clip.y + clip.height - 0.01;
/**
 * Where the blurred copy goes under footage at `camera` that leaves part of `clip` open: the
 * footage scaled about its own centre until it covers the window with a margin, so what is
 * blurred around the picture continues what is in it and the blur's soft edge stays outside.
 */
export function backdropCamera(camera, clip) {
    const cx = camera.x + camera.width / 2;
    const cy = camera.y + camera.height / 2;
    const k = Math.max(1, (cx - clip.x) / (camera.width / 2), (clip.x + clip.width - cx) / (camera.width / 2), (cy - clip.y) / (camera.height / 2), (clip.y + clip.height - cy) / (camera.height / 2)) * BACKDROP_BLEED;
    return roundRect({
        x: cx - (camera.width * k) / 2,
        y: cy - (camera.height * k) / 2,
        width: camera.width * k,
        height: camera.height * k
    });
}
/** The frame as a rectangle. */
export const frameRect = ([width, height]) => ({
    x: 0,
    y: 0,
    width,
    height
});
/** A number param, or `fallback`; the check reports anything else. */
export function numberParam(params, name, fallback) {
    const v = params[name];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
/** Messages for params that are not numbers within `[min, max]`. */
export function checkNumber(params, name, min, max) {
    const v = params[name];
    if (v === undefined)
        return [];
    return typeof v === 'number' && v >= min && v <= max
        ? []
        : [`"${name}" must be a number from ${min} to ${max} (got ${JSON.stringify(v)}).`];
}
/** Messages for unknown params. */
export function checkKnown(params, known) {
    return Object.keys(params)
        .filter((k) => !known.includes(k))
        .map((k) => `Unknown param "${k}". ${known.length ? `Known: ${known.join(', ')}.` : 'It takes none.'}`);
}
