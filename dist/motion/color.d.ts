/**
 * Colours for keyframes: parse CSS colours, mix them perceptually and write them back as sRGB.
 * Pure functions with no DOM access, so the same code runs in Node (resolve, check) and on the
 * stage. A colour is held in OKLab with straight alpha so values outside sRGB (a vivid `oklch()`)
 * survive until output, where they are gamut mapped by chroma reduction (CSS Color 4).
 */
/** The space two colours blend in: OKLab (default) or OKLCH along the shorter hue arc. */
export type ColorSpace = 'oklab' | 'oklch';
/** A colour in OKLab with straight (not premultiplied) alpha. */
export type Oklab = {
    l: number;
    a: number;
    b: number;
    alpha: number;
};
/** OKLCH: chroma `c`, hue `h` in degrees. */
export type Oklch = {
    l: number;
    c: number;
    h: number;
    alpha: number;
};
/** sRGB, gamma encoded, channels 0–1. */
export type Rgb = {
    r: number;
    g: number;
    b: number;
    alpha: number;
};
export declare const TRANSPARENT: Oklab;
export declare function srgbToOklab({ r, g, b, alpha }: Rgb): Oklab;
/** OKLab to sRGB without clamping: channels outside 0–1 mean the colour is outside sRGB. */
export declare function oklabToSrgb({ l, a, b, alpha }: Oklab): Rgb;
export declare function oklabToOklch({ l, a, b, alpha }: Oklab): Oklch;
export declare function oklchToOklab({ l, c, h, alpha }: Oklch): Oklab;
/** The sRGB colour closest to `color` with the same lightness and hue, by reducing chroma. */
export declare function gamutMapToSrgb(color: Oklab): Rgb;
/**
 * Mix two colours at `t` (0 = `from`, 1 = `to`; values outside 0–1 extrapolate, as overshooting
 * eases need) with premultiplied alpha, so a transparent end takes the other end's colour and only
 * fades. `oklch` takes the shorter hue arc; a grey end adopts the other end's hue.
 */
export declare function mixColors(from: Oklab, to: Oklab, t: number, space?: ColorSpace): Oklab;
/**
 * Signed degrees from angle `a` to angle `b` along the shorter arc, the way CSS "shorter" hue
 * interpolation picks it: both are taken to 0–360 first, and a half turn keeps the sign of that
 * difference (0 to 180 is +180, 180 to 0 is −180).
 */
export declare function shortestArc(a: number, b: number): number;
/** `rgb(r g b / a)` after gamut mapping; channels to 3 decimals, alpha to 4. */
export declare function formatColor(color: Oklab): string;
export type ColorOptions = {
    /** Colour space the two colours blend in. Default `oklab`. */
    space?: ColorSpace;
};
/** Mix two CSS colours and write the result as `rgb(r g b / a)`. */
export declare function interpolateColor(from: string, to: string, t: number, options?: ColorOptions): string;
/**
 * Parse a CSS colour: hex (3, 4, 6, 8 digits), `rgb()`/`rgba()` and `hsl()`/`hsla()` in comma or
 * space syntax, `oklab()`, `oklch()`, the CSS named colours and `transparent`.
 */
export declare function parseColor(input: string): Oklab;
/** Like `parseColor`, but `undefined` for text that is not a colour. */
export declare function tryParseColor(input: string): Oklab | undefined;
/** A CSS angle (`45deg`, `0.5turn`, `1.2rad`, `100grad`, or a plain number of degrees) in degrees. */
export declare function parseAngle(text: string): number | undefined;
/** Split at `separator` outside parentheses; `' '` splits on any run of whitespace. */
export declare function splitTopLevel(input: string, separator: ',' | ' '): string[];
/** Round to `digits` decimals and drop trailing zeros; never writes `-0`. */
export declare function formatNumber(value: number, digits: number): string;
