import { type ShotModule } from './layout.js';
/**
 * Width over height from an `aspect` param: `"4:5"`, `"16:9"`, or a number; null for anything
 * else (the check reports it).
 */
export declare function aspectParam(v: unknown): number | null;
/**
 * The speaker in a framed window over the style's surface, with a `panel` slot beside it for a
 * clip (a list, tiles, a screenshot). Landscape and square: the window sits in a corner
 * (`corner`, default bottom right) and the panel takes the full height on the other side.
 * Portrait: the window is centred at the top of the safe area and the panel takes the rest of
 * it below (`corner: "bottom-…"`: the window at the bottom of the safe area, just above the
 * caption band, and the panel above it); nothing goes under the platform's buttons or the
 * caption band. Landscape and square keep their own margins: their players overlay no lasting
 * UI on the corners. `size` is the window's width as a share of the frame, `zoom` how much
 * closer the camera goes inside it, `ring` the width of its brand-coloured ring in pixels at
 * 1080 px of the frame's shorter side (0: none), so it scales with the frame like `blur`.
 * `aspect` is the window's width over height (`"4:5"`, `"1:1"`, `"16:9"` or a number; default
 * 16:9 in landscape, 1:1 in square and portrait); without `size` a window of another aspect
 * keeps the default window's area, so `"4:5"` gives a close selfie's head more height without a
 * bigger window. `headroom` keeps the whole head in the window (see `frameOnHead`).
 */
export declare const windowShot: ShotModule;
