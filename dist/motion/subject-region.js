/** Head height, as a share of the footage height, when the matte did not measure one. */
const HEAD_GUESS = 0.22;
/** Where the head is in footage pixels: the top of its column, and its height. */
export function headOf(frame) {
    const { box, width, height } = frame;
    if (!box)
        return null;
    return {
        top: { x: box.headX * width, y: box.headY * height },
        height: (box.headHeight || HEAD_GUESS) * height
    };
}
function lineOf(line, frame) {
    if (typeof line === 'number' || 'head' in line) {
        const k = typeof line === 'number' ? line : line.head;
        const tilt = typeof line === 'number' ? 0 : (line.tilt ?? 0);
        const head = headOf(frame);
        if (!head)
            return null;
        const a = (tilt * Math.PI) / 180;
        // Left to right whatever the turn, so a tilt past 90° does not swap above and below.
        const flip = Math.cos(a) < -1e-9 || (Math.abs(Math.cos(a)) <= 1e-9 && Math.sin(a) < 0);
        const sign = flip ? -1 : 1;
        return {
            at: { x: head.top.x, y: head.top.y + k * head.height },
            dir: { x: sign * Math.cos(a), y: sign * Math.sin(a) }
        };
    }
    const [[x1, y1], [x2, y2]] = line.through;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (!(length > 0))
        throw new Error('A region line needs two different points ("through").');
    // Left to right, so "above" means the same side whichever point comes first.
    const sign = x2 > x1 || (x2 === x1 && y2 > y1) ? 1 : -1;
    return {
        at: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
        dir: { x: (sign * (x2 - x1)) / length, y: (sign * (y2 - y1)) / length }
    };
}
/**
 * `region` placed at one frame. Null when it follows the head and the frame has no subject (the
 * matte found none), so there is nothing to take or leave.
 */
export function placeRegion(region, frame) {
    if (region === 'all')
        return { kind: 'all' };
    if (typeof region !== 'object' || region === null)
        throw new Error(`Unknown region ${JSON.stringify(region)}. ${REGION_HELP}`);
    if ('above' in region || 'below' in region) {
        const side = 'above' in region ? 'above' : 'below';
        const line = lineOf('above' in region ? region.above : region.below, frame);
        if (!line)
            return null;
        return halfPlane(line.at, line.dir, side, 4 * (frame.width + frame.height));
    }
    const origin = region.origin ?? 'frame';
    if (origin !== 'frame' && origin !== 'head')
        throw new Error(`Region origin must be "frame" or "head", got ${JSON.stringify(origin)}.`);
    let dx = 0;
    let dy = 0;
    if (origin === 'head') {
        const head = headOf(frame);
        if (!head)
            return null;
        dx = head.top.x;
        dy = head.top.y;
    }
    if ('path' in region) {
        if (typeof region.path !== 'string' || !region.path.trim())
            throw new Error('A region path must be an SVG path string, e.g. "M 100 400 L 300 400 Z".');
        return { kind: 'path', d: region.path, dx, dy };
    }
    if ('mask' in region) {
        return {
            kind: 'mask',
            src: region.mask,
            x: dx + (region.x ?? 0),
            y: dy + (region.y ?? 0),
            width: region.width ?? frame.width,
            height: region.height ?? frame.height
        };
    }
    throw new Error(`Unknown region ${JSON.stringify(region)}. ${REGION_HELP}`);
}
/** The half of the plane on `side` of the line through `at` along `dir`, `far` px across. */
function halfPlane(at, dir, side, far) {
    // The normal pointing down the picture (for a level line); "above" is the other way.
    const n = { x: -dir.y, y: dir.x };
    const s = side === 'above' ? -1 : 1;
    const a = { x: at.x - dir.x * far, y: at.y - dir.y * far };
    const b = { x: at.x + dir.x * far, y: at.y + dir.y * far };
    const polygon = [
        a,
        b,
        { x: b.x + s * n.x * far, y: b.y + s * n.y * far },
        { x: a.x + s * n.x * far, y: a.y + s * n.y * far }
    ];
    return { kind: 'half', side, at, dir, polygon };
}
/** The other half of a half-plane (what `outside` leaves of `{ above }` is `{ below }`). */
export function otherHalf(shape) {
    const far = Math.hypot(shape.polygon[0].x - shape.at.x, shape.polygon[0].y - shape.at.y);
    return halfPlane(shape.at, shape.dir, shape.side === 'above' ? 'below' : 'above', far);
}
export const REGION_HELP = 'A region is "all", { "above": line }, { "below": line }, { "path": "M… Z" } or { "mask": url }; a line is a number (head heights below the top of the head), { "head": k, "tilt": degrees } or { "through": [[x1, y1], [x2, y2]] }.';
/** Which side of the line `p` is on: true when inside the half-plane. */
export function insideHalf(shape, p) {
    const n = { x: -shape.dir.y, y: shape.dir.x };
    const d = (p.x - shape.at.x) * n.x + (p.y - shape.at.y) * n.y;
    return shape.side === 'above' ? d < 0 : d > 0;
}
/**
 * A point to turn and scale a region's layer about, in footage pixels: for a half-plane, on the
 * head's column halfway between the line and the head's top (above) or below the line by as much
 * (below); for the whole subject, the middle of its box; null for paths and masks (their own
 * bounds decide, see `<Subject>`) and without a subject.
 */
export function regionPivot(shape, frame) {
    const { box, width, height } = frame;
    if (!box)
        return null;
    if (shape.kind === 'all')
        return { x: (box.x + box.width / 2) * width, y: (box.y + box.height / 2) * height };
    if (shape.kind !== 'half')
        return null;
    const head = headOf(frame);
    // Where the line crosses the head's column.
    const t = Math.abs(shape.dir.x) > 1e-6 ? (head.top.x - shape.at.x) / shape.dir.x : 0;
    const cross = { x: shape.at.x + shape.dir.x * t, y: shape.at.y + shape.dir.y * t };
    const rise = Math.max(0, cross.y - head.top.y);
    return shape.side === 'above'
        ? { x: cross.x, y: cross.y - rise / 2 }
        : { x: cross.x, y: cross.y + Math.max(rise, head.height * 0.3) / 2 };
}
