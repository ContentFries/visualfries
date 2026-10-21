import type { TransitionModule } from './contract.js';
/**
 * The blur mask as a `MAP`² 24-bit BMP spanning the square around the point: red is how much of
 * the sideways blur shows, green how much of the up-and-down one. Together they rise from 0 near
 * the centre to 1 at the square's edge; red takes the share cos² of the angle, green sin².
 */
export declare function zoomMask(): string;
export declare const zoomThrough: TransitionModule;
