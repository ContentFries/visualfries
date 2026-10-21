import { type ShotInput, type ShotLayout, type ShotModule } from './layout.js';
/**
 * The footage fills the frame. When its aspect differs from the format's, it is cropped around
 * the subject's head (smoothed). Portrait footage in a landscape frame is never cropped to a
 * sliver: it stands in a full-height window over the style's surface.
 */
export declare function fullLayout(input: ShotInput, zoom?: number): ShotLayout;
export declare const full: ShotModule;
