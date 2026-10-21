import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { AudioPiece, ResolvedProgram } from './program.js';
import {
	RATE,
	SILENT,
	applyGain,
	integratedLoudness,
	maxShortLoudness,
	normalizeLoudness,
	truePeak
} from './loudness.js';

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
export const STEMS: readonly StemName[] = ['speech', 'sfx', 'music'];

export type MixReport = {
	/** Integrated loudness of the speech as cut, LUFS; null: no speech or silent. */
	speech: number | null;
	/** What effect and music levels are measured from: the speech loudness, else the target. */
	reference: number;
	/** dB each piece was given before the master gain (level and its own gain). */
	pieces: { owner: string; stem: StemName; gain: number }[];
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

const linear = (decibels: number) => Math.pow(10, decibels / 20);
const toSample = (seconds: number) => Math.round(seconds * RATE);

/** Program sample frames: the picture's length at 48 kHz. */
const programSamples = (program: Pick<ResolvedProgram, 'frames' | 'fps'>) =>
	Math.round((program.frames / program.fps) * RATE);

/** True when the program has any sound to mix. */
const hasSound = (program: ResolvedProgram) =>
	program.audio.speech.length + program.audio.sfx.length + program.audio.music.length > 0;

/** Mixes the program's sound. Null when it has none. */
export async function mixProgram(
	program: ResolvedProgram,
	opts: MixOptions
): Promise<MixedProgram | null> {
	if (!hasSound(program)) return null;
	const frames = programSamples(program);
	const { levels, master } = program.audio;
	const [speechPieces, sfx, music] = [
		program.audio.speech,
		program.audio.sfx,
		program.audio.music
	].map((pieces) => pieces.map(fromFileStart));
	const decoded = await decodeAll(
		[...speechPieces, ...sfx, ...music].map((p) => ({
			file: path.resolve(opts.dir, p.file),
			srcIn: p.srcIn,
			frames: pieceSpan(p, frames).frames
		}))
	);
	const sound = (i: number) => decoded[i];
	const report: MixReport['pieces'] = [];

	const speech = new Float32Array(frames * 2);
	speechPieces.forEach((p, i) => {
		addPiece(speech, sound(i), p, p.gain);
		report.push({ owner: p.owner, stem: 'speech', gain: p.gain });
	});
	const speechLufs = integratedLoudness(speech);
	const reference = speechLufs === SILENT ? master.lufs : speechLufs;

	// Each stem sums in its own buffer and the stems add up in one fixed order, with or without
	// `stems`: float sums depend on their order, and the mix must not depend on the option.
	const keep = !!opts.stems;
	const effects = sfx.length || keep ? new Float32Array(frames * 2) : null;
	sfx.forEach((p, i) => {
		const own = maxShortLoudness(sound(speechPieces.length + i));
		const gain = own === SILENT ? p.gain : reference + levels.sfx - own + p.gain;
		addPiece(effects!, sound(speechPieces.length + i), p, gain);
		report.push({ owner: p.owner, stem: 'sfx', gain });
	});
	const bed = music.length || keep ? new Float32Array(frames * 2) : null;
	music.forEach((p, i) => {
		const samples = sound(speechPieces.length + sfx.length + i);
		const own = integratedLoudness(samples);
		const fallback = own === SILENT ? maxShortLoudness(samples, 0.4) : own;
		const gain = fallback === SILENT ? p.gain : reference + levels.music - fallback + p.gain;
		addPiece(bed!, samples, p, gain);
		report.push({ owner: p.owner, stem: 'music', gain });
	});

	// Without stems the sum takes the speech buffer's place (one buffer less); a missing stem
	// adds nothing (x + 0 is x exactly).
	const sum = keep ? new Float32Array(frames * 2) : speech;
	for (let i = 0; i < sum.length; i++)
		sum[i] = speech[i] + (effects ? effects[i] : 0) + (bed ? bed[i] : 0);
	const raw = () => {
		const lufs = integratedLoudness(sum);
		return {
			input: lufs,
			gain: 0,
			limiter: null,
			reduction: 0,
			lufs,
			truePeak: truePeak(sum),
			samples: sum
		};
	};
	const done =
		opts.normalize === false ? raw() : normalizeLoudness(sum, master.lufs, master.truePeak);
	let stems: MixedProgram['stems'] = null;
	if (keep) {
		const g = linear(done.gain);
		stems = { speech, sfx: effects!, music: bed! };
		for (const stem of Object.values(stems)) {
			for (let i = 0; i < stem.length; i++) stem[i] *= g;
			if (done.limiter) applyGain(stem, done.limiter);
		}
	}
	return {
		samples: done.samples,
		stems,
		report: {
			speech: speechLufs === SILENT ? null : round(speechLufs),
			reference: round(reference),
			pieces: report.map((r) => ({ ...r, gain: round(r.gain) })),
			input: round(done.input),
			gain: round(done.gain),
			limiter: round(done.reduction),
			lufs: round(done.lufs),
			truePeak: round(done.truePeak)
		}
	};
}

/**
 * A piece reaching before its file (a program file written by an older version) starts with the
 * sound instead: later and shorter by the missing part, so every sample keeps its place.
 */
function fromFileStart(p: AudioPiece): AudioPiece {
	if (p.srcIn >= 0) return p;
	const early = -p.srcIn;
	return {
		...p,
		srcIn: 0,
		at: p.at + early,
		dur: p.dur === null ? null : Math.max(0, p.dur - early),
		fadeIn: Math.max(0, p.fadeIn - early)
	};
}

const round = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : x);

