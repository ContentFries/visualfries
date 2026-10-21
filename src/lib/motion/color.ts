/**
 * Colours for keyframes: parse CSS colours, mix them perceptually and write them back as sRGB.
 * Pure functions with no DOM access, so the same code runs in Node (resolve, check) and on the
 * stage. A colour is held in OKLab with straight alpha so values outside sRGB (a vivid `oklch()`)
 * survive until output, where they are gamut mapped by chroma reduction (CSS Color 4).
 */

/** The space two colours blend in: OKLab (default) or OKLCH along the shorter hue arc. */
export type ColorSpace = 'oklab' | 'oklch';
/** A colour in OKLab with straight (not premultiplied) alpha. */
export type Oklab = { l: number; a: number; b: number; alpha: number };
/** OKLCH: chroma `c`, hue `h` in degrees. */
export type Oklch = { l: number; c: number; h: number; alpha: number };
/** sRGB, gamma encoded, channels 0–1. */
export type Rgb = { r: number; g: number; b: number; alpha: number };

export const TRANSPARENT: Oklab = Object.freeze({ l: 0, a: 0, b: 0, alpha: 0 });

/** Below this chroma a colour is grey and its hue carries no meaning (CSS "powerless" hue). */
const ACHROMATIC = 1e-4;
/** 100% of `a`, `b` in `oklab()` and of `C` in `oklch()`. */
const OK_PERCENT = 0.4;

// sRGB <-> OKLab. The forward matrices are the ones published with the OKLab definition
// (Björn Ottosson, 2020); the inverses are computed from them so a round trip is exact to
// floating point instead of to the 10 published digits.

type Matrix = [number, number, number][];

const RGB_TO_LMS: Matrix = [
	[0.4122214708, 0.5363325363, 0.0514459929],
	[0.2119034982, 0.6806995451, 0.1073969566],
	[0.0883024619, 0.2817188376, 0.6299787005]
];
const LMS_TO_LAB: Matrix = [
	[0.2104542553, 0.793617785, -0.0040720468],
	[1.9779984951, -2.428592205, 0.4505937099],
	[0.0259040371, 0.7827717662, -0.808675766]
];
const LMS_TO_RGB = invert(RGB_TO_LMS);
const LAB_TO_LMS = invert(LMS_TO_LAB);

function multiply(m: Matrix, [x, y, z]: number[]): [number, number, number] {
	return m.map(([p, q, r]) => p * x + q * y + r * z) as [number, number, number];
}

function invert([[a, b, c], [d, e, f], [g, h, i]]: Matrix): Matrix {
	const A = e * i - f * h;
	const B = f * g - d * i;
	const C = d * h - e * g;
	const det = a * A + b * B + c * C;
	return [
		[A / det, (c * h - b * i) / det, (b * f - c * e) / det],
		[B / det, (a * i - c * g) / det, (c * d - a * f) / det],
		[C / det, (b * g - a * h) / det, (a * e - b * d) / det]
	];
}

const linear = (c: number) => {
	const x = Math.abs(c);
	return x <= 0.04045 ? c / 12.92 : Math.sign(c) * ((x + 0.055) / 1.055) ** 2.4;
};
const gamma = (c: number) => {
	const x = Math.abs(c);
	return x > 0.0031308 ? Math.sign(c) * (1.055 * x ** (1 / 2.4) - 0.055) : 12.92 * c;
};

export function srgbToOklab({ r, g, b, alpha }: Rgb): Oklab {
	const lms = multiply(RGB_TO_LMS, [linear(r), linear(g), linear(b)]).map(Math.cbrt);
	const [l, a, bb] = multiply(LMS_TO_LAB, lms);
	return { l, a, b: bb, alpha };
}

/** OKLab to sRGB without clamping: channels outside 0–1 mean the colour is outside sRGB. */
export function oklabToSrgb({ l, a, b, alpha }: Oklab): Rgb {
	const lms = multiply(LAB_TO_LMS, [l, a, b]).map((v) => v ** 3);
	const [r, g, bb] = multiply(LMS_TO_RGB, lms).map(gamma);
	return { r, g, b: bb, alpha };
}

