import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gsap } from 'gsap';
import { chromium, type Browser } from 'playwright';
import { findChromium } from '../../src/lib/motion/node.js';
import {
	formatColor,
	gamutMapToSrgb,
	mixColors,
	parseColor,
	srgbToOklab,
	type Oklab
} from '../../src/lib/motion/color.js';
import {
	createTrack,
	formatGradient,
	interpolate,
	interpolator,
	parseGradient,
	parseShadows,
	type AnimatableKind,
	type Gradient
} from '../../src/lib/motion/interpolate.js';

const NUM = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi;

/** Same text with every number within `tol` (colour channels are written to 3 decimals). */
function expectSameNumbers(actual: string, expected: string, tol = 0.02) {
	expect(actual.replace(NUM, '#')).toBe(expected.replace(NUM, '#'));
	const a = actual.match(NUM)?.map(Number) ?? [];
	const b = expected.match(NUM)?.map(Number) ?? [];
	a.forEach((v, i) => expect(Math.abs(v - b[i]), `${actual} vs ${expected}`).toBeLessThan(tol));
}

/** CSS's blend between two `rgb()` gradient stops: gamma-encoded sRGB, premultiplied alpha. */
function srgbBlend(from: Oklab, to: Oklab, t: number): Oklab {
	const x = gamutMapToSrgb(from);
	const y = gamutMapToSrgb(to);
	const alpha = x.alpha + (y.alpha - x.alpha) * t;
	const ch = (p: number, q: number) =>
		alpha ? (p * x.alpha + (q * y.alpha - p * x.alpha) * t) / alpha : p + (q - p) * t;
	return srgbToOklab({ r: ch(x.r, y.r), g: ch(x.g, y.g), b: ch(x.b, y.b), alpha });
}

/** The colour the browser draws at `p` of a parsed gradient, as a test-side oracle. */
function sample(g: Gradient, p: number): Oklab {
	const s = g.stops;
	if (p <= s[0].position.value) return s[0].color;
	for (let i = 0; i < s.length - 1; i++) {
		const a = s[i].position.value;
		const b = s[i + 1].position.value;
		if (p >= a && p < b) return srgbBlend(s[i].color, s[i + 1].color, (p - a) / (b - a));
	}
	return s[s.length - 1].color;
}

const stopsOf = (css: string) =>
	parseGradient(css).stops.map((s) => [formatColor(s.color), s.position.value]);

describe('numbers and lengths', () => {
	it('lerps numbers and px lengths', () => {
		expect(interpolate('number', 2, 4, 0.25)).toBe(2.5);
		expect(interpolate('number', 0, 10, 1.2)).toBe(12); // overshooting eases extrapolate
		expect(interpolate('length', 10, 20, 0.5)).toBe(15);
		expect(interpolate('length', '10px', 20, 0.5)).toBe('15px');
	});

	it('keeps %, lets 0 take either unit and rejects mixed units', () => {
		expect(interpolate('length', '10%', '-30%', 0.5)).toBe('-10%');
		expect(interpolate('length', 0, '50%', 0.5)).toBe('25%');
		expect(() => interpolate('length', 10, '50%', 0.5)).toThrow(/same unit \(px or %\)/);
		expect(() => interpolate('length', '2em', '3em', 0.5)).toThrow(/Unknown length/);
		expect(() => interpolate('number', '2', 3, 0.5)).toThrow(/finite number/);
	});
});

