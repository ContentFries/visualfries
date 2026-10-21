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
    fonts: {
        heading: string;
        body: string;
        mono: string;
    };
    /** Logo URLs the page can load, null when the brand has none. */
    logo: {
        full: {
            light: string | null;
            dark: string | null;
        };
        mark: {
            light: string | null;
            dark: string | null;
        };
    };
    /** CSS length. */
    radius: string;
};
/**
 * The brand of a project that names none: the look of the built-in blocks and captions
 * (yellow accent, rose primary, near-black stage, white type, Anton headings, Inter body).
 */
export declare const NEUTRAL_BRAND: ResolvedBrand;
/**
 * Resolve a parsed brand file. `asset` maps a path from the brand (font or logo file) to a URL
 * the page can load.
 */
export declare function resolveBrand(brand: Brand, asset: (file: string) => string): ResolvedBrand;
/** CSS custom properties of a brand, set on every clip's root element. */
export declare function brandTokens(brand: ResolvedBrand): Record<string, string>;
/**
 * A plain colour for a value that may be a gradient: the gradient's first colour stop.
 * Plain colours come back unchanged.
 */
export declare function solidColor(value: string): string;
/** [r, g, b] 0–255 of a hex or rgb()/rgba() colour (gradients use their first stop), else null. */
export declare function parseColor(value: string): [number, number, number] | null;
/**
 * `#rrggbb` for any colour `parseColor` reads (a gradient gives its first stop), so code that
 * mixes colours by hand can rely on one form. Other values come back as their solid colour.
 */
export declare function toHex(value: string): string;
/** WCAG contrast ratio of two colours (1–21); null when either cannot be parsed. */
export declare function contrast(a: string, b: string): number | null;
/**
 * Readable text colour on `background`: the candidate with the most contrast, or black or
 * white when no candidate reaches 4.5:1 (WCAG AA for body text).
 */
export declare function readableOn(background: string, candidates: string[]): string;