export function oklabToOklch({ l, a, b, alpha }: Oklab): Oklch {
	const c = Math.hypot(a, b);
	const h = c < ACHROMATIC ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
	return { l, c, h, alpha };
}

export function oklchToOklab({ l, c, h, alpha }: Oklch): Oklab {
	const rad = (h * Math.PI) / 180;
	return { l, a: c * Math.cos(rad), b: c * Math.sin(rad), alpha };
}

// Gamut mapping (CSS Color 4, "binary search gamut mapping with local MINDE").

const GAMUT_EPSILON = 1e-6;
const JND = 0.02;
const CHROMA_EPSILON = 0.0001;

const inGamut = ({ r, g, b }: Rgb) =>
	[r, g, b].every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);
const clip = ({ r, g, b, alpha }: Rgb): Rgb => ({
	r: clamp01(r),
	g: clamp01(g),
	b: clamp01(b),
	alpha
});
const deltaEOK = (x: Oklab, y: Oklab) => Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);

/** The sRGB colour closest to `color` with the same lightness and hue, by reducing chroma. */
export function gamutMapToSrgb(color: Oklab): Rgb {
	const rgb = oklabToSrgb(color);
	if (inGamut(rgb)) return clip(rgb);
	const { alpha } = color;
	if (color.l >= 1) return { r: 1, g: 1, b: 1, alpha };
	if (color.l <= 0) return { r: 0, g: 0, b: 0, alpha };
	const lch = oklabToOklch(color);
	let clipped = clip(rgb);
	if (deltaEOK(srgbToOklab(clipped), color) < JND) return clipped;
	let min = 0;
	let max = lch.c;
	let minInGamut = true;
	while (max - min > CHROMA_EPSILON) {
		const chroma = (min + max) / 2;
		const current = oklchToOklab({ ...lch, c: chroma });
		const currentRgb = oklabToSrgb(current);
		if (minInGamut && inGamut(currentRgb)) {
			min = chroma;
			continue;
		}
		clipped = clip(currentRgb);
		const e = deltaEOK(srgbToOklab(clipped), current);
		if (e < JND) {
			if (JND - e < CHROMA_EPSILON) return clipped;
			minInGamut = false;
			min = chroma;
		} else {
			max = chroma;
		}
	}
	return clipped;
}

// Mixing

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const mod360 = (x: number) => ((x % 360) + 360) % 360;

/**
 * Mix two colours at `t` (0 = `from`, 1 = `to`; values outside 0–1 extrapolate, as overshooting
 * eases need) with premultiplied alpha, so a transparent end takes the other end's colour and only
 * fades. `oklch` takes the shorter hue arc; a grey end adopts the other end's hue.
 */
export function mixColors(from: Oklab, to: Oklab, t: number, space: ColorSpace = 'oklab'): Oklab {
	const rawAlpha = lerp(from.alpha, to.alpha, t);
	const alpha = clamp01(rawAlpha);
	if (space === 'oklch') {
		const x = oklabToOklch(from);
		const y = oklabToOklch(to);
		const hx = x.c < ACHROMATIC ? y.h : x.h;
		const hy = y.c < ACHROMATIC ? x.h : y.h;
		const h = mod360(hx + shortestArc(hx, hy) * t);
		if (rawAlpha <= 0) {
			return oklchToOklab({ l: lerp(x.l, y.l, t), c: Math.max(0, lerp(x.c, y.c, t)), h, alpha });
		}
		const l = lerp(x.l * from.alpha, y.l * to.alpha, t) / rawAlpha;
		const c = Math.max(0, lerp(x.c * from.alpha, y.c * to.alpha, t) / rawAlpha);
		return oklchToOklab({ l, c, h, alpha });
	}
	if (rawAlpha <= 0) {
		return { l: lerp(from.l, to.l, t), a: lerp(from.a, to.a, t), b: lerp(from.b, to.b, t), alpha };
	}
	const mix = (p: number, q: number) => lerp(p * from.alpha, q * to.alpha, t) / rawAlpha;
	return { l: mix(from.l, to.l), a: mix(from.a, to.a), b: mix(from.b, to.b), alpha };
}

/**
 * Signed degrees from angle `a` to angle `b` along the shorter arc, the way CSS "shorter" hue
 * interpolation picks it: both are taken to 0–360 first, and a half turn keeps the sign of that
 * difference (0 to 180 is +180, 180 to 0 is −180).
 */
