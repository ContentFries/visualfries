import { easeOf } from '../ease.js';
import { checkKnown, checkNumber, numberParam } from '../shots/layout.js';
import { checkChoice, choiceParam, isSolid, originOf, px, ramp, smooth } from './common.js';
/**
 * Card: the incoming picture arrives as a card (smaller, with rounded corners and a shadow) that
 * slides in along `direction` or flips in, lands in the middle of the frame, and grows to fill
 * it while the outgoing picture dims behind it. `params.side: "out"` plays it backwards for the
 * outgoing picture: it shrinks into a card that slides or flips away over the incoming one.
 *
 * The picture under the card always fills the frame, so no corner of the stage shows; the card's
 * corners clip its own picture (the clips riding it move with it).
 *
 * Params: `side` ("in" or "out", default "in"; a clip transition always brings its clip in),
 * `motion` ("slide" or "flip"), `scale` (the card's size as a share of the frame, default 0.62),
 * `radius` (corner radius in pixels of a 1080 px frame, default 44), `shadow` (strength, 0–1,
 * default 0.4) and `dim` (how far the picture behind the card darkens, 0–1, default 0.45).
 */
/** The card lands halfway; then it grows to full frame (or, backwards, shrinks and leaves). */
const MID = 0.5;
const MOTIONS = ['slide', 'flip'];
const SIDES = ['in', 'out'];
const land = easeOf('power4.out');
const grow = easeOf('power3.inOut');
/** Points per rounded corner of the outline; the camera distance of a flip, px of a 1080 px frame. */
const ARC = 8;
/** How far past the frame edge the card starts, in frame lengths along the travel. */
const AWAY = 0.25;
const PERSPECTIVE = 2400;
/** The incoming side's hole for an outgoing card is this many pixels inside the card's edge. */
const HOLE = 1;
const horizontal = (d) => d === 'left' || d === 'right' || d === null;
/** +1 when the travel runs right or down. */
const sign = (d) => (d === 'right' || d === 'down' ? 1 : -1);
/**
 * The card's pose at `a` (0: off the frame or edge on, `MID`: landed, 1: the full frame). The
 * same curve read backwards is the outgoing card of `side: "out"`.
 */
export function cardPose(a, o) {
    const { motion, direction, size, scale, radius } = o;
    // An ease that overshoots (back, elastic) never turns the card past edge on.
    a = Math.max(0, Math.min(1, a));
    const arrive = Math.min(1, a / MID);
    const expand = Math.max(0, (a - MID) / (1 - MID));
    const s = scale + (1 - scale) * grow(expand);
    const pose = {
        x: 0,
        y: 0,
        scale: s,
        turn: 0,
        radius: radius * (1 - grow(expand)),
        lift: 1 - smooth(expand)
    };
    if (motion === 'flip') {
        // Edge on at the start, facing the camera when it lands.
        pose.turn = 90 * (1 - land(arrive)) * sign(direction) + 0;
        return pose;
    }
    // From past the frame edge it travels from, against the travel: far enough that on the first
    // frame of a window (and, backwards, the last) at most a sliver of it shows.
    const along = horizontal(direction) ? size[0] : size[1];
    const away = -sign(direction) * along * (0.5 + scale / 2 + AWAY);
    // Plus zero: a landed card sits at 0, never -0.
    const offset = away * (1 - land(arrive)) + 0;
    if (horizontal(direction))
        pose.x = offset;
    else
        pose.y = offset;
    return pose;
}
/** The card's transform, about the frame's centre. */
function cardTransform(pose, direction, unit) {
    const axis = horizontal(direction) ? 'rotateY' : 'rotateX';
    const flip = pose.turn
        ? ` perspective(${px(PERSPECTIVE * unit)}px) ${axis}(${pose.turn.toFixed(3)}deg)`
        : '';
    return `translate(${px(pose.x)}px, ${px(pose.y)}px)${flip} scale(${pose.scale.toFixed(4)})`;
}
/** A shadow below the card, in pixels before the scale (divided by it to get screen pixels). */
function shadowOf(pose, shadow, unit) {
    const a = shadow * pose.lift;
    if (a <= 0.005)
        return null;
    return `0px ${px((24 * unit) / pose.scale)}px ${px((120 * unit) / pose.scale)}px rgba(0, 0, 0, ${a.toFixed(3)})`;
}
/** Corner radius and shadow, drawn before the scale: divided by it to get screen pixels. */
function cardLook(el, pose, shadow, unit, inset = 0) {
    // Every property on every frame, neutral values included: the order styles are written in
    // stays the same whatever frame came before.
    const radius = Math.max(0, pose.radius / pose.scale - inset);
    const round = radius > 0.05;
    el.style.borderRadius = round ? `${px(radius)}px` : '0px';
    el.style.overflow = round ? 'hidden' : 'visible';
    el.style.boxShadow = shadowOf(pose, shadow, unit) ?? 'none';
}
/** SVG path data of a rounded rectangle. */
function roundedRect(x0, y0, x1, y1, r) {
    const n = (v) => px(v).toString();
    r = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
    const arc = (x, y) => `A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}`;
    return (`M${n(x0 + r)} ${n(y0)}H${n(x1 - r)}${arc(x1, y0 + r)}V${n(y1 - r)}${arc(x1 - r, y1)}` +
        `H${n(x0 + r)}${arc(x0, y1 - r)}V${n(y0 + r)}${arc(x0 + r, y0)}Z`);
}
/**
 * The card's outline on screen, `inset` pixels inside its edge, as a polygon: its rounded
 * rectangle (the frame, scaled about its centre) turned and projected the way `cardTransform`
 * draws it.
 */
