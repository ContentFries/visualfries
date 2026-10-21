/**
 * Loudness of interleaved stereo float samples at 48 kHz, as ITU-R BS.1770-4 measures it:
 * K-weighting, gated integrated loudness, short-window loudness and true peak (4× oversampled),
 * plus a true-peak limiter and the normalisation of a finished mix. Pure and deterministic: the
 * same samples give the same numbers and the same output bytes on every run.
 */
/** Sample rate of every mix. The K-weighting coefficients below are for this rate. */
export const RATE = 48000;
/** Loudness of silence. */
export const SILENT = -Infinity;
// BS.1770-4 table 1 (high shelf) and table 2 (high pass) at 48 kHz.
const SHELF = {
    b: [1.53512485958697, -2.69169618940638, 1.19839281085285],
    a: [-1.69065929318241, 0.73248077421585]
};
const HIGHPASS = { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] };
/**
 * K-weighted power summed over both channels in consecutive hops of `hop` sample frames (a
 * partial last hop is kept). Streams over the samples: no per-frame buffer.
 */
function weightedPowerSums(samples, hop) {
    const frames = samples.length >> 1;
    const sums = new Float64Array(Math.ceil(frames / hop));
    for (let ch = 0; ch < 2; ch++) {
        // Two biquads in series (direct form I).
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0;
        for (let k = 0; k < sums.length; k++) {
            let sum = 0;
            const to = Math.min(frames, (k + 1) * hop);
            for (let n = k * hop; n < to; n++) {
                const x = samples[2 * n + ch];
                const y = SHELF.b[0] * x + SHELF.b[1] * x1 + SHELF.b[2] * x2 - SHELF.a[0] * y1 - SHELF.a[1] * y2;
                x2 = x1;
                x1 = x;
                const z = HIGHPASS.b[0] * y +
                    HIGHPASS.b[1] * y1 +
                    HIGHPASS.b[2] * y2 -
                    HIGHPASS.a[0] * z1 -
                    HIGHPASS.a[1] * z2;
                y2 = y1;
                y1 = y;
                z2 = z1;
                z1 = z;
                sum += z * z;
            }
            sums[k] += sum;
        }
    }
    return sums;
}
const loudnessOf = (meanPower) => meanPower > 0 ? -0.691 + 10 * Math.log10(meanPower) : SILENT;
/**
 * Integrated loudness in LUFS: 400 ms blocks every 100 ms, the absolute gate at −70 LUFS and the
 * relative gate 10 LU under the loudness of the blocks above it. Shorter than one block, or
 * silent: -Infinity.
 */
export function integratedLoudness(samples) {
    const step = RATE / 10;
    const sums = weightedPowerSums(samples, step);
    // Whole 100 ms steps only.
    const steps = Math.floor((samples.length >> 1) / step);
    const blocks = [];
    for (let j = 0; j + 4 <= steps; j++)
        blocks.push((sums[j] + sums[j + 1] + sums[j + 2] + sums[j + 3]) / (4 * step));
    const gated = (threshold) => blocks.filter((z) => loudnessOf(z) > threshold);
    const absolute = gated(-70);
    if (!absolute.length)
        return SILENT;
    const relative = loudnessOf(absolute.reduce((a, b) => a + b, 0) / absolute.length) - 10;
    const kept = absolute.filter((z) => loudnessOf(z) > relative);
    return loudnessOf(kept.reduce((a, b) => a + b, 0) / kept.length);
}
/**
 * The loudest `window` seconds (default 100 ms, a whole number of 10 ms hops) in LUFS, windows
 * every 10 ms; a sound shorter than the window counts over the whole window. The measure of
 * short sounds (effects).
 */
