const ATTRS = [
    'style',
    'transform',
    'points',
    'd',
    'x',
    'y',
    'x1',
    'x2',
    'y1',
    'y2',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'width',
    'height',
    'viewBox',
    'offset',
    'opacity',
    'stroke-dashoffset',
    'stroke-dasharray'
];
// the value, optionally followed by a CSS unit (`NaNpx`, `undefined%`), but not inside a word
const BAD = /(^|[^A-Za-z])(NaN|undefined|-?Infinity)(?:px|%|r?em|r?lh|ex|ch|deg|rad|grad|turn|m?s|[sld]?v(?:h|w|min|max)|cq(?:w|h|i|b|min|max)|fr|pt|pc|cm|mm|in|q)?(?![A-Za-z])/;
// path data has no words, and command letters touch their numbers (`MNaN,NaNL…`)
const BAD_PATH = /NaN|undefined|Infinity/;
// quoted strings and url() in a style may hold any text (font names, file names, base64)
const STYLE_TEXT = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^)]*\)/g;
function isBad(attr, value) {
    if (attr === 'd')
        return BAD_PATH.test(value);
    return BAD.test(attr === 'style' ? value.replace(STYLE_TEXT, '""') : value);
}
function describe(el, root) {
    const parts = [];
    for (let e = el; e && e !== root; e = e.parentElement) {
        const cls = typeof e.className === 'string' && e.className.trim()
            ? `.${e.className.trim().split(/\s+/)[0]}`
            : '';
        const parent = e.parentElement;
        const nth = parent && parent.children.length > 1
            ? `:nth-child(${Array.prototype.indexOf.call(parent.children, e) + 1})`
            : '';
        parts.unshift(`${e.tagName.toLowerCase()}${cls}${nth}`);
        if (parts.length >= 5)
            break;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
}
export function findBadValues(root, limit = 20) {
    const out = [];
    for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
        for (const attr of ATTRS) {
            const value = el.getAttribute(attr);
            if (value && isBad(attr, value)) {
                out.push({
                    path: describe(el, root),
                    attr,
                    value: value.length > 120 ? `${value.slice(0, 117)}…` : value
                });
                if (out.length >= limit)
                    return out;
            }
        }
    }
    return out;
}
