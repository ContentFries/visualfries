import { type FrameRange } from './footage-map.js';
import { type MattePlanOptions } from './matte-use.js';
import { type LoadedMotionProject } from './node.js';
import { type ResolvedProgram } from './program.js';
import { type RangeMatteOptions } from './matte.js';
/**
 * Whether a block draws or measures the subject: its file, or a file of the project it imports,
 * names it. Files of VisualFries itself are not followed (only its subject blocks name it).
 */
export declare function blockReadsSubject(dir: string, block: string): Promise<boolean>;
/** One footage with a matte: its files and its frame count and rate. */
type MattedFootage = {
    name: string;
    src: string;
    matte: string;
    frames: number;
    fps: number;
};
export type FootageMattePlan = MattedFootage & {
    /** Frames of the footage (its own rate) the programs read the matte at. */
    reads: FrameRange[];
    /** Frames to matte: the reads widened, out of words, joined (see `planMatteRanges`). */
    ranges: FrameRange[];
};
/**
 * What `visualfries matte <project>` mattes of each footage with a matte: the frames the program
 * reads it at, in the project's frame size, in each excerpt and in each of `formats` (frame sizes
 * `render --format` draws), widened by a margin, moved out of words and joined. A project
 * without cuts or shots (inserts mode) reads every frame.
 */
export declare function projectMattePlan(loaded: LoadedMotionProject, opts?: {
    formats?: string[];
} & Pick<MattePlanOptions, 'margin' | 'gap'>): Promise<FootageMattePlan[]>;
/**
 * Throws when `program` reads a partial matte (one `visualfries matte <project>` made) at a
 * frame it does not cover, where it is black: the program changed since. Mattes without a
 * ranges file cover the whole footage and pass.
 */
export declare function assertMatteCovers(loaded: LoadedMotionProject, program: ResolvedProgram, format?: string): Promise<void>;
export type ProjectMatteReport = {
    footage: string;
    matte: string;
    /** Frames of the footage, the frames the matte covers, and those matted in this run. */
    frames: number;
    covered: number;
    matted: number;
    ranges: FrameRange[];
    fps: number;
    seconds: number;
    /** Seconds a matte of every frame would take at this run's pace; null when nothing was matted. */
    fullSeconds: number | null;
    written: boolean;
};
/**
 * `visualfries matte <project>`: for each footage with a `matte`, mattes only the frames the
 * program reads it at (see `projectMattePlan`) into one full-length matte at that path, black
 * elsewhere, with its ranges file. Ranges matted before are reused from
 * `.visualfries/matte/<footage>/`.
 */
export declare function matteProject(loaded: LoadedMotionProject, opts: Omit<RangeMatteOptions, 'output' | 'ranges' | 'cacheDir'> & {
    formats?: string[];
}): Promise<ProjectMatteReport[]>;
/** What `matteProject` did, one line per footage for the terminal. */
export declare function matteReportLines(reports: ProjectMatteReport[]): string[];
/**
 * `--ranges` of `visualfries matte <video>`: seconds as `from-to` pairs separated by commas
 * ("12.5-20,31-40.2"), as sorted, joined frame ranges of a video at `fps` with `total` frames.
 */
export declare function parseRangesFlag(text: string, fps: number, total: number): FrameRange[];
export {};