export function maxShortLoudness(samples, window = 0.1) {
    const hop = RATE / 100;
    const hops = Math.max(1, Math.round(window * 100));
    const sums = weightedPowerSums(samples, hop);
    let best = 0;
    for (let start = 0; start === 0 || start + hops <= sums.length; start++) {
        let sum = 0;
        for (let k = start; k < Math.min(sums.length, start + hops); k++)
            sum += sums[k];
        best = Math.max(best, sum);
        if (start + hops >= sums.length)
            break;
    }
    return loudnessOf(best / (hops * hop));
}
// BS.1770-4 annex 2: the 48-tap, 4-phase interpolation filter of the true-peak meter.
const PHASES = [
    [
        0.001708984375, 0.010986328125, -0.0196533203125, 0.033203125, -0.0594482421875,
        0.1373291015625, 0.97216796875, -0.102294921875, 0.047607421875, -0.026611328125,
        0.014892578125, -0.00830078125
    ],
    [
        -0.0291748046875, 0.029296875, -0.0517578125, 0.089111328125, -0.16650390625, 0.465087890625,
        0.77978515625, -0.2003173828125, 0.1015625, -0.0582275390625, 0.0330810546875, -0.0189208984375
    ],
    [
        -0.0189208984375, 0.0330810546875, -0.0582275390625, 0.1015625, -0.2003173828125, 0.77978515625,
        0.465087890625, -0.16650390625, 0.089111328125, -0.0517578125, 0.029296875, -0.0291748046875
    ],
    [
        -0.00830078125, 0.014892578125, -0.026611328125, 0.047607421875, -0.102294921875, 0.97216796875,
        0.1373291015625, -0.0594482421875, 0.033203125, -0.0196533203125, 0.010986328125, 0.001708984375
    ]
];
const TAPS = 12;
/** The interpolated values at frame n lie around frame n − DELAY. */
const DELAY = 6;
/**
 * Per sample frame, the largest absolute value of either channel, the sample itself or the
 * values the 4× oversampled signal reaches next to it.
 */
function peakEnvelope(samples) {
    const frames = samples.length >> 1;
    const env = new Float32Array(frames);
    for (let n = 0; n < frames; n++)
        env[n] = Math.max(Math.abs(samples[2 * n]), Math.abs(samples[2 * n + 1]));
    const [h0, h1, h2, h3] = PHASES;
    // One channel at a time, with TAPS − 1 zeros before and DELAY after: no bounds checks below.
    // Float32 holds the samples exactly; the products are taken in double precision.
    const x = new Float32Array(frames + TAPS - 1 + DELAY);
    for (let ch = 0; ch < 2; ch++) {
        for (let n = 0; n < frames; n++)
            x[n + TAPS - 1] = samples[2 * n + ch];
        for (let n = 0; n < frames + DELAY; n++) {
            let y0 = 0, y1 = 0, y2 = 0, y3 = 0;
            for (let k = 0; k < TAPS; k++) {
                const v = x[n - k + TAPS - 1];
                y0 += h0[k] * v;
                y1 += h1[k] * v;
                y2 += h2[k] * v;
                y3 += h3[k] * v;
            }
            const peak = Math.max(Math.abs(y0), Math.abs(y1), Math.abs(y2), Math.abs(y3));
            // The interpolated value sits between frames n − DELAY and n − DELAY + 1: both may
            // have to make room for it.
            const a = n - DELAY;
            if (a >= 0 && a < frames && peak > env[a])
                env[a] = peak;
            if (a + 1 >= 0 && a + 1 < frames && peak > env[a + 1])
                env[a + 1] = peak;
        }
    }
    return env;
}
const db = (linear) => (linear > 0 ? 20 * Math.log10(linear) : SILENT);
const linear = (decibels) => Math.pow(10, decibels / 20);
/** True peak in dBTP (sample peak included). */
export function truePeak(samples) {
    const env = peakEnvelope(samples);
    let max = 0;
    for (let n = 0; n < env.length; n++)
        if (env[n] > max)
            max = env[n];
    return db(max);
}
/** Hold and smoothing radius of the limiter: 5 ms each, so it looks 10 ms ahead. */
const LIMIT_RADIUS = RATE / 200;
/** Release time constant of the limiter. */
const LIMIT_RELEASE = 0.05;
/** The smoothing sum starts afresh this often, so rounding never accumulates. */
const RESUM = 4096;
/**
 * Gain per sample frame (0–1) that keeps the true peak of `samples` at or under `ceiling` dBTP.
 * Each frame's needed gain is held (minimum) over ±5 ms and the result averaged over ±5 ms, so
 * the gain starts falling 10 ms before a peak and is never above what any frame needs; it then
 * rises back with a 50 ms release time constant (about 195 ms to recover from a 6 dB dip to
 * within 0.1 dB). Null when nothing needs limiting.
 */
