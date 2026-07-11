import { type Scene } from '../schemas/scene/index.js';
export type TimeRange = {
    start: number;
    end: number;
};
export type EffectiveRenderRange = {
    fromFrame: number;
    toFrame: number;
    startSec: number;
    endSec: number;
};
export type EffectiveRenderRangesResult = {
    ranges: EffectiveRenderRange[];
    trimAppliedInRanges: boolean;
};
export declare const normalizeAndFilterRanges: (ranges: TimeRange[], boundary: TimeRange) => TimeRange[];
export declare const mergeOverlappingRanges: (ranges: TimeRange[]) => TimeRange[];
export declare const invertRemovedRanges: (removedRanges: TimeRange[], boundary: TimeRange) => TimeRange[];
export declare function resolveEffectiveRenderRanges(input: {
    scene: Scene | unknown;
    fromFrame: number;
    toFrame: number;
    fps?: number;
}): EffectiveRenderRangesResult;
