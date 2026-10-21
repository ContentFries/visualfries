/**
 * Loudness of interleaved stereo float samples at 48 kHz, as ITU-R BS.1770-4 measures it:
 * K-weighting, gated integrated loudness, short-window loudness and true peak (4× oversampled),
 * plus a true-peak limiter and the normalisation of a finished mix. Pure and deterministic: the
 * same samples give the same numbers and the same output bytes on every run.
 */
/** Sample rate of every mix. The K-weighting coefficients below are for this rate. */
export declare const RATE = 48000;
/** Loudness of silence. */
export declare const SILENT: number;
/**
 * Integrated loudness in LUFS: 400 ms blocks every 100 ms, the absolute gate at −70 LUFS and the
 * relative gate 10 LU under the loudness of the blocks above it. Shorter than one block, or
 * silent: -Infinity.
 */
export declare function integratedLoudness(samples: Float32Array): number;
/**
 * The loudest `window` seconds (default 100 ms) in LUFS, windows every 10 ms; a sound shorter
 * than the window counts over the whole window. The measure of short sounds (effects).
 */
export declare function maxShortLoudness(samples: Float32Array, window?: number): number;
/** True peak in dBTP (sample peak included). */
export declare function truePeak(samples: Float32Array): number;
/**
 * Gain per sample frame (0–1) that keeps the true peak of `samples` at or under `ceiling` dBTP.
 * Each frame's needed gain is held over ±5 ms and averaged over ±5 ms, so the gain starts
 * falling 5 ms before a peak and is never above what any frame needs; it then rises back with
 * a 50 ms release. Null when nothing needs limiting.
 */
export declare function limiterGain(samples: Float32Array, ceiling: number): Float32Array | null;
export type Normalized = {
    /** Loudness before, LUFS. */
    input: number;
    /** dB applied to the whole mix. */
    gain: number;
    /** Gain per sample frame on top of `gain`, where the limiter acted; null: it did not. */
    limiter: Float32Array | null;
    /** Largest gain reduction of the limiter, dB (0: none). */
    reduction: number;
    /** Loudness and true peak after. */
    lufs: number;
    truePeak: number;
    samples: Float32Array;
};
/**
 * Brings a mix to `target` LUFS integrated with its true peak at or under `ceiling` dBTP: one
 * gain for the whole mix, then the limiter where peaks would pass the ceiling, then the gain
 * corrected by what the limiter took (up to four rounds, until within 0.05 LU). A silent mix
 * stays silent.
 */
export declare function normalizeLoudness(samples: Float32Array, target: number, ceiling: number): Normalized;
/** Multiplies interleaved stereo samples by a per-frame gain, in place. */
export declare function applyGain(samples: Float32Array, gain: Float32Array): void;