export function limiterGain(samples, ceiling) {
    // The envelope becomes the gain each frame needs, in place.
    const need = peakEnvelope(samples);
    const c = linear(ceiling);
    const frames = need.length;
    let needed = false;
    for (let n = 0; n < frames; n++) {
        need[n] = need[n] > c ? c / need[n] : 1;
        if (need[n] < 1)
            needed = true;
    }
    if (!needed)
        return null;
    const r = LIMIT_RADIUS;
    // Minimum over [n − r, n + r] (monotonic queue).
    const held = new Float32Array(frames);
    {
        const queue = new Int32Array(frames);
        let head = 0, tail = 0, next = 0;
        for (let n = 0; n < frames; n++) {
            for (; next < frames && next <= n + r; next++) {
                while (tail > head && need[queue[tail - 1]] >= need[next])
                    tail--;
                queue[tail++] = next;
            }
            while (queue[head] < n - r)
                head++;
            held[n] = need[queue[head]];
        }
    }
    // Mean over [n − r, n + r]; outside the signal the gain counts as the edge value. The gain
    // goes into `need`, which is no longer read.
    const gain = need;
    const at = (i) => held[i < 0 ? 0 : i >= frames ? frames - 1 : i];
    const release = 1 - Math.exp(-1 / (LIMIT_RELEASE * RATE));
    let previous = 1;
    let sum = 0;
    for (let n = 0; n < frames; n++) {
        if (n % RESUM === 0) {
            sum = 0;
            for (let i = n - r; i <= n + r; i++)
                sum += at(i);
        }
        else
            sum += at(n + r) - at(n - r - 1);
        const g = Math.min(sum / (2 * r + 1), previous + (1 - previous) * release);
        gain[n] = g;
        previous = g;
    }
    return gain;
}
/** Margin under the ceiling the limiter aims at: the gain curve rounds peaks slightly. */
const CEILING_MARGIN = 0.05;
/** Loudness within this many LU of the target is reached. */
const TOLERANCE = 0.05;
/** Rounds of gain, limiting and measuring at most. */
const MAX_ROUNDS = 8;
/** dB one round may change the gain by at most. */
const MAX_STEP = 12;
/** dB the limiter may be asked to make up at most, over the plain gain. */
const MAX_MAKEUP = 30;
/**
 * Brings a mix to `target` LUFS integrated with its true peak at or under `ceiling` dBTP: one
 * gain for the whole mix, then the limiter where peaks would pass the ceiling, then the gain
 * corrected for what the limiter took. The first correction adds the shortfall; later ones step
 * along the secant of the last two rounds (limiting makes loudness grow slower than the gain),
 * at most 12 dB a round and 30 dB over the plain gain, until within 0.05 LU or after eight
 * rounds. A silent mix stays silent.
 */
export function normalizeLoudness(samples, target, ceiling) {
    const input = integratedLoudness(samples);
    if (input === SILENT)
        return {
            input,
            gain: 0,
            limiter: null,
            reduction: 0,
            lufs: SILENT,
            truePeak: truePeak(samples),
            samples: Float32Array.from(samples)
        };
    const out = new Float32Array(samples.length);
    let limiter = null;
    const run = (gain) => {
        const g = linear(gain);
        for (let i = 0; i < samples.length; i++)
            out[i] = samples[i] * g;
        limiter = limiterGain(out, ceiling - CEILING_MARGIN);
        if (limiter)
            applyGain(out, limiter);
        return integratedLoudness(out);
    };
    const start = target - input;
    let gain = start;
    let lufs = run(gain);
    let previous = null;
    for (let round = 1; round < MAX_ROUNDS && Math.abs(lufs - target) >= TOLERANCE; round++) {
        // Loudness per dB of gain: 1 without limiting, less the more the limiter takes.
        let slope = 1;
        if (previous && gain !== previous.gain)
            slope = Math.min(1, Math.max(0.05, (lufs - previous.lufs) / (gain - previous.gain)));
        previous = { gain, lufs };
        // Bounded: a sound the limiter cannot make louder (sparse clicks) must not run away.
        const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, (target - lufs) / slope));
        const next = Math.min(start + MAX_MAKEUP, gain + step);
        if (next === gain)
            break;
        gain = next;
        lufs = run(gain);
    }
    let reduction = 0;
    const curve = limiter;
    if (curve)
        for (let n = 0; n < curve.length; n++)
            reduction = Math.min(reduction, db(curve[n]));
    // A last safety net: the true peak after limiting must be under the ceiling.
    let peak = truePeak(out);
    if (peak > ceiling) {
        const trim = linear(ceiling - peak - 0.01);
        for (let i = 0; i < out.length; i++)
            out[i] *= trim;
        gain += ceiling - peak - 0.01;
        lufs = integratedLoudness(out);
        peak = truePeak(out);
    }
    return { input, gain, limiter: curve, reduction, lufs, truePeak: peak, samples: out };
}
/** Multiplies interleaved stereo samples by a per-frame gain, in place. */
export function applyGain(samples, gain) {
    for (let n = 0; n < gain.length; n++) {
        samples[2 * n] *= gain[n];
        samples[2 * n + 1] *= gain[n];
    }
}
