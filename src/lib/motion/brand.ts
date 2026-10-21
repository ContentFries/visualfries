// Brand resolution and tokens. The brand file schema (`BrandShape`) lives in project.ts.
import type { Brand } from './project.js';

export type BrandColorRole = 'primary' | 'accent' | 'background' | 'surface' | 'text' | 'muted';

export type ResolvedBrand = {
	/** True when the project names no brand: built-in blocks then keep their original look. */
	neutral: boolean;
	name: string | null;
	colors: Record<BrandColorRole | 'onPrimary' | 'onAccent', string> & {
		extra: Record<string, string>;
	};
	/** CSS font-family values, ready for `font-family`. */
	fonts: { heading: string; body: string; mono: string };
	/** Logo URLs the page can load, null when the brand has none. */
	logo: {
		full: { light: string | null; dark: string | null };
		mark: { light: string | null; dark: string | null };
	};
	/** CSS length. */
	radius: string;
};

/**
 * The brand of a project that names none: the look of the built-in blocks and captions
 * (yellow accent, rose primary, near-black stage, white type, Anton headings, Inter body).
 */
export const NEUTRAL_BRAND: ResolvedBrand = {
	neutral: true,
	name: null,
	colors: {
		primary: '#f43f5e',
		accent: '#fbc42d',
		background: '#08090c',
		surface: '#12141b',
		text: '#ffffff',
		muted: '#c9ced8',
		onPrimary: '#ffffff',
		onAccent: '#111111',
		extra: {}
	},
	fonts: {
		heading: 'Anton, Impact, sans-serif',
		body: 'Inter, system-ui, sans-serif',
		mono: 'ui-monospace, Menlo, Consolas, monospace'
	},
	logo: { full: { light: null, dark: null }, mark: { light: null, dark: null } },
	radius: '12px'
};

const GENERIC = { heading: 'sans-serif', body: 'sans-serif', mono: 'monospace' } as const;

/**
 * Resolve a parsed brand file. `asset` maps a path from the brand (font or logo file) to a URL
 * the page can load.
 */
export function resolveBrand(brand: Brand, asset: (file: string) => string): ResolvedBrand {
	const c = brand.colors;
	const family = (role: keyof typeof GENERIC) => {
		const font = brand.fonts[role];
		return font ? `${JSON.stringify(font.family)}, ${GENERIC[role]}` : NEUTRAL_BRAND.fonts[role];
	};
	const logo = (v?: { light?: string; dark?: string }) => ({
		light: v?.light ? asset(v.light) : null,
		dark: v?.dark ? asset(v.dark) : null
	});
	return {
		neutral: false,
		name: brand.name ?? null,
		colors: {
			primary: c.primary,
			accent: c.accent,
			background: c.background,
			surface: c.surface,
			text: c.text,
			muted: c.muted,
			onPrimary: c.onPrimary ?? readableOn(c.primary, [c.text, c.background]),
			onAccent: c.onAccent ?? readableOn(c.accent, [c.text, c.background]),
			extra: { ...(c.extra ?? {}) }
		},
		fonts: { heading: family('heading'), body: family('body'), mono: family('mono') },
		logo: { full: logo(brand.logo?.full), mark: logo(brand.logo?.mark) },
		radius:
			brand.radius === undefined
				? NEUTRAL_BRAND.radius
				: typeof brand.radius === 'number'
					? `${brand.radius}px`
					: brand.radius
	};
}

/** CSS custom properties of a brand, set on every clip's root element. */
export function brandTokens(brand: ResolvedBrand): Record<string, string> {
	const c = brand.colors;
	const tokens: Record<string, string> = {
		'--brand-primary': c.primary,
		'--brand-accent': c.accent,
		'--brand-background': c.background,
		'--brand-surface': c.surface,
		'--brand-text': c.text,
		'--brand-muted': c.muted,
		'--brand-on-primary': c.onPrimary,
		'--brand-on-accent': c.onAccent,
		'--brand-font-heading': brand.fonts.heading,
		'--brand-font-body': brand.fonts.body,
		'--brand-font-mono': brand.fonts.mono,
		'--brand-radius': brand.radius
	};
	for (const [name, value] of Object.entries(c.extra)) tokens[`--brand-extra-${name}`] = value;
	for (const kind of ['full', 'mark'] as const)
		for (const variant of ['light', 'dark'] as const) {
			const url = brand.logo[kind][variant];
			if (url) tokens[`--brand-logo-${kind}-${variant}`] = `url(${JSON.stringify(url)})`;
		}
	return tokens;
}

// ---------------------------------------------------------------- colour helpers

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
const FUNC = /(?:rgba?|hsla?)\([^)]*\)/i;

/**
 * A plain colour for a value that may be a gradient: the gradient's first colour stop.
 * Plain colours come back unchanged.
 */
export function solidColor(value: string): string {
	if (!/gradient\(/i.test(value)) return value;
	const hex = HEX.exec(value);
	const fn = FUNC.exec(value);
	if (hex && (!fn || hex.index < fn.index)) return hex[0];
	return fn ? fn[0] : value;
}

/** [r, g, b] 0–255 of a hex or rgb()/rgba() colour (gradients use their first stop), else null. */
export function parseColor(value: string): [number, number, number] | null {
	const v = solidColor(value).trim().toLowerCase();
	if (v === 'white') return [255, 255, 255];
	if (v === 'black') return [0, 0, 0];
	let m = /^#([0-9a-f]{3,4})$/.exec(v);
	if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as [number, number, number];
	m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
	if (m) {
		const n = parseInt(m[1], 16);
		return [n >> 16, (n >> 8) & 255, n & 255];
	}
	m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(v);
	if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
	return null;
}

/**
 * `#rrggbb` for any colour `parseColor` reads (a gradient gives its first stop), so code that
 * mixes colours by hand can rely on one form. Other values come back as their solid colour.
 */
export function toHex(value: string): string {
	const rgb = parseColor(value);
	if (!rgb) return solidColor(value);
	return '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function luminance([r, g, b]: [number, number, number]): number {
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio of two colours (1–21); null when either cannot be parsed. */
export function contrast(a: string, b: string): number | null {
	const ca = parseColor(a);
	const cb = parseColor(b);
	if (!ca || !cb) return null;
	const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/**
 * Readable text colour on `background`: the candidate with the most contrast, or black or
 * white when no candidate reaches 4.5:1 (WCAG AA for body text).
 */
export function readableOn(background: string, candidates: string[]): string {
	let best: { color: string; ratio: number } | null = null;
	for (const color of candidates) {
		const ratio = contrast(color, background);
		if (ratio !== null && (!best || ratio > best.ratio)) best = { color: solidColor(color), ratio };
	}
	if (best && best.ratio >= 4.5) return best.color;
	const white = contrast('#ffffff', background);
	const black = contrast('#000000', background);
	if (white === null || black === null) return best?.color ?? '#ffffff';
	return white >= black ? '#ffffff' : '#000000';
}
