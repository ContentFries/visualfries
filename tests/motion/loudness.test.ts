// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
	RATE,
	integratedLoudness,
	limiterGain,
	maxShortLoudness,
	normalizeLoudness,
	truePeak
} from '$lib/motion/loudness.js';

/** Interleaved stereo: a sine of `dbfs` peak in both channels, `seconds` long. */
function sine(seconds: number, dbfs: number, hz = 1000, phase = 0): Float32Array {
	const frames = Math.round(seconds * RATE);
	const a = Math.pow(10, dbfs / 20);
	const out = new Float32Array(frames * 2);
	for (let n = 0; n < frames; n++)
		out[2 * n] = out[2 * n + 1] = a * Math.sin((2 * Math.PI * hz * n) / RATE + phase);
	return out;
}

const concat = (...parts: Float32Array[]) => {
	const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
};

describe('loudness meter (BS.1770-4)', () => {
	// EBU Tech 3341, cases 1 and 2: a stereo 1 kHz sine at −23 / −33 dBFS reads −23 / −33 LUFS.
	it('reads a stereo 1 kHz sine at its level in dBFS', () => {
		expect(integratedLoudness(sine(5, -23))).toBeCloseTo(-23, 1);
		expect(integratedLoudness(sine(5, -33))).toBeCloseTo(-33, 1);
	});

	// EBU Tech 3341, case 3 (shortened): the quiet parts fall under the relative gate; ±0.1 LU.
	it('gates out passages more than 10 LU under the rest', () => {
		const signal = concat(sine(4, -36), sine(20, -23), sine(4, -36));
		expect(Math.abs(integratedLoudness(signal) + 23)).toBeLessThan(0.1);
	});

	it('reads silence and anything shorter than a block as silent', () => {
		expect(integratedLoudness(new Float32Array(RATE * 4))).toBe(-Infinity);
		expect(integratedLoudness(sine(0.3, -10))).toBe(-Infinity);
	});

	it('finds the loudest 100 ms of a short sound', () => {
		// 50 ms at −20 dBFS in 1 s of silence: half the window's power, so 3 dB under the sine.
		const burst = concat(new Float32Array(RATE), sine(0.05, -20), new Float32Array(RATE));
		expect(maxShortLoudness(burst)).toBeCloseTo(-23, 0);
		expect(maxShortLoudness(sine(1, -20))).toBeCloseTo(-20, 1);
	});

	// A sine at a quarter of the sample rate, 45° off: every sample sits at 0.707 of the peak.
	it('finds the true peak between samples', () => {
		const signal = sine(1, 0, RATE / 4, Math.PI / 4);
		let sampled = 0;
		for (const x of signal) sampled = Math.max(sampled, Math.abs(x));
		expect(20 * Math.log10(sampled)).toBeCloseTo(-3.01, 1);
		expect(Math.abs(truePeak(signal))).toBeLessThan(0.3);
	});
});

describe('true-peak limiter and normalisation', () => {
	it('keeps every true peak under the ceiling and leaves quieter passages alone', () => {
		const signal = concat(sine(1, -12), sine(0.2, -0.5), sine(1, -12));
		const gain = limiterGain(signal, -6)!;
		expect(gain).not.toBeNull();
		const out = signal.map((x, i) => x * gain[i >> 1]);
		expect(truePeak(out)).toBeLessThanOrEqual(-6 + 0.02);
		// Far from the loud part the gain is back to 1.
		expect(gain[Math.round(0.5 * RATE)]).toBe(1);
		expect(gain[gain.length - 1]).toBeGreaterThan(0.999);
		expect(limiterGain(sine(1, -12), -6)).toBeNull();
	});

	it('brings a mix to −14 LUFS with its true peak at or under −1 dBTP', () => {
		// A quiet sine with sparse loud clicks: the gain alone would push the clicks over 0 dBFS.
		const signal = sine(6, -30, 440);
		for (let s = 0.5; s < 6; s += 0.5) signal[2 * Math.round(s * RATE)] = 0.4;
		const result = normalizeLoudness(signal, -14, -1);
		expect(result.input).toBeCloseTo(-30 - 0.6, 0);
		expect(Math.abs(result.lufs + 14)).toBeLessThan(0.05);
		expect(result.truePeak).toBeLessThanOrEqual(-1);
		expect(result.reduction).toBeLessThan(-1);
		expect(integratedLoudness(result.samples)).toBe(result.lufs);
	});

	it('gives the same bytes twice', () => {
		const signal = concat(sine(2, -20, 300), sine(1, -3, 5000), sine(2, -25, 120));
		const a = normalizeLoudness(signal, -14, -1).samples;
		const b = normalizeLoudness(signal, -14, -1).samples;
		expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
	});

	it('leaves silence silent', () => {
		const result = normalizeLoudness(new Float32Array(RATE * 2), -14, -1);
		expect(result.gain).toBe(0);
		expect(result.samples.every((x) => x === 0)).toBe(true);
	});
});
