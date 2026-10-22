import type { FootageFrames } from './resolve.js';
import { type ResolvedBrand } from './brand.js';
import type { ResolvedFormat } from './format.js';
import type { FootageMap } from './footage-map.js';
import type { FormatClass, ProgramClip, ProgramSegment, ProgramTransition, ResolvedProgram } from './program.js';
import { type ShotSpan } from './shots/index.js';
/**
 * What a page needs to draw a range of the program on one stage (`loadSegment`). Every pixel
 * of a frame is a function of its program frame alone, so the same frame drawn on the page of
 * its segment or on a page holding the whole program comes out the same.
 */
/** A clip as a segment page mounts it. */
export type StageClip = Omit<ProgramClip, 'footage' | 'footageMap'> & {
    /** Program frames the clip is on screen, holds included: `[from, until)`. */
    show: {
        from: number;
        until: number;
    };
};
export type StageSegment = {
    id: string;
    /** First program frame and frame count; `frame(n)` takes program frames inside it. */
    startFrame: number;
    frames: number;
    fps: number;
    size: [number, number];
    /** Format class shots lay out for. */
    cls: FormatClass;
    /** Class and safe insets: `data-format` and `--safe-*` on the stage and every clip root. */
    format: ResolvedFormat;
    /** `--brand-*` tokens on the stage: fills, transition colours and every block read them. */
    brand: ResolvedBrand;
    background: string | null;
    /** Extracted frames per source (filled in by the node tooling). */
    footage: Record<string, FootageFrames>;
    /** Which source frame the program shows when; null without footage. */
    footageMap: FootageMap | null;
    /** Shots deciding the layout in the segment (see `shotsDuring`). */
    shots: ShotSpan[];
    /** Every clip on screen in the segment, in project order. */
    clips: StageClip[];
    /** Transition windows that touch the segment. */
    transitions: ProgramTransition[];
    /**
     * An insert of the inserts export: the clips without the footage picture (no fill, plate or
     * window look); with `holdout`, each frame then cuts the subject out of the alpha.
     */
    insert?: {
        holdout: boolean;
    };
};
type Span = {
    startFrame: number;
    frames: number;
};
/**
 * Program frames a clip is on screen. Inside a transition window the outgoing clip holds its
 * last frame and the incoming its first: a clip's own transition, or a cut or shot transition
 * whose cut is the clip's first frame (incoming) or the frame after its last (outgoing). Only
 * drawn transitions count; one not drawn yet cuts on its cut.
 */
export declare function clipShowRange(clip: Span & {
    id: string;
}, transitions: ProgramTransition[]): {
    from: number;
    until: number;
};
/** The clip frame shown at program frame `f`: held at its edges, null when not on screen. */
export declare function clipFrameAt(clip: StageClip, f: number): number | null;
/** The whole program as one segment (a page that can draw any frame). */
export declare function wholeProgram(program: Pick<ResolvedProgram, 'frames'>): ProgramSegment;
/** The segment holding program frame `f`. */
export declare function segmentAt(program: Pick<ResolvedProgram, 'segments'>, f: number): ProgramSegment | null;
/** The page data of one segment (or of `wholeProgram`): clips and transitions on screen in it. */
export declare function segmentStage(program: Pick<ResolvedProgram, 'fps' | 'format' | 'background' | 'shots' | 'clips' | 'transitions'>, segment: Span & {
    id: string;
}, footage: {
    frames: Record<string, FootageFrames>;
    map: FootageMap | null;
}, brand?: ResolvedBrand): StageSegment;
/**
 * Frames worth running in a segment: every `every`th frame, the frames around each cut, shot
 * and morph edge, clip edge, cue and transition window edge, and the last frame.
 */
export declare function segmentCheckFrames(program: Pick<ResolvedProgram, 'cuts' | 'shots' | 'clips' | 'transitions'>, segment: Span, every?: number): number[];
/**
 * Frames on both sides of every change: cuts, shot starts, morph middles and ends, clip edges,
 * transition window edges, keys and the middle between two keys.
 */
export declare function edgeFrames(program: Pick<ResolvedProgram, 'cuts' | 'shots' | 'clips' | 'transitions'>): number[];
/**
 * A fixed shuffle of `frames` (no randomness: the same list always gives the same order), so a
 * determinism check also seeks in an order that is neither forward nor backward.
 */
export declare function scrambled<T>(frames: T[]): T[];
export {};
