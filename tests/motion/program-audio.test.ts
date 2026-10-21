// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadMotionProject, motionProgram } from '../../src/lib/motion/node.js';
import { mixProgram, writeWav, type MixedProgram } from '../../src/lib/motion/audio.js';
import {
	RATE,
	integratedLoudness,
	maxShortLoudness,
	truePeak
} from '../../src/lib/motion/loudness.js';
import type { ResolvedProgram } from '../../src/lib/motion/program.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const FPS = 30;

/** Interleaved stereo float of `seconds`, each frame from `f(n)` (both channels). */
function stereo(seconds: number, f: (n: number) => number): Float32Array {
	const frames = Math.round(seconds * RATE);
	const out = new Float32Array(frames * 2);
	for (let n = 0; n < frames; n++) out[2 * n] = out[2 * n + 1] = f(n);
	return out;
}
const clicks = (seconds: number, at: number[], value = 0.6) => {
	const set = new Set(at);
	return stereo(seconds, (n) => (set.has(n) ? value : 0));
};
const sine = (seconds: number, dbfs: number, hz: number) => {
	const a = Math.pow(10, dbfs / 20);
	return stereo(seconds, (n) => a * Math.sin((2 * Math.PI * hz * n) / RATE));
};

/** Sample frames (left channel) whose magnitude passes half the largest. */
function peaks(samples: Float32Array): number[] {
	let max = 0;
	for (let i = 0; i < samples.length; i += 2) max = Math.max(max, Math.abs(samples[i]));
	const out: number[] = [];
	for (let n = 0; n < samples.length >> 1; n++)
		if (max > 0 && Math.abs(samples[2 * n]) > max / 2) out.push(n);
	return out;
}
const near = (actual: number[], expected: number[]) => {
	expect(actual.length).toBe(expected.length);
	actual.forEach((a, i) =>
		expect(Math.abs(a - expected[i]), `peak ${i}: ${a}`).toBeLessThanOrEqual(1)
	);
};
const left = (samples: Float32Array, from: number, to: number) => {
	const out: number[] = [];
	for (let n = from; n < to; n++) out.push(samples[2 * n]);
	return out;
};
const bytes = (s: Float32Array) => Buffer.from(s.buffer, s.byteOffset, s.byteLength);

