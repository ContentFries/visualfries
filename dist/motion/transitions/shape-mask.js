import { checkKnown, checkNumber, numberParam } from '../shots/layout.js';
import { checkChoice, checkPoint, choiceParam, isSolid, originOf, pointAt, px, ramp, smooth } from './common.js';
/**
 * Shape mask: the incoming picture shows through a shape that grows from a point (the outgoing
 * picture's face by default) until it covers the frame, a ring in the brand's accent riding its
 * edge. The outgoing picture drifts a little closer behind it and the incoming one settles from a
 * little closer, so the reveal has depth.
 *
 * Both sides only scale up, so the frame is always covered. Clips that leave with the outgoing
 * side (they sit above both sides) are cut out where the shape is, so they never cover the
 * incoming picture.
 *
 * Params: `shape` ("circle" or "rect", a rectangle with rounded corners), `at` ("face", "center"
 * or [x, y] in fractions of the frame), `ring` (width of the ring in pixels of a 1080 px frame,
 * default 10; 0: none), `color` (the ring's colour, default the brand's accent) and `radius`
 * (corner radius of "rect" at its start, pixels of a 1080 px frame, default 64).
 */
const SHAPES = ['circle', 'rect'];
/** How much closer the outgoing picture drifts, and how much closer the incoming one starts. */
const DRIFT = 0.06;
const SETTLE = 0.08;
const n = (v) => px(v).toString();
/** The shape's outline as SVG path data, shifted by `-o` (into an element's own box). */
export function shapePath(shape, o = { x: 0, y: 0 }) {
    const cx = shape.c.x - o.x;
    const cy = shape.c.y - o.y;
    if (shape.kind === 'circle') {
        const r = shape.r;
        return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;
    }
    const { hw, hh } = shape;
    const r = Math.min(shape.r, hw, hh);
    const [x0, y0, x1, y1] = [cx - hw, cy - hh, cx + hw, cy + hh];
    const arc = (x, y) => `A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}`;
    return (`M${n(x0 + r)} ${n(y0)}H${n(x1 - r)}${arc(x1, y0 + r)}V${n(y1 - r)}${arc(x1 - r, y1)}` +
        `H${n(x0 + r)}${arc(x0, y1 - r)}V${n(y0 + r)}${arc(x0 + r, y0)}Z`);
}
/** `shape` drawn inside a box scaled `k` times about its centre: the same outline on screen. */
const within = (shape, k) => shape.kind === 'circle'
    ? { ...shape, r: shape.r / k }
    : { ...shape, hw: shape.hw / k, hh: shape.hh / k, r: shape.r / k };
/**
 * The shape at eased progress `e`, from nothing at `c` to past every corner of the frame (and of
 * the ring around it) at 1.
 */
export function shapeAt(kind, c, e, size, margin, radius) {
    const [w, h] = size;
    const far = { x: Math.max(c.x, w - c.x) + margin, y: Math.max(c.y, h - c.y) + margin };
    if (kind === 'circle')
        return { kind, c, r: Math.max(0, e * Math.hypot(far.x, far.y)) };
    const grow = Math.max(0, e);
    // The corners round off as the rectangle reaches the frame's.
    return { kind, c, hw: grow * far.x, hh: grow * far.y, r: radius * Math.max(0, 1 - grow * grow) };
}
export const shapeMask = {
    name: 'shape-mask',
    defaultDuration: 0.7,
    ease: 'power3.inOut',
    directional: false,
    events: [{ kind: 'transition', at: 0.5 }],
    check: (params) => [
        ...checkKnown(params, ['shape', 'at', 'ring', 'color', 'radius']),
        ...checkChoice(params, 'shape', [...SHAPES]),
        ...checkPoint(params),
        ...checkNumber(params, 'ring', 0, 80),
        ...checkNumber(params, 'radius', 0, 540),
        ...(params.color === undefined || typeof params.color === 'string'
            ? []
            : [`"color" must be a CSS colour (got ${JSON.stringify(params.color)}).`])
    ],
    setup(overlay, { params }) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'position:absolute;inset:0;overflow:visible';
        const ring = document.createElementNS(ns, 'path');
        ring.setAttribute('fill', 'none');
        ring.dataset.ring = '';
        // Set as properties: a colour that is not one is dropped, never read as more CSS.
        ring.style.stroke = 'var(--brand-accent, #fbc42d)';
        if (typeof params.color === 'string')
            ring.style.stroke = params.color;
        svg.appendChild(ring);
        overlay.appendChild(svg);
    },
    apply(frame) {
        const { eased, params, out, in: incoming, overlay, kind, size } = frame;
        const unit = Math.min(size[0], size[1]) / 1080;
        const ringWidth = numberParam(params, 'ring', 10) * unit;
        const c = pointAt(params, frame, 'out');
        const shape = shapeAt(choiceParam(params, 'shape', SHAPES, 'circle'), c, eased, size, ringWidth + 2, numberParam(params, 'radius', 64) * unit);
        const drift = 1 + DRIFT * eased;
        const settle = 1 + SETTLE * (1 - eased);
        const [w, h] = size;
        for (const el of incoming) {
            const o = originOf(el);
            el.style.clipPath = `path('${shapePath(within(shape, settle), o)}')`;
            el.style.transformOrigin = `${px(c.x - o.x)}px ${px(c.y - o.y)}px`;
            el.style.transform = `scale(${settle.toFixed(4)})`;
        }
        // A clip transition leaves the layers below the clip where they are.
        if (kind !== 'clip')
            for (const el of out) {
                const o = originOf(el);
                el.style.transformOrigin = `${px(c.x - o.x)}px ${px(c.y - o.y)}px`;
                el.style.transform = `scale(${drift.toFixed(4)})`;
                // Clips leaving with the outgoing side sit above both sides: cut the shape out of them.
                if (!isSolid(el))
                    el.style.clipPath = `path(evenodd, 'M${n(-o.x)} ${n(-o.y)}H${n(w - o.x)}V${n(h - o.y)}H${n(-o.x)}Z${shapePath(within(shape, drift), o)}')`;
            }
        // The ring grows to its width with the shape: never a dot on the face.
        const size0 = shape.kind === 'circle' ? shape.r : Math.min(shape.hw, shape.hh);
        const ring = overlay.querySelector('[data-ring]');
        ring.setAttribute('d', ringWidth > 0 ? shapePath(shape) : '');
        ring.setAttribute('stroke-width', n(ringWidth * smooth(ramp(size0, 0, 12 * ringWidth))));
    },
    release({ out, in: incoming }) {
        for (const el of [...out, ...incoming]) {
            el.style.clipPath = '';
            el.style.transform = '';
            el.style.transformOrigin = '';
        }
    }
};
