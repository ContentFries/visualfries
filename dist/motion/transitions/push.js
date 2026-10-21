import { checkKnown, checkNumber, numberParam } from '../shots/layout.js';
/**
 * Push: the incoming picture pushes the outgoing one off the frame, both moving together, with
 * a directional blur along the travel that peaks halfway. `params.blur` is the peak blur in
 * pixels of a 1920 px travel (default 50; 0: none).
 */
/** Peak blur (standard deviation, px) over a 1920 px travel. */
const BLUR = 50;
/** Below this the blur is not drawn at all. */
const BLUR_MIN = 0.4;
const horizontal = (d) => d === 'left' || d === 'right' || d === null;
const sign = (d) => (d === 'right' || d === 'down' ? 1 : -1);
const px = (v) => Math.round(v * 100) / 100;
const filterId = (overlay, solid) => `${overlay.id}-${solid ? 'solid' : 'blur'}`;
function translate(d, offset) {
    return horizontal(d) ? `translate(${px(offset)}px, 0px)` : `translate(0px, ${px(offset)}px)`;
}
export const push = {
    name: 'push',
    defaultDuration: 0.55,
    ease: 'expo.inOut',
    directional: true,
    events: [{ kind: 'transition', at: 0.5 }],
    check: (params) => [...checkKnown(params, ['blur']), ...checkNumber(params, 'blur', 0, 400)],
    setup(overlay, { direction }) {
        // One-axis blur: SVG filters the sides reference while it is strong enough to see. A
        // solid element (a side) is blurred inside its own box and keeps it opaque: the seam
        // where the two sides meet never blends with the stage behind them (a darker band).
        // Everything else (riding clips) blurs into transparency around it.
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        const across = horizontal(direction);
        for (const solid of [false, true]) {
            const filter = document.createElementNS(ns, 'filter');
            filter.id = filterId(overlay, solid);
            filter.setAttribute('x', solid || !across ? '0' : '-30%');
            filter.setAttribute('y', solid || across ? '0' : '-30%');
            filter.setAttribute('width', solid || !across ? '100%' : '160%');
            filter.setAttribute('height', solid || across ? '100%' : '160%');
            filter.setAttribute('color-interpolation-filters', 'sRGB');
            const blur = document.createElementNS(ns, 'feGaussianBlur');
            blur.setAttribute('stdDeviation', '0 0');
            filter.appendChild(blur);
            if (solid) {
                // Colours come out of the blur averaged over the box alone (alpha is divided out);
                // only the alpha the edge lost is put back.
                const opaque = document.createElementNS(ns, 'feComponentTransfer');
                const alpha = document.createElementNS(ns, 'feFuncA');
                alpha.setAttribute('type', 'discrete');
                alpha.setAttribute('tableValues', '0 1');
                opaque.appendChild(alpha);
                filter.appendChild(opaque);
            }
            svg.appendChild(filter);
        }
        overlay.appendChild(svg);
    },
    apply({ p, eased, direction, params, size, out, in: incoming, overlay }) {
        const travel = horizontal(direction) ? size[0] : size[1];
        const moved = sign(direction) * travel * eased;
        for (const el of out)
            el.style.transform = translate(direction, moved);
        for (const el of incoming)
            el.style.transform = translate(direction, moved - sign(direction) * travel);
        // Rises over the first half, falls over the second (power2 both ways).
        const rise = 1 - Math.abs(2 * p - 1);
        const amount = ((numberParam(params, 'blur', BLUR) * travel) / 1920) * rise * rise;
        const on = amount > BLUR_MIN;
        if (on) {
            const value = amount.toFixed(1);
            for (const blur of overlay.querySelectorAll('feGaussianBlur'))
                blur.setAttribute('stdDeviation', horizontal(direction) ? `${value} 0` : `0 ${value}`);
        }
        for (const el of [...out, ...incoming])
            el.style.filter = on ? `url(#${filterId(overlay, 'solid' in el.dataset)})` : '';
    },
    release({ out, in: incoming }) {
        for (const el of [...out, ...incoming]) {
            el.style.transform = '';
            el.style.filter = '';
        }
    }
};