describe.skipIf(!hasFfmpeg)('program audio mix', () => {
	let dir: string;
	let n = 0;
	/** Resolves a project written into the test folder, through the node tooling. */
	async function resolve(project: object): Promise<ResolvedProgram> {
		const file = path.join(dir, `p${++n}.vf.json`);
		await fs.writeFile(file, JSON.stringify({ size: [320, 180], fps: FPS, ...project }));
		const { program } = await motionProgram(await loadMotionProject(file));
		const errors = program.diagnostics.filter((d) => d.level === 'error');
		expect(errors).toEqual([]);
		return program;
	}
	const mix = (program: ResolvedProgram, opts: { stems?: boolean; normalize?: boolean } = {}) =>
		mixProgram(program, { dir, stems: true, normalize: false, ...opts }) as Promise<MixedProgram>;

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-program-audio-'));
		const run = (args: string[]) => {
			const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
			if (r.status !== 0) throw new Error(String(r.stderr));
		};
		run([
			'-f',
			'lavfi',
			'-i',
			'color=black:s=320x180:r=30:d=4',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'v.mp4')
		]);
		// Speech: clicks at known source frames; constant +0.5 and −0.5 (steps would show).
		await writeWav(
			path.join(dir, 'clicks.wav'),
			clicks(4, [4800, 33600, 38400, 52800, 91200, 120000])
		);
		await writeWav(
			path.join(dir, 'up.wav'),
			stereo(4, () => 0.5)
		);
		await writeWav(
			path.join(dir, 'down.wav'),
			stereo(4, () => -0.5)
		);
		await writeWav(path.join(dir, 'tone.wav'), sine(4, -20, 300));
		// Effects and music.
		await writeWav(path.join(dir, 'click.wav'), clicks(0.3, [0]));
		await fs.mkdir(path.join(dir, 'lib', 'sounds'), { recursive: true });
		await writeWav(path.join(dir, 'lib', 'sounds', 'hit.wav'), clicks(0.4, [4800]));
		await fs.writeFile(
			path.join(dir, 'lib', 'sounds.json'),
			JSON.stringify({ sounds: [{ id: 'hit', file: 'sounds/hit.wav', hitMs: 100 }] })
		);
		await writeWav(path.join(dir, 'beat.wav'), clicks(3, [0, 24000, 48000, 72000]));
		await writeWav(path.join(dir, 'bed.wav'), sine(6, -6, 200));
		// A mono file at 44.1 kHz: resampled and played on both sides.
		run([
			'-f',
			'lavfi',
			'-i',
			'sine=frequency=500:sample_rate=44100:duration=3',
			'-ac',
			'1',
			path.join(dir, 'mono.wav')
		]);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const footage = (audio: Record<string, string>) =>
		Object.fromEntries(
			Object.entries(audio).map(([name, file]) => [name, { src: 'v.mp4', audio: file }])
		);

	it('puts every click of speech, effects and music on its expected sample', async () => {
		const program = await resolve({
			footage: footage({ v: 'clicks.wav' }),
			// Program 0–1 s: source 1–2 s; 1–2 s: source 0–1 s.
			cuts: [
				{ source: 'v', in: 1, out: 2 },
				{ source: 'v', in: 0, out: 1 }
			],
			sfx: [
				{ at: 0.5, sound: 'click.wav' },
				// The library says the hit sits 100 ms in: the file starts at 1.1 s.
				{ at: 1.2, sound: 'lib/sounds/hit.wav' }
			],
			music: [{ src: 'beat.wav', from: 0.2, fade: { in: 0, out: 0 } }]
		});
		const { stems } = await mix(program);
		// Source 1.1 s and 1.9 s land at 0.1 s and 0.9 s; source 0.1, 0.7 and 0.8 s at 1.1, 1.7, 1.8 s.
		near(peaks(stems!.speech), [4800, 43200, 52800, 81600, 86400]);
		near(peaks(stems!.sfx), [24000, 57600]);
		near(peaks(stems!.music), [9600, 33600, 57600, 81600]);
	});

	it('crossfades at every audio edit point without a step', async () => {
		const program = await resolve({
			footage: footage({ up: 'up.wav', down: 'down.wav' }),
			cuts: [
				{ source: 'up', in: 0, out: 1 },
				{ source: 'down', in: 1, out: 2 },
				{ source: 'up', in: 2, out: 3, audio: { crossfade: 0.05 } }
			]
		});
		const { samples } = await mix(program, { stems: false });
		// A hard cut from +0.5 to −0.5 would jump by 1.0 in one sample; the 10 ms equal-power
		// crossfade moves at most 0.5·√2·(π/2)/480 ≈ 0.0023 per sample.
		let step = 0;
		for (let n = 1; n < samples.length >> 1; n++)
			step = Math.max(step, Math.abs(samples[2 * n] - samples[2 * (n - 1)]));
		expect(step).toBeLessThan(0.0025);
		// Equal power: the sign changes on the edit point itself.
		const crossing = (from: number) => {
			const s = left(samples, from - 2000, from + 2000);
			return from - 2000 + s.findIndex((x, i) => i > 0 && Math.sign(x) !== Math.sign(s[i - 1]));
		};
		expect(Math.abs(crossing(48000) - 48000)).toBeLessThanOrEqual(1);
		expect(Math.abs(crossing(96000) - 96000)).toBeLessThanOrEqual(1);
		// Away from the edits the level is exactly the source's.
		expect(left(samples, 20000, 20003)).toEqual([0.5, 0.5, 0.5]);
		expect(left(samples, 70000, 70003)).toEqual([-0.5, -0.5, -0.5]);
	});

	it('moves the edit point by exactly the split and keeps the sound in sync', async () => {
		const edit = async (split: number) => {
			const program = await resolve({
				footage: footage({ up: 'up.wav', clicks: 'clicks.wav' }),
				cuts: [
					{ source: 'up', in: 0, out: 1 },
					{ source: 'clicks', in: 1, out: 2, audio: { split } }
				]
			});
			return (await mix(program, { stems: false })).samples;
		};
		for (const split of [-0.25, 0, 0.25]) {
			const samples = await edit(split);
			const at = 48000 + Math.round(split * RATE);
			// The outgoing constant sound fades out centred on the edit: half power there.
			expect(samples[2 * at] ** 2).toBeCloseTo(0.25 / 2, 3);
			expect(samples[2 * (at - 300)]).toBeCloseTo(0.5, 6);
			expect(samples[2 * (at + 300)]).toBeCloseTo(0, 6);
		}
		// The click at source 0.8 s belongs 0.2 s before the cut: heard with the J cut only, in sync.
		const j = await edit(-0.25);
		expect(j[2 * 38400]).toBeCloseTo(0.6, 6);
		const hard = await edit(0);
		expect(hard[2 * 38400]).toBeCloseTo(0.5, 6);
	});

	it('mixes the same sound with or without a transition; a transition sound only adds an effect', async () => {
		const cuts = (transition?: object | string) => [
			{ source: 'v', in: 0, out: 1 },
			{ source: 'v', in: 2, out: 3.5, ...(transition ? { transition } : {}) }
		];
		const base = { footage: footage({ v: 'tone.wav' }), music: [{ src: 'bed.wav' }] };
		const plain = await mix(await resolve({ ...base, cuts: cuts() }), { normalize: true });
		const push = await mix(await resolve({ ...base, cuts: cuts('push') }), { normalize: true });
		const wipe = await mix(
			await resolve({ ...base, cuts: cuts({ type: 'wipe', duration: 0.6 }) }),
			{
				normalize: true
			}
		);
		expect(bytes(push.samples).equals(bytes(plain.samples))).toBe(true);
		expect(bytes(wipe.samples).equals(bytes(plain.samples))).toBe(true);

		const program = await resolve({ ...base, cuts: cuts({ type: 'push', sound: 'click.wav' }) });
		const event = program.events.find((e) => e.kind === 'transition')!;
		expect(program.audio.sfx).toEqual([
			expect.objectContaining({
				owner: 'cut2.transition.sound',
				file: 'click.wav',
				at: event.frame / FPS
			})
		]);
		const sounded = await mix(program);
		const unmixed = await mix(await resolve({ ...base, cuts: cuts() }));
		expect(bytes(sounded.stems!.speech).equals(bytes(unmixed.stems!.speech))).toBe(true);
		expect(bytes(sounded.stems!.music).equals(bytes(unmixed.stems!.music))).toBe(true);
		near(peaks(sounded.stems!.sfx), [(event.frame / FPS) * RATE]);
	});

	it('sets effects and music at their level under the speech, with gain, keys and fades', async () => {
		const project = (extra: object = {}) => ({
			footage: footage({ v: 'tone.wav' }),
			cuts: [{ source: 'v', in: 0, out: 3 }],
			sfx: [{ at: 1, sound: 'mono.wav' }],
			music: [{ src: 'bed.wav' }],
			...extra
		});
		const { stems, report } = await mix(await resolve(project()));
		const speech = integratedLoudness(stems!.speech);
		expect(report.speech).toBeCloseTo(speech, 1);
		expect(maxShortLoudness(stems!.sfx) - speech).toBeCloseTo(-10, 1);
		// The bed fades out over its last second: measured before that.
		const steady = stems!.music.subarray(0, 2 * RATE * 2);
		expect(integratedLoudness(steady) - speech).toBeCloseTo(-15, 1);

		const custom = await mix(
			await resolve(
				project({
					mix: { sfx: -6, music: -20 },
					sfx: [{ at: 1, sound: 'mono.wav', gain: -3 }],
					music: [
						{
							src: 'bed.wav',
							gain: 2,
							fade: { in: 0.5, out: 0 },
							keys: [
								{ at: 2, gain: 0 },
								{ at: 2.5, gain: -12 }
							]
						}
					]
				})
			)
		);
		expect(maxShortLoudness(custom.stems!.sfx) - speech).toBeCloseTo(-9, 1);
		const music = custom.stems!.music;
		const level = (from: number, to: number) =>
			integratedLoudness(music.subarray(Math.round(from * RATE) * 2, Math.round(to * RATE) * 2));
		expect(level(0.5, 2) - speech).toBeCloseTo(-18, 1);
		expect(level(2.5, 3) - speech).toBeCloseTo(-30, 1);
		// The fade-in rises from silence over half a second, along a quarter sine.
		expect(Math.abs(music[0])).toBeLessThan(1e-3);
		const rms = (from: number) => {
			const s = left(music, Math.round(from * RATE), Math.round(from * RATE) + 480);
			return Math.sqrt(s.reduce((a, x) => a + x * x, 0) / s.length);
		};
		expect(rms(0.245) / rms(1)).toBeCloseTo(Math.sin(Math.PI / 4), 1);
		expect(custom.report.pieces.map((p) => p.stem)).toEqual(['speech', 'sfx', 'music']);
	});

	it('brings the finished mix to −14 LUFS with true peaks at or under −1 dBTP, as ffmpeg measures it too', async () => {
		const program = await resolve({
			footage: footage({ v: 'tone.wav' }),
			cuts: [{ source: 'v', in: 0, out: 3 }],
			sfx: [0.4, 1.1, 1.9, 2.5].map((at) => ({ at, sound: 'click.wav', gain: 20 })),
			music: [{ src: 'bed.wav' }]
		});
		const done = await mixProgram(program, { dir });
		expect(Math.abs(done!.report.lufs + 14)).toBeLessThan(0.05);
		expect(done!.report.truePeak).toBeLessThanOrEqual(-1);
		expect(truePeak(done!.samples)).toBeLessThanOrEqual(-1);
		expect(done!.samples.length).toBe(3 * RATE * 2);
		const file = path.join(dir, 'master.wav');
		await writeWav(file, done!.samples);
		const r = spawnSync('ffmpeg', [
			'-hide_banner',
			'-nostats',
			'-i',
			file,
			'-af',
			'ebur128=peak=true',
			'-f',
			'null',
			'-'
		]);
		const log = String(r.stderr);
		const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(log.slice(log.lastIndexOf('Summary')))![1]);
		const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(log.slice(log.lastIndexOf('Summary')))![1]);
		expect(Math.abs(lufs + 14)).toBeLessThanOrEqual(0.5);
		expect(peak).toBeLessThanOrEqual(-0.9);
	});

	it('gives byte-identical audio twice, and stems that add up to the mix', async () => {
		const project = {
			footage: footage({ v: 'clicks.wav', t: 'tone.wav' }),
			cuts: [
				{ source: 't', in: 0, out: 1.3 },
				{ source: 'v', in: 1, out: 2, audio: { split: -0.1, gain: -3 } },
				{ source: 't', in: 2, out: 3, transition: { type: 'push', sound: 'lib/sounds/hit.wav' } }
			],
			sfx: [{ at: 0.7, sound: 'mono.wav' }],
			music: [{ src: 'bed.wav', from: -0.5, keys: [{ at: 1, gain: 3 }] }]
		};
		const a = await mixProgram(await resolve(project), { dir, stems: true });
		const b = await mixProgram(await resolve(project), { dir, stems: true });
		expect(bytes(a!.samples).equals(bytes(b!.samples))).toBe(true);
		// Asking for stems does not change the mix.
		const plain = await mixProgram(await resolve(project), { dir });
		expect(bytes(plain!.samples).equals(bytes(a!.samples))).toBe(true);
		for (const stem of ['speech', 'sfx', 'music'] as const)
			expect(bytes(a!.stems![stem]).equals(bytes(b!.stems![stem]))).toBe(true);
		let off = 0;
		for (let i = 0; i < a!.samples.length; i++)
			off = Math.max(
				off,
				Math.abs(a!.stems!.speech[i] + a!.stems!.sfx[i] + a!.stems!.music[i] - a!.samples[i])
			);
		expect(off).toBeLessThan(1e-5);
	});

	it('reports a sound file that does not exist', async () => {
		const file = path.join(dir, 'missing.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [320, 180],
				fps: FPS,
				footage: footage({ v: 'tone.wav' }),
				cuts: [
					{ source: 'v', in: 0, out: 1 },
					{ source: 'v', in: 1, out: 2, transition: { type: 'push', sound: 'nope.wav' } }
				],
				sfx: [{ id: 'boom', at: 0.5, sound: 'boom.wav' }]
			})
		);
		const { program } = await motionProgram(await loadMotionProject(file));
		expect(program.diagnostics.filter((d) => d.level === 'error')).toEqual([
			expect.objectContaining({
				item: 'boom',
				message: expect.stringContaining('"boom.wav" not found')
			}),
			expect.objectContaining({
				item: 'cut2.transition.sound',
				message: expect.stringContaining('"nope.wav" not found')
			})
		]);
	});
});
