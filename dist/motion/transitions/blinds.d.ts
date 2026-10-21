import type { FormatClass, TransitionModule } from './contract.js';
/** The number of slats in a format class (`params.count` wins). */
export declare function blindsCount(params: Record<string, unknown>, cls: FormatClass): number;
/**
 * How far slat `j` (in travel order) of `n` covers its place at eased progress `e`, 0–1, and
 * from which end: closing from its start edge before halfway, opening toward its far edge after.
 * Every slat covers fully exactly at halfway.
 */
export declare function blindsSlatAt(j: number, n: number, e: number, stagger?: number): {
    cover: number;
    from: "start";
} | {
    cover: number;
    from: "end";
};
export declare const blinds: TransitionModule;
