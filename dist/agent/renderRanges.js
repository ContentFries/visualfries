import { SceneShape } from '../schemas/scene/index.js';
export const normalizeAndFilterRanges = (ranges, boundary) => ranges
    .map((range) => ({
    start: Math.max(boundary.start, range.start),
    end: Math.min(boundary.end, range.end)
}))
    .filter((range) => range.start < range.end);
export const mergeOverlappingRanges = (ranges) => {
    if (ranges.length < 2)
        return [...ranges];
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
    return sortedRanges.reduce((acc, range) => {
        const previous = acc[acc.length - 1];
        if (range.start <= previous.end) {
            previous.end = Math.max(previous.end, range.end);
        }
        else {
            acc.push({ ...range });
        }
        return acc;
    }, [{ ...sortedRanges[0] }]);
};
export const invertRemovedRanges = (removedRanges, boundary) => {
    const keptRanges = [];
    let cursor = boundary.start;
    for (const range of removedRanges) {
        if (range.start > cursor)
            keptRanges.push({ start: cursor, end: range.start });
        cursor = Math.max(cursor, range.end);
    }
    if (cursor < boundary.end)
        keptRanges.push({ start: cursor, end: boundary.end });
    return keptRanges;
};
export function resolveEffectiveRenderRanges(input) {
    const scene = SceneShape.parse(input.scene);
    const fps = Math.max(1, Number(input.fps || scene.settings.fps || 30));
    const boundary = {
        start: input.fromFrame / fps,
        end: input.toFrame / fps
    };
    const fallbackRange = {
        fromFrame: input.fromFrame,
        toFrame: input.toFrame,
        startSec: boundary.start,
        endSec: boundary.end
    };
    const trimZones = scene.settings.trimZones || [];
    if (trimZones.length === 0 || boundary.end <= boundary.start) {
        return { ranges: [fallbackRange], trimAppliedInRanges: false };
    }
    const filteredRanges = normalizeAndFilterRanges(trimZones, boundary);
    if (filteredRanges.length === 0) {
        return { ranges: [fallbackRange], trimAppliedInRanges: false };
    }
    const removedRanges = mergeOverlappingRanges(filteredRanges);
    const keptRanges = invertRemovedRanges(removedRanges, boundary);
    if (keptRanges.length === 0) {
        return { ranges: [fallbackRange], trimAppliedInRanges: false };
    }
    const ranges = keptRanges
        .map((range) => ({
        fromFrame: Math.max(input.fromFrame, Math.floor(range.start * fps + 1e-9)),
        toFrame: Math.min(input.toFrame, Math.ceil(range.end * fps - 1e-9)),
        startSec: range.start,
        endSec: range.end
    }))
        .filter((range) => range.toFrame > range.fromFrame);
    if (ranges.length === 0) {
        return { ranges: [fallbackRange], trimAppliedInRanges: false };
    }
    return { ranges, trimAppliedInRanges: true };
}