export function shortestArc(a: number, b: number): number {
	const d = mod360(b) - mod360(a);
	return d > 180 ? d - 360 : d < -180 ? d + 360 : d;
}

/** `rgb(r g b / a)` after gamut mapping; channels to 3 decimals, alpha to 4. */
export function formatColor(color: Oklab): string {
	const { r, g, b, alpha } = gamutMapToSrgb(color);
	const ch = (v: number) => formatNumber(v * 255, 3);
	return `rgb(${ch(r)} ${ch(g)} ${ch(b)} / ${formatNumber(clamp01(alpha), 4)})`;
}

export type ColorOptions = {
	/** Colour space the two colours blend in. Default `oklab`. */
	space?: ColorSpace;
};

/** Mix two CSS colours and write the result as `rgb(r g b / a)`. */
export function interpolateColor(
	from: string,
	to: string,
	t: number,
	options: ColorOptions = {}
): string {
	return formatColor(mixColors(parseColor(from), parseColor(to), t, options.space));
}

// Parsing

/**
 * Parse a CSS colour: hex (3, 4, 6, 8 digits), `rgb()`/`rgba()` and `hsl()`/`hsla()` in comma or
 * space syntax, `oklab()`, `oklch()`, the CSS named colours and `transparent`.
 */
export function parseColor(input: string): Oklab {
	const color = tryParseColor(input);
	if (!color) {
		throw new Error(
			`Unknown colour "${input}". Use hex (#ff3366), rgb(), hsl(), oklab(), oklch(), a CSS colour name or transparent.`
		);
	}
	return color;
}

/** Like `parseColor`, but `undefined` for text that is not a colour. */
export function tryParseColor(input: string): Oklab | undefined {
	const text = input.trim().toLowerCase();
	if (text === 'transparent') return { ...TRANSPARENT };
	if (text.startsWith('#')) return parseHex(text.slice(1));
	const named = NAMED_COLORS.get(text);
	if (named) return parseHex(named);
	const fn = /^([a-z]+)\((.*)\)$/s.exec(text);
	if (!fn) return undefined;
	const args = colorArgs(fn[2]);
	if (!args) return undefined;
	const [x, y, z] = args.channels;
	const alpha = args.alpha === undefined ? 1 : alphaValue(args.alpha);
	if (alpha === undefined) return undefined;
	switch (fn[1]) {
		case 'rgb':
		case 'rgba': {
			const rgb = [x, y, z].map((v) => channel(v, 255));
			if (rgb.some((v) => v === undefined)) return undefined;
			const [r, g, b] = rgb.map((v) => clamp01(v!));
			return srgbToOklab({ r, g, b, alpha });
		}
		case 'hsl':
		case 'hsla': {
			const h = parseAngle(x);
			const s = channel(y, 100);
			const l = channel(z, 100);
			if (h === undefined || s === undefined || l === undefined) return undefined;
			const [r, g, b] = hslToRgb(h, clamp01(s), clamp01(l));
			return srgbToOklab({ r, g, b, alpha });
		}
		case 'oklab': {
			const l = channel(x, 1);
			const a = channel(y, 1, OK_PERCENT);
			const b = channel(z, 1, OK_PERCENT);
			if (l === undefined || a === undefined || b === undefined) return undefined;
			return { l: clamp01(l), a, b, alpha };
		}
		case 'oklch': {
			const l = channel(x, 1);
			const c = channel(y, 1, OK_PERCENT);
			const h = parseAngle(z);
			if (l === undefined || c === undefined || h === undefined) return undefined;
			return oklchToOklab({ l: clamp01(l), c: Math.max(0, c), h, alpha });
		}
		default:
			return undefined;
	}
}

function parseHex(hex: string): Oklab | undefined {
	if (!/^[0-9a-f]+$/.test(hex) || ![3, 4, 6, 8].includes(hex.length)) return undefined;
	const digits = hex.length <= 4 ? [...hex].map((d) => d + d) : hex.match(/../g)!;
	const [r, g, b, a = 'ff'] = digits;
	const byte = (d: string) => parseInt(d, 16) / 255;
	return srgbToOklab({ r: byte(r), g: byte(g), b: byte(b), alpha: byte(a) });
}

