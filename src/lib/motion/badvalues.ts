/**
 * Finds attribute values a block computed from broken math: `NaN`, `undefined`, `Infinity` in
 * inline styles, transforms and SVG geometry. A shadowed variable that turns every polygon's
 * `points` into `NaN,NaN` renders nothing and throws nothing; `visualfries check` reports it.
 */
export type BadValue = { path: string; attr: string; value: string };

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
const BAD = /(^|[^A-Za-z])(NaN|undefined|-?Infinity)(?:px|%|em|rem|deg|rad|turn|s|ms|vh|vw|vmin|vmax|fr|ch|pt)?(?![A-Za-z])/;

function describe(el: Element, root: Element): string {
	const parts: string[] = [];
	for (let e: Element | null = el; e && e !== root; e = e.parentElement) {
		const cls = typeof e.className === 'string' && e.className.trim() ? `.${e.className.trim().split(/\s+/)[0]}` : '';
		const parent = e.parentElement;
		const nth =
			parent && parent.children.length > 1
				? `:nth-child(${Array.prototype.indexOf.call(parent.children, e) + 1})`
				: '';
		parts.unshift(`${e.tagName.toLowerCase()}${cls}${nth}`);
		if (parts.length >= 5) break;
	}
	return parts.join(' > ');
}

export function findBadValues(root: Element, limit = 20): BadValue[] {
	const out: BadValue[] = [];
	for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
		for (const attr of ATTRS) {
			const value = el.getAttribute(attr);
			if (value && BAD.test(value)) {
				out.push({ path: describe(el, root), attr, value: value.length > 120 ? `${value.slice(0, 117)}…` : value });
				if (out.length >= limit) return out;
			}
		}
	}
	return out;
}
