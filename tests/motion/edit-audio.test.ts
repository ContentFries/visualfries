// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadMotionProject, motionProgram } from '../../src/lib/motion/node.js';
import { writeWav } from '../../src/lib/motion/audio.js';
import { EDGE_RATE, measureEdge } from '../../src/lib/motion/edit-audio.js';
import { RATE } from '../../src/lib/motion/loudness.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** A fixed pseudo-random sequence in [−1, 1): the same noise on every run. */
function noise(seed = 1) {
	let x = seed;
	return () => {
		x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
		return x / 2 ** 31 - 1;
	};
}

type Span = [number, number, number];

/**
 * Mono samples at `rate`: a 200 Hz voice at `db` dBFS inside each [from, to, db] span, over
 * optional white noise and a 330 Hz music bed (dBFS RMS).
 */
function voice(
	seconds: number,
	spans: Span[],
	opts: { rate?: number; noise?: number; bed?: number } = {}
): Float32Array {
	const rate = opts.rate ?? EDGE_RATE;
	const out = new Float32Array(Math.round(seconds * rate));
	const random = noise();
	// Uniform noise in [−a, a) has an RMS of a / √3.
	const hiss = opts.noise === undefined ? 0 : Math.pow(10, opts.noise / 20) * Math.sqrt(3);
	const bed = opts.bed === undefined ? 0 : Math.pow(10, opts.bed / 20) * Math.SQRT2;
	for (let n = 0; n < out.length; n++) {
		const t = n / rate;
		const span = spans.find(([a, b]) => t >= a && t < b);
		const v = span ? Math.pow(10, span[2] / 20) * Math.SQRT2 * Math.sin(2 * Math.PI * 200 * t) : 0;
		out[n] = v + hiss * random() + bed * Math.sin(2 * Math.PI * 330 * t);
	}
	return out;
}

/** Interleaved stereo at 48 kHz of the same sound, for a WAV file. */
function stereo(seconds: number, spans: Span[], opts: { noise?: number; bed?: number } = {}) {
	const mono = voice(seconds, spans, { ...opts, rate: RATE });
	const out = new Float32Array(mono.length * 2);
	mono.forEach((v, n) => (out[2 * n] = out[2 * n + 1] = v));
	return out;
}

/**
 * The take: "alpha" 0.5–1.2 s with its ringing end to 1.5 s (12 dB down), "beta" from 2.0 s
 * (the transcript says 2.1), "gamma" from 3.0 s (the transcript says 2.9), "delta" 3.6–3.9 s
 * with a 40 ms stop (silence) in its middle at 3.73–3.77 s.
 */
const TAKE: Span[] = [
	[0.5, 1.2, -12],
	[1.2, 1.5, -24],
	[2.0, 2.6, -12],
	[3.0, 3.5, -12],
	[3.6, 3.73, -12],
	[3.77, 3.9, -12]
];
const WORDS = [
	{ text: 'alpha', startMs: 500, endMs: 1200 },
	{ text: 'beta', startMs: 2100, endMs: 2600 },
	{ text: 'gamma', startMs: 2900, endMs: 3500 },
	{ text: 'delta', startMs: 3600, endMs: 3900 }
];

describe('speech at an edit point', () => {
	const take = voice(4, TAKE);

	it('is clean in a pause, and where the voice ends or starts right at the point', () => {
		expect(measureEdge(take, 0, 1.7, 'out')).toMatchObject({ clean: true, move: 0 });
		expect(measureEdge(take, 0, 1.5, 'out')).toMatchObject({ clean: true });
		expect(measureEdge(take, 0, 2.0, 'in')).toMatchObject({ clean: true });
	});

	it('says how far a point inside a ringing end must move', () => {
		const edge = measureEdge(take, 0, 1.2, 'out')!;
		expect(edge).toMatchObject({ clean: false, move: 0.3 });
		expect(edge.level).toBeGreaterThan(-30);
	});

	it('says how far a start inside a word must move back, in whole frames', () => {
		expect(measureEdge(take, 0, 2.0667, 'in')).toMatchObject({ clean: false, move: 0.067 });
		// Three steps in: still a whole frame, never 0.
		expect(measureEdge(take, 0, 2.0 + 0.02, 'in')).toMatchObject({ clean: false, move: 0.033 });
	});

	it('calls a voice that ends within half a frame of the point clean', () => {
		expect(measureEdge(take, 0, 1.495, 'out')).toMatchObject({ clean: true, move: 0 });
		expect(measureEdge(take, 0, 2.004, 'in')).toMatchObject({ clean: true, move: 0 });
	});

	it('finds no point within the stretch when the voice never stops', () => {
		const long = voice(3, [[0.5, 3, -12]]);
		expect(measureEdge(long, 0, 1, 'out')).toMatchObject({ clean: false, move: null });
	});

	it('leaves the point to the transcript without speech or with nothing but voice', () => {
		expect(measureEdge(voice(2, [[0, 2, -60]]), 0, 1, 'out')).toBeNull();
		expect(measureEdge(voice(2, [[0, 2, -12]]), 0, 1, 'out')).toBeNull();
	});

	it('measures over room noise: pauses are clean, a ringing end is not', () => {
		// Speech 30 dB over the noise, its ringing end 18 dB over it.
		const noisy = voice(
			4,
			[
				[0.5, 1.2, -15],
				[1.2, 1.5, -27],
				[2.0, 2.6, -15]
			],
			{ noise: -45 }
		);
		expect(measureEdge(noisy, 0, 1.7, 'out')).toMatchObject({ clean: true });
		expect(measureEdge(noisy, 0, 1.9, 'in')).toMatchObject({ clean: true });
		expect(measureEdge(noisy, 0, 1.2, 'out')).toMatchObject({ clean: false, move: 0.3 });
		// Speech only 18 dB over the noise: still clean in the pause.
		const loud = voice(
			4,
			[
				[0.5, 1.2, -22],
				[2.0, 2.6, -22]
			],
			{ noise: -40 }
		);
		expect(measureEdge(loud, 0, 1.7, 'out')).toMatchObject({ clean: true });
		expect(measureEdge(loud, 0, 1.0, 'out')).toMatchObject({ clean: false });
	});

	it('measures over a music bed: pauses are clean, a cut inside a word is not', () => {
		const bed = voice(
			4,
			[
				[0.5, 1.2, -15],
				[2.0, 2.6, -15]
			],
			{ bed: -32 }
		);
		expect(measureEdge(bed, 0, 1.7, 'out')).toMatchObject({ clean: true });
		expect(measureEdge(bed, 0, 2.0, 'in')).toMatchObject({ clean: true });
		expect(measureEdge(bed, 0, 2.1, 'in')).toMatchObject({ clean: false, move: 0.1 });
	});
});

