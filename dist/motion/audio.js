import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { RATE, SILENT, applyGain, integratedLoudness, maxShortLoudness, normalizeLoudness, truePeak } from './loudness.js';
export const STEMS = ['speech', 'sfx', 'music'];
const linear = (decibels) => Math.pow(10, decibels / 20);
const toSample = (seconds) => Math.round(seconds * RATE);
/** Program sample frames: the picture's length at 48 kHz. */
const programSamples = (program) => Math.round((program.frames / program.fps) * RATE);
/** True when the program has any sound to mix. */
const hasSound = (program) => program.audio.speech.length + program.audio.sfx.length + program.audio.music.length > 0;
/** Mixes the program's sound. Null when it has none. */
export async function mixProgram(program, opts) {
    if (!hasSound(program))
        return null;
    const raw = await mixStems(program, opts);
    const ceiling = program.audio.master.truePeak - (opts.headroom ?? 0);
    return finish(program, raw, normalized(program, raw, opts, ceiling), ceiling);
}
/**
 * Decodes and adds every piece. Each stem sums in its own buffer and the stems add up in one
 * fixed order, with or without `stems` (float sums depend on their order, and the mix must not
 * depend on the option). Pieces decode one stem at a time, so only one stem's sound is held.
 */
async function mixStems(program, opts) {
    const frames = programSamples(program);
    const { levels, master } = program.audio;
    const [speechPieces, sfx, music] = [
        program.audio.speech,
        program.audio.sfx,
        program.audio.music
    ].map((pieces) => pieces.map(fromFileStart));
    const decodeStem = (pieces) => decodeAll(pieces.map((p) => ({
        file: path.resolve(opts.dir, p.file),
        srcIn: p.srcIn,
        frames: pieceSpan(p, frames).frames
    })));
    const pieces = [];
    const speech = new Float32Array(frames * 2);
    (await decodeStem(speechPieces)).forEach((sound, i) => {
        const p = speechPieces[i];
        addPiece(speech, sound, p, p.gain);
        pieces.push({ owner: p.owner, stem: 'speech', gain: p.gain });
    });
    const speechLufs = integratedLoudness(speech);
    const reference = speechLufs === SILENT ? master.lufs : speechLufs;
    const keep = !!opts.stems;
    const effects = sfx.length || keep ? new Float32Array(frames * 2) : null;
    (await decodeStem(sfx)).forEach((sound, i) => {
        const p = sfx[i];
        const own = maxShortLoudness(sound);
        const gain = own === SILENT ? p.gain : reference + levels.sfx - own + p.gain;
        addPiece(effects, sound, p, gain);
        pieces.push({ owner: p.owner, stem: 'sfx', gain });
    });
    const bed = music.length || keep ? new Float32Array(frames * 2) : null;
    (await decodeStem(music)).forEach((sound, i) => {
        const p = music[i];
        const own = integratedLoudness(sound);
        const level = own === SILENT ? maxShortLoudness(sound, 0.4) : own;
        const gain = level === SILENT ? p.gain : reference + levels.music - level + p.gain;
        addPiece(bed, sound, p, gain);
        pieces.push({ owner: p.owner, stem: 'music', gain });
    });
    // Without stems the sum takes the speech buffer's place (one buffer less); a missing stem
    // adds nothing (x + 0 is x exactly).
    const sum = keep ? new Float32Array(frames * 2) : speech;
    for (let i = 0; i < sum.length; i++)
        sum[i] = speech[i] + (effects ? effects[i] : 0) + (bed ? bed[i] : 0);
    return { speech, effects, bed, sum, speechLufs, reference, pieces };
}
function normalized(program, raw, opts, ceiling) {
    if (opts.normalize !== false)
        return normalizeLoudness(raw.sum, program.audio.master.lufs, ceiling);
    const lufs = integratedLoudness(raw.sum);
    return {
        input: lufs,
        gain: 0,
        limiter: null,
        reduction: 0,
        lufs,
        truePeak: truePeak(raw.sum),
        samples: raw.sum
    };
}
/** Applies the master gain and limiter to the stems (in place) and writes the report. */
function finish(program, raw, done, ceiling) {
    let stems = null;
    if (raw.sum !== raw.speech) {
        const g = linear(done.gain);
        stems = { speech: raw.speech, sfx: raw.effects, music: raw.bed };
        for (const stem of Object.values(stems)) {
            for (let i = 0; i < stem.length; i++)
                stem[i] *= g;
            if (done.limiter)
                applyGain(stem, done.limiter);
        }
    }
    const report = {
        speech: raw.speechLufs === SILENT ? null : round(raw.speechLufs),
        reference: round(raw.reference),
        pieces: raw.pieces.map((r) => ({ ...r, gain: round(r.gain) })),
        input: round(done.input),
        gain: round(done.gain),
        limiter: round(done.reduction),
        ceiling: round(ceiling),
        lufs: round(done.lufs),
        truePeak: round(done.truePeak),
        warnings: []
    };
    report.warnings = mixWarnings(program, report);
    return { samples: done.samples, stems, report };
}
/** Loudness more than this many LU off the target is reported. */
const LOUDNESS_TOLERANCE = 0.5;
function mixWarnings(program, report) {
    const { lufs, truePeak } = program.audio.master;
    const result = report.delivered ?? report;
    const where = report.delivered ? 'The delivered audio' : 'The mix';
    const out = [];
    if (Number.isFinite(result.lufs) && Math.abs(result.lufs - lufs) > LOUDNESS_TOLERANCE)
        out.push(`${where} is ${result.lufs} LUFS, ${round(Math.abs(result.lufs - lufs))} LU off the ${lufs} LUFS target${report.limiter < -6 ? ` even with the limiter taking up to ${-report.limiter} dB` : ''}; lower "mix.loudness" or make the sound less peaky.`);
    if (result.truePeak > truePeak)
        out.push(`${where} peaks at ${result.truePeak} dBTP, over the ${truePeak} dBTP ceiling.`);
    return out;
}
/** dB of room under the ceiling for AAC at 192 kbit/s, which overshoots peaks by up to ~0.7 dB. */
const ENCODER_HEADROOM = 0.5;
/** Encodes at most, correcting what the encoder changed. */
const MAX_ENCODES = 4;
/** LU the delivered loudness may differ from the target without another encode. */
const DELIVERY_TOLERANCE = 0.1;
/**
 * Mixes the program and encodes it to AAC (`opts.output`, an .m4a) through a float WAV
 * (`opts.wav`, removed afterwards), leaving room under the true-peak ceiling for the encoder.
 * The encoded file is decoded and measured; when its true peak passes the ceiling, or its
 * loudness is more than 0.1 LU off the target, the mix is normalised again with that difference
 * fed back and encoded again (four encodes at most). The report's `delivered` is what the
 * encoded file measures. Null when the program has no sound.
 */
