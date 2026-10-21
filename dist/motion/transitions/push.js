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
const filterId = (overlay) => `${overlay.id}-blur`;
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
        // One-axis blur: an SVG filter the sides reference while it is strong enough to see.
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        const filter = document.createElementNS(ns, 'filter');
        filter.id = filterId(overlay);
        const across = horizontal(direction);
        filter.setAttribute('x', across ? '-30%' : '0');
        filter.setAttribute('y', across ? '0' : '-30%');
        filter.setAttribute('width', across ? '160%' : '100%');
        filter.setAttribute('height', across ? '100%' : '160%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        const blur = document.createElementNS(ns, 'feGaussianBlur');
        blur.setAttribute('stdDeviation', '0 0');
        filter.appendChild(blur);
        svg.appendChild(filter);
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
            overlay
                .querySelector('feGaussianBlur')
                .setAttribute('stdDeviation', horizontal(direction) ? `${value} 0` : `0 ${value}`);
        }
        const filter = on ? `url(#${filterId(overlay)})` : '';
        for (const el of [...out, ...incoming])
            el.style.filter = filter;
    },
    release({ out, in: incoming }) {
        for (const el of [...out, ...incoming]) {
            el.style.transform = '';
            el.style.filter = '';
        }
    }
};
