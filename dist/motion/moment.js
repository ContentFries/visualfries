/** Cue names every clip has; projects cannot redefine them. */
export const RESERVED_CUES = ['start', 'end'];
const CUE_MOMENT = /^([A-Za-z_][A-Za-z0-9_]*)(\.start|\.end)?\s*([+-]\s*\d*\.?\d+)?$/;
const FRAME_MOMENT = /^f(\d+)$/;
const SECONDS_MOMENT = /^(-?\d*\.?\d+)s$/;
/**
 * The one grammar for "a moment in a clip", shared by blocks (`clip.at`) and the CLI (`--at`):
 * - cue: `extra`, `extra.end`, `extra+0.4`, `extra.end - 0.2`, and the built-in `start` / `end`
 * - clip-local seconds: `2.5s` (or a plain number from code)
 * - clip-local frame: `f120`
 * - `mid`: the middle of the clip
 * Returns clip-local seconds.
 */
export function resolveMoment(at, ctx) {
    if (typeof at === 'number')
        return at;
    const text = at.trim();
    if (text === 'mid')
        return ctx.duration / 2;
    const frame = FRAME_MOMENT.exec(text);
    if (frame)
        return Number(frame[1]) / ctx.fps;
    const seconds = SECONDS_MOMENT.exec(text);
    if (seconds)
        return Number(seconds[1]);
    const m = CUE_MOMENT.exec(text);
    const builtin = {
        start: { start: 0, end: 0 },
        end: { start: ctx.duration, end: ctx.duration }
    };
    const cue = m && (builtin[m[1]] ?? ctx.cues[m[1]]);
    if (!m || !cue) {
        const known = [...Object.keys(ctx.cues), ...RESERVED_CUES].join(', ');
        throw new Error(`Clip "${ctx.id}": unknown moment "${at}". Use a cue (${known}), "extra.end+0.3", "2.5s", "f120" or "mid".`);
    }
    const base = m[2] === '.end' ? cue.end : cue.start;
    return base + (m[3] ? Number(m[3].replace(/\s+/g, '')) : 0);
}
