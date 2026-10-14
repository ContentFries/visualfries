import { describe, expect, it } from 'vitest';
import { findBadValues } from '$lib/motion/badvalues.js';

function dom(html: string) {
	const root = document.createElement('div');
	root.innerHTML = html;
	return root;
}

describe('findBadValues', () => {
	it('finds NaN in SVG geometry and inline styles, with a path to the element', () => {
		const root = dom(`
			<div class="panel"><svg viewBox="0 0 10 10"><polygon points="1,2 3,4"/><polygon points="NaN,NaN 3,4"/></svg></div>
			<span style="left: NaNpx; top: 4px">a</span>
			<div style="transform: translate(undefinedpx, 0)"></div>`);
		const bad = findBadValues(root);
		expect(bad.map((b) => b.attr)).toEqual(['points', 'style', 'style']);
		expect(bad[0].path).toBe('div.panel:nth-child(1) > svg > polygon:nth-child(2)');
		expect(bad[1].value).toContain('NaNpx');
	});

	it('leaves words that merely contain the letters alone', () => {
		const root = dom(`<div style="font-family: 'Nancy Sans'; content: 'undefinedly'" data-x="NaN"></div><circle r="Infinity"></circle>`);
		const bad = findBadValues(root);
		expect(bad).toHaveLength(1);
		expect(bad[0]).toMatchObject({ attr: 'r', value: 'Infinity' });
	});

	it('stops at the limit', () => {
		const root = dom(Array.from({ length: 30 }, () => '<i style="width: NaN%"></i>').join(''));
		expect(findBadValues(root, 5)).toHaveLength(5);
	});
});
