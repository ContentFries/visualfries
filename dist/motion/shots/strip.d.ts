import { type ShotModule } from './layout.js';
/**
 * The camera narrows into a strip while a `panel` slot opens beside it, both moving together.
 * Landscape and square: camera left, panel right (`side: "right"` swaps them). Portrait: camera
 * on top, panel below (`side: "right"` puts the camera at the bottom). `size` is the camera's
 * share of the frame. The surface fill shows under the panel. `headroom` keeps the whole head in
 * the strip (see `frameOnHead`); with it, in portrait and without `size`, the strip also grows
 * from 0.45 up to 0.55 of the frame height for the shot's head (a close selfie), so the footage
 * still fills the strip's width instead of backing off; a head taller still makes it back off.
 */
export declare const strip: ShotModule;
