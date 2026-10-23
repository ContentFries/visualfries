/**
 * Text over the speaker's face: where the matte puts the head on the stage, how much of it the
 * text boxes of a clip cover, and the `check` warning that says so. Pure geometry; the stage
 * measures the text boxes in the page (see `measure` in `program-stage.ts`).
 */
/**
 * The matte measures the chin this many head widths below the head's widest row (see
 * `measureSubject`): the head's box is about this much taller than it is wide.
 */
const HEAD_RATIO = 1.4;
/** Head height, as a share of the footage height, when the matte did not measure one. */
const HEAD_GUESS = 0.22;
/**
 * Share of the face covered by text from which `check` warns. The face is the ellipse inside
 * the head's box and a text box is its line box (taller than the glyphs): below a tenth, the
 * glyphs touch the hair, an ear or the room beside the chin, not the eyes or the mouth.
 */
export const FACE_TEXT_SHARE = 0.1;
/** Seconds the text must stay over the face: a word flying past it on its way in is fine. */
export const FACE_TEXT_SECONDS = 0.5;
/** Text at less opacity than this is not read: fading in or out, or hidden. */
export const TEXT_OPACITY = 0.1;
/** Samples across each axis of the head's box when measuring how much of the face is covered. */
const GRID = 24;
/**
 * The head's box on the stage, in stage pixels: the matte's head (top, chin, a head's width
 * around its column) where the shot's camera puts the footage, turned with a shot key's rotation
 * (about its middle, keeping its size) and cut to the camera window. Null when no part of it is
 * on screen.
 */
export function headOnStage(box, layout) {
    const { camera, clip, turn } = layout;
    const height = (box.headHeight || HEAD_GUESS) * camera.height;
    const width = height / HEAD_RATIO;
    let cx = camera.x + box.headX * camera.width;
    let cy = camera.y + box.headY * camera.height + height / 2;
    if (turn) {
        const a = (turn.rotation * Math.PI) / 180;
        const dx = cx - turn.pivot.x;
        const dy = cy - turn.pivot.y;
        cx = turn.pivot.x + dx * Math.cos(a) - dy * Math.sin(a);
        cy = turn.pivot.y + dx * Math.sin(a) + dy * Math.cos(a);
    }
    return intersect({ x: cx - width / 2, y: cy - height / 2, width, height }, clip);
}
/** The overlap of two boxes; null when they do not overlap. */
export function intersect(a, b) {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
/**
 * The share (0–1) of the face, the ellipse inside `head`, that `boxes` cover together: sampled on
 * a grid, so overlapping boxes count once.
 */
export function faceCovered(head, boxes) {
    const near = boxes.filter((b) => intersect(b, head));
    if (!near.length || head.width <= 0 || head.height <= 0)
        return 0;
    let inside = 0;
    let covered = 0;
    for (let i = 0; i < GRID; i++)
        for (let j = 0; j < GRID; j++) {
            const u = (i + 0.5) / GRID - 0.5;
            const v = (j + 0.5) / GRID - 0.5;
            if (u * u + v * v > 0.25)
                continue;
            inside++;
            const x = head.x + (u + 0.5) * head.width;
            const y = head.y + (v + 0.5) * head.height;
            if (near.some((b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height))
                covered++;
        }
    return inside ? covered / inside : 0;
}
/** The wider side of the frame beside the head, and its span in stage pixels. */
export function freeSide(head, size) {
    const left = Math.max(0, head.x);
    const right = Math.max(0, size[0] - (head.x + head.width));
    return left >= right
        ? { side: 'left', from: 0, to: Math.round(left) }
        : { side: 'right', from: Math.round(size[0] - right), to: size[0] };
}
const COVERS = "its text covers the speaker's face";
/**
 * A `check` warning for text over the face, worded so an agent knows where there is room. It
 * stays a warning: the engine moves nothing, the agent looks at a still and decides.
 */
export function textOverFaceMessage(found, size, fps) {
    const at = `${(found.frame / fps).toFixed(2)} s`;
    const free = freeSide(found.head, size);
    const room = free.to - free.from > 0
        ? `The ${free.side} side of the frame (x ${free.from}–${free.to} of ${size[0]} px) is clear of the head.`
        : 'The head spans the whole width of the frame there.';
    const tries = [
        free.to - free.from > 0
            ? `move it to the ${free.side} side (a smaller size if it must fit there)`
            : 'move it above or below the face',
        '"layer": "behind" to put it behind the speaker',
        'a shot that frees a slot beside the speaker ("strip" or "window") for it'
    ];
    return `Clip "${found.clip}" (${found.block}): ${COVERS} from ${at} (program time) on, up to ${Math.round(found.share * 100)} % of the face in the frames checked. ${room} If the text is not meant to sit on the face, try: ${tries.join('; ')}. Look at a still at ${at} before deciding.`;
}
/** The clip a text-over-face warning names; null for any other message. */
export function textOverFaceClip(message) {
    const m = /^Clip "(.*?)" \(.*?\): (.*?) from /.exec(message);
    return m && m[2] === COVERS ? m[1] : null;
}
