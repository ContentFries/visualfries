import type { Point, TransitionFrame } from './contract.js';

export type { Point };

/**
 * Helpers the drawn transitions share: params, the point a transition centres on, and where an
 * element sits on the stage.
 */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Whole hundredths of a pixel: the same numbers on every page, smooth motion between frames. */
export const px = (v: number) => Math.round(v * 100) / 100;
/** Progress of `v` from `a` to `b`, clamped to 0–1. */
export const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
/** Smooth 0–1 step (zero slope at both ends). */
export const smooth = (v: number) => v * v * (3 - 2 * v);

/** Without footage the frame centre, slightly high, stands in for the face (as shots do). */
const NO_FACE = { x: 0.5, y: 0.35 };

/** Messages for an `at` param: "face", "center" or `[x, y]` in fractions of the frame. */
export function checkPoint(params: Record<string, unknown>, name = 'at'): string[] {
	const v = params[name];
	if (v === undefined || v === 'face' || v === 'center') return [];
	if (
		Array.isArray(v) &&
		v.length === 2 &&
		v.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
	)
		return [];
	return [
		`"${name}" must be "face", "center" or [x, y] in fractions of the frame (got ${JSON.stringify(v)}).`
	];
}

/**
 * The point `at` names on stage, for the side given: "face" (the default) the eyes on that side
 * (from its matte; the frame centre slightly high without one), "center" the frame centre, or
 * `[x, y]` in fractions of the frame.
 */
export function pointAt(
	params: Record<string, unknown>,
	frame: Pick<TransitionFrame, 'size' | 'focus'>,
	side: 'out' | 'in',
	name = 'at'
): Point {
	const [w, h] = frame.size;
	const v = params[name];
	if (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number'))
		return { x: px(v[0] * w), y: px(v[1] * h) };
	if (v === 'center') return { x: w / 2, y: h / 2 };
	const face = frame.focus?.[side];
	return face ? { x: px(face.x), y: px(face.y) } : { x: NO_FACE.x * w, y: NO_FACE.y * h };
}

/**
 * Where `el`'s box starts on the stage: the layers, sides and clip roots sit at the stage origin,
 * a slotted clip root at its slot. Read from `offsetLeft`/`offsetTop` (the transitions clear
 * their own transforms before every frame, so nothing they set moves it).
 */
export function originOf(el: HTMLElement): Point {
	return { x: el.offsetLeft || 0, y: el.offsetTop || 0 };
}

/** Whether `el` paints its whole box (a side, its fill, its footage window). */
export const isSolid = (el: HTMLElement) => 'solid' in el.dataset;

/**
 * Whether `v` may be a CSS colour: a string that cannot load anything (`url(…)`) or carry more
 * CSS. Colours are still set as property values, so a string that is no colour is dropped.
 */
export function isColor(v: unknown): v is string {
	return typeof v === 'string' && v.trim() !== '' && !/url\s*\(|image\s*\(|[;{}]/i.test(v);
}

/** A list of CSS colours, or null. */
export function colorList(v: unknown): string[] | null {
	return Array.isArray(v) && v.length && v.every(isColor) ? v : null;
}

/** Messages for a `colors` param that is not a list of CSS colours. */
export function checkColors(params: Record<string, unknown>, name = 'colors'): string[] {
	const v = params[name];
	if (v === undefined || colorList(v)) return [];
	return [`"${name}" must be a list of CSS colours (got ${JSON.stringify(v)}).`];
}

/** Messages for a `name` param that is not a CSS colour. */
export function checkColor(params: Record<string, unknown>, name = 'color'): string[] {
	const v = params[name];
	if (v === undefined || isColor(v)) return [];
	return [`"${name}" must be a CSS colour (got ${JSON.stringify(v)}).`];
}

/** Messages for a `name` param that is not one of `options`. */
export function checkChoice(
	params: Record<string, unknown>,
	name: string,
	options: string[]
): string[] {
	const v = params[name];
	if (v === undefined || (typeof v === 'string' && options.includes(v))) return [];
	return [
		`"${name}" must be ${options.map((o) => `"${o}"`).join(' or ')} (got ${JSON.stringify(v)}).`
	];
}

/** A string param that is one of `options`, or `fallback`. */
export function choiceParam<T extends string>(
	params: Record<string, unknown>,
	name: string,
	options: readonly T[],
	fallback: T
): T {
	const v = params[name];
	return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}
