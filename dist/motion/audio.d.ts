import type { ResolvedProgram } from './program.js';
/**
 * The program mixer (Node). Every piece of the resolved program is decoded with ffmpeg to 48 kHz
 * stereo float and added sample-exactly into one buffer per stem, in a fixed order (speech by
 * cut, effects and music by program time), so the same program gives the same samples on every
 * run. The mix depends only on `program.audio`: never on segments, caching or transitions.
 *
 * - Speech: each cut's sound at its program time, with equal-power fades centred on the audio
 *   edit points and the cut's gain.
 * - Effects: each sound's loudest 100 ms at `levels.sfx` dB under the speech loudness, plus the
 *   item's gain.
 * - Music: each item's integrated loudness at `levels.music` dB under the speech loudness, plus
 *   its gain, gain keys and fades.
 * - Master: the sum, brought to `master.lufs` integrated with its true peak at or under
 *   `master.truePeak` (one gain, a true-peak limiter where needed, the gain corrected once more).
 *
 * The speech loudness is the integrated loudness of the speech stem as cut; a program without
 * speech uses the master loudness instead.
 */
export type StemName = 'speech' | 'sfx' | 'music';
export declare const STEMS: readonly StemName[];
export type MixReport = {
    /** Integrated loudness of the speech as cut, LUFS; null: no speech or silent. */
    speech: number | null;
    /** What effect and music levels are measured from: the speech loudness, else the target. */
    reference: number;
    /** dB each piece was given before the master gain (level and its own gain). */
    pieces: {
        owner: string;
        stem: StemName;
        gain: number;
    }[];
    /** Integrated loudness of the sum before normalisation, LUFS. */
    input: number;
    /** dB applied to the whole mix, and the limiter's largest reduction (0: it did not act). */
    gain: number;
    limiter: number;
    /** Integrated loudness and true peak of the finished mix. */
    lufs: number;
    truePeak: number;
};
export type MixedProgram = {
    /** Interleaved stereo at 48 kHz, exactly the program's length. */
    samples: Float32Array;
    /** Each stem with the master gain and limiter applied: the stems add up to `samples`. */
    stems: Record<StemName, Float32Array> | null;
    report: MixReport;
};
export type MixOptions = {
    /** Folder the pieces' files are relative to (the project's). */
    dir: string;
    /** Keep the stems (speech, effects, music). */
    stems?: boolean;
    /** false: no loudness normalisation (the sum as mixed). */
    normalize?: boolean;
};
/** Mixes the program's sound. Null when it has none. */
export declare function mixProgram(program: ResolvedProgram, opts: MixOptions): Promise<MixedProgram | null>;
/** Writes interleaved stereo float samples as a 48 kHz 32-bit float WAV file. */
export declare function writeWav(file: string, samples: Float32Array): Promise<void>;
