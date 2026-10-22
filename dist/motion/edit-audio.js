import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { soundEnd, soundLength } from './cutlist.js';
/**
 * Node side of the edit-point check: how loud the speech is at each audio edit point, measured
 * on the decoded source. Transcript times are often a few hundredths off (a word's ringing end,
 * an onset timed early), so the cut list's warning about a word cut through by an edit point
 * trusts the sound where it was measured (see `SpeechEdge`). `program`, `check` and `render`
 * measure (`loadMotionProject(file, { editPoints: true })`); results are cached per source file
 * and point in `.visualfries/edit-points.json`.
 */
/** Sample rate the speech is measured at: mono, plenty for its loudness. */
export const EDGE_RATE = 16000;
/** Seconds of sound around an edit point that set the voice level and the noise floor. */
const AROUND = 1.5;
/** RMS window and hop for the voice level and the floor, seconds. */
const WINDOW = 0.02;
const HOP = 0.005;
/** Seconds on each side of a point whose sound decides whether the voice runs through it. */
const SIDE = 0.01;
/** Steps when looking for a point the voice does not run through, seconds. */
const STEP = 0.0025;
/** dB under the voice level (its loudest 5 % around the point) that counts as quiet. */
const BELOW_VOICE = 24;
/** dB over the noise floor (the quietest 10 % around the point) that still counts as quiet. */
const OVER_FLOOR = 6;
/** dBFS that always counts as quiet. */
const FLOOR = -55;
/** Without this many dB between the voice and the floor the voice cannot be told from noise. */
const MIN_RANGE = 12;
/** Bump when the measure changes, so cached results are measured again. */
const VERSION = 2;
/** dBFS of the RMS of mono samples over [a, a + length), clamped to the stretch. */
function meter(samples) {
    const frames = samples.length;
    const sums = new Float64Array(frames + 1);
    for (let n = 0; n < frames; n++)
        sums[n + 1] = sums[n] + samples[n] * samples[n];
    return {
        frames,
        db(a, length) {
            const from = Math.max(0, Math.min(frames - length, a));
            const to = Math.min(frames, from + length);
            const mean = to > from ? (sums[to] - sums[from]) / (to - from) : 0;
            return mean > 0 ? 10 * Math.log10(mean) : -Infinity;
        }
    };
}
/**
 * How the voice sounds at source second `t` of mono `samples` decoded from `start` at `rate`:
 * `out` is where a cut's sound stops, `in` where it starts.
 *
 * The voice level is the loudest 5 % of 20 ms windows in the stretch, the floor the quietest
 * 10 % (room noise, a music bed). Quiet is 24 dB under the voice, but never less than 6 dB over
 * the floor (nor under −55 dBFS). The voice runs through the point when the 10 ms on both sides
 * of it are louder than quiet; then `move` is how far the point must go (later for `out`,
 * earlier for `in`) to a point it does not run through, at least one frame, null when that is
 * not within the stretch. A point less than half a frame from such a point is clean: cut points
 * land on frames. Null when the voice cannot be told from the floor (12 dB or less apart, or no
 * speech at all): the transcript then decides.
 */
export function measureEdge(samples, start, t, side, opts = {}) {
    const rate = opts.rate ?? EDGE_RATE;
    const fps = opts.fps ?? 30;
    const { frames, db } = meter(samples);
    const window = Math.round(WINDOW * rate);
    const all = [];
    for (let n = 0; n + window <= frames; n += Math.round(HOP * rate))
        all.push(db(n, window));
    if (!all.length)
        return null;
    all.sort((a, b) => a - b);
    const voice = all[Math.floor(all.length * 0.95)];
    const floor = all[Math.floor(all.length * 0.1)];
    if (!Number.isFinite(voice) || voice - Math.max(floor, FLOOR) <= MIN_RANGE)
        return null;
    const round = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : -120);
    const quiet = Math.max(voice - BELOW_VOICE, floor + OVER_FLOOR, FLOOR);
    const side10 = Math.round(SIDE * rate);
    const sample = (s) => Math.round((s - start) * rate);
    /** The quieter of the 10 ms before and after source second `p`. */
    const through = (p) => Math.min(db(sample(p) - side10, side10), db(sample(p), side10));
    const level = through(t);
    const clean = { voice: round(voice), level: round(level), clean: true, move: 0 };
    if (level <= quiet)
        return clean;
    const end = start + frames / rate;
    const dir = side === 'out' ? 1 : -1;
    let raw = null;
    for (let k = 1;; k++) {
        const p = t + dir * k * STEP;
        if (p - SIDE < start || p + SIDE > end)
            break;
        if (through(p) <= quiet) {
            raw = k * STEP;
            break;
        }
    }
    if (raw !== null && raw < 0.5 / fps)
        return clean;
    // Whole frames, at least one; less the search step, so a point found a step past a frame
    // boundary does not cost a frame more.
    const move = raw === null
        ? null
        : Math.round((Math.max(1, Math.ceil((raw - STEP) * fps - 1e-6)) / fps) * 1000) / 1000;
    return { voice: round(voice), level: round(level), clean: false, move };
}
/** The file a footage's sound comes from, or null without sound. */
function soundFile(project, inputs, name) {
    const footage = project.footage?.[name];
    if (!footage || footage.audio === false)
        return null;
    if (typeof footage.audio === 'string')
        return footage.audio;
    return inputs.sources?.[name]?.audio === false ? null : footage.src;
}
/** Mono float at `EDGE_RATE` of `seconds` of a file's first audio stream from `from`. */
function decodeMono(file, from, seconds) {
    const args = [
        '-v',
        'error',
        ...(from > 0 ? ['-ss', from.toFixed(6)] : []),
        '-t',
        seconds.toFixed(6),
        '-i',
        file,
        '-map',
        '0:a:0',
        '-ac',
        '1',
        '-ar',
        String(EDGE_RATE),
        '-f',
        'f32le',
        'pipe:1'
    ];
    return new Promise((resolve, reject) => {
        const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        const chunks = [];
        let err = '';
        p.stdout.on('data', (d) => chunks.push(d));
        p.stderr.on('data', (d) => (err = (err + d).slice(-2000)));
        p.on('error', reject);
        p.on('close', (code) => {
            if (code !== 0)
                return reject(new Error(`ffmpeg ${code}: ${err.trim()}`));
            const all = Buffer.concat(chunks);
            const out = new Float32Array(all.length >> 2);
            new Uint8Array(out.buffer).set(all.subarray(0, out.length * 4));
            resolve(out);
        });
    });
}
/** Points closer than this many seconds share one decode. */
const JOIN = 10;
/**
 * Measures the speech at every audio edit point of the cut list: where each cut's sound starts
 * and stops, in its source. Points inside one continuous take (the next cut starts where this
 * one ends, same sound and gain) are no edit and are skipped, as are muted cuts and sources
 * without a readable sound file. Each source is decoded once per stretch of nearby points (one
 * ffmpeg run, mono 16 kHz); a stretch that cannot be decoded leaves its points to the
 * transcript. Results are cached by the sound file (path, size, time) and point.
 */
