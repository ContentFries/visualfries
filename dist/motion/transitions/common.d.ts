import type { Point, TransitionFrame } from './contract.js';
export type { Point };
/**
 * Helpers the drawn transitions share: params, the point a transition centres on, and where an
 * element sits on the stage.
 */
export declare const clamp01: (v: number) => number;
/** Whole hundredths of a pixel: the same numbers on every page, smooth motion between frames. */
export declare const px: (v: number) => number;
/** Progress of `v` from `a` to `b`, clamped to 0–1. */
export declare const ramp: (v: number, a: number, b: number) => number;
/** Smooth 0–1 step (zero slope at both ends). */
export declare const smooth: (v: number) => number;
/** Messages for an `at` param: "face", "center" or `[x, y]` in fractions of the frame. */
export declare function checkPoint(params: Record<string, unknown>, name?: string): string[];
/**
 * The point `at` names on stage, for the side given: "face" (the default) the eyes on that side
 * (from its matte; the frame centre slightly high without one), "center" the frame centre, or
 * `[x, y]` in fractions of the frame.
 */
export declare function pointAt(params: Record<string, unknown>, frame: Pick<TransitionFrame, 'size' | 'focus'>, side: 'out' | 'in', name?: string): Point;
/**
 * Where `el`'s box starts on the stage: the layers, sides and clip roots sit at the stage origin,
 * a slotted clip root at its slot. Read from `offsetLeft`/`offsetTop` (the transitions clear
 * their own transforms before every frame, so nothing they set moves it).
 */
export declare function originOf(el: HTMLElement): Point;
/** Whether `el` paints its whole box (a side, its fill, its footage window). */
export declare const isSolid: (el: HTMLElement) => boolean;
/**
 * Whether `v` may be a CSS colour: a string that cannot load anything (`url(…)`) or carry more
 * CSS. Colours are still set as property values, so a string that is no colour is dropped.
 */
export declare function isColor(v: unknown): v is string;
/** A list of CSS colours, or null. */
export declare function colorList(v: unknown): string[] | null;
/** Messages for a `colors` param that is not a list of CSS colours. */
export declare function checkColors(params: Record<string, unknown>, name?: string): string[];
/** Messages for a `name` param that is not a CSS colour. */
export declare function checkColor(params: Record<string, unknown>, name?: string): string[];
/** Messages for a `name` param that is not one of `options`. */
export declare function checkChoice(params: Record<string, unknown>, name: string, options: string[]): string[];
/** A string param that is one of `options`, or `fallback`. */
export declare function choiceParam<T extends string>(params: Record<string, unknown>, name: string, options: readonly T[], fallback: T): T;
