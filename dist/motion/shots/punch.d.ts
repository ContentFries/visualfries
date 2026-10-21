import { type Energy, type ShotModule } from './layout.js';
/** How much closer a punch-in goes, by the style's energy. */
export declare const PUNCH_SCALE: Record<Energy, number>;
/** Without a style: the approved look. */
export declare const DEFAULT_PUNCH_SCALE = 1.45;
/**
 * A punch-in: the full frame, `params.scale` times closer, toward the head. In fast and out
 * slower; the hit is the first frame.
 */
export declare const punch: ShotModule;
