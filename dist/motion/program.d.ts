import type { MotionProject } from './project.js';
import { type Key, type Provenance } from './timeline.js';
import { type FormatClass, type ResolvedFormat } from './format.js';
import { type ResolvedClip } from './resolve.js';
import { type ProgramExcerpt } from './excerpt.js';
import { type ProgramDiagnostic, type ProgramInputs, type ProgramWord } from './cutlist.js';
export type { BlockAnimatable, ProgramDiagnostic, ProgramInputs, ProgramWord, SourceInfo } from './cutlist.js';
/** Hashes the node tooling computes from files; they go into the program and its segments. */
export type ProgramHashes = {
    project?: string;
    transcript?: string | null;
    transcripts?: Record<string, string>;
    sources?: Record<string, string>;
    /** Blocks, custom shots and transitions, fonts and CSS files, by project-relative path. */
    assets?: Record<string, string>;
    /** Music beats and their corrections; null without beats. */
    music?: string | null;
    /** Brand values and the contents of its font and logo files; null without a brand. */
    brand?: string | null;
    /** The layered style; null without a style. */
    style?: string | null;
};
export type { FormatClass };
export type { ProgramExcerpt };
/**
 * The frame the program is resolved for ("1080x1920"): its class and the safe insets of the
 * project's `safeZone`, as blocks see them in `clip.format`.
 */
export type ProgramFormat = ResolvedFormat & {
    name: string;
    size: [number, number];
};
/**
 * A keyframe at a program frame. Lengths stay as written (px or "%") until interpolation; brand
 * tokens in props (`"brand.primary"`) are already replaced by the brand's colours. `ease` shapes
 * the move arriving at this key: the key's own, else the energy's (see `KEY_EASE`).
 */