describe.skipIf(!hasFfmpeg)('edit-point warnings from the decoded sound', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-edit-audio-'));
		const r = spawnSync('ffmpeg', [
			'-y',
			'-loglevel',
			'error',
			'-f',
			'lavfi',
			'-i',
			'color=black:s=320x180:r=30:d=4',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'v.mp4')
		]);
		if (r.status !== 0) throw new Error(String(r.stderr));
		await writeWav(path.join(dir, 'voice.wav'), stereo(4, TAKE));
		await fs.writeFile(path.join(dir, 'text.wav'), 'not a sound');
		await fs.writeFile(path.join(dir, 'take.json'), JSON.stringify({ words: WORDS }));
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const project = (audio: string | false) => ({
		size: [320, 180],
		fps: 30,
		footage: { talk: { src: 'v.mp4', audio, transcript: 'take.json' } },
		cuts: [
			{ source: 'talk', in: 0.4, out: 'alpha' },
			{ source: 'talk', in: { say: 'beta', offset: -0.05 }, out: 'beta' },
			{ source: 'talk', in: { say: 'gamma', offset: 0.03 }, out: 3.5 },
			// Ends inside the stop in the middle of "delta": silent there, but mid-word.
			{ source: 'talk', in: 'delta', out: 3.75 }
		],
		clips: []
	});
	const load = async (audio: string | false, editPoints = true) => {
		const file = path.join(dir, `p-${audio}.vf.json`);
		await fs.writeFile(file, JSON.stringify(project(audio)));
		const loaded = await loadMotionProject(file, { editPoints });
		return { loaded, program: (await motionProgram(loaded)).program };
	};
	const edits = (diagnostics: { field: string; message: string }[]) =>
		diagnostics
			.filter((d) => /voice|cuts through/.test(d.message))
			.map((d) => `${d.field}: ${d.message}`);

	const TRANSCRIPT_ONLY = [
		'cuts[2]: cut 3: the audio edit point at 1.33 s cuts through "gamma" (1.30–1.90 s).',
		'cuts[3]: cut 4: "out" of cut 4 cuts through "delta" (1.90–2.20 s).'
	];

	it('trusts the transcript alone without sound, or when the sound cannot be decoded', async () => {
		expect(edits((await load(false)).program.diagnostics)).toEqual(TRANSCRIPT_ONLY);
		const broken = await load('text.wav');
		expect(broken.loaded.inputs.speechEdges).toBeUndefined();
		expect(edits(broken.program.diagnostics)).toEqual(TRANSCRIPT_ONLY);
	});

	it('measures only when asked (program, check, render)', async () => {
		const { loaded, program } = await load('voice.wav', false);
		expect(loaded.inputs.speechEdges).toBeUndefined();
		expect(edits(program.diagnostics)).toEqual(TRANSCRIPT_ONLY);
	});

	it('warns where the voice runs through a point, and drops the transcript’s false alarm', async () => {
		const { loaded, program } = await load('voice.wav');
		expect(loaded.inputs.speechEdges!.map((e) => [e.cut, e.side, e.clean])).toEqual([
			[0, 'in', true],
			[0, 'out', false],
			[1, 'in', false],
			[1, 'out', true],
			[2, 'in', true],
			[2, 'out', true],
			[3, 'in', true],
			[3, 'out', true]
		]);
		expect(edits(program.diagnostics)).toEqual([
			'cuts[3]: cut 4: "out" of cut 4 cuts through "delta" (1.90–2.20 s).',
			'cuts[0].out: cut 1: the voice is still sounding where the cut\'s sound stops (1.20 s of "talk"); move "out" 0.30 s later.',
			'cuts[1].in: cut 2: the voice has already started where the cut\'s sound starts (2.07 s of "talk"); move "in" 0.07 s earlier.'
		]);
		// The words do not change: the sound only decides the warnings.
		const words = (await load(false)).program.words;
		expect(program.words).toEqual(words);
	});

	it('caches what it measured by file and point', async () => {
		const first = (await load('voice.wav')).loaded.inputs.speechEdges;
		const cache = JSON.parse(
			await fs.readFile(path.join(dir, '.visualfries', 'edit-points.json'), 'utf8')
		);
		expect(Object.keys(cache.points)).toHaveLength(8);
		// A cached result is used as it is: change one and the next load reports it.
		const key = Object.keys(cache.points)[0];
		cache.points[key] = { voice: -1, level: -2, clean: true, move: 0 };
		await fs.writeFile(path.join(dir, '.visualfries', 'edit-points.json'), JSON.stringify(cache));
		const again = (await load('voice.wav')).loaded.inputs.speechEdges!;
		expect(again.filter((e) => e.voice === -1)).toHaveLength(1);
		expect(again.length).toBe(first!.length);
	});
});
