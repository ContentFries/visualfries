import { z } from 'zod';
/**
 * A beats file (`music.beats.json`), written once by `visualfries beats music.mp3` and read by
 * everything else, so render never analyses audio. Times are seconds of the music file.
 * Downbeats are the beats with `beat: 1`; `bars[].start` repeats them with the bar's energy.
 */
export const BeatsFileShape = z.object({
    version: z.literal(1),
    source: z.object({
        /** Music file name when it was analysed. */
        file: z.string().min(1),
        /** SHA-256 of the music file; a changed file makes the beats stale. */
        sha256: z.string().regex(/^[0-9a-f]{64}$/, 'sha256: 64 hex digits'),
        duration: z.number().positive()
    }),
    analyzer: z.object({
        name: z.string().min(1),
        version: z.string().nullable(),
        model: z.string().optional(),
        command: z.string().optional()
    }),
    /** Beats per minute from the median beat interval; informational. */
    tempo: z.number().positive(),
    /** Most common bar length; null when the analyzer gave no downbeats. */
    beatsPerBar: z.number().int().positive().nullable(),
    beats: z
        .array(z.object({
        time: z.number(),
        /** 1 = first full bar, 0 = pickup beats before it. Absent without downbeats. */
        bar: z.number().int().min(0).optional(),
        /** Position in the bar, 1 = downbeat. */
        beat: z.number().int().min(1).optional(),
        /** RMS level in dB from this beat to the next. */
        energy: z.number().optional()
    }))
        .min(2, 'a beats file needs at least two beats'),
    bars: z.array(z.object({
        bar: z.number().int().min(1),
        start: z.number(),
        /** RMS level of the bar in dB (dBFS). */
        energy: z.number()
    }))
});
const power = (db) => 10 ** (db / 10);
const decibels = (p) => Math.round(10 * Math.log10(Math.max(p, 1e-12)) * 10) / 10;
/** Labels beats 1…n counting from `first` (the index of a downbeat), backwards for pickups. */
function relabel(list, first, perBar) {
    list.forEach((b, i) => (b.position = ((((i - first) % perBar) + perBar) % perBar) + 1));
}
function firstDownbeat(list) {
    const i = list.findIndex((b) => b.position === 1);
    return i < 0 ? 0 : i;
}
/**
 * Applies a project's corrections to a beats file: `tempo` first, then `downbeat` (counted on
 * the grid `tempo` produced), then `shift`. Returns beats in music-file seconds.
 */
