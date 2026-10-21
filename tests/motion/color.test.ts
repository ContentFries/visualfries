import { describe, expect, it } from 'vitest';
import {
	formatColor,
	interpolateColor,
	mixColors,
	oklabToOklch,
	oklabToSrgb,
	parseColor,
	shortestArc,
	srgbToOklab,
	type Oklab
} from '../../src/lib/motion/color.js';

const channels = (css: string) => css.match(/-?[\d.]+/g)!.map(Number);
const chroma = (c: Oklab) => Math.hypot(c.a, c.b);

describe('OKLab conversion', () => {
	// Published sRGB → OKLab values for the sRGB primaries, secondaries, grey, white and black.
	const reference: [string, number, number, number][] = [
		['#ff0000', 0.627955, 0.224863, 0.125846],
		['#00ff00', 0.86644, -0.233888, 0.179498],
		['#0000ff', 0.452014, -0.032457, -0.311528],
		['#ffff00', 0.967983, -0.071369, 0.19857],
		['#00ffff', 0.905399, -0.149444, -0.039398],
		['#ff00ff', 0.701674, 0.274566, -0.169156],
		['#808080', 0.599871, 0, 0],
		['#ffffff', 1, 0, 0],
		['#000000', 0, 0, 0]
	];

	it.each(reference)('%s matches the published OKLab value to 1e-4', (hex, l, a, b) => {
		const c = parseColor(hex);
		expect(Math.abs(c.l - l)).toBeLessThan(1e-4);
		expect(Math.abs(c.a - a)).toBeLessThan(1e-4);
		expect(Math.abs(c.b - b)).toBeLessThan(1e-4);
		expect(c.alpha).toBe(1);
	});

	it('red has the published OKLCH chroma and hue', () => {
		const lch = oklabToOklch(parseColor('red'));
		expect(lch.c).toBeCloseTo(0.25768, 4);
		expect(lch.h).toBeCloseTo(29.2339, 3);
	});

	it('round-trips sRGB through OKLab', () => {
		for (const rgb of [
			{ r: 0.2, g: 0.4, b: 0.6, alpha: 1 },
			{ r: 1, g: 0.5, b: 0, alpha: 0.3 },
			{ r: 0.01, g: 0.002, b: 0.9, alpha: 1 }
		]) {
			const back = oklabToSrgb(srgbToOklab(rgb));
			expect(back.r).toBeCloseTo(rgb.r, 12);
			expect(back.g).toBeCloseTo(rgb.g, 12);
			expect(back.b).toBeCloseTo(rgb.b, 12);
			expect(back.alpha).toBe(rgb.alpha);
		}
	});
});

describe('parseColor', () => {
	const red = 'rgb(255 0 0 / 1)';
	it.each([
		'#f00',
		'#f00f',
		'#ff0000',
		'#FF0000FF',
		'red',
		'RED',
		'rgb(255, 0, 0)',
		'rgba(255, 0, 0, 1)',
		'rgb(255 0 0)',
		'rgb(100% 0% 0% / 100%)',
		'rgba(255 0 0 / 1)',
		'hsl(0, 100%, 50%)',
		'hsla(360deg 100% 50% / 1)',
		'hsl(1turn 100% 50%)',
		'oklab(0.627955 0.224863 0.125846)',
		'oklab(62.7955% 56.2158% 31.4615%)',
		'oklch(0.627955 0.257683 29.2339)',
		'oklch(62.7955% 64.42% 29.2339deg)'
	])('%s is red', (input) => {
		const out = channels(formatColor(parseColor(input)));
		const want = channels(red);
		out.forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThan(0.05));
	});

	it('reads alpha in every syntax', () => {
		for (const input of [
			'#ff000080',
			'#f008',
			'rgba(255, 0, 0, 0.5)',
			'rgb(255 0 0 / 50%)',
			'hsl(0 100% 50% / 0.5)',
			'oklch(0.628 0.258 29.23 / 0.5)'
		]) {
			expect(parseColor(input).alpha).toBeCloseTo(0.5, 1);
		}
	});

	it('reads hsl with hue units and the named colours', () => {
		expect(formatColor(parseColor('hsl(210 60% 40%)'))).toBe('rgb(40.8 102 163.2 / 1)');
		expect(formatColor(parseColor(`hsl(${(7 * Math.PI) / 6}rad, 60%, 40%)`))).toBe(
			formatColor(parseColor('hsl(210deg 60% 40%)'))
		);
		expect(formatColor(parseColor('rebeccapurple'))).toBe('rgb(102 51 153 / 1)');
		expect(formatColor(parseColor('cornflowerblue'))).toBe('rgb(100 149 237 / 1)');
	});

	it('reads transparent as black with zero alpha', () => {
		expect(parseColor('transparent')).toEqual({ l: 0, a: 0, b: 0, alpha: 0 });
		expect(formatColor(parseColor('transparent'))).toBe('rgb(0 0 0 / 0)');
	});

	it('rejects text that is not a colour', () => {
		for (const input of ['#12', '#ggg', 'bluish', 'rgb(1, 2)', 'rgb(1 2 3 4)', 'lab(50 0 0)', '']) {
			expect(() => parseColor(input), input).toThrow(/Unknown colour/);
		}
	});
});

