import { type FootageMap, type FootageView } from './footage-map.js';
import type { FootageFrames, SubjectBox } from './resolve.js';
import type { ProgramTransition } from './program.js';
import { type ShotLayout, type ShotSpan } from './shots/index.js';
import type { StageSegment } from './segments.js';
type Span = {
    startFrame: number;
    frames: number;
};
/**
 * The head's height a shot frames for (see `ShotInput.head`): a high percentile of the matte's
 * per-frame measure over every frame of the shot, so one tall frame (a lean, a hand) does not
 * shrink the whole shot and the shot does not breathe with every lean. Null without a matte
 * that measures heads.
 */
export declare function shotHead(shot: Span, map: FootageMap | null, footage: Record<string, FootageFrames>): number | null;
export type FramingData = Pick<StageSegment, 'fps' | 'size' | 'cls' | 'format' | 'footage' | 'footageMap' | 'shots'>;
/**
 * The framing of a program (or a segment of it): the layout of a side showing `view` at
 * program frame `f`, from the shot track or from `shot` alone, and the smoothed subject of a
 * view. Head sizes are measured once per shot.
 */
export declare function programFraming(data: FramingData): {
    layoutFor: (f: number, view: FootageView | null, shot?: Pick<ShotSpan, "shot" | "params" | "keys"> & {
        id?: string;
    }) => ShotLayout;
    subjectOf: (view: FootageView | null) => SubjectBox | null;
    headOf: (shot: {
        id?: string;
    }) => number | null;
};
export type HeadCrop = {
    shot: string;
    /** `top`: the top of the head is cut or touches the edge; `face`: the face is cut below. */
    edge: 'top' | 'face';
    /** Program frames, first and last cut. */
    from: number;
    to: number;
    /**
     * The worst frame: pixels of the head past the window's edge (0 for a head touching the top
     * edge), and as a share of the head (null: the matte gives no head size).
     */
    pixels: number;
    share: number | null;
};
/**
 * Where a shot's camera window cuts the speaker's head for at least `CROP_FRAMES` frames in a
 * row, its keys included: the top of the head less than `TOP_ROOM` of the window below its top
 * edge (or past it), or more than `FACE_CUT` of the head below its bottom edge. The head is
 * where each frame's matte puts it (not smoothed: a lean that the calm framing lags behind
 * counts). Morphs and cut or shot transition windows are skipped (the head is in motion there).
 * `range` limits the frames looked at (a segment).
 */
export declare function headCrops(data: FramingData & {
    transitions: readonly ProgramTransition[];
}, range?: Span): HeadCrop[];
/**
 * A `check` warning for a head crop, worded so an agent knows what it can change. It stays a
 * warning: a tight crop can be the creator's choice, so the agent looks at a still and decides.
 */
export declare function headCropMessage(crop: HeadCrop, shot: Pick<ShotSpan, 'shot' | 'params' | 'keys'>, fps: number): string;
export {};
