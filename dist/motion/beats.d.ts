import { type BeatsFile } from './beat-grid.js';
export type AnalyzerInfo = {
    name: string;
    version: string | null;
    model?: string;
    command?: string;
};
/**
 * Finds the beats in a music file. VisualFries decodes the music once to `input` (a mono
 * 44.1 kHz 16-bit WAV, so every analyzer hears the same samples), the analyzer writes `output`,
 * and VisualFries reads it (see `parseAnalyzerOutput`), measures energy and writes the beats file.
 */
export type BeatAnalyzer = {
    name: string;
    /** Analyzer version and model for the beats file. */
    info(): Promise<AnalyzerInfo>;
    analyze(input: string, output: string): Promise<void>;
};
/**
 * beat_this (beats and downbeats; MIT code and weights), run through its own `beat_this`
 * command: `VISUALFRIES_BEAT_THIS` or `beat_this` on the PATH. `model` is a checkpoint name
 * (`final0` default, `small0` is about twice as fast). PyTorch threads are capped (default 4):
 * results are identical for any thread count and a busy machine is much faster with fewer.
 */
export declare function beatThis(opts?: {
    executable?: string;
    model?: string;
    threads?: number;
}): BeatAnalyzer;
export declare function commandBeats(template: string, opts?: {
    name?: string;
    version?: string;
}): BeatAnalyzer;
export type AnalyzerBeats = {
    times: number[];
    /** Position in the bar per beat (1 = downbeat), or null when the tool gave no downbeats. */
    positions: number[] | null;
    analyzer?: Partial<AnalyzerInfo>;
};
/**
 * Reads what an analyzer wrote. Accepted:
 * - text, one beat per line: `time` or `time<TAB or space>position` (1 = downbeat), `#` comments
 * - JSON `{ "beats": [0.5, …] | [{ "time", "beat" }, …], "downbeats"?: [...], "analyzer"? }`
 *   or a plain array of times
 */
export declare function parseAnalyzerOutput(text: string): AnalyzerBeats;
/** SHA-256 of a file, hex. */
export declare function fileSha256(file: string): Promise<string>;
/**
 * Turns analyzer beats and the decoded music into a beats file: drops beats placed in silence
 * before or after the music, numbers bars (beats before the first downbeat are bar 0), and
 * measures RMS energy per beat and per bar.
 */
export declare function buildBeatsFile(beats: AnalyzerBeats, samples: Float32Array, source: {
    file: string;
    sha256: string;
}, analyzer: AnalyzerInfo): {
    file: BeatsFile;
    dropped: number;
};
/** The beats file as JSON with one beat and one bar per line. */
export declare function formatBeatsFile(file: BeatsFile): string;
export type BeatsResult = {
    output: string;
    analyzer: AnalyzerInfo;
    tempo: number;
    beatsPerBar: number | null;
    beats: number;
    bars: number;
    /** Beats the analyzer placed in silence, left out. */
    dropped: number;
    seconds: number;
};
/** Default beats file for a music file: `music.mp3` → `music.beats.json`. */
export declare function defaultBeatsPath(music: string): string;
/**
 * Analyses a music file once and writes its beats file (see `BeatsFileShape`). Render and
 * `check` only ever read that file. Default analyzer: `beatThis()`.
 */
export declare function analyzeBeats(music: string, opts?: {
    output?: string;
    analyzer?: BeatAnalyzer;
    onProgress?: (message: string) => void;
}): Promise<BeatsResult>;
