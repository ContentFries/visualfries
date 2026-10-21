// Outlined and hollow text that ignores how a font draws its glyphs.
//
// A plain `-webkit-text-stroke` strokes every contour of a glyph. Variable fonts and many
// serifs keep overlapping contours (a stem and a bowl drawn as two shapes), so the stroke
// shows their inner edges: a second "A" inside the A, a seam through the I.
//
// The fill of a glyph is the union of its contours, so drawing the stroke first and the fill
// on top (`paint-order: stroke fill`) hides every inner edge and leaves the line outside the
// letters. That is the whole technique for outlined filled text. Hollow text draws the fill in
// pure red and the stroke in pure green, and an SVG filter on the element keeps only the
// green that shows (the outline) and repaints it in the outline colour.
//
// Apply it to the text element itself, never to an ancestor of a nested canvas: Chromium
// crashes when an ancestor of a `<canvas layoutsubtree>` has a CSS filter or mask.
/** Channel colours of hollow text: the filter tells fill and stroke apart by them. */
const FILL = '#ff0000';
const STROKE = '#00ff00';
/**
 * Where a font's contours meet, the fill can cover a pixel only partly and let some of the
 * stroke under it show through as a faint seam. Taking red off green removes every pixel the
 * fill covers by two thirds or more, while a pixel shared half and half by fill and outline
 * (the line's inner edge) keeps its half.
 */
const SEAM = 1;
/** Filter region around the element's box: the line and glyph ink may overhang the box. */
const REGION = 'x="-25%" y="-50%" width="150%" height="200%"';
function check(options) {
    const { width, color } = options;
    if (typeof width === 'number' ? !(Number.isFinite(width) && width > 0) : !width.trim())
        throw new Error(`Outline width must be a positive px number or a CSS length, got ${width}.`);
    // The colour goes into an SVG attribute, where `var()` would not resolve against the text.
    if (!color?.trim() || /["<>&;]|var\(/.test(color))
        throw new Error(`Outline colour "${color}" must be a plain CSS colour.`);
}
/** Short stable hash, so equal colours share one filter element. */
function hash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++)
        h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(36);
}
/** Id of the hollow-text filter for a colour; equal colours give the same id. */
export function outlineFilterId(color) {
    check({ width: 1, color });
    return `vf-outline-${hash(color.trim())}`;
}
/** The `<filter>` element that turns red-fill, green-stroke text into a hollow outline. */
export function outlineFilterMarkup(color) {
    const id = outlineFilterId(color);
    // Alpha of `green` = (1 + SEAM)·green − SEAM·red on unpremultiplied colour, clamped; the
    // `in` with SourceAlpha multiplies coverage back in, so antialiased edges stay soft.
    return (`<filter id="${id}" ${REGION} color-interpolation-filters="sRGB">` +
        `<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${-SEAM} ${1 + SEAM} 0 0 0" result="green"/>` +
        `<feComposite in="green" in2="SourceAlpha" operator="in" result="line"/>` +
        `<feFlood flood-color="${color.trim()}"/>` +
        `<feComposite in2="line" operator="in"/>` +
        `</filter>`);
}
const DEFS_ID = 'vf-outline-defs';
const SVG_NS = 'http://www.w3.org/2000/svg';
/**
 * Make sure the document has the hollow-text filter for a colour and return the CSS `filter`
 * value that applies it, e.g. `url(#vf-outline-1x2k3)`. Filters live in one hidden `<svg>` at
 * the end of `<body>`, shared by every clip on the page.
 */
export function outlineFilter(color, doc = document) {
    const id = outlineFilterId(color);
    if (!doc.getElementById(id)) {
        let defs = doc.getElementById(DEFS_ID);
        if (!defs) {
            const svg = doc.createElementNS(SVG_NS, 'svg');
            svg.id = DEFS_ID;
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('width', '0');
            svg.setAttribute('height', '0');
            svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
            defs = doc.body.appendChild(svg);
        }
        const holder = doc.createElementNS(SVG_NS, 'svg');
        holder.innerHTML = outlineFilterMarkup(color);
        defs.appendChild(holder.firstChild);
    }
    return `url(#${id})`;
}
/**
 * CSS declarations that outline an element's text. `filled` needs no filter; `hollow` adds
 * its filter to `doc` and replaces the text colour.
 */
export function outlineStyle(options, doc = document) {
    check(options);
    const width = typeof options.width === 'number' ? `${options.width}px` : options.width.trim();
    // Half of a stroke lies inside the letters, under the fill: twice the width shows `width`.
    const stroke = `calc(2 * ${width})`;
    if ((options.mode ?? 'hollow') === 'filled')
        return {
            '-webkit-text-stroke': `${stroke} ${options.color.trim()}`,
            'paint-order': 'stroke fill'
        };
    return {
        color: FILL,
        '-webkit-text-fill-color': FILL,
        '-webkit-text-stroke': `${stroke} ${STROKE}`,
        'paint-order': 'stroke fill',
        filter: outlineFilter(options.color, doc)
    };
}
/**
 * Svelte action: outline the element's text, e.g.
 * `<span use:outline={{ width: 6, color: '#fff' }}>AI</span>`.
 *
 * Hollow text sets the element's CSS `filter` and text colours: animate blur on a parent and
 * keep text-shadow off the element. Give inline elements `display: inline-block`. An update and
 * `destroy` put back the inline values (and `!important`) the element had before.
 */
export function outline(node, options) {
    // The element's own inline declarations that the outline replaced, by property.
    const saved = new Map();
    const restore = () => {
        for (const [name, { value, priority }] of saved) {
            if (value)
                node.style.setProperty(name, value, priority);
            else
                node.style.removeProperty(name);
        }
        saved.clear();
    };
    const apply = (o) => {
        const style = outlineStyle(o, node.ownerDocument);
        restore();
        for (const [name, value] of Object.entries(style)) {
            saved.set(name, {
                value: node.style.getPropertyValue(name),
                priority: node.style.getPropertyPriority(name)
            });
            node.style.setProperty(name, value);
        }
    };
    apply(options);
    return { update: apply, destroy: restore };
}