export async function encodeProgramMix(program, opts) {
    if (!hasSound(program))
        return null;
    const raw = await mixStems(program, opts);
    const { lufs: loudness, truePeak: target } = program.audio.master;
    let headroom = opts.headroom ?? ENCODER_HEADROOM;
    // What the encoder changes is measured and fed back: the true peak it adds becomes more
    // room under the ceiling, the loudness it takes (high frequencies it drops) a higher target.
    let aim = loudness;
    let done;
    let delivered;
    for (let attempt = 0;; attempt++) {
        done =
            opts.normalize === false
                ? normalized(program, raw, opts, target - headroom)
                : normalizeLoudness(raw.sum, aim, target - headroom);
        try {
            await writeWav(opts.wav, done.samples);
            await ffmpeg([
                '-y',
                '-i',
                opts.wav,
                '-c:a',
                'aac',
                '-b:a',
                opts.bitrate ?? '192k',
                opts.output
            ]);
        }
        finally {
            await fs.rm(opts.wav, { force: true });
        }
        const encoded = await decode({
            file: opts.output,
            srcIn: 0,
            frames: (done.samples.length >> 1) + RATE
        });
        const measured = { lufs: integratedLoudness(encoded), truePeak: truePeak(encoded) };
        delivered = { lufs: round(measured.lufs), truePeak: round(measured.truePeak) };
        const peakOver = measured.truePeak - target;
        const loudnessOff = Number.isFinite(measured.lufs) ? loudness - measured.lufs : 0;
        if (opts.normalize === false || attempt === MAX_ENCODES - 1)
            break;
        if (peakOver <= 0 && Math.abs(loudnessOff) <= DELIVERY_TOLERANCE)
            break;
        if (peakOver > 0)
            headroom += peakOver + 0.1;
        aim += loudnessOff;
    }
    const mixed = finish(program, raw, done, target - headroom);
    mixed.report.delivered = delivered;
    mixed.report.warnings = mixWarnings(program, mixed.report);
    return { ...mixed, file: opts.output };
}
/**
 * A piece reaching before its file (a program file written by an older version) starts with the
 * sound instead: later and shorter by the missing part, so every sample keeps its place.
 */
function fromFileStart(p) {
    if (p.srcIn >= 0)
        return p;
    const early = -p.srcIn;
    return {
        ...p,
        srcIn: 0,
        at: p.at + early,
        dur: p.dur === null ? null : Math.max(0, p.dur - early),
        fadeIn: Math.max(0, p.fadeIn - early)
    };
}
const round = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : x);
/**
 * Where a piece plays, in program sample frames: its first frame, how many frames it may take
 * (to its end, or for `dur: null` to the program end), and where its fades fall. Fades are
 * placed from the piece's own end, so a file that runs out sooner ends there without them.
 */
