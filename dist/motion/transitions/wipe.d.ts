import type { TransitionModule } from './contract.js';
/** Where bar `i` of `n` is at progress `p`, in percent of its own length (0 = covering). */
export declare function wipeBarAt(i: number, n: number, p: number): number;
export declare const wipe: TransitionModule;