export function cardOutline(pose, direction, size, unit, inset = 0) {
    const [w, h] = size;
    const i = inset / pose.scale;
    const r = Math.max(0, Math.min(pose.radius / pose.scale - i, w / 2 - i, h / 2 - i));
    const corners = [
        [w - i - r, i + r, -90],
        [w - i - r, h - i - r, 0],
        [i + r, h - i - r, 90],
        [i + r, i + r, 180]
    ];
    const local = [];
    for (const [cx, cy, from] of corners)
        for (let k = 0; k <= ARC; k++) {
            const a = ((from + (90 * k) / ARC) * Math.PI) / 180;
            local.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
    const t = (pose.turn * Math.PI) / 180;
    const p = PERSPECTIVE * unit;
    const across = horizontal(direction);
    return local.map(([x, y]) => {
        const qx = (x - w / 2) * pose.scale;
        const qy = (y - h / 2) * pose.scale;
        // rotateY: x cos t, depth −x sin t; rotateX: y cos t, depth y sin t; then perspective.
        const z = across ? -qx * Math.sin(t) : qy * Math.sin(t);
        const d = pose.turn ? 1 - z / p : 1;
        const X = (across ? qx * Math.cos(t) : qx) / d;
        const Y = (across ? qy : qy * Math.cos(t)) / d;
        return [px(w / 2 + X + pose.x), px(h / 2 + Y + pose.y)];
    });
}
export const card = {
    name: 'card',
    defaultDuration: 0.9,
    ease: 'none',
    directional: true,
    events: [{ kind: 'transition', at: MID }],
    check: (params) => [
        ...checkKnown(params, ['side', 'motion', 'scale', 'radius', 'shadow', 'dim']),
        ...checkChoice(params, 'side', [...SIDES]),
        ...checkChoice(params, 'motion', [...MOTIONS]),
        ...checkNumber(params, 'scale', 0.2, 0.95),
        ...checkNumber(params, 'radius', 0, 300),
        ...checkNumber(params, 'shadow', 0, 1),
        ...checkNumber(params, 'dim', 0, 1)
    ],
    setup(overlay, { under }) {
        // The outgoing card's shadow (`side: "out"`), drawn above the incoming picture and below
        // the front clips: an outer shadow paints only outside its box, so the card stays clear.
        const shadow = document.createElement('div');
        shadow.dataset.shadow = '';
        shadow.style.cssText = 'position:absolute';
        (under ?? overlay).appendChild(shadow);
    },
    apply({ eased, direction, params, out, in: incoming, kind, size, overlay, under }) {
        const unit = Math.min(size[0], size[1]) / 1080;
        const [w, h] = size;
        const options = {
            motion: choiceParam(params, 'motion', MOTIONS, 'slide'),
            direction,
            size,
            scale: numberParam(params, 'scale', 0.62),
            radius: numberParam(params, 'radius', 44) * unit
        };
        const shadow = numberParam(params, 'shadow', 0.4);
        const dim = numberParam(params, 'dim', 0.45);
        // A clip transition always brings its clip in: the layers below it stay.
        const backwards = kind !== 'clip' && choiceParam(params, 'side', SIDES, 'in') === 'out';
        /** Everything but the card, in `el`'s own box (a pixel inside the card's edge). */
        const outside = (el, pose) => {
            const o = originOf(el);
            const hole = cardOutline(pose, direction, size, unit, HOLE)
                .map(([x, y], k) => `${k ? 'L' : 'M'}${px(x - o.x)} ${px(y - o.y)}`)
                .join('');
            return `path(evenodd, 'M${-o.x} ${-o.y}H${w - o.x}V${h - o.y}H${-o.x}Z${hole}Z')`;
        };
        /**
         * Makes `el` part of the card: moved about the frame's centre wherever its box sits (a
         * slotted clip), never showing its back. A side gets the card's corners and shadow; a
         * clip riding it is cut to the card's corners; a clip that is the card itself (a clip
         * transition) gets corners and a shadow that follows what it draws.
         */
        const onCard = (el, pose, transform, lifted) => {
            const o = originOf(el);
            el.style.transform = transform;
            el.style.transformOrigin = `${px(w / 2 - o.x)}px ${px(h / 2 - o.y)}px`;
            el.style.backfaceVisibility = 'hidden';
            if (isSolid(el))
                cardLook(el, pose, lifted ? shadow : 0, unit);
            else if (kind === 'clip') {
                cardLook(el, pose, 0, unit);
                const drop = shadowOf(pose, shadow, unit);
                el.style.filter = drop ? `drop-shadow(${drop})` : '';
            }
            else
                el.style.clipPath = `path('${roundedRect(-o.x, -o.y, w - o.x, h - o.y, pose.radius / pose.scale)}')`;
        };
        const shading = (shade) => (shade < 0.999 ? `brightness(${shade.toFixed(4)})` : '');
        if (!backwards) {
            const pose = cardPose(eased, options);
            const transform = cardTransform(pose, direction, unit);
            for (const el of incoming)
                onCard(el, pose, transform, true);
            if (kind === 'clip')
                return;
            // Dims as the card arrives, brightens as it fills the frame. Clips leaving with the
            // outgoing side sit above the card: they are cut where it is, as if under it.
            const shade = 1 - dim * (Math.min(1, eased / MID) * (1 - smooth(ramp(eased, MID, 1))));
            for (const el of out) {
                el.style.filter = shading(shade);
                if (!isSolid(el))
                    el.style.clipPath = outside(el, pose);
            }
            return;
        }
        // Backwards: the outgoing picture shrinks into the card (the curve from 1 down to MID),
        // then leaves the way it would have come in (MID down to 0). The incoming side (and the
        // clips arriving with it) is drawn above it, so it shows the card through a hole of the
        // card's shape, a pixel smaller: the card's own edge stays under the incoming picture,
        // never over the empty stage. The card's shadow lies around the hole, above the incoming
        // side and below the front clips.
        const pose = cardPose(1 - eased, options);
        pose.x = -pose.x;
        pose.y = -pose.y;
        pose.turn = -pose.turn;
        const transform = cardTransform(pose, direction, unit);
        for (const el of out)
            onCard(el, pose, transform, false);
        const shade = 1 - dim * (1 - smooth(ramp(eased, MID, 1)));
        for (const el of incoming) {
            el.style.clipPath = outside(el, pose);
            el.style.filter = shading(shade);
        }
        // The shadow's box is the hole's: a pixel inside the card's edge all round.
        const lifted = (under ?? overlay).querySelector('[data-shadow]');
        const i = HOLE / pose.scale;
        lifted.style.left = `${px(i)}px`;
        lifted.style.top = `${px(i)}px`;
        lifted.style.width = `${px(w - 2 * i)}px`;
        lifted.style.height = `${px(h - 2 * i)}px`;
        lifted.style.transform = transform;
        lifted.style.transformOrigin = `${px(w / 2 - i)}px ${px(h / 2 - i)}px`;
        lifted.style.backfaceVisibility = 'hidden';
        cardLook(lifted, pose, shadow, unit, HOLE / pose.scale);
    },
    release({ out, in: incoming }) {
        for (const el of [...out, ...incoming]) {
            el.style.transform = '';
            el.style.transformOrigin = '';
            el.style.backfaceVisibility = '';
            el.style.borderRadius = '';
            el.style.overflow = '';
            el.style.boxShadow = '';
            el.style.filter = '';
            el.style.clipPath = '';
        }
    }
};
