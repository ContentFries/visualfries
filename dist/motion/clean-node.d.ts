import type { FrameRange } from './footage-map.js';
/** How a footage's clean plate is made (`footage.<name>.clean` in the project). */
export type CleanSpec = {
    /** A still of the empty background (absolute path): the hole shows it. Default: filled. */
    image?: string;
    /** Pixels the hole grows past the matte's soft edge. Default about 1.1 % of the short side. */
    grow?: number;
};
export type CleanSource = {
    name: string;
    src: string;
    matte: string;
    width: number;
    height: number;
    /** Same rate as the project: seek straight to the range (see `extractFootageRange`). */
    direct: boolean;
};
/** Folder name of the clean frames of a range for `spec` (its settings and the image file). */
export declare function cleanFolder(spec: CleanSpec, size: [number, number]): Promise<string>;
/** What one range's clean plates cost. */
export type CleanReport = {
    frames: number;
    seconds: number;
    cached: boolean;
    full: number[];
};
/**
 * Cleans frames `range` of `source` into `<dir>/<folder>/` (JPEG, numbered like the plates),
 * unless they are there. `full` lists frames whose matte covers the whole picture: nothing is
 * left to fill from, so they keep the footage (`check` reports them).
 */
export declare function buildCleanRange(dir: string, folder: string, source: CleanSource, spec: CleanSpec, fps: number, range: FrameRange, opts?: {
    jobs?: number;
}): Promise<CleanReport>;
