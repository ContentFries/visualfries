import { NO_MUSIC_BEATS, findBarBeat, findBeat, nearBeat, shiftByBeats } from './beat-grid.js';
/** Cue names every clip has; projects cannot redefine them. */
export const RESERVED_CUES = ['start', 'end'];
// Cue names are letters (any script), digits, `_` and inner spaces, not starting with a digit:
// `nových odberateľov`, `extra_2`. `+`, `-` and `.` belong to the grammar.
const CUE_MOMENT = /^([\p{L}_][\p{L}\p{N}_ ]*?)(\.start|\.end)?$/u;
const FRAME_MOMENT = /^f(\d+)$/;
/** `2.5s`, or a bare `2.5` like a number from code. */
const SECONDS_MOMENT = /^(-?\d*\.?\d+)s?$/;
/** `extra + 0.4`, `extra.end-0.2`, `bar 5 - 1b`: a moment, then seconds or beats. */
const OFFSET_MOMENT = /^(.*?\S)\s*([+-])\s*(\d*\.?\d+)(b?)$/;
const BEAT_MOMENT = /^beat\s+(\d+)$/;
const BAR_MOMENT = /^bar\s+(\d+)(?:\.(\d+))?$/;
/** `downbeat > extra`, `beat < end - 0.5`: the nearest (down)beat after or before a moment. */
const NEAR_MOMENT = /^(beat|downbeat)\s*([<>])\s*(.+)$/;
/**
 * The one grammar for "a moment in a clip", shared by blocks (`clip.at`) and the CLI (`--at`):
 * - cue: `extra`, `extra.end`, `extra+0.4`, `extra.end - 0.2`, and the built-in `start` / `end`
 * - clip-local seconds: `2.5s` or `2.5` (a plain number from code works too)
 * - clip-local frame: `f120`
 * - `mid`: the middle of the clip
 * - music beats: `beat 17`, `bar 5`, `bar 5.3` (beat 3 of bar 5), `downbeat > extra` (first
 *   downbeat at or after a moment), `beat < end` (last beat at or before it)
 * - any of these plus or minus seconds (`+0.4`) or beats (`- 1b`); after `>` / `<` the offset
 *   belongs to the moment on the right
 * Returns clip-local seconds.
 */
export function resolveMoment(at, ctx) {
    return momentIn(at, at, ctx);
}
/** `whole` is the moment as written, so an error inside `extr - 1b` names all of it. */
function momentIn(at, whole, ctx) {
    if (typeof at === 'number')
        return at;
    const text = at.trim();
    const label = `the music of clip "${ctx.id}"`;
    /** Runs a beat lookup; its error gets the clip and moment in front, once. */
    const onBeats = (fn) => {
        if (!ctx.beats?.length)
            throw new Error(`Clip "${ctx.id}": "${whole}" needs music beats. ${ctx.noBeats ?? NO_MUSIC_BEATS}`);
        try {
            return fn(ctx.beats);
        }
        catch (error) {
            throw new Error(`Clip "${ctx.id}": "${whole}": ${error.message}`);
        }
    };
    const near = NEAR_MOMENT.exec(text);
    if (near) {
        const time = momentIn(near[3], whole, ctx);
        const kind = near[1];
        return onBeats((grid) => nearBeat(grid, time, kind, near[2] === '>' ? 'after' : 'before', label)).time;
    }
    const offset = OFFSET_MOMENT.exec(text);
    if (offset) {
        const base = momentIn(offset[1], whole, ctx);
        const amount = Number(offset[3]) * (offset[2] === '-' ? -1 : 1);
        return offset[4] ? onBeats((grid) => shiftByBeats(grid, base, amount, label)) : base + amount;
    }
    if (text === 'mid')
        return ctx.duration / 2;
    const frame = FRAME_MOMENT.exec(text);
    if (frame)
        return Number(frame[1]) / ctx.fps;
    const seconds = SECONDS_MOMENT.exec(text);
    if (seconds)
        return Number(seconds[1]);
    const beat = BEAT_MOMENT.exec(text);
    if (beat)
        return onBeats((grid) => findBeat(grid, Number(beat[1]), label)).time;
    const bar = BAR_MOMENT.exec(text);
    if (bar)
        return onBeats((grid) => findBarBeat(grid, Number(bar[1]), Number(bar[2] ?? 1), label)).time;
    const m = CUE_MOMENT.exec(text);
    const builtin = {
        start: { start: 0, end: 0 },
        end: { start: ctx.duration, end: ctx.duration }
    };
    const name = m?.[1].trim() ?? '';
    const cue = m && (builtin[name] ?? ctx.cues[name]);
    if (!m || !cue) {
        const known = [...Object.keys(ctx.cues), ...RESERVED_CUES].join(', ');
        const beats = ctx.beats?.length ? ', "bar 5", "beat 17", "downbeat > extra", "extra - 1b"' : '';
        const part = at === whole ? '' : ` in "${whole}"`;
        throw new Error(`Clip "${ctx.id}": unknown moment "${at}"${part}. Use a cue (${known}), "extra.end+0.3", "2.5s" (or 2.5), "f120", "mid"${beats}.`);
    }
    return m[2] === '.end' ? cue.end : cue.start;
}