/** The three channels and optional alpha of a colour function, in comma or space syntax. */
function colorArgs(body: string): { channels: string[]; alpha?: string } | undefined {
	const commas = splitTopLevel(body, ',');
	if (commas.length > 1) {
		if (commas.length < 3 || commas.length > 4) return undefined;
		return { channels: commas.slice(0, 3), alpha: commas[3] };
	}
	const slash = body.split('/');
	if (slash.length > 2) return undefined;
	const channels = splitTopLevel(slash[0], ' ');
	if (channels.length !== 3) return undefined;
	return { channels, alpha: slash[1]?.trim() };
}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/;

/** A plain number divided by `numberScale`, or a percentage of `percentScale`; `none` is 0. */
function channel(
	text: string | undefined,
	numberScale: number,
	percentScale = 1
): number | undefined {
	if (text === undefined) return undefined;
	const v = text.trim();
	if (v === 'none') return 0;
	if (v.endsWith('%')) {
		const p = v.slice(0, -1);
		return NUMBER.test(p) ? (Number(p) / 100) * percentScale : undefined;
	}
	return NUMBER.test(v) ? Number(v) / numberScale : undefined;
}

function alphaValue(text: string): number | undefined {
	const v = channel(text, 1);
	return v === undefined ? undefined : clamp01(v);
}

const ANGLE_UNITS: Record<string, number> = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };

/** A CSS angle (`45deg`, `0.5turn`, `1.2rad`, `100grad`, or a plain number of degrees) in degrees. */
export function parseAngle(text: string): number | undefined {
	const v = text.trim().toLowerCase();
	if (v === 'none') return 0;
	const m = /^(.*?)(deg|grad|rad|turn)?$/.exec(v);
	if (!m || !NUMBER.test(m[1])) return undefined;
	return Number(m[1]) * ANGLE_UNITS[m[2] ?? 'deg'];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const hue = ((h % 360) + 360) % 360;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + hue / 30) % 12;
		return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
	};
	return [f(0), f(8), f(4)];
}

// Shared text helpers

/** Split at `separator` outside parentheses; `' '` splits on any run of whitespace. */
export function splitTopLevel(input: string, separator: ',' | ' '): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const ch of input) {
		if (ch === '(') depth++;
		if (ch === ')') depth--;
		const split = depth === 0 && (separator === ' ' ? /\s/.test(ch) : ch === separator);
		if (split) {
			if (separator === ',' || current.trim()) parts.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}
	if (separator === ',' || current.trim()) parts.push(current.trim());
	return parts;
}

/** Round to `digits` decimals and drop trailing zeros; never writes `-0`. */
export function formatNumber(value: number, digits: number): string {
	const scale = 10 ** digits;
	const rounded = Math.round(value * scale) / scale;
	return String(rounded === 0 ? 0 : rounded);
}

const NAMED_COLORS = new Map(
	(
		'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff ' +
		'beige:f5f5dc bisque:ffe4c4 black:000000 blanchedalmond:ffebcd blue:0000ff ' +
		'blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 ' +
		'chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c ' +
		'cyan:00ffff darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 ' +
		'darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b darkmagenta:8b008b darkolivegreen:556b2f ' +
		'darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f ' +
		'darkslateblue:483d8b darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 ' +
		'darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dimgrey:696969 ' +
		'dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 fuchsia:ff00ff ' +
		'gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 green:008000 ' +
		'greenyellow:adff2f grey:808080 honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c ' +
		'indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5 ' +
		'lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff ' +
		'lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 lightgrey:d3d3d3 ' +
		'lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa ' +
		'lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 ' +
		'lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 ' +
		'mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db ' +
		'mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a ' +
		'mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa ' +
		'mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 oldlace:fdf5e6 ' +
		'olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 ' +
		'palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 ' +
		'papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 ' +
		'purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f royalblue:4169e1 ' +
		'saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee ' +
		'sienna:a0522d silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 ' +
		'slategrey:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 ' +
		'thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff ' +
		'whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32'
	)
		.split(' ')
		.map((entry) => entry.split(':') as [string, string])
);
