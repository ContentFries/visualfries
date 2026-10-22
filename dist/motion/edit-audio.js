import { existsSync } from 'node:fs';
import path from 'node:path';
import { RATE } from './loudness.js';
import { decodeAll } from './audio.js';
import { soundEnd, soundLength } from './cutlist.js';
/**
 * Node side of the edit-point check: how loud the speech is at each audio edit point, measured
 * on the decoded source. Transcript times are often a few hundredths off (a word's ringing end,
 * an onset timed early), so the cut list's warning about a word cut through by an edit point
 * trusts the sound where it was measured (see `SpeechEdge`).
 */
/** Seconds of sound decoded on each side of an edit point. */
const AROUND = 1;
/** RMS window and hop for the voice level, seconds. */
const WINDOW = 0.02;
const HOP = 0.005;
/** Seconds on each side of a point whose sound decides whether the voice runs through it. */
const SIDE = 0.01;
/** Steps when looking for a point the voice does not run through, seconds. */
const STEP = 0.0025;
/** dB under the voice level (its loudest 5 % around the point) that counts as quiet. */
const BELOW_VOICE = 24;
/** dBFS that always counts as quiet; a voice level under `SILENCE` means no speech around. */
const FLOOR = -55;
const SILENCE = -45;
/** dBFS of the RMS of the mono mix over sample frames [a, a + length), clamped to the stretch. */
function meter(samples) {
    const frames = samples.length >> 1;
    const sums = new Float64Array(frames + 1);
    for (let n = 0; n < frames; n++) {
        const m = (samples[2 * n] + samples[2 * n + 1]) / 2;
        sums[n + 1] = sums[n] + m * m;
    }
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
 * How the voice sounds at source second `t` of a stretch decoded from `start`: `out` is where a
 * cut's sound stops, `in` where it starts. The voice runs through the point when the 10 ms on
 * both sides of it stay within 24 dB of the voice level (its loudest 5 % in the stretch); then
 * `move` is how far the point must go (later for `out`, earlier for `in`, rounded up to a frame)
 * to a point it does not run through, null when that is not within the decoded stretch.
 */
export function measureEdge(samples, start, t, side, fps = 30) {
    const { frames, db } = meter(samples);
    const window = Math.round(WINDOW * RATE);
    const all = [];
    for (let n = 0; n + window <= frames; n += Math.round(HOP * RATE))
        all.push(db(n, window));
    all.sort((a, b) => a - b);
    const voice = all.length ? all[Math.floor(all.length * 0.95)] : -Infinity;
    const round = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : -120);
    if (!(voice > SILENCE))
        return { voice: round(voice), level: -120, clean: true, move: 0 };
    const quiet = Math.max(voice - BELOW_VOICE, FLOOR);
    const side10 = Math.round(SIDE * RATE);
    const sample = (s) => Math.round((s - start) * RATE);
    /** The quieter of the 10 ms before and after source second `p`. */
    const through = (p) => Math.min(db(sample(p) - side10, side10), db(sample(p), side10));
    const level = through(t);
    if (level <= quiet)
        return { voice: round(voice), level: round(level), clean: true, move: 0 };
    const end = start + frames / RATE;
    const dir = side === 'out' ? 1 : -1;
    let move = null;
    for (let k = 1;; k++) {
        const p = t + dir * k * STEP;
        if (p - SIDE < start || p + SIDE > end)
            break;
        if (through(p) <= quiet) {
            move = k * STEP;
            break;
        }
    }
    // Cut points land on frames: round the move up to a whole frame (less the search step, so a
    // point on a frame is not pushed a frame further by the step size).
    if (move !== null)
        move = Math.round((Math.ceil((move - STEP) * fps - 1e-6) / fps) * 1000) / 1000;
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
/**
 * Measures the speech at every audio edit point of the cut list: where each cut's sound starts
 * and stops, in its source. Points inside one continuous take (the next cut starts where this
 * one ends, same sound and gain) are no edit and are skipped, as are muted cuts and sources
 * without a readable sound file. A source that cannot be decoded is left unmeasured; the mix
 * reports it.
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
    const wanted = [];
    cuts.forEach((cut, i) => {
        const name = file(cut);
        if (!name || cut.mute)
            return;
        const abs = path.resolve(dir, name);
        if (!existsSync(abs))
            return;
        const shift = cut.srcIn / fps - cut.startFrame / fps;
        const length = soundLength(inputs.sources?.[cut.source]);
        const points = [];
        if (!continues(cuts[i - 1], cut))
            points.push(['in', cut.edit + shift]);
        if (!continues(cut, cuts[i + 1]))
            points.push(['out', soundEnd(cuts, i, end, fps) + shift]);
        for (const [side, at] of points)
            if (at >= SIDE && at <= length - SIDE)
                wanted.push({
                    cut: i,
                    side,
                    source: cut.source,
                    at: Math.round(at * 1e6) / 1e6,
                    file: abs
                });
    });
    if (!wanted.length)
        return [];
    let decoded;
    try {
        decoded = await decodeAll(wanted.map((w) => ({
            file: w.file,
            srcIn: Math.max(0, w.at - AROUND),
            frames: Math.round((Math.min(w.at, AROUND) + AROUND) * RATE)
        })));
    }
    catch {
        return [];
    }
    return wanted.map(({ file: _file, ...w }, k) => ({
        ...w,
        ...measureEdge(decoded[k], Math.max(0, w.at - AROUND), w.at, w.side, fps)
    }));
}
