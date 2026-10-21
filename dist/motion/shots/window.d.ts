import { type ShotModule } from './layout.js';
/**
 * The speaker in a framed window over the style's surface, with a `panel` slot beside it for a
 * clip (a list, tiles, a screenshot). Landscape and square: the window sits in a corner
 * (`corner`, default bottom right) and the panel takes the full height on the other side.
 * Portrait: the window is centred near the top (`corner: "bottom-…"`: above the bottom band
 * where captions and platform buttons sit) and the panel takes the rest below (or above) it.
 * `size` is the window's width as a share of the frame, `zoom` how much closer the camera goes
 * inside it, `ring` the width of its brand-coloured ring in pixels (0: none).
 */
export declare const windowShot: ShotModule;
