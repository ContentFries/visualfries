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
 * The loudest `window` seconds (default 100 ms, a whole number of 10 ms hops) in LUFS, windows
 * every 10 ms; a sound shorter than the window counts over the whole window. The measure of
 * short sounds (effects).
 */
export declare function maxShortLoudness(samples: Float32Array, window?: number): number;
/** True peak in dBTP (sample peak included). */
export declare function truePeak(samples: Float32Array): number;
/**
 * Gain per sample frame (0–1) that keeps the true peak of `samples` at or under `ceiling` dBTP.
 * Each frame's needed gain is held (minimum) over ±5 ms and the result averaged over ±5 ms, so
 * the gain starts falling 10 ms before a peak and is never above what any frame needs; it then
 * rises back with a 50 ms release time constant (about 195 ms to recover from a 6 dB dip to
 * within 0.1 dB). Null when nothing needs limiting.
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
 * corrected for what the limiter took. The first correction adds the shortfall; later ones step
 * along the secant of the last two rounds (limiting makes loudness grow slower than the gain),
 * at most 12 dB a round and 30 dB over the plain gain, until within 0.05 LU or after eight
 * rounds. A silent mix stays silent.
 */
export declare function normalizeLoudness(samples: Float32Array, target: number, ceiling: number): Normalized;
/** Multiplies interleaved stereo samples by a per-frame gain, in place. */
export declare function applyGain(samples: Float32Array, gain: Float32Array): void;
