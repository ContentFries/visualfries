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
 * The footage covering `clip`, `zoom` times closer, with the face centred and a third from the
 * top. The footage never leaves an edge of the window uncovered, so near an edge the face moves
 * off its mark instead. Same aspect and no zoom: the footage fills the window exactly.
 */
export function frameOnHead(clip, footage, subject, zoom = 1) {
    if (!footage)
        return roundRect(clip);
    const [fw, fh] = footage;
    const scale = Math.max(clip.width / fw, clip.height / fh) * zoom;
    const width = fw * scale;
    const height = fh * scale;
    const face = facePoint(subject);
    const x = clip.x + clip.width * FACE_AT.x - face.x * width;
    const y = clip.y + clip.height * FACE_AT.y - face.y * height;
    return roundRect({
        x: clamp(x, clip.x + clip.width - width, clip.x),
        y: clamp(y, clip.y + clip.height - height, clip.y),
        width,
        height
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