export function correctBeats(file, corrections = {}) {
    const hasBars = file.beats.every((b) => b.beat !== undefined) && file.beatsPerBar !== null;
    let list = file.beats.map((b) => ({
        time: b.time,
        position: hasBars ? b.beat : null,
        energy: b.energy ?? null
    }));
    const perBar = file.beatsPerBar ?? 4;
    if (corrections.tempo === 'double') {
        const first = firstDownbeat(list);
        const doubled = [];
        list.forEach((b, i) => {
            doubled.push({ ...b });
            const next = list[i + 1];
            if (next)
                doubled.push({ time: (b.time + next.time) / 2, position: null, energy: b.energy });
        });
        list = doubled;
        if (hasBars)
            relabel(list, first * 2, perBar);
    }
    else if (corrections.tempo === 'half') {
        const first = firstDownbeat(list);
        const kept = [];
        list.forEach((b, i) => {
            if ((i - first) % 2 !== 0)
                return;
            const next = list[i + 1];
            // The kept beat now spans two beats: average their power.
            const energy = b.energy !== null && next?.energy != null
                ? decibels((power(b.energy) + power(next.energy)) / 2)
                : b.energy;
            kept.push({ ...b, energy });
        });
        list = kept;
        if (hasBars)
            relabel(list, firstDownbeat(list), perBar);
    }
    if (corrections.downbeat !== undefined) {
        if (!hasBars)
            throw new Error('"downbeat" needs a beats file with downbeats (bar and beat per beat).');
        if (corrections.downbeat < 1 || corrections.downbeat > perBar)
            throw new Error(`"downbeat" must be between 1 and ${perBar} (beats per bar).`);
        const n = corrections.downbeat;
        for (const b of list)
            b.position = ((((b.position - n) % perBar) + perBar) % perBar) + 1;
    }
    const shift = corrections.shift ?? 0;
    let bar = 0;
    return list.map((b, i) => {
        if (b.position === 1)
            bar++;
        return {
            index: i + 1,
            time: Math.round((b.time + shift) * 1e6) / 1e6,
            bar: hasBars ? bar : null,
            beat: hasBars ? b.position : null,
            energy: b.energy
        };
    });
}
// ---------------------------------------------------------------- lookups
export class BeatError extends Error {
}
/** Why beat anchors, beat moments and `pulse()` fail in a project without music beats. */
export const NO_MUSIC_BEATS = 'Beat anchors need music with beats: add "music": [{ "src": "music.mp3", "beats": "music.beats.json" }] to the project (visualfries beats music.mp3 writes the beats file).';
/** `-1b`, `+0.5b`, `2b`: an offset counted in beats. */
export const BEAT_OFFSET = /^([+-]?\d*\.?\d+)b$/;
function needTwo(grid, label) {
    if (grid.length < 2)
        throw new BeatError(`${label} has fewer than two beats.`);
}
function needBars(grid, label) {
    if (grid[0]?.bar === null)
        throw new BeatError(`${label} has no downbeats, so bars do not exist. Use beats ({ "beat": n }) or re-analyse with a tool that finds downbeats.`);
}
/** The beat with number `n` (1-based over the whole file). */
export function findBeat(grid, n, label) {
    const hit = grid.find((b) => b.index === n);
    if (!hit) {
        const range = grid.length ? `${grid[0].index}–${grid[grid.length - 1].index}` : 'none';
        throw new BeatError(`Beat ${n} does not exist: ${label} has beats ${range}.`);
    }
    return hit;
}
/** Beat `beat` (default 1, the downbeat) of bar `bar`. */
export function findBarBeat(grid, bar, beat, label) {
    needBars(grid, label);
    const hit = grid.find((b) => b.bar === bar && b.beat === beat);
    if (!hit) {
        const bars = grid.filter((b) => b.beat === 1).map((b) => b.bar);
        const inBar = grid.filter((b) => b.bar === bar).length;
        throw new BeatError(inBar
            ? `Bar ${bar} has no beat ${beat}: it has ${inBar} beats.`
            : `Bar ${bar} does not exist: ${label} has bars ${bars.length ? `${bars[0]}–${bars[bars.length - 1]}` : 'none'}.`);
    }
    return hit;
}
/** The first beat (or downbeat) at or after `time`, or the last one at or before it. */
export function nearBeat(grid, time, kind, direction, label) {
    if (kind === 'downbeat')
        needBars(grid, label);
    const pool = kind === 'downbeat' ? grid.filter((b) => b.beat === 1) : grid;
    const eps = 1e-6;
    const hit = direction === 'after'
        ? pool.find((b) => b.time >= time - eps)
        : [...pool].reverse().find((b) => b.time <= time + eps);
    if (!hit)
        throw new BeatError(`No ${kind} ${direction} ${time.toFixed(2)}s: ${label} ${direction === 'after' ? 'ends before' : 'starts after'} that.`);
    return hit;
}
/**
 * Where `time` falls in the beat list, as a fractional 0-based index: 3.5 is halfway between the
 * 4th and 5th beat. Before the first and after the last beat the edge interval continues.
 */
export function beatPosition(times, time) {
    const n = times.length;
    if (time < times[0])
        return (time - times[0]) / (times[1] - times[0]);
    if (time >= times[n - 1])
        return n - 1 + (time - times[n - 1]) / (times[n - 1] - times[n - 2]);
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= time)
            lo = mid;
        else
            hi = mid;
    }
    return lo + (time - times[lo]) / (times[lo + 1] - times[lo]);
}
/** Inverse of `beatPosition`. */
export function timeAtPosition(times, position) {
    const n = times.length;
    if (position <= 0)
        return times[0] + position * (times[1] - times[0]);
    if (position >= n - 1)
        return times[n - 1] + (position - (n - 1)) * (times[n - 1] - times[n - 2]);
    const i = Math.floor(position);
    return times[i] + (position - i) * (times[i + 1] - times[i]);
}
/** `time` moved by `beats` beats along the grid (fractions follow the local beat length). */
export function shiftByBeats(grid, time, beats, label) {
    needTwo(grid, label);
    const times = grid.map((b) => b.time);
    return timeAtPosition(times, beatPosition(times, time) + beats);
}
/**
 * 0 on a beat (or downbeat for `bar`), rising to 1 just before the next one. A beat less than
 * `snap` seconds ahead counts as reached, so the frame nearest a beat (half a frame) shows it.
 */