export async function measureSpeechEdges(project, inputs, cutList, dir) {
    if (cutList.mode !== 'program' || cutList.frames === null)
        return [];
    const fps = project.fps;
    const cuts = cutList.cuts;
    const end = cutList.frames / fps;
    const file = (c) => soundFile(project, inputs, c.source);
    const continues = (a, b) => !!a &&
        !!b &&
        !a.mute &&
        !b.mute &&
        a.source === b.source &&
        file(a) === file(b) &&
        a.gain === b.gain &&
        !a.hold &&
        a.srcOut === b.srcIn;
    const stats = new Map();
    const statOf = async (abs) => {
        if (!stats.has(abs)) {
            const st = await fs.stat(abs).catch(() => null);
            stats.set(abs, st ? JSON.stringify([path.relative(dir, abs), st.size, st.mtimeMs]) : null);
        }
        return stats.get(abs);
    };
    const wanted = [];
    for (const [i, cut] of cuts.entries()) {
        const name = file(cut);
        if (!name || cut.mute)
            continue;
        const abs = path.resolve(dir, name);
        const stat = existsSync(abs) ? await statOf(abs) : null;
        if (!stat)
            continue;
        const shift = cut.srcIn / fps - cut.startFrame / fps;
        const length = soundLength(inputs.sources?.[cut.source]);
        const points = [];
        if (!continues(cuts[i - 1], cut))
            points.push(['in', cut.edit + shift]);
        if (!continues(cut, cuts[i + 1]))
            points.push(['out', soundEnd(cuts, i, end, fps) + shift]);
        for (const [side, raw] of points) {
            const at = Math.round(raw * 1e6) / 1e6;
            if (at < SIDE || at > length - SIDE)
                continue;
            const key = createHash('sha1')
                .update(JSON.stringify([VERSION, stat, side, at, fps]))
                .digest('hex');
            wanted.push({ cut: i, side, source: cut.source, at, file: abs, key });
        }
    }
    if (!wanted.length)
        return [];
    const cacheFile = path.join(dir, '.visualfries', 'edit-points.json');
    let cache = { version: VERSION, points: {} };
    try {
        const read = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
        if (read.version === VERSION && read.points)
            cache = read;
    }
    catch {
        // No cache yet, or an unreadable one: measure everything.
    }
    const found = new Map();
    for (const w of wanted)
        if (w.key in cache.points)
            found.set(w.key, cache.points[w.key]);
    // The rest: per file, stretches of nearby points, each decoded once.
    const missing = wanted.filter((w) => !found.has(w.key)).sort((a, b) => a.at - b.at);
    const groups = [];
    for (const w of missing) {
        const group = groups.find((g) => g[0].file === w.file && w.at - g[g.length - 1].at <= JOIN);
        if (group)
            group.push(w);
        else
            groups.push([w]);
    }
    for (const group of groups) {
        const from = Math.max(0, group[0].at - AROUND);
        const to = group[group.length - 1].at + AROUND;
        let samples;
        try {
            samples = await decodeMono(group[0].file, from, to - from);
        }
        catch {
            continue;
        }
        for (const w of group) {
            const a = Math.max(0, Math.round((w.at - AROUND - from) * EDGE_RATE));
            const b = Math.round((w.at + AROUND - from) * EDGE_RATE);
            found.set(w.key, measureEdge(samples.subarray(a, b), from + a / EDGE_RATE, w.at, w.side, { fps }));
        }
    }
    const fresh = missing.filter((w) => found.has(w.key));
    if (fresh.length) {
        // Merged: several projects (and formats) in one folder share the file.
        const points = { ...cache.points };
        for (const w of fresh)
            points[w.key] = found.get(w.key);
        try {
            await fs.mkdir(path.dirname(cacheFile), { recursive: true });
            await fs.writeFile(cacheFile, JSON.stringify({ version: VERSION, points }) + '\n');
        }
        catch {
            // A read-only folder only costs the next run a decode.
        }
    }
    return wanted.flatMap(({ file: _file, key, ...w }) => {
        const measured = found.get(key);
        return measured ? [{ ...w, ...measured }] : [];
    });
}
