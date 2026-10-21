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
 * K-weighted power per sample frame: the sum over both channels of the squared K-weighted
 * signal. Float64 so long programs sum without drift.
 */
function weightedPower(samples) {
    const frames = samples.length >> 1;
    const out = new Float64Array(frames);
    for (let ch = 0; ch < 2; ch++) {
        // Two biquads in series (direct form I).
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0;
        for (let n = 0; n < frames; n++) {
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
            out[n] += z * z;
        }
    }
    return out;
}
const loudnessOf = (meanPower) => meanPower > 0 ? -0.691 + 10 * Math.log10(meanPower) : SILENT;
/**
 * Integrated loudness in LUFS: 400 ms blocks every 100 ms, the absolute gate at −70 LUFS and the
 * relative gate 10 LU under the loudness of the blocks above it. Shorter than one block, or
 * silent: -Infinity.
 */
export function integratedLoudness(samples) {
    const power = weightedPower(samples);
    const step = RATE / 10;
    const steps = Math.floor(power.length / step);
    const sums = new Float64Array(steps);
    for (let k = 0; k < steps; k++) {
        let s = 0;
        for (let n = k * step; n < (k + 1) * step; n++)
            s += power[n];
        sums[k] = s;
    }
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
 * The loudest `window` seconds (default 100 ms) in LUFS, windows every 10 ms; a sound shorter
 * than the window counts over the whole window. The measure of short sounds (effects).
 */
export function maxShortLoudness(samples, window = 0.1) {
    const power = weightedPower(samples);
    const size = Math.round(window * RATE);
    const hop = RATE / 100;
    const prefix = new Float64Array(power.length + 1);
    for (let n = 0; n < power.length; n++)
        prefix[n + 1] = prefix[n] + power[n];
    let best = 0;
    for (let start = 0; start === 0 || start + size <= power.length; start += hop) {
        const end = Math.min(power.length, start + size);
        best = Math.max(best, prefix[end] - prefix[start]);
        if (end === power.length)
            break;
    }
    return loudnessOf(best / size);
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
    const x = new Float64Array(frames + TAPS - 1 + DELAY);
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
/** Lookahead and smoothing radius of the limiter (5 ms each side). */
const LIMIT_RADIUS = RATE / 200;
/** Release time constant of the limiter. */
const LIMIT_RELEASE = 0.05;
/**
 * Gain per sample frame (0–1) that keeps the true peak of `samples` at or under `ceiling` dBTP.
 * Each frame's needed gain is held over ±5 ms and averaged over ±5 ms, so the gain starts
 * falling 5 ms before a peak and is never above what any frame needs; it then rises back with
 * a 50 ms release. Null when nothing needs limiting.
 */
export function limiterGain(samples, ceiling) {
    const env = peakEnvelope(samples);
    const c = linear(ceiling);
    const frames = env.length;
    let needed = false;
    const need = new Float32Array(frames);
    for (let n = 0; n < frames; n++) {
        need[n] = env[n] > c ? c / env[n] : 1;
        if (need[n] < 1)
            needed = true;
    }
    if (!needed)
        return null;
    const r = LIMIT_RADIUS;
    // Minimum over [n − r, n + r] (monotonic queue).
    const held = new Float32Array(frames);
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
    // Mean over [n − r, n + r]; outside the signal the gain counts as the edge value.
    const prefix = new Float64Array(frames + 1);
    for (let n = 0; n < frames; n++)
        prefix[n + 1] = prefix[n] + held[n];
    const gain = new Float32Array(frames);
    const release = 1 - Math.exp(-1 / (LIMIT_RELEASE * RATE));
    let previous = 1;
    for (let n = 0; n < frames; n++) {
        const from = Math.max(0, n - r);
        const to = Math.min(frames, n + r + 1);
        const mean = (prefix[to] -
            prefix[from] +
            (n - r < 0 ? (r - n) * held[0] : 0) +
            (n + r + 1 > frames ? (n + r + 1 - frames) * held[frames - 1] : 0)) /
            (2 * r + 1);
        const g = Math.min(mean, previous + (1 - previous) * release);
        gain[n] = g;
        previous = g;
    }
    return gain;
}
/** Margin under the ceiling the limiter aims at: the gain curve rounds peaks slightly. */
const CEILING_MARGIN = 0.05;
/**
 * Brings a mix to `target` LUFS integrated with its true peak at or under `ceiling` dBTP: one
 * gain for the whole mix, then the limiter where peaks would pass the ceiling, then the gain
 * corrected by what the limiter took (up to four rounds, until within 0.05 LU). A silent mix
 * stays silent.
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
    let gain = target - input;
    let out = new Float32Array(samples.length);
    let limiter = null;
    let lufs = input;
    for (let round = 0; round < 4; round++) {
        const g = linear(gain);
        for (let i = 0; i < samples.length; i++)
            out[i] = samples[i] * g;
        limiter = limiterGain(out, ceiling - CEILING_MARGIN);
        if (limiter)
            applyGain(out, limiter);
        lufs = integratedLoudness(out);
        if (Math.abs(lufs - target) < 0.05)
            break;
        gain += target - lufs;
    }
    let reduction = 0;
    if (limiter)
        for (let n = 0; n < limiter.length; n++)
            reduction = Math.min(reduction, db(limiter[n]));
    // A last safety net: the true peak after limiting must be under the ceiling.
    let peak = truePeak(out);
    if (peak > ceiling) {
        const trim = linear(ceiling - peak - 0.01);
        out = out.map((x) => x * trim);
        gain += ceiling - peak - 0.01;
        lufs = integratedLoudness(out);
        peak = truePeak(out);
    }
    return { input, gain, limiter, reduction, lufs, truePeak: peak, samples: out };
}
/** Multiplies interleaved stereo samples by a per-frame gain, in place. */
export function applyGain(samples, gain) {
    for (let n = 0; n < gain.length; n++) {
        samples[2 * n] *= gain[n];
        samples[2 * n + 1] *= gain[n];
    }
}
