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
 * It owns the element's transform, opacity, filter, clip-path and visibility (and the split
 * items'), so do not set those from markup or a timeline on the same element.
 */
export declare const motion: Action<Element, MotionOptions | undefined>;
