import { afterEach, describe, expect, it } from 'vitest';
import {
	outline,
	outlineFilter,
	outlineFilterId,
	outlineFilterMarkup,
	outlineStyle
} from '$lib/motion/outline.js';

afterEach(() => {
	document.body.innerHTML = '';
});

/**
 * What the hollow filter draws for one pixel: the fill (red, coverage `fill`) painted over the
 * stroke (green, coverage `stroke`), then the colour matrix on unpremultiplied colour and the
 * `in` with the source alpha, as the SVG filter spec defines them.
 */
function lineAlpha(fill: number, stroke: number) {
	const values = /values="([^"]+)"/
		.exec(outlineFilterMarkup('#fff'))![1]
		.trim()
		.split(/\s+/)
		.map(Number);
	const alpha = fill + stroke * (1 - fill);
	if (alpha === 0) return 0;
	const [r, g] = [fill / alpha, (stroke * (1 - fill)) / alpha];
	const [kr, kg, kb, ka, k] = values.slice(15);
	const matrixAlpha = Math.min(1, Math.max(0, kr * r + kg * g + kb * 0 + ka * alpha + k));
	return matrixAlpha * alpha;
}

describe('outline filter', () => {
	it('keeps the stroke that shows outside the letters and drops the fill', () => {
		expect(lineAlpha(0, 1)).toBeCloseTo(1); // the line
		expect(lineAlpha(1, 1)).toBeCloseTo(0); // inside a letter, over a hidden inner contour
		expect(lineAlpha(1, 0)).toBeCloseTo(0); // inside a letter
		expect(lineAlpha(0, 0)).toBe(0); // background
	});

	it('keeps antialiased edges soft', () => {
		expect(lineAlpha(0, 0.5)).toBeCloseTo(0.5); // outer edge of the line
		expect(lineAlpha(0.5, 1)).toBeCloseTo(0.5); // inner edge, half fill half line
	});

	it('cuts seams where a font’s contours meet', () => {
		// The fill covers most of the pixel, the stroke of an inner contour shows through.
		expect(lineAlpha(0.9, 1)).toBe(0);
		expect(lineAlpha(0.7, 1)).toBe(0);
	});

	it('paints the line in the outline colour', () => {
		const markup = outlineFilterMarkup('rgba(255, 255, 255, 0.92)');
		expect(markup).toContain('flood-color="rgba(255, 255, 255, 0.92)"');
		expect(markup).toContain('color-interpolation-filters="sRGB"');
		expect(markup).not.toMatch(/feMorphology|feGaussianBlur/);
	});

	it('gives equal colours one id and different colours different ids', () => {
		expect(outlineFilterId('#fff')).toBe(outlineFilterId(' #fff '));
		expect(outlineFilterId('#fff')).not.toBe(outlineFilterId('#ffe'));
		expect(outlineFilterId('#fff')).toMatch(/^vf-outline-[0-9a-z]+$/);
	});

	it('refuses colours that cannot go into an SVG attribute', () => {
		expect(() => outlineFilterId('var(--ink)')).toThrow(/plain CSS colour/);
		expect(() => outlineFilterId('red" onload="x')).toThrow(/plain CSS colour/);
		expect(() => outlineFilterId('')).toThrow(/plain CSS colour/);
	});

	it('adds each filter once, to one shared hidden svg', () => {
		expect(outlineFilter('#fff')).toBe(`url(#${outlineFilterId('#fff')})`);
		outlineFilter('#fff');
		outlineFilter('#000');
		const defs = document.querySelectorAll('svg#vf-outline-defs');
		expect(defs).toHaveLength(1);
		expect(defs[0].querySelectorAll('filter')).toHaveLength(2);
		expect(document.getElementById(outlineFilterId('#000'))?.tagName).toBe('filter');
	});
});

describe('outlineStyle', () => {
	it('outlines filled text with the stroke under the fill and no filter', () => {
		expect(outlineStyle({ width: 4, color: '#000', mode: 'filled' })).toEqual({
			'-webkit-text-stroke': 'calc(2 * 4px) #000',
			'paint-order': 'stroke fill'
		});
		expect(document.getElementById('vf-outline-defs')).toBeNull();
	});

	it('draws hollow text in channel colours and filters it', () => {
		const style = outlineStyle({ width: '0.014em', color: '#e8ecf8' });
		expect(style).toEqual({
			color: '#ff0000',
			'-webkit-text-fill-color': '#ff0000',
			'-webkit-text-stroke': 'calc(2 * 0.014em) #00ff00',
			'paint-order': 'stroke fill',
			filter: `url(#${outlineFilterId('#e8ecf8')})`
		});
	});

	it('refuses a width that is not positive', () => {
		expect(() => outlineStyle({ width: 0, color: '#fff' })).toThrow(/positive/);
		expect(() => outlineStyle({ width: Number.NaN, color: '#fff' })).toThrow(/positive/);
		expect(() => outlineStyle({ width: ' ', color: '#fff' })).toThrow(/positive/);
	});
});

describe('outline action', () => {
	it('sets the style on the element, updates and removes it', () => {
		const el = document.createElement('span');
		el.style.opacity = '0.7';
		document.body.appendChild(el);
		const action = outline(el, { width: 6, color: '#fff' });
		// jsdom keeps only the properties it knows: colour and filter.
		expect(el.style.color).not.toBe('');
		expect(el.style.filter).toBe(`url(#${outlineFilterId('#fff')})`);

		action.update({ width: 6, color: '#000', mode: 'filled' });
		expect(el.style.filter).toBe('');
		expect(el.style.color).toBe('');

		action.update({ width: 6, color: '#fff' });
		action.destroy();
		expect(el.style.filter).toBe('');
		expect(el.style.color).toBe('');
		expect(el.style.opacity).toBe('0.7');
	});
});