export type ResolvedKey = {
    frame: number;
    values: Omit<Key, 'at' | 'ease' | 'mix'>;
    ease: string;
    mix: 'oklab' | 'oklch';
};
export type ProgramSource = {
    src: string;
    matte: string | null;
    /** Frames at the project rate; null when the file could not be probed. */
    frames: number | null;
    width: number | null;
    height: number | null;
    fps: number | null;
    /** File the source's sound comes from; null: no sound. */
    audio: string | null;
    provenance?: Provenance;
};
export type ProgramCut = {
    id: string;
    index: number;
    source: string;
    startFrame: number;
    frames: number;
    /** Source frames (project rate): first, and one after the last. */
    srcIn: number;
    srcOut: number;
    /** Source frames available before `srcIn` and after `srcOut`; null: source length unknown. */
    handles: {
        before: number;
        after: number | null;
    };
    /**
     * Program frames at the end of the cut (inside `frames`) that hold source frame `srcOut − 1`,
     * without sound. Absent: no hold.
     */
    hold?: number;
    /** Id of the transition into this cut. */
    transition: string | null;
    audio: {
        edit: number;
        split: number;
        crossfade: number;
        gain: number;
        mute: boolean;
    };
    native: boolean | null;
};
export type ProgramShot = {
    id: string;
    shot: string;
    /** A gap between written shots, framed `full`. */
    implicit: boolean;
    startFrame: number;
    frames: number;
    /**
     * Footage framed instead of the cut list's: source frame `srcIn` (0 unless the shot gives
     * `in`) at the shot start.
     */
    source: {
        name: string;
        srcIn: number;
    } | null;
    params: Record<string, unknown>;
    /** Frames the layout moves from the previous shot's, from the shot start; 0: hard. */
    morphFrames: number;
    /** Ease of that move. */
    morphEase: string;
    transition: string | null;
    keys: ResolvedKey[];
    native: boolean | null;
};
export type ProgramClip = ResolvedClip & {
    slot: string | null;
    layer: 'front' | 'behind';
    transition: string | null;
    keys: ResolvedKey[];
    /** Stacking order: project order. */
    z: number;
    native: boolean | null;
};
export type ProgramTransition = {
    id: string;
    /** The incoming item that carries it. */
    owner: string;
    kind: 'cut' | 'shot' | 'clip';
    /** The outgoing cut or shot; null for a clip (everything below it is outgoing). */
    outgoing: string | null;
    type: string;
    startFrame: number;
    frames: number;
    /** Program frame of the cut (the incoming item's first frame). */
    cutFrame: number;
    align: 'center' | 'start' | 'end';
    direction: string | null;
    ease: string | null;
    params: Record<string, unknown>;
    sound: string | false | null;
    native: boolean | null;
    /** Frames a side holds its edge frame for lack of handle. */
    held: {
        out: number;
        in: number;
    };
};
export type ProgramEvent = {
    kind: string;
    frame: number;
    owner: string;
    strength?: number;
};
/** Program seconds `at`, source seconds `srcIn`; `dur` null: to the end of the file or program. */
export type AudioPiece = {
    owner: string;
    file: string;
    srcIn: number;
    dur: number | null;
    at: number;
    fadeIn: number;
    fadeOut: number;
    /** dB. */
    gain: number;
    gainKeys?: {
        at: number;
        gain: number;
    }[];
    /** Music only: the end of bar `bar`, the nearest to `target` (where it would end unsnapped). */
    snap?: {
        bar: number;
        target: number;
    };
};
export type ProgramSegment = {
    id: string;
    startFrame: number;
    frames: number;
    /** Cuts, shots, clips and transitions on screen in the segment. */
    items: string[];
    hash: string;
    /**
     * The pieces a render draws and caches on their own (see `chunkSpans`), in order; a short
     * segment is one chunk with the segment's id. Each hash covers only what its frames show.
     */
    chunks: {
        id: string;
        startFrame: number;
        frames: number;
        hash: string;
    }[];
};
export type ResolvedProgram = {
    version: 1;
    mode: 'inserts' | 'program';
    format: ProgramFormat;
    fps: number;
    frames: number;
    background: string | null;
    hashes: {
        project: string | null;
        transcript: string | null;
        transcripts: Record<string, string>;
        sources: Record<string, string>;
        assets: Record<string, string>;
        music: string | null;
        brand: string | null;
        style: string | null;
    };
    sources: Record<string, ProgramSource>;
    cuts: ProgramCut[];
    shots: ProgramShot[];
    clips: ProgramClip[];
    transitions: ProgramTransition[];
    words: ProgramWord[];
    events: ProgramEvent[];
    audio: {
        speech: AudioPiece[];
        sfx: AudioPiece[];
        music: AudioPiece[];
        /** dB of effects (their loudest 100 ms) and music under the speech loudness. */
        levels: {
            sfx: number;
            music: number;
        };
        /** Integrated loudness (LUFS) and true-peak ceiling (dBTP) of the finished video. */
        master: {
            lufs: number;
            truePeak: number;
        };
    };
    segments: ProgramSegment[];
    diagnostics: ProgramDiagnostic[];
    /** The project's excerpts as ranges of this program; absent when it has none. */
    excerpts?: ProgramExcerpt[];
    /**
     * In the program of an excerpt (`resolveProgram` with `excerpt`): which range of the whole
     * program it is. Frame 0 is that range's first frame; an end card follows its last.
     */
    excerpt?: ProgramExcerpt;
};
/** Seconds a transition not drawn yet lasts when the project does not say. */
export declare const DEFAULT_TRANSITION_SECONDS = 0.5;
/**
 * Mix levels when the project does not set them: effects about 10 dB under the speech (issue
 * 07), music at one steady level under it (issue 17), finished videos at −14 LUFS integrated
 * with true peaks at or under −1 dBTP.
 */
export declare const MIX_DEFAULTS: {
    readonly sfx: -10;
    readonly music: -15;
    readonly loudness: -14;
    readonly truePeak: -1;
};
/** Default music fades: an anti-click fade-in and a one-second fade-out. */
export declare const MUSIC_FADE: {
    readonly in: 0.01;
    readonly out: 1;
};
/** The project's frame, or another size given as "1080x1350". */
export declare function programFormat(project: Pick<MotionProject, 'size' | 'safeZone'>, name?: string): ProgramFormat;
/**
 * Orders text by UTF-16 code units, the same on every machine (`localeCompare` follows the
 * locale, which would make the order, and the mix, depend on where it runs).
 */
export declare const compareText: (a: string, b: string) => 0 | 1 | -1;
/**
 * Resolves a project into its program for one format: cuts, shots (gaps framed `full`), clips,
 * transition windows with handles and held frames, keys, events, audio pieces and segments.
 * Pure: the same project and inputs give the same JSON, in Node and in the browser.
 */
export declare function resolveProgram(project: MotionProject, given: ProgramInputs & {
    hashes?: ProgramHashes;
}, opts?: {
    format?: string;
    excerpt?: string;
}): ResolvedProgram;
/**
 * Strings in clip props that may name a project file (no URLs, data or colours), and every
 * `{ "file" }` path, with or without an extension.
 */
export declare function propFiles(props: (Record<string, unknown> | undefined)[]): string[];
