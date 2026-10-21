import { type ColorSpace, type Oklab } from './color.js';
/**
 * Keyframe interpolation: numbers, lengths, colours, gradients and shadows. Pure functions with
 * no DOM access (Node and browser). GSAP provides the ease curves; this module mixes the values,
 * because colours blend in OKLab and gradients and shadows have to be aligned before they mix.
 */
/** What a keyframed value is, as a block declares it in `animatable`. */
export type AnimatableKind = 'number' | 'length' | 'color' | 'gradient' | 'shadow';
/** The value a track of each kind produces. */
export type AnimatableValue = {
    number: number;
    length: number | string;
    color: string;
    gradient: string;
    shadow: string;
};
export type InterpolateOptions = {
    /** Colour space for colours, gradient stops and shadow colours. Default `oklab`. */
    mix?: ColorSpace;
    /** Box a gradient is drawn in; corner directions (`to top right`) depend on its aspect. Default square. */
    box?: {
        width: number;
        height: number;
    };
};
/** Ease used for a key without `ease` when the track sets none. */
export declare const DEFAULT_EASE = "power2.inOut";
/** A GSAP ease by name (`power2.out`, `back.out(1.7)`, `none`); throws for unknown names. */
export declare function resolveEase(name: string): (x: number) => number;
export type LengthUnit = 'px' | '%';
export type Length = {
    value: number;
    unit: LengthUnit;
};
/** A length: a number (px), `"12px"` or `"50%"`. A unitless string is only allowed for 0. */
export declare function parseLength(input: number | string): Length;
export declare function formatLength({ value, unit }: Length): string;
export type GradientStop = {
    color: Oklab;
    position: Length;
};
/** `angle` in degrees, or a side or corner keyword (`top`, `top right`). */
export type LinearDirection = {
    angle: number;
} | {
    to: string;
};
export type RadialSize = {
    keyword: 'closest-side' | 'closest-corner' | 'farthest-side' | 'farthest-corner';
} | {
    lengths: Length[];
};
export type LinearGradient = {
    type: 'linear';
    direction: LinearDirection;
    stops: GradientStop[];
};
export type RadialGradient = {
    type: 'radial';
    shape: 'circle' | 'ellipse';
    size: RadialSize;
    position: [Length, Length];
    stops: GradientStop[];
};
export type Gradient = LinearGradient | RadialGradient;
/** True for text that looks like a gradient function (any kind, supported or not). */
export declare function isGradient(input: string): boolean;
/**
 * Parse `linear-gradient()` (angle or `to` side/corner) or `radial-gradient()` (shape, size,
 * `at` position) with colour stops that have zero, one or two positions in px or %.
 * Missing positions are filled in the way CSS does.
 */
export declare function parseGradient(input: string): Gradient;
/** CSS text for a gradient, colours as `rgb(r g b / a)` and every stop position written out. */
export declare function formatGradient(gradient: Gradient): string;
export type Shadow = {
    inset: boolean;
    x: Length;
    y: Length;
    blur: Length;
    /** Absent for `text-shadow` and for box shadows written without one. */
    spread?: Length;
    color: Oklab;
};
/**
 * Parse a `box-shadow` or `text-shadow` list: per shadow optional `inset`, two to four px lengths
 * (x, y, blur, spread) and a colour. `none` is the empty list.
 */
export declare function parseShadows(input: string): Shadow[];
export declare function formatShadows(shadows: Shadow[]): string;
/**
 * Align two values of one kind once and return the mixer for progress `t` (0 = `from`,
 * 1 = `to`). Throws when the ends cannot be aligned (units, gradient types, inset shadows).
 */
export declare function interpolator<K extends AnimatableKind>(kind: K, from: unknown, to: unknown, options?: InterpolateOptions): (t: number) => AnimatableValue[K];
/** One-off `interpolator(kind, from, to, options)(t)`. */
export declare function interpolate<K extends AnimatableKind>(kind: K, from: unknown, to: unknown, t: number, options?: InterpolateOptions): AnimatableValue[K];
/** One keyframe. `ease` and `mix` shape the segment arriving at this key. */
export type Key = {
    frame: number;
    value: unknown;
    ease?: string;
    mix?: ColorSpace;
};
export type TrackOptions = InterpolateOptions & {
    /** Ease for keys without one. Default `DEFAULT_EASE`. */
    ease?: string;
    /** Property name, used in error messages. */
    name?: string;
};
/**
 * A keyframe track for one property: returns the value at any frame (fractional frames work).
 * Before the first key the first value holds, after the last the last. Keys sharing a frame make
 * a jump: from that frame on the later key applies. Every key is parsed and every segment
 * aligned when the track is built, so invalid keys throw here, not mid-render.
 */
export declare function createTrack<K extends AnimatableKind>(kind: K, keys: readonly Key[], options?: TrackOptions): (frame: number) => AnimatableValue[K];
