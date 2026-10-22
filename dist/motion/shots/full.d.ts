import { type ShotInput, type ShotLayout, type ShotModule } from './layout.js';
/**
 * The footage fills the frame. When its aspect differs from the format's, it is cropped around
 * the subject's head (smoothed); `headroom` keeps the whole head in (see `frameOnHead`).
 * Portrait footage in a landscape frame is never cropped to a sliver: it stands in a full-height
 * window over the style's surface.
 */
export declare function fullLayout(input: ShotInput, zoom?: number): ShotLayout;
/** Shots framed like `full`: moving between them is no shot change. */
export declare const FULL_FRAMED: string[];
/**
 * Events of a shot framed like `full`: the camera moving back from a strip (or another framed
 * shot) is a shot change; settling out of a punch-in or a room dimmed behind a word is not.
 */
export declare const fullEvents: ShotModule['events'];
export declare const full: ShotModule;