/**
 * Where a piece plays, in program sample frames: its first frame, how many frames it may take
 * (to its end, or for `dur: null` to the program end), and where its fades fall. Fades are
 * placed from the piece's own end, so a file that runs out sooner ends there without them.
 */
function pieceSpan(p: AudioPiece, programFrames: number) {
	const start = toSample(p.at);
	const end = p.dur === null ? programFrames : toSample(p.at + p.dur);
	return {
		start,
		end,
		frames: Math.max(0, Math.min(end, programFrames) - start),
		fadeIn: Math.max(0, toSample(p.at + p.fadeIn) - start),
		fadeOut:
			p.dur === null ? toSample(p.fadeOut) : Math.max(0, end - toSample(p.at + p.dur - p.fadeOut))
	};
}

/**
 * Adds a decoded piece into `target` at its program time: gain in dB, gain keys, and
 * equal-power fades (sin over the fade-in, its mirror over the fade-out, measured at sample
 * centres, so two fades over the same frames keep the power at every frame).
 */
function addPiece(target: Float32Array, samples: Float32Array, p: AudioPiece, gain: number) {
	const programFrames = target.length >> 1;
	const span = pieceSpan(p, programFrames);
	const count = Math.min(samples.length >> 1, span.frames);
	const base = linear(gain);
	const keys = p.gainKeys?.length ? p.gainKeys : null;
	let k = 0;
	for (let i = 0; i < count; i++) {
		const n = span.start + i;
		let w = base;
		if (i < span.fadeIn) w *= Math.sin((Math.PI / 2) * ((i + 0.5) / span.fadeIn));
		const left = span.end - 1 - n;
		if (left < span.fadeOut) w *= Math.sin((Math.PI / 2) * ((left + 0.5) / span.fadeOut));
		if (keys) {
			const t = n / RATE;
			while (k < keys.length && keys[k].at <= t) k++;
			const db =
				k === 0
					? keys[0].gain
					: k === keys.length
						? keys[keys.length - 1].gain
						: keys[k - 1].gain +
							((keys[k].gain - keys[k - 1].gain) * (t - keys[k - 1].at)) /
								(keys[k].at - keys[k - 1].at);
			w *= linear(db);
		}
		target[2 * n] += samples[2 * i] * w;
		target[2 * n + 1] += samples[2 * i + 1] * w;
	}
}

type Decode = { file: string; srcIn: number; frames: number };

/** Decodes every piece (a few ffmpeg processes at a time); results in the pieces' order. */
async function decodeAll(pieces: Decode[], jobs = 4): Promise<Float32Array[]> {
	const out: Float32Array[] = new Array(pieces.length);
	let next = 0;
	const worker = async () => {
		for (let i = next++; i < pieces.length; i = next++) out[i] = await decode(pieces[i]);
	};
	await Promise.all(Array.from({ length: Math.min(jobs, pieces.length) }, worker));
	return out;
}

/**
 * At most `frames` sample frames of a file's first audio stream from `srcIn` seconds, as
 * interleaved stereo float at 48 kHz (mono plays on both sides). Fewer when the file ends.
 */
function decode({ file, srcIn, frames }: Decode): Promise<Float32Array> {
	if (frames <= 0) return Promise.resolve(new Float32Array(0));
	const args = [
		'-v',
		'error',
		...(srcIn > 0 ? ['-ss', srcIn.toFixed(6)] : []),
		// A little more than needed: the cut to the exact frame count happens here.
		'-t',
		(frames / RATE + 0.05).toFixed(6),
		'-i',
		file,
		'-map',
		'0:a:0',
		'-ac',
		'2',
		'-ar',
		String(RATE),
		'-f',
		'f32le',
		'-c:a',
		'pcm_f32le',
		'pipe:1'
	];
	return new Promise((resolve, reject) => {
		const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
			stdio: ['ignore', 'pipe', 'pipe']
		});
		const chunks: Buffer[] = [];
		let err = '';
		p.stdout.on('data', (d: Buffer) => chunks.push(d));
		p.stderr.on('data', (d) => (err = (err + d).slice(-2000)));
		p.on('error', reject);
		p.on('close', (code) => {
			if (code !== 0)
				return reject(
					new Error(`Could not read the sound of ${file} (ffmpeg ${code}): ${err.trim()}`)
				);
			const raw = Buffer.concat(chunks);
			const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length >> 2);
			resolve(Float32Array.from(all.subarray(0, Math.min(all.length, frames * 2))));
		});
	});
}

/** Writes interleaved stereo float samples as a 48 kHz 32-bit float WAV file. */
export async function writeWav(file: string, samples: Float32Array) {
	const data = samples.length * 4;
	const header = Buffer.alloc(58);
	header.write('RIFF', 0, 'ascii');
	header.writeUInt32LE(50 + data, 4);
	header.write('WAVE', 8, 'ascii');
	header.write('fmt ', 12, 'ascii');
	header.writeUInt32LE(18, 16);
	header.writeUInt16LE(3, 20); // IEEE float
	header.writeUInt16LE(2, 22);
	header.writeUInt32LE(RATE, 24);
	header.writeUInt32LE(RATE * 8, 28);
	header.writeUInt16LE(8, 32);
	header.writeUInt16LE(32, 34);
	header.writeUInt16LE(0, 36);
	header.write('fact', 38, 'ascii');
	header.writeUInt32LE(4, 42);
	header.writeUInt32LE(samples.length >> 1, 46);
	header.write('data', 50, 'ascii');
	header.writeUInt32LE(data, 54);
	const body = Buffer.from(samples.buffer, samples.byteOffset, data);
	// Little-endian hosts only, which every platform Node runs on is.
	await fs.writeFile(file, Buffer.concat([header, body]));
}
