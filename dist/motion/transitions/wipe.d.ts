import type { TransitionModule } from './contract.js';
/**
 * A bar's box: 120 % of the frame across the travel and longer than the frame along it, by an
 * overhang on each end that covers what the slant shifts its corners (tan 12° of half its
 * cross length), so no corner of the picture shows while it covers the frame, in any format.
 */
export declare function wipeBox(size: [number, number], across: boolean): string;
/** Where bar `i` of `n` is at progress `p`, in percent of its own length (0 = covering). */
export declare function wipeBarAt(i: number, n: number, p: number): number;
export declare const wipe: TransitionModule;
