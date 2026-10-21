import type { Action } from 'svelte/action';
import { type MotionOptions } from './primitives.js';
/**
 * Named motion on any element of a motion block, as a pure function of clip time:
 *
 * ```svelte
 * <h1 use:motion={{ enter: 'pop', at: 'cue', exit: 'fade', emphasis: 'pulse' }}>…</h1>
 * <p use:motion={{ enter: 'rise', split: 'words', at: 'list' }}>…</p>
 * <span use:motion={{ count: 12400, at: 'stat' }}>0</span>
 * ```
 *
 * It owns the `OWNED` properties of the element (and of the split items): transform, opacity,
 * filter, clip-path, visibility, display, transform-box/-origin, stroke-dash*, background-* and
 * box-decoration-break. Do not set those from markup or a timeline on the same element.
 */
export declare const motion: Action<Element, MotionOptions | undefined>;