describe('mixColors', () => {
	it('red → blue midpoint keeps more chroma than the RGB midpoint (OKLCH)', () => {
		const rgbMid = parseColor('rgb(127.5 0 127.5)');
		const oklchMid = parseColor(interpolateColor('red', 'blue', 0.5, { space: 'oklch' }));
		expect(chroma(oklchMid)).toBeGreaterThan(chroma(rgbMid) + 0.02);
	});

	it('red → blue midpoint in OKLab is the straight line, lighter than the RGB midpoint', () => {
		const red = parseColor('red');
		const blue = parseColor('blue');
		const mid = mixColors(red, blue, 0.5, 'oklab');
		expect(mid.l).toBeCloseTo((red.l + blue.l) / 2, 12);
		expect(mid.a).toBeCloseTo((red.a + blue.a) / 2, 12);
		expect(mid.b).toBeCloseTo((red.b + blue.b) / 2, 12);
		expect(interpolateColor('red', 'blue', 0.5, { space: 'oklab' })).toBe(
			'rgb(140.362 83.033 162.308 / 1)'
		);
		// the RGB midpoint (128 0 128) is darker than both the average lightness and the OKLab mix
		expect(parseColor('rgb(127.5 0 127.5)').l).toBeLessThan(mid.l - 0.1);
		// OKLab trades chroma for even lightness here; OKLCH keeps it (test above)
		expect(chroma(mid)).toBeLessThan(chroma(parseColor('rgb(127.5 0 127.5)')));
	});

	it('mixes in OKLCH unless told otherwise', () => {
		const red = parseColor('red');
		const blue = parseColor('blue');
		expect(mixColors(red, blue, 0.5)).toEqual(mixColors(red, blue, 0.5, 'oklch'));
		expect(interpolateColor('red', 'blue', 0.5)).toBe(
			interpolateColor('red', 'blue', 0.5, { space: 'oklch' })
		);
	});

	it('mixes alpha premultiplied, so a transparent end only fades', () => {
		expect(interpolateColor('transparent', 'red', 0.5)).toBe('rgb(255 0 0 / 0.5)');
		expect(interpolateColor('rgb(0 0 255 / 0)', 'red', 0.25)).toBe('rgb(255 0 0 / 0.25)');
		expect(interpolateColor('red', 'transparent', 1)).toBe('rgb(0 0 0 / 0)');
		expect(interpolateColor('transparent', 'red', 0.5, { space: 'oklch' })).toBe(
			'rgb(255 0 0 / 0.5)'
		);
		// A transparent end's own hue does not count either.
		expect(interpolateColor('rgb(0 0 255 / 0)', 'red', 0.25, { space: 'oklch' })).toBe(
			'rgb(255 0 0 / 0.25)'
		);
		expect(interpolateColor('rgb(0 0 255 / 0)', 'red', 0.25, { space: 'oklab' })).toBe(
			'rgb(255 0 0 / 0.25)'
		);
		// Nearly transparent behaves like transparent: no hue of its own drags the mix.
		const near = parseColor(interpolateColor('rgb(0 0 255 / 0.000000001)', 'red', 0.25));
		const want = parseColor('rgb(255 0 0 / 0.25)');
		for (const k of ['l', 'a', 'b'] as const) expect(near[k]).toBeCloseTo(want[k], 4);
		// Equal alphas: the plain OKLCH mix.
		expect(interpolateColor('rgb(0 0 255 / 0.5)', 'rgb(255 0 0 / 0.5)', 0.5)).toBe(
			interpolateColor('blue', 'red', 0.5).replace('/ 1)', '/ 0.5)')
		);
	});

	it('OKLCH takes the shorter hue arc', () => {
		const red = oklabToOklch(parseColor('red'));
		const blue = oklabToOklch(parseColor('blue'));
		const mid = oklabToOklch(mixColors(parseColor('red'), parseColor('blue'), 0.5, 'oklch'));
		const expected = (red.h + shortestArc(red.h, blue.h) / 2 + 360) % 360;
		expect(mid.h).toBeCloseTo(expected, 6);
		expect(mid.h).toBeGreaterThan(300); // through magenta, not through green
		expect(shortestArc(350, 10)).toBe(20);
		expect(shortestArc(10, 350)).toBe(-20);
		// a half turn goes the way CSS "shorter" picks it: by the sign after both are taken to 0–360
		expect(shortestArc(0, 180)).toBe(180);
		expect(shortestArc(180, 0)).toBe(-180);
		expect(shortestArc(-90, 90)).toBe(-180);
		expect(shortestArc(90, 630)).toBe(180);
	});

	it('OKLCH keeps the chromatic hue when one end is grey', () => {
		const blue = oklabToOklch(parseColor('blue'));
		const mid = oklabToOklch(mixColors(parseColor('white'), parseColor('blue'), 0.5, 'oklch'));
		expect(mid.h).toBeCloseTo(blue.h, 6);
	});

	it('gamut maps out-of-sRGB colours by reducing chroma', () => {
		const vivid = parseColor('oklch(0.7 0.35 140)');
		const [r, g, b] = channels(formatColor(vivid));
		for (const v of [r, g, b]) expect(v).toBeGreaterThanOrEqual(0);
		for (const v of [r, g, b]) expect(v).toBeLessThanOrEqual(255);
		const mapped = oklabToOklch(parseColor(formatColor(vivid)));
		expect(mapped.c).toBeLessThan(0.35);
		expect(Math.abs(mapped.l - 0.7)).toBeLessThan(0.02);
		expect(Math.abs(shortestArc(mapped.h, 140))).toBeLessThan(3);
	});

	it('is pure: same inputs, same output, inputs untouched', () => {
		const a = Object.freeze(parseColor('#ff3366'));
		const b = Object.freeze(parseColor('oklch(0.6 0.2 250 / 0.4)'));
		const runs = Array.from({ length: 3 }, () => formatColor(mixColors(a, b, 0.37, 'oklch')));
		expect(new Set(runs).size).toBe(1);
	});
});
