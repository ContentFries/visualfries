import type { Component } from 'svelte';
import { type LiveFootage } from './live-footage.js';
import { type LiveManifest, type LiveProgram, type LiveRange, type LiveSource } from './live-manifest.js';
import type { ResolvedBrand } from './brand.js';
import type { StageSegment } from './segments.js';
import type { StageFont } from './stage.js';
import type { Animatable } from './keys.js';
export type { LiveManifest, LiveSource, LiveRange, LiveProgram };
export type ProgramPlayerOptions = {
    /** A proxy video per footage source (see `LiveSource`). */
    footage: Record<string, LiveSource>;
    /** Source ranges and subject boxes per footage, as extraction cuts them (see `LiveRange`). */
    boxes?: Record<string, LiveRange[]>;
    /** The program's mixed sound; the clock follows it while it plays. */
    audio?: string | null;
    fonts?: StageFont[];
    /** The project's CSS, scoped to the player's host. */
    css?: string;
    /** Brand tokens, when `createProgramPlayer` gets a program rather than a segment. */
    brand?: ResolvedBrand;
};
export type PlayerFrame = {
    frame: number;
    time: number;
    /** Main-thread milliseconds the scene's seek and draw took. */
    work: number;
    /** Program frames passed over since the frame drawn before (0 while it keeps up). */
    skipped: number;
    perf: number;
};
export type PlayerStats = LiveFootage['stats'] & {
    audioCorrections: number;
    /** The clock minus the sound's own time, sampled about four times a second while playing. */
    audio: {
        at: number;
        offset: number;
    }[];
};
export type ProgramPlayer = {
    readonly fps: number;
    readonly frames: number;
    readonly duration: number;
    readonly size: [number, number];
    /** Program seconds now. */
    readonly time: number;
    readonly playing: boolean;
    play(): Promise<void>;
    pause(): void;
    /**
     * Seeks to program second `t`; resolves with the milliseconds until the picture shows it (at
     * once after `destroy`), rejects when a proxy fails to load or does not show the frame within
     * 5 s. The player stays usable either way: play, pause and seek again as before.
     */
    seek(t: number): Promise<number>;
    /** Calls `fn` for every frame drawn, and once more when playback stops at the end. */
    onFrame(fn: (f: PlayerFrame) => void): () => void;
    /** Draws another revision of the same program on the same proxies, at the same time. */
    update(program: StageSegment | LiveProgram): Promise<void>;
    stats: PlayerStats;
    destroy(): void;
};
type Blocks = Record<string, Component<Record<string, unknown>>>;
type AnimatableMap = Record<string, Animatable | undefined>;
/**
 * Plays a resolved program in real time in the page: the same scene `render` draws (shots,
 * clips, behind layer, transitions), with time set once per animation frame from one clock and
 * the footage from proxy videos. `program` is a stage segment, or a resolved program the player
 * makes one of with `opts.brand`. The stage keeps the program's size, scaled to fit `host`.
 */
export declare function createProgramPlayer(host: HTMLElement, program: StageSegment | LiveProgram, blocks: Blocks, animatable: AnimatableMap, opts: ProgramPlayerOptions): Promise<ProgramPlayer>;
/**
 * A live preview folder's player (see `LiveManifest`): `base` is the manifest's URL, so the
 * files it names resolve against it. What a preview bundle's `createPlayer` calls.
 */
export declare function mountLivePreview(host: HTMLElement, manifest: LiveManifest, base: string, blocks: Blocks, animatable: AnimatableMap): Promise<ProgramPlayer>;
