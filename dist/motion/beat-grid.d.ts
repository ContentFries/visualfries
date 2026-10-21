import { z } from 'zod';
/**
 * A beats file (`music.beats.json`), written once by `visualfries beats music.mp3` and read by
 * everything else, so render never analyses audio. Times are seconds of the music file.
 * Downbeats are the beats with `beat: 1`; `bars[].start` repeats them with the bar's energy.
 */
export declare const BeatsFileShape: z.ZodObject<{
    version: z.ZodLiteral<1>;
    source: z.ZodObject<{
        file: z.ZodString;
        sha256: z.ZodString;
        duration: z.ZodNumber;
    }, z.core.$strip>;
    analyzer: z.ZodObject<{
        name: z.ZodString;
        version: z.ZodNullable<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        command: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    tempo: z.ZodNumber;
    beatsPerBar: z.ZodNullable<z.ZodNumber>;
    beats: z.ZodArray<z.ZodObject<{
        time: z.ZodNumber;
        bar: z.ZodOptional<z.ZodNumber>;
        beat: z.ZodOptional<z.ZodNumber>;
        energy: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    bars: z.ZodArray<z.ZodObject<{
        bar: z.ZodNumber;
        start: z.ZodNumber;
        energy: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type BeatsFile = z.infer<typeof BeatsFileShape>;
/** Corrections a project applies to a beats file; re-analysis never wipes them. */
export type BeatCorrections = {
    /** Seconds added to every beat (an analyzer's constant offset). */
    shift?: number;
    /** Which beat of the bar (after `tempo`) is really beat 1. */
    downbeat?: number;
    /** The analyzer found half the real tempo (`double`) or twice it (`half`). */
    tempo?: 'double' | 'half';
};
/** A beat as anchors use it. `time` is in whatever time base the list is in. */
export type GridBeat = {
    /** 1-based number of the beat over the whole music file, after corrections. */
    index: number;
    time: number;
    /** Bar number (0 = pickup); null when the beats file has no downbeats. */
    bar: number | null;
    /** Position in the bar, 1 = downbeat; null without downbeats. */
    beat: number | null;
};
/** A beat of the clip's music: `time` in program seconds, `local` relative to the clip start. */
export type MotionBeatRef = GridBeat & {
    local: number;
};
/**
 * Applies a project's corrections to a beats file: `tempo` first, then `downbeat` (counted on
 * the grid `tempo` produced), then `shift`. Returns beats in music-file seconds.
 */
export declare function correctBeats(file: BeatsFile, corrections?: BeatCorrections): (GridBeat & {
    energy: number | null;
})[];
export declare class BeatError extends Error {
}
/** Why beat anchors, beat moments and `pulse()` fail in a project without music beats. */
export declare const NO_MUSIC_BEATS = "Beat anchors need music with beats: add \"music\": [{ \"src\": \"music.mp3\", \"beats\": \"music.beats.json\" }] to the project (visualfries beats music.mp3 writes the beats file).";
/** `-1b`, `+0.5b`, `2b`: an offset counted in beats. */
export declare const BEAT_OFFSET: RegExp;
/** The beat with number `n` (1-based over the whole file). */
export declare function findBeat(grid: GridBeat[], n: number, label: string): GridBeat;
/** Beat `beat` (default 1, the downbeat) of bar `bar`. */
export declare function findBarBeat(grid: GridBeat[], bar: number, beat: number, label: string): GridBeat;
/** The first beat (or downbeat) at or after `time`, or the last one at or before it. */
export declare function nearBeat(grid: GridBeat[], time: number, kind: 'beat' | 'downbeat', direction: 'after' | 'before', label: string): GridBeat;
/**
 * Where `time` falls in the beat list, as a fractional 0-based index: 3.5 is halfway between the
 * 4th and 5th beat. Before the first and after the last beat the edge interval continues.
 */
export declare function beatPosition(times: number[], time: number): number;
/** Inverse of `beatPosition`. */
export declare function timeAtPosition(times: number[], position: number): number;
/** `time` moved by `beats` beats along the grid (fractions follow the local beat length). */
export declare function shiftByBeats(grid: GridBeat[], time: number, beats: number, label: string): number;
/**
 * 0 on a beat (or downbeat for `bar`), rising to 1 just before the next one. A beat less than
 * `snap` seconds ahead counts as reached, so the frame nearest a beat (half a frame) shows it.
 */
export declare function beatPhase(grid: GridBeat[], time: number, on: 'beat' | 'bar', label: string, snap?: number): number;
export type BarRow = {
    bar: number;
    /** Program seconds of the bar's first beat. */
    start: number;
    /** Program seconds of every beat in the bar. */
    beats: number[];
    /** Beats per minute inside the bar. */
    bpm: number | null;
    /** RMS level of the bar in dB, when the beats file has energy. */
    energy: number | null;
};
/** Bars of a corrected grid (program seconds), for `check`. Bar 0 holds pickup beats. */
export declare function barRows(grid: (GridBeat & {
    energy?: number | null;
})[], fileBars?: BeatsFile['bars'], corrected?: boolean): BarRow[];
/** The bar grid as text: tempo doubling shows up as a BPM column twice the expected value. */
export declare function formatBarGrid(rows: BarRow[], firstBeats?: number): string;
/** A music item's beats placed in the program. */
export type MusicBeats = {
    /** The music's id, or null when it has none. */
    id: string | null;
    /** Label for messages: the id, or the music file. */
    name: string;
    /** Beats in program seconds after corrections; beats after `until` are gone. */
    grid: (GridBeat & {
        energy: number | null;
    })[];
};
/** Corrects a beats file and places it at `from` in the program, cut at `until`. */
export declare function programBeats(file: BeatsFile, music: BeatCorrections & {
    id?: string;
    src: string;
    from?: number;
    until?: number;
}): MusicBeats;
/**
 * The music whose beats an anchor uses: the one named `id`, else the only music with beats.
 * Throws a message that says how to fix the project.
 */
export declare function pickMusic(music: MusicBeats[], id: string | undefined): MusicBeats;