describe('createTrack', () => {
	const linear = [
		{ frame: 10, value: 0 },
		{ frame: 20, value: 100, ease: 'none' },
		{ frame: 30, value: 0, ease: 'none' }
	];

	it('holds before the first key and after the last', () => {
		const track = createTrack('number', linear);
		expect(track(-5)).toBe(0);
		expect(track(10)).toBe(0);
		expect(track(15)).toBe(50);
		expect(track(20)).toBe(100);
		expect(track(25)).toBe(50);
		expect(track(30)).toBe(0);
		expect(track(99)).toBe(0);
	});

	it("uses the arriving key's ease, else the track's, else the default", () => {
		const power = gsap.parseEase('power3.in');
		const keyed = createTrack('number', [
			{ frame: 0, value: 0 },
			{ frame: 10, value: 1, ease: 'power3.in' }
		]);
		expect(keyed(4)).toBeCloseTo(power(0.4), 12);
		const trackEase = createTrack(
			'number',
			[
				{ frame: 0, value: 0 },
				{ frame: 10, value: 1 }
			],
			{ ease: 'none' }
		);
		expect(trackEase(4)).toBeCloseTo(0.4, 12);
		const fallback = createTrack('number', [
			{ frame: 0, value: 0 },
			{ frame: 10, value: 1 }
		]);
		expect(fallback(4)).toBeCloseTo(gsap.parseEase('power2.inOut')(0.4), 12);
	});

	it('sorts keys and treats two keys on one frame as a jump', () => {
		const track = createTrack('number', [
			{ frame: 20, value: 5, ease: 'none' },
			{ frame: 10, value: 0 },
			{ frame: 10, value: 1 }
		]);
		expect(track(9)).toBe(0);
		expect(track(10)).toBe(1);
		expect(track(15)).toBe(3);
	});

	it('allows a jump between values that cannot mix', () => {
		const track = createTrack('gradient', [
			{ frame: 0, value: 'linear-gradient(red, blue)' },
			{ frame: 0, value: 'radial-gradient(red, blue)' }
		]);
		expect(track(0)).toMatch(/^radial-gradient/);
	});

	it('uses the arriving key colour space for colours', () => {
		const track = createTrack(
			'color',
			[
				{ frame: 0, value: 'red' },
				{ frame: 10, value: 'blue', space: 'oklch' }
			],
			{ ease: 'none' }
		);
		expect(track(5)).toBe(
			formatColor(mixColors(parseColor('red'), parseColor('blue'), 0.5, 'oklch'))
		);
	});

	it('reports bad keys when the track is built', () => {
		expect(() => createTrack('number', [])).toThrow(/at least one key/);
		expect(() => createTrack('color', [{ frame: 0, value: 'bluish' }], { name: 'accent' })).toThrow(
			/Keys of "accent": key 1: Unknown colour "bluish"/
		);
		expect(() =>
			createTrack('number', [
				{ frame: 0, value: 0 },
				{ frame: 5, value: 1, ease: 'wobble' }
			])
		).toThrow(/key 1 to 2: Unknown ease "wobble"/);
		expect(() =>
			createTrack('gradient', [
				{ frame: 0, value: 'linear-gradient(red, blue)' },
				{ frame: 5, value: 'radial-gradient(red, blue)' }
			])
		).toThrow(/linear-gradient into a radial-gradient/);
		expect(() => createTrack('size' as AnimatableKind, [{ frame: 0, value: 1 }])).toThrow(
			/Unknown animatable kind/
		);
	});

	it('gives the same frame the same value whatever the visiting order', () => {
		const make = () =>
			createTrack('gradient', [
				{ frame: 0, value: 'red' },
				{
					frame: 12,
					value: 'linear-gradient(45deg, #ff3366, gold 40%, teal)',
					ease: 'back.out(2)'
				},
				{ frame: 30, value: 'linear-gradient(300deg, navy, white)', space: 'oklch' }
			]);
		const frames = Array.from({ length: 36 }, (_, i) => i - 2.5);
		const forward = frames.map(make());
		const track = make();
		const reverse = [...frames].reverse().map(track).reverse();
		expect(reverse).toEqual(forward);
	});
});