export function beatPhase(grid, time, on, label, snap = 0) {
    if (on === 'bar')
        needBars(grid, label);
    const times = (on === 'bar' ? grid.filter((b) => b.beat === 1) : grid).map((b) => b.time);
    if (times.length < 2)
        throw new BeatError(`${label} has fewer than two ${on}s.`);
    const p = beatPosition(times, time);
    const whole = Math.floor(p + 1e-9);
    if (timeAtPosition(times, whole + 1) - time <= snap)
        return 0;
    return Math.min(1, Math.max(0, p - whole));
}
/** Bars of a corrected grid (program seconds), for `check`. Bar 0 holds pickup beats. */
export function barRows(grid, fileBars = [], corrected = false) {
    if (!grid.length || grid[0].bar === null)
        return [];
    const rows = [];
    grid.forEach((b, i) => {
        let row = rows[rows.length - 1];
        if (!row || row.bar !== b.bar) {
            row = { bar: b.bar, start: b.time, beats: [], bpm: null, energy: null, spans: [] };
            rows.push(row);
        }
        row.beats.push(b.time);
        const next = grid[i + 1];
        if (next)
            row.spans.push({ length: next.time - b.time, energy: b.energy ?? null });
    });
    return rows.map(({ spans, ...row }) => {
        const total = spans.reduce((sum, s) => sum + s.length, 0);
        if (spans.length)
            row.bpm = Math.round((60 / (total / spans.length)) * 10) / 10;
        if (spans.length && spans.every((s) => s.energy !== null))
            row.energy = decibels(spans.reduce((sum, s) => sum + s.length * power(s.energy), 0) / total);
        else if (!corrected)
            row.energy = fileBars.find((f) => f.bar === row.bar)?.energy ?? null;
        return row;
    });
}
/** The bar grid as text: tempo doubling shows up as a BPM column twice the expected value. */
export function formatBarGrid(rows, firstBeats = 4) {
    const lines = ['   bar      start    bpm   energy  first beats'];
    for (const r of rows) {
        const beats = r.beats
            .slice(0, firstBeats)
            .map((t) => t.toFixed(3))
            .join(' ');
        lines.push(`${String(r.bar).padStart(6)}  ${r.start.toFixed(3).padStart(8)}s  ${(r.bpm?.toFixed(1) ?? '-').padStart(5)}  ${(r.energy === null ? '-' : `${r.energy.toFixed(1)}dB`).padStart(7)}  ${beats}${r.beats.length > firstBeats ? ` … (${r.beats.length} beats)` : ''}${r.bar === 0 ? '  pickup' : ''}`);
    }
    return lines.join('\n');
}
/**
 * Corrects a beats file and places it in the program: file second `in` (default 0) plays at
 * program second `from`, and beats after `until` are gone. Numbers only; projects whose music
 * starts on a phrase or a beat are placed by `placeMusic` (music.ts).
 */
export function programBeats(file, music) {
    const seconds = (value, name) => {
        if (value === undefined || typeof value === 'number')
            return value;
        throw new BeatError(`programBeats takes "${name}" in seconds; use placeMusic for anchors.`);
    };
    const from = seconds(music.from, 'from') ?? 0;
    const until = seconds(music.until, 'until');
    const offset = music.in ?? 0;
    const grid = correctBeats(file, music)
        .map((b) => ({ ...b, time: Math.round((from + (b.time - offset)) * 1e6) / 1e6 }))
        .filter((b) => until === undefined || b.time <= until + 1e-6);
    return { id: music.id ?? null, name: music.id ?? music.src, grid };
}
/**
 * The music whose beats an anchor uses: the one named `id`, else the only music with beats.
 * Throws a message that says how to fix the project.
 */
export function pickMusic(music, id) {
    if (id !== undefined) {
        const hit = music.find((m) => m.id === id);
        if (!hit)
            throw new BeatError(`Unknown music "${id}". Music with beats: ${music.map((m) => m.id ?? m.name).join(', ') || 'none'}.`);
        return hit;
    }
    if (!music.length)
        throw new BeatError(NO_MUSIC_BEATS);
    if (music.length > 1)
        throw new BeatError(`Several music items have beats (${music.map((m) => m.name).join(', ')}); give each an "id" and say which with "music": "<id>".`);
    return music[0];
}
