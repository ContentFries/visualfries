import { type ShotModule } from './layout.js';
/**
 * The camera narrows into a strip while a `panel` slot opens beside it, both moving together.
 * Landscape and square: camera left, panel right (`side: "right"` swaps them). Portrait: camera
 * on top, panel below (`side: "right"` puts the camera at the bottom). `size` is the camera's
 * share of the frame. The surface fill shows under the panel.
 */
export declare const strip: ShotModule;