describe('gradients', () => {
	it('parses directions, shapes and stops the way CSS fills them in', () => {
		expect(parseGradient('linear-gradient(red, lime, blue)')).toMatchObject({
			type: 'linear',
			direction: { to: 'bottom' }
		});
		expect(stopsOf('linear-gradient(red, lime, blue)').map((s) => s[1])).toEqual([0, 50, 100]);
		expect(stopsOf('linear-gradient(red 20%, lime, blue 10%, white)').map((s) => s[1])).toEqual([
			20, 20, 20, 100
		]);
		expect(stopsOf('linear-gradient(red 0 40%, blue)').map((s) => s[1])).toEqual([0, 40, 100]);
		expect(parseGradient('linear-gradient(to right top, red, blue)').direction).toEqual({
			to: 'top right'
		});
		expect(parseGradient('linear-gradient(0.25turn, red, blue)').direction).toEqual({ angle: 90 });
		expect(formatGradient(parseGradient('radial-gradient(circle at top left, red, blue)'))).toBe(
			'radial-gradient(circle farthest-corner at 0% 0%, rgb(255 0 0 / 1) 0%, rgb(0 0 255 / 1) 100%)'
		);
		expect(
			formatGradient(parseGradient('radial-gradient(40px 20% at 30% bottom, red, blue)'))
		).toMatch(/^radial-gradient\(ellipse 40px 20% at 30% 100%,/);
	});

	it('rejects what it cannot keyframe', () => {
		expect(() => parseGradient('conic-gradient(red, blue)')).toThrow(/Unsupported gradient/);
		expect(() => parseGradient('linear-gradient(45, red, blue)')).toThrow(/unknown direction/);
		expect(() => parseGradient('linear-gradient(red, 30%, blue)')).toThrow(/colour hints/);
		expect(() => parseGradient('linear-gradient(red 10px, blue 50%)')).toThrow(/mixes px and %/);
		expect(() => parseGradient('linear-gradient(in oklab, red, blue)')).toThrow(/not supported/);
	});

	it('aligns a 2-stop gradient with a 3-stop one at its stop positions', () => {
		const from = 'linear-gradient(90deg, red, blue)';
		const to = 'linear-gradient(90deg, white, lime 50%, black)';
		const start = stopsOf(interpolate('gradient', from, to, 0));
		expect(start.map((s) => s[1])).toEqual([0, 50, 100]);
		// the added stop is what the browser draws there (sRGB), so the key frame looks the same
		expect(start[1][0]).toBe('rgb(127.5 0 127.5 / 1)');
		expectSameNumbers(interpolate('gradient', to, from, 1), interpolate('gradient', from, to, 0));
		expectSameNumbers(
			interpolate('gradient', from, to, 1),
			'linear-gradient(90deg, rgb(255 255 255 / 1) 0%, rgb(0 255 0 / 1) 50%, rgb(0 0 0 / 1) 100%)'
		);
		const mid = stopsOf(interpolate('gradient', from, to, 0.5));
		expect(mid[1][0]).toBe(
			formatColor(mixColors(parseColor('rgb(127.5 0 127.5)'), parseColor('lime'), 0.5))
		);
	});

	it('keeps both looks when the stop positions do not line up', () => {
		const from = 'linear-gradient(red 0%, blue 30%)';
		const to = 'linear-gradient(white, lime 50%, black)';
		const start = interpolate('gradient', from, to, 0);
		expect(stopsOf(start).map((s) => s[1])).toEqual([0, 30, 50, 100]);
		expectSamePaint(start, from);
	});

	it('pairs equal stop counts and moves their positions', () => {
		const out = interpolate(
			'gradient',
			'linear-gradient(red 10%, blue 20%)',
			'linear-gradient(red 50%, blue 90%)',
			0.5
		);
		expect(stopsOf(out).map((s) => s[1])).toEqual([30, 55]);
	});

	it('turns a solid colour into a gradient of the other end', () => {
		const radial = 'radial-gradient(circle 30px at 20% 80%, red, gold 40%, blue)';
		const start = interpolate('gradient', 'white', radial, 0);
		expect(start).toBe(
			'radial-gradient(circle 30px at 20% 80%, rgb(255 255 255 / 1) 0%, rgb(255 255 255 / 1) 40%, rgb(255 255 255 / 1) 100%)'
		);
		expect(interpolate('gradient', radial, 'transparent', 1)).toMatch(
			/^radial-gradient\(circle 30px at 20% 80%, rgb\(0 0 0 \/ 0\) 0%,/
		);
		expect(interpolate('gradient', 'red', 'blue', 0.5)).toBe('rgb(140.362 83.033 162.308 / 1)');
	});

	it('turns the angle along the shorter path', () => {
		const angle = (css: string) => parseGradient(css).direction;
		const g = (a: string) => `linear-gradient(${a}, red, blue)`;
		expect(angle(interpolate('gradient', g('350deg'), g('10deg'), 0.5))).toEqual({ angle: 0 });
		expect(angle(interpolate('gradient', g('10deg'), g('350deg'), 0.25))).toEqual({ angle: 5 });
		expect(angle(interpolate('gradient', g('to right'), g('to bottom'), 0.5))).toEqual({
			angle: 135
		});
		expect(angle(interpolate('gradient', g('to top right'), g('to top right'), 0.5))).toEqual({
			to: 'top right'
		});
		// corners depend on the box: 16:9 puts "to top right" at atan(9/16)
		const wide = interpolate('gradient', g('to top right'), g('90deg'), 0, {
			box: { width: 16, height: 9 }
		});
		expect((angle(wide) as { angle: number }).angle).toBeCloseTo(29.3578, 3);
		// without a box a corner has no angle, so the pair is refused instead of guessed
		expect(() => interpolate('gradient', g('to top right'), g('90deg'), 0.5)).toThrow(
			/depends on the box it is drawn in/
		);
		// a half turn goes clockwise from the smaller angle, like CSS "shorter" hues
		expect(angle(interpolate('gradient', g('0deg'), g('180deg'), 0.5))).toEqual({ angle: 90 });
		expect(angle(interpolate('gradient', g('180deg'), g('0deg'), 0.5))).toEqual({ angle: 90 });
	});

	it('moves radial geometry and refuses a shape or type change', () => {
		const out = interpolate(
			'gradient',
			'radial-gradient(circle 10px at 0% 0%, red, blue)',
			'radial-gradient(circle 30px at 100% 50%, red, blue)',
			0.5
		);
		expect(out).toMatch(/^radial-gradient\(circle 20px at 50% 25%,/);
		expect(() =>
			interpolate(
				'gradient',
				'radial-gradient(circle, red, blue)',
				'radial-gradient(red, blue)',
				0.5
			)
		).toThrow(/circle radial gradient into a ellipse/);
		expect(() =>
			interpolate('gradient', 'linear-gradient(red, blue)', 'radial-gradient(red, blue)', 0.5)
		).toThrow(/Cannot interpolate a linear-gradient into a radial-gradient/);
	});
});

describe('gradient keys in Chromium', () => {
	let browser: Browser | undefined;
	beforeAll(async () => {
		browser = await chromium.launch({ executablePath: findChromium() }).catch(() => undefined);
	});
	afterAll(() => browser?.close());

	const SIZE = 100;
	const GRID = [5, 25, 40, 50, 60, 75, 95];

	/** RGBA at a grid of points of each background, drawn the way a block's stage draws them. */
	async function pixels(backgrounds: string[]): Promise<number[][]> {
		const page = await browser!.newPage({
			viewport: { width: SIZE, height: SIZE * backgrounds.length },
			deviceScaleFactor: 1
		});
		const boxes = backgrounds
			.map((bg) => `<div style="width:${SIZE}px;height:${SIZE}px;background:${bg}"></div>`)
			.join('');
		await page.setContent(`<body style="margin:0;background:#fff">${boxes}</body>`);
		const png = (await page.screenshot()).toString('base64');
		const data = await page.evaluate(
			async ({ png, size, count, grid }) => {
				const img = new Image();
				img.src = `data:image/png;base64,${png}`;
				await img.decode();
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size * count;
				const ctx = canvas.getContext('2d')!;
				ctx.drawImage(img, 0, 0);
				return Array.from({ length: count }, (_, i) =>
					grid.flatMap((y) =>
						grid.flatMap((x) => Array.from(ctx.getImageData(x, i * size + y, 1, 1).data))
					)
				);
			},
			{ png, size: SIZE, count: backgrounds.length, grid: GRID }
		);
		await page.close();
		return data;
	}

	// A segment starts from the previous key aligned to the next one; that aligned gradient must
	// draw the same pixels as the key itself, or the gradient jumps on the segment's first frame.
	const pairs: [string, string][] = [
		['linear-gradient(90deg, red, blue)', 'linear-gradient(90deg, white, lime 50%, black)'],
		['linear-gradient(90deg, red 0%, blue 30%)', 'linear-gradient(90deg, white, lime 50%, black)'],
		[
			'linear-gradient(90deg, rgb(0 0 255 / 0), red)',
			'linear-gradient(90deg, white, lime 25%, gold 70%, black)'
		],
		[
			'linear-gradient(45deg, oklch(0.7 0.35 145), #3366ff)',
			'linear-gradient(45deg, red, white, red)'
		],
		[
			'radial-gradient(circle 60px at 40% 50%, tomato, navy)',
			'radial-gradient(circle 60px at 40% 50%, white 10%, teal 35%, black)'
		]
	];

	it('draws the aligned key exactly like the key', async (ctx) => {
		if (!browser) ctx.skip();
		const keys: string[] = [];
		const aligned: string[] = [];
		for (const [a, b] of pairs) {
			for (const [from, to] of [
				[a, b],
				[b, a]
			]) {
				const track = createTrack('gradient', [
					{ frame: 0, value: from },
					{ frame: 10, value: to }
				]);
				keys.push(track(-1));
				aligned.push(track(0));
			}
		}
		expect(aligned).not.toEqual(keys); // the alignment did add stops
		const [want, got] = [await pixels(keys), await pixels(aligned)];
		want.forEach((w, i) => {
			const worst = Math.max(...w.map((v, k) => Math.abs(v - got[i][k])));
			// 2 levels leave room for Skia's gradient dithering and 3-decimal rounding
			expect(worst, `${keys[i]} vs ${aligned[i]}`).toBeLessThanOrEqual(2);
		});
	});
});

describe('shadows', () => {
	it('pads the shorter list with transparent zero shadows', () => {
		const from = '0 4px 10px rgba(0, 0, 0, 0.5)';
		const to = '0 0 20px 2px red, 2px 2px 0 #fff';
		expect(interpolate('shadow', from, to, 0)).toBe(
			'0px 4px 10px 0px rgb(0 0 0 / 0.5), 0px 0px 0px rgb(0 0 0 / 0)'
		);
		expect(interpolate('shadow', from, to, 0.5)).toBe(
			'0px 2px 15px 1px rgb(148.036 0 0 / 0.75), 1px 1px 0px rgb(255 255 255 / 0.5)'
		);
		expect(interpolate('shadow', from, to, 1)).toBe(
			'0px 0px 20px 2px rgb(255 0 0 / 1), 2px 2px 0px rgb(255 255 255 / 1)'
		);
	});

	it('fades a glow in from none and keeps inset shadows inset', () => {
		expect(interpolate('shadow', 'none', 'inset 0 0 8px gold', 0.5)).toBe(
			'inset 0px 0px 4px rgb(255 215 0 / 0.5)'
		);
		expect(interpolate('shadow', 'none', 'none', 0.5)).toBe('none');
	});

	it('never blurs below zero when an ease overshoots', () => {
		expect(interpolate('shadow', '0 0 0 red', '0 0 10px red', -0.5)).toMatch(/^0px 0px 0px /);
	});

	it('rejects shadows it cannot pair', () => {
		expect(() => interpolate('shadow', 'inset 0 0 4px red', '0 0 4px red', 0.5)).toThrow(
			/inset and the other is not/
		);
		expect(() => parseShadows('0 0 4px')).toThrow(/needs a colour/);
		expect(() => parseShadows('0 red')).toThrow(/two to four lengths/);
		expect(() => parseShadows('0 0 1em red')).toThrow(/Lengths are px/);
		expect(() => parseShadows('0 0 -4px red')).toThrow(/blur radius cannot be negative/);
	});
});

// Property tests: random values of every kind, from a seeded generator so failures reproduce.

function rng(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
		return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
	};
}

const random = rng(20261020);
const int = (n: number) => Math.floor(random() * n);
const pick = <T>(list: T[]) => list[int(list.length)];

function randomColor(): string {
	const a = Math.round(random() * 100) / 100;
	return pick([
		() => `#${int(0xffffff).toString(16).padStart(6, '0')}`,
		() => `rgb(${int(256)} ${int(256)} ${int(256)} / ${a})`,
		() => `hsl(${int(360)}, ${int(101)}%, ${int(101)}%)`,
		() => `oklch(${random().toFixed(3)} ${(random() * 0.37).toFixed(3)} ${int(360)})`,
		() => pick(['transparent', 'tomato', 'navy', 'white', 'black'])
	])();
}

function randomStops(): string {
	const n = 1 + int(5);
	const positions = Array.from({ length: n }, () => int(101)).sort((x, y) => x - y);
	return positions.map((p) => `${randomColor()} ${p}%`).join(', ');
}

function randomGradientPair(): [string, string] {
	const type = pick(['linear', 'radial']);
	const one = () =>
		random() < 0.2
			? randomColor()
			: type === 'linear'
				? `linear-gradient(${int(720) - 360}deg, ${randomStops()})`
				: `radial-gradient(circle ${int(200)}px at ${int(101)}% ${int(101)}%, ${randomStops()})`;
	return [one(), one()];
}

function randomShadows(): string {
	const n = int(4);
	if (!n) return 'none';
	return Array.from(
		{ length: n },
		(_, i) =>
			`${i % 2 ? 'inset ' : ''}${int(41) - 20}px ${int(41) - 20}px ${int(30)}px ${randomColor()}`
	).join(', ');
}

/** Visual equality of two paints (colour or gradient): geometry text plus colours along the line. */
function expectSamePaint(actual: string, expected: string) {
	if (!/gradient/.test(actual)) return expectSameNumbers(actual, formatColor(parseColor(expected)));
	const a = parseGradient(actual);
	const e = /gradient/.test(expected) ? parseGradient(expected) : undefined;
	if (!e) {
		for (const s of a.stops)
			expectSameNumbers(formatColor(s.color), formatColor(parseColor(expected)));
		return;
	}
	if (
		a.type === 'linear' &&
		e.type === 'linear' &&
		'angle' in a.direction &&
		'angle' in e.direction
	) {
		const diff = (((a.direction.angle - e.direction.angle) % 360) + 360) % 360;
		expect(Math.min(diff, 360 - diff)).toBeLessThan(1e-3);
	}
	// Every stop of the expected gradient is kept, and every stop the alignment added carries the
	// expected gradient's own colour at that position. Between stops both are drawn the same way.
	const positions = new Set(a.stops.map((s) => s.position.value));
	for (const s of e.stops) expect(positions.has(s.position.value), actual).toBe(true);
	const seen = new Map<number, number>();
	for (const stop of a.stops) {
		const p = stop.position.value;
		const own = e.stops.filter((s) => s.position.value === p);
		const k = seen.get(p) ?? 0;
		seen.set(p, k + 1);
		const want = own.length ? own[Math.min(k, own.length - 1)].color : sample(e, p);
		expectSameNumbers(formatColor(stop.color), formatColor(want));
	}
}

/** Shadow lists equal once the transparent zero shadows used as padding are dropped. */
function expectSameShadows(actual: string, expected: string) {
	const visible = (css: string) =>
		parseShadows(css)
			.filter((s) => s.color.alpha > 0 || s.x.value || s.y.value || s.blur.value || s.spread?.value)
			.map((s) => ({ ...s, spread: s.spread?.value ? s.spread : undefined }));
	const a = visible(actual);
	const e = visible(expected);
	expect(a.length).toBe(e.length);
	a.forEach((s, i) => {
		expect(s.inset).toBe(e[i].inset);
		for (const k of ['x', 'y', 'blur'] as const) expect(s[k].value).toBeCloseTo(e[i][k].value, 3);
		if (s.color.alpha || e[i].color.alpha) {
			expectSameNumbers(formatColor(s.color), formatColor(e[i].color));
		}
	});
}

describe('properties', () => {
	const runs = 150;

	it('returns the ends at t = 0 and t = 1 for every kind', () => {
		for (let i = 0; i < runs; i++) {
			const a = random() * 2000 - 1000;
			const b = random() * 2000 - 1000;
			expect(interpolate('number', a, b, 0)).toBe(a);
			expect(interpolate('number', a, b, 1)).toBeCloseTo(b, 9);
			expect(interpolate('length', `${a}%`, `${b}%`, 0)).toBe(`${Math.round(a * 1e4) / 1e4}%`);

			const [ca, cb] = [randomColor(), randomColor()];
			for (const space of ['oklab', 'oklch'] as const) {
				expectSameNumbers(interpolate('color', ca, cb, 0, { space }), formatColor(parseColor(ca)));
				expectSameNumbers(interpolate('color', ca, cb, 1, { space }), formatColor(parseColor(cb)));
			}

			const [ga, gb] = randomGradientPair();
			expectSamePaint(interpolate('gradient', ga, gb, 0), ga);
			expectSamePaint(interpolate('gradient', ga, gb, 1), gb);

			// inset alternates by index in both lists, so every pair agrees
			const [sa, sb] = [randomShadows(), randomShadows()];
			expectSameShadows(interpolate('shadow', sa, sb, 0), sa);
			expectSameShadows(interpolate('shadow', sa, sb, 1), sb);
		}
	});

	it('is deterministic: same inputs, same output', () => {
		for (let i = 0; i < runs; i++) {
			const [ga, gb] = randomGradientPair();
			const t = random() * 1.4 - 0.2;
			const space = pick(['oklab', 'oklch'] as const);
			const once = interpolator('gradient', ga, gb, { space })(t);
			expect(interpolator('gradient', ga, gb, { space })(t)).toBe(once);
			expect(interpolate('gradient', ga, gb, t, { space })).toBe(once);
		}
	});
});
