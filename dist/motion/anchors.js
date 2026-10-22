import { AMBIGUOUS_BAR_ANCHOR } from './project.js';
import { describeWords, findPhrase, suggestPhrases } from './transcript.js';
import { BEAT_OFFSET, findBarBeat, findBeat, nearBeat, pickMusic, shiftByBeats } from './beat-grid.js';
export class AnchorError extends Error {
}
/** No music: beat anchors and beat offsets fail with "add music". */
export const NO_BEATS = { music: [], clip: undefined };
/** Says why the program end cannot be read: it is not fixed before the program is resolved. */
export const OPEN_END = 'The program end is not fixed yet: it needs "cuts" (or footage) or "duration".';
/** Where event anchors work, for anchors used anywhere else. */
export const EVENT_ELSEWHERE = 'An event anchor ({ "event", "clip" }) works in sfx "at", shots and music keys, not here: the clip it names is placed first.';
/** Whether an anchor is the program end: `"end"` in a program context, or `{ program: "end" }`. */
export function isProgramEnd(anchor, ctx) {
    if (typeof anchor === 'string')
        return anchor === 'end' && ctx.end !== undefined;
    return typeof anchor === 'object' && 'program' in anchor;
}
export function resolvePhrase(say, ctx, occurrence) {
    const { words, window } = ctx;
    const scope = ctx.scope ?? 'clip';
    if (!words)
        throw new AnchorError(`"${say}" needs a transcript; ${ctx.needs ?? 'set "transcript" in the project'}.`);
    const hits = findPhrase(words, say, window?.from, window?.to);
    if (!hits.length) {
        const anywhere = window ? findPhrase(words, say) : [];
        const similar = suggestPhrases(words, say, window?.from, window?.to);
        const hint = anywhere.length
            ? ` It occurs outside this ${scope} at ${anywhere.map((h) => h.start.toFixed(2) + 's').join(', ')}.`
            : similar.length
                ? ` Did you mean ${similar
                    .map((h) => `"${h.text}" at ${h.start.toFixed(2)}s (${describeWords(words, h.start, 2)})`)
                    .join('; ')}?`
                : window
                    ? ` Words in the ${scope} start: ${describeWords(words, window.from, 6)}`
                    : '';
        throw new AnchorError(`Phrase "${say}" not found${window ? ` inside the ${scope}` : ''}.${hint}`);
    }
    if (occurrence !== undefined) {
        const hit = hits[occurrence - 1];
        if (!hit)
            throw new AnchorError(`Phrase "${say}" has only ${hits.length} occurrence(s), asked for #${occurrence}.`);
        return hit;
    }
    if (hits.length > 1) {
        const list = hits
            .map((h, i) => `#${i + 1} at ${h.start.toFixed(2)}s (${describeWords(words, h.start, 2)})`)
            .join('; ');
        throw new AnchorError(`Phrase "${say}" is ambiguous: ${list}. Use a longer phrase or { "say": "${say}", "occurrence": n }.`);
    }
    return hits[0];
}
function musicFor(beats, id) {
    return pickMusic(beats.music, id ?? beats.clip);
}
/** Adds seconds, or moves along the beat grid for `"-1b"`. */
function applyOffset(time, offset, beats, id) {
    if (offset === undefined)
        return time;
    if (typeof offset === 'number')
        return time + offset;
    const m = BEAT_OFFSET.exec(offset);
    if (!m)
        throw new AnchorError(`Offset "${offset}" must be seconds (-0.2) or beats ("-1b").`);
    const music = musicFor(beats, id);
    return shiftByBeats(music.grid, time, Number(m[1]), music.name);
}
/** Returns seconds: absolute, or relative to `ctx.localBase` for numeric anchors when it is set. */
export function resolveAnchor(anchor, ctx, defaultEdge) {
    const { fps, localBase } = ctx;
    const beats = ctx.beats ?? NO_BEATS;
    if (typeof anchor === 'number') {
        const time = localBase === null ? anchor : localBase + anchor;
        return { time, end: time, words: [] };
    }
    if (isProgramEnd(anchor, ctx)) {
        if (ctx.end === undefined || ctx.end === null)
            throw new AnchorError(ctx.end === null ? OPEN_END : 'The program end exists only with "cuts" or "shots".');
        const offset = typeof anchor === 'object' && 'program' in anchor ? anchor.offset : undefined;
        const time = applyOffset(ctx.end, offset, beats);
        return { time, end: time, words: [] };
    }
    if (typeof anchor === 'string')
        anchor = { say: anchor };
    if ('event' in anchor) {
        if (!ctx.event)
            throw new AnchorError(EVENT_ELSEWHERE);
        const time = applyOffset(ctx.event(anchor.event, anchor.clip), anchor.offset, beats);
        return { time, end: time, words: [] };
    }
    if ('program' in anchor)
        throw new AnchorError(OPEN_END);
    if ('frame' in anchor) {
        // Program frame for clip ranges, clip-local frame for cues (like numbers).
        const time = applyOffset((localBase ?? 0) + anchor.frame / fps, anchor.offset, beats);
        return { time, end: time, words: [] };
    }
    if ('bar' in anchor || 'downbeat' in anchor || 'beat' in anchor) {
        if ('bar' in anchor &&
            ('at' in anchor || 'downbeat' in anchor || typeof anchor.beat === 'string'))
            throw new AnchorError(AMBIGUOUS_BAR_ANCHOR);
        // Beats are absolute: bar 5 is bar 5 wherever the item is.
        const music = musicFor(beats, anchor.music);
        let base;
        if ('bar' in anchor)
            base = findBarBeat(music.grid, anchor.bar, anchor.beat ?? 1, music.name).time;
        else if ('downbeat' in anchor || typeof anchor.beat === 'string') {
            const direction = 'downbeat' in anchor ? anchor.downbeat : anchor.beat;
            // `at` keeps the caller's edge: in `until` a phrase means its end, so the downbeat after
            // it never cuts the phrase short. `{ say, edge }` still picks another edge.
            const at = resolveAnchor(anchor.at, ctx, defaultEdge).time;
            base = nearBeat(music.grid, at, 'downbeat' in anchor ? 'downbeat' : 'beat', direction, music.name).time;
        }
        else
            base = findBeat(music.grid, anchor.beat, music.name).time;
        const time = applyOffset(base, anchor.offset, beats, anchor.music);
        return { time, end: time, words: [] };
    }
    const hit = resolvePhrase(anchor.say, ctx, anchor.occurrence);
    const edge = anchor.edge ?? defaultEdge;
    const base = edge === 'start'
        ? hit.start
        : edge === 'last'
            ? hit.words[hit.words.length - 1].start
            : hit.end;
    const time = applyOffset(base, anchor.offset, beats);
    return { time, end: hit.end, words: hit.words };
}