function pieceSpan(p, programFrames) {
    const start = toSample(p.at);
    const end = p.dur === null ? programFrames : toSample(p.at + p.dur);
    return {
        start,
        end,
        frames: Math.max(0, Math.min(end, programFrames) - start),
        fadeIn: Math.max(0, toSample(p.at + p.fadeIn) - start),
        fadeOut: p.dur === null ? toSample(p.fadeOut) : Math.max(0, end - toSample(p.at + p.dur - p.fadeOut))
    };
}
/**
 * Adds a decoded piece into `target` at its program time: gain in dB, gain keys, and
 * equal-power fades (sin over the fade-in, its mirror over the fade-out, measured at sample
 * centres, so two fades over the same frames keep the power at every frame).
 */
function addPiece(target, samples, p, gain) {
    const programFrames = target.length >> 1;
    const span = pieceSpan(p, programFrames);
    const count = Math.min(samples.length >> 1, span.frames);
    const base = linear(gain);
    const keys = p.gainKeys?.length ? p.gainKeys : null;
    let k = 0;
    for (let i = 0; i < count; i++) {
        const n = span.start + i;
        let w = base;
        if (i < span.fadeIn)
            w *= Math.sin((Math.PI / 2) * ((i + 0.5) / span.fadeIn));
        const left = span.end - 1 - n;
        if (left < span.fadeOut)
            w *= Math.sin((Math.PI / 2) * ((left + 0.5) / span.fadeOut));
        if (keys) {
            const t = n / RATE;
            while (k < keys.length && keys[k].at <= t)
                k++;
            const db = k === 0
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
/** Decodes every piece (a few ffmpeg processes at a time); results in the pieces' order. */
export async function decodeAll(pieces, jobs = 4) {
    const out = new Array(pieces.length);
    let next = 0;
    const worker = async () => {
        for (let i = next++; i < pieces.length; i = next++)
            out[i] = await decode(pieces[i]);
    };
    await Promise.all(Array.from({ length: Math.min(jobs, pieces.length) }, worker));
    return out;
}
/**
 * Seconds decoded before `srcIn` and dropped: decoders of compressed formats (MP3 in particular)
 * need a little audio after a seek before their output is right.
 */
const PREROLL = 0.2;
/**
 * At most `frames` sample frames of a file's first audio stream from `srcIn` seconds, as
 * interleaved stereo float at 48 kHz (mono plays on both sides). Fewer when the file ends. The
 * decode starts up to 0.2 s earlier and drops exactly that many frames, so the first frame kept
 * is `srcIn` itself.
 */
function decode({ file, srcIn, frames }) {
    if (frames <= 0)
        return Promise.resolve(new Float32Array(0));
    const preroll = srcIn > 0 ? Math.min(PREROLL, srcIn) : 0;
    const skip = Math.round(preroll * RATE) * 8;
    const seek = srcIn - preroll;
    const args = [
        '-v',
        'error',
        ...(seek > 0 ? ['-ss', seek.toFixed(6)] : []),
        // A little more than needed: the cut to the exact frame count happens here.
        '-t',
        (preroll + frames / RATE + 0.05).toFixed(6),
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
        // Straight into the result: bytes past the pre-roll, up to the frames asked for.
        const out = new Float32Array(frames * 2);
        const bytes = new Uint8Array(out.buffer);
        let seen = 0;
        let filled = 0;
        let err = '';
        p.stdout.on('data', (d) => {
            const from = Math.max(0, skip - seen);
            seen += d.length;
            if (from >= d.length || filled >= bytes.length)
                return;
            const part = d.subarray(from, from + (bytes.length - filled));
            bytes.set(part, filled);
            filled += part.length;
        });
        p.stderr.on('data', (d) => (err = (err + d).slice(-2000)));
        p.on('error', reject);
        p.on('close', (code) => {
            if (code !== 0)
                return reject(new Error(`Could not read the sound of ${file} (ffmpeg ${code}): ${err.trim()}`));
            const kept = (filled >> 3) * 2;
            resolve(kept === out.length ? out : out.slice(0, kept));
        });
    });
}
function ffmpeg(args) {
    return new Promise((resolve, reject) => {
        const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-v', 'error', ...args], {
            stdio: ['ignore', 'ignore', 'pipe']
        });
        let err = '';
        p.stderr.on('data', (d) => (err = (err + d).slice(-2000)));
        p.on('error', reject);
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.trim()}`)));
    });
}
/** Writes interleaved stereo float samples as a 48 kHz 32-bit float WAV file. */
export async function writeWav(file, samples) {
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
    // The samples' own bytes, no copy (little-endian, as every platform Node runs on is).
    const body = Buffer.from(samples.buffer, samples.byteOffset, data);
    const handle = await fs.open(file, 'w');
    try {
        await handle.write(header);
        for (let at = 0; at < data; at += 1 << 24)
            await handle.write(body.subarray(at, Math.min(data, at + (1 << 24))));
    }
    finally {
        await handle.close();
    }
}
