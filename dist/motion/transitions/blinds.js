import { easeOf } from '../ease.js';
import { checkKnown, checkNumber, numberParam } from '../shots/layout.js';
import { checkColors, clamp01, colorList } from './common.js';
/**
 * Blinds: slats in the brand's colours close over the outgoing picture one after another, along
 * `direction`; while they all cover the frame (halfway) the picture changes, then they open the
 * same way and reveal the incoming one. Slats stand across the travel: columns that drop when it
 * runs left or right, rows that sweep sideways when it runs up or down. `forward` runs left in
 * landscape and square, up in portrait.
 *
 * Params: `count` (number of slats, default 8 in landscape, 6 in square, 7 in portrait),
 * `colors` (CSS colours, used in turn from the first slat on; default the brand's primary, every
 * other slat a shade darker) and
 * `stagger` (share of each half spent starting the slats one after another, 0–0.9, default 0.4).
 *
 * In a cut or shot transition the outgoing side hides from halfway; a clip transition leaves the
 * layers below the clip alone.
 */
const MID = 0.5;
/** The brand's primary, every other slat a shade darker. */
const COLORS = [
    'var(--brand-primary, #f43f5e)',
    'color-mix(in oklab, var(--brand-primary, #f43f5e) 82%, #000000)'
];
const COUNT = { landscape: 8, square: 6, portrait: 7 };
/** Slats overlap their neighbours and run past the frame edges by this many pixels. */
const BLEED = 2;
const close = easeOf('power3.in');
const open = easeOf('power3.out');
const horizontal = (d) => d === 'left' || d === 'right' || d === null;
/** The number of slats in a format class (`params.count` wins). */
export function blindsCount(params, cls) {
    return Math.round(numberParam(params, 'count', COUNT[cls]));
}
/**
 * How far slat `j` (in travel order) of `n` covers its place at eased progress `e`, 0–1, and
 * from which end: closing from its start edge before halfway, opening toward its far edge after.
 * Every slat covers fully exactly at halfway.
 */
export function blindsSlatAt(j, n, e, stagger = 0.4) {
    const step = n > 1 ? (stagger * MID) / (n - 1) : 0;
    const travel = MID - step * (n - 1);
    if (e < MID)
        return { cover: close(clamp01((e - j * step) / travel)), from: 'start' };
    return { cover: 1 - open(clamp01((e - MID - j * step) / travel)), from: 'end' };
}
export const blinds = {
    name: 'blinds',
    defaultDuration: 0.8,
    ease: 'none',
    directional: true,
    events: [{ kind: 'transition', at: MID }],
    shows: () => ({ out: MID, in: MID }),
    check: (params) => [
        ...checkKnown(params, ['count', 'colors', 'stagger']),
        ...checkNumber(params, 'count', 2, 40),
        ...checkNumber(params, 'stagger', 0, 0.9),
        ...checkColors(params)
    ],
    setup(overlay, { params, size, cls, direction }) {
        const n = blindsCount(params, cls);
        const colors = colorList(params.colors) ?? COLORS;
        const across = horizontal(direction);
        const [w, h] = size;
        // Columns across a horizontal travel, rows across a vertical one, in whole pixels.
        const length = across ? w : h;
        for (let i = 0; i < n; i++) {
            const a = Math.round((i * length) / n) - (i ? BLEED / 2 : BLEED);
            const b = Math.round(((i + 1) * length) / n) + (i < n - 1 ? BLEED / 2 : BLEED);
            const slat = document.createElement('div');
            slat.style.cssText = across
                ? `position:absolute;left:${a}px;width:${b - a}px;top:-${BLEED}px;height:${h + 2 * BLEED}px`
                : `position:absolute;top:${a}px;height:${b - a}px;left:-${BLEED}px;width:${w + 2 * BLEED}px`;
            slat.dataset.slat = String(i);
            // Set as a property: an invalid colour is dropped, never read as more CSS.
            slat.style.background = colors[i % colors.length];
            overlay.appendChild(slat);
        }
    },
    apply({ eased, direction, params, out, in: incoming, overlay, kind }) {
        const slats = [...overlay.querySelectorAll('[data-slat]')];
        const n = slats.length;
        const across = horizontal(direction);
        // Travel order: a slat further along the travel starts later.
        const reversed = direction === 'left' || direction === 'up' || direction === null;
        const stagger = numberParam(params, 'stagger', 0.4);
        slats.forEach((slat, i) => {
            const j = reversed ? n - 1 - i : i;
            const { cover, from } = blindsSlatAt(j, n, eased, stagger);
            // Columns drop from the top and leave at the bottom; rows sweep the way the travel runs
            // sideways (from the left for up, from the right for down).
            const startEdge = across ? 'top' : direction === 'down' ? 'right' : 'left';
            const endEdge = { top: 'bottom', left: 'right', right: 'left' }[startEdge];
            slat.style.transformOrigin = from === 'start' ? startEdge : endEdge;
            slat.style.transform = across ? `scaleY(${cover.toFixed(4)})` : `scaleX(${cover.toFixed(4)})`;
        });
        const changed = eased >= MID;
        for (const el of incoming)
            el.style.visibility = changed ? '' : 'hidden';
        if (kind !== 'clip')
            for (const el of out)
                el.style.visibility = changed ? 'hidden' : '';
    },
    release({ out, in: incoming }) {
        for (const el of [...out, ...incoming])
            el.style.visibility = '';
    }
};
