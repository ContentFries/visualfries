// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadMotionProject, motionProgram } from '../../src/lib/motion/node.js';
import { writeWav } from '../../src/lib/motion/audio.js';
import { measureEdge } from '../../src/lib/motion/edit-audio.js';
import { RATE } from '../../src/lib/motion/loudness.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** Stereo float at 48 kHz: a 200 Hz voice at `db` dBFS inside each [from, to, db] span. */
function voice(seconds: number, spans: [number, number, number][]): Float32Array {
	const frames = Math.round(seconds * RATE);
	const out = new Float32Array(frames * 2);
	for (let n = 0; n < frames; n++) {
		const t = n / RATE;
		const span = spans.find(([a, b]) => t >= a && t < b);
		const v = span ? Math.pow(10, span[2] / 20) * Math.sin(2 * Math.PI * 200 * t) : 0;
		out[2 * n] = out[2 * n + 1] = v;
	}
	return out;
}

/**
 * The take: "alpha" 0.5–1.2 s with its ringing end to 1.5 s (12 dB down), "beta" from 2.0 s
 * (the transcript says 2.1), "gamma" from 3.0 s (the transcript says 2.9).
 */
const TAKE: [number, number, number][] = [
	[0.5, 1.2, -12],
	[1.2, 1.5, -24],
	[2.0, 2.6, -12],
	[3.0, 3.5, -12]
];
const WORDS = [
	{ text: 'alpha', startMs: 500, endMs: 1200 },
	{ text: 'beta', startMs: 2100, endMs: 2600 },
	{ text: 'gamma', startMs: 2900, endMs: 3500 }
];

describe('speech at an edit point', () => {
	const take = voice(4, TAKE);

	it('is clean in a pause, and where the voice ends or starts right at the point', () => {
		expect(measureEdge(take, 0, 1.7, 'out')).toMatchObject({ clean: true, move: 0 });
		expect(measureEdge(take, 0, 1.5, 'out')).toMatchObject({ clean: true });
		expect(measureEdge(take, 0, 2.0, 'in')).toMatchObject({ clean: true });
	});

	it('says how far a point inside a ringing end must move', () => {
		const edge = measureEdge(take, 0, 1.2, 'out');
		expect(edge).toMatchObject({ clean: false, move: 0.3 });
		expect(edge.level).toBeGreaterThan(-30);
	});

	it('says how far a start inside a word must move back', () => {
		expect(measureEdge(take, 0, 2.0667, 'in')).toMatchObject({ clean: false, move: 0.067 });
	});

	it('finds no point within the stretch when the voice never stops', () => {
		const long = voice(2, [[0, 2, -12]]);
		expect(measureEdge(long, 0, 1, 'out')).toMatchObject({ clean: false, move: null });
	});

	it('treats a stretch without speech as clean', () => {
		const hum = voice(2, [[0, 2, -60]]);
		expect(measureEdge(hum, 0, 1, 'out')).toMatchObject({ clean: true });
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
		await writeWav(path.join(dir, 'voice.wav'), voice(4, TAKE));
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
			{ source: 'talk', in: { say: 'gamma', offset: 0.03 }, out: 3.5 }
		],
		clips: []
	});
	const load = async (audio: string | false) => {
		const file = path.join(dir, `p-${audio}.vf.json`);
		await fs.writeFile(file, JSON.stringify(project(audio)));
		const loaded = await loadMotionProject(file);
		return { loaded, program: (await motionProgram(loaded)).program };
	};
	const edits = (diagnostics: { field: string; message: string }[]) =>
		diagnostics
			.filter((d) => /voice|cuts through/.test(d.message))
			.map((d) => `${d.field}: ${d.message}`);

	it('trusts the transcript alone without sound', async () => {
		const { program } = await load(false);
		expect(edits(program.diagnostics)).toEqual([
			'cuts[2]: cut 3: the audio edit point at 1.33 s cuts through "gamma" (1.30–1.90 s).'
		]);
	});

	it('warns where the voice runs through a point, and drops the transcript’s false alarm', async () => {
		const { loaded, program } = await load('voice.wav');
		expect(loaded.inputs.speechEdges!.map((e) => [e.cut, e.side, e.clean])).toEqual([
			[0, 'in', true],
			[0, 'out', false],
			[1, 'in', false],
			[1, 'out', true],
			[2, 'in', true],
			[2, 'out', true]
		]);
		expect(edits(program.diagnostics)).toEqual([
			'cuts[0].out: cut 1: the voice is still sounding where the cut\'s sound stops (1.20 s of "talk"); move "out" 0.30 s later.',
			'cuts[1].in: cut 2: the voice has already started where the cut\'s sound starts (2.07 s of "talk"); move "in" 0.07 s earlier.'
		]);
		// The words do not change: the sound only decides the warnings.
		const words = (await load(false)).program.words;
		expect(program.words).toEqual(words);
	});
});
