import { micro } from './cutlist.js';
import { clipShowRange } from './segments.js';
import { shotsDuring } from './shots/index.js';
/**
 * Excerpts: a range of the program as a video of its own (a teaser), sliced from the whole
 * program after it resolved, so every phrase, `until` and repeated phrase lands exactly where it
 * does in the full video and nothing in the slice goes missing. Pure, like `resolveProgram`.
 *
 * At the edges, items keep their own time: a clip, shot or transition running across `from` or
 * `until` shows the frames it shows there in the full video (a clip mid-way through its
 * animation, a shot mid-way through its move). Cuts are trimmed to the slice. Sound is trimmed
 * with short fades (see `EDGE_FADE`). An end card plays after the slice over its last frame,
 * held: from the card's first frame on, the footage, shots and clips stay as they are on the
 * slice's last frame and only the card moves (`StageSegment.hold`).
 */
/** The built-in end card (`@visualfries/end-card`), the default block of `end`. */
export const END_CARD_BLOCK = '@visualfries/end-card';
/**
 * Seconds of the fades where an excerpt's edge cuts a sound: speech and effects get an
 * anti-click fade, music a short fade-in at `from` and its own `fade.out` (at least this) where
 * the excerpt ends.
 */
export const EDGE_FADE = { speech: 0.01, music: 0.25 };
const endOf = (s) => s.startFrame + s.frames;
const overlaps = (a, b) => a.startFrame < endOf(b) && b.startFrame < endOf(a);
/**
 * The excerpt `excerpt` of program `full`: every item on screen in the range, moved so that the
 * range starts at frame 0, plus the end card's clip and sound. Segments are left to the caller
 * (they hash the sliced items). `sounds` gives each effect's hit offset, so an effect stays in the
 * excerpt exactly when its hit lands inside it. `field` names the excerpt in diagnostics
 * (`excerpts[0]`).
 */
export function sliceProgram(full, excerpt, end, sounds = {}, field = 'excerpt') {
    const fps = full.fps;
    const first = excerpt.startFrame;
    const range = { startFrame: first, frames: excerpt.frames };
    const cardFrames = end.clip ? end.clip.frames : 0;
    const a = first / fps;
    const b = endOf(range) / fps;
    /** Program seconds of the whole program as seconds of the excerpt. */
    const sec = (t) => micro(t - a);
    const frame = (f) => f - first;
    const transitions = full.transitions
        .filter((t) => overlaps(t, range))
        .map((t) => ({ ...t, startFrame: frame(t.startFrame), cutFrame: frame(t.cutFrame) }));
    const kept = new Set(transitions.map((t) => t.id));
    const transitionOf = (id) => (id !== null && kept.has(id) ? id : null);
    // Both sides of a cut transition the slice shows stay, even a side outside the range: the
    // window shows its handle.
    const sides = new Set(transitions.flatMap((t) => (t.kind === 'cut' ? [t.owner, t.outgoing ?? ''] : [])));
    const cuts = full.cuts.flatMap((c) => {
        const moved = {
            transition: transitionOf(c.transition),
            audio: { ...c.audio, edit: sec(c.audio.edit) }
        };
        if (overlaps(c, range))
            return [{ ...trimCut(c, range), ...moved }];
        if (!sides.has(c.id))
            return [];
        return [{ ...c, startFrame: frame(c.startFrame), ...moved }];
    });
    // Shots keep their start, so a move cut by `from` goes on from where it is (with the shot it
    // morphs from), and their keys.
    const shots = shotsDuring(full.shots, range).map((s) => ({
        ...s,
        startFrame: frame(s.startFrame),
        transition: transitionOf(s.transition),
        keys: s.keys.map((k) => ({ ...k, frame: frame(k.frame) }))
    }));
    const clips = full.clips
        .filter((c) => {
        const show = clipShowRange(c, full.transitions);
        return show.from < endOf(range) && show.until > first;
    })
        .map((c) => shiftClip(c, first, fps));
    if (end.clip)
        clips.push(end.clip);
    const events = full.events
        .filter((e) => e.frame >= first && e.frame < endOf(range))
        .map((e) => ({ ...e, frame: frame(e.frame) }));
    const words = full.words
        .filter((w) => w.end > a && w.start < b)
        .map((w) => ({ ...w, start: sec(w.start), end: sec(w.end) }));
    /** Where the excerpt ends, end card included, in program seconds of the whole program. */
    const stop = (endOf(range) + cardFrames) / fps;
    const speech = full.audio.speech.flatMap((p) => {
        const piece = trimPiece(p, a, b, EDGE_FADE.speech, EDGE_FADE.speech);
        return piece ? [shiftPiece(piece, a)] : [];
    });
    // An effect plays when its hit lands in the slice; one that rings on past `until` rings on
    // under the end card. Its part before `from` (the run-up to the hit) is cut.
    const sfx = full.audio.sfx.flatMap((p) => {
        const hit = sounds[p.file]?.hit ?? 0;
        const moment = p.at + hit - p.srcIn;
        if (moment < a - 1e-6 || moment >= b - 1e-6)
            return [];
        const piece = trimPiece(p, a, Infinity, EDGE_FADE.speech, 0);
        return [shiftPiece(piece, a)];
    });
    if (end.sound)
        sfx.push(end.sound);
    sfx.sort((x, y) => x.at - y.at || (x.owner < y.owner ? -1 : x.owner > y.owner ? 1 : 0));
    // Music goes on under the end card, at the level it has at `until`, and fades out where the
    // excerpt ends.
    const music = full.audio.music.flatMap((p) => {
        const piece = trimPiece(p, a, stop, EDGE_FADE.music, Math.max(EDGE_FADE.music, p.fadeOut));
        if (!piece)
            return [];
        const shifted = shiftPiece(piece, a);
        if (p.gainKeys?.length)
            shifted.gainKeys = keysWithin(p.gainKeys, a, b);
        return [shifted];
    });
    return {
        ...full,
        frames: excerpt.frames + cardFrames,
        cuts,
        shots,
        clips,
        transitions,
        words,
        events,
        audio: { ...full.audio, speech, sfx, music },
        diagnostics: [...full.diagnostics, ...excerptNotes(full, excerpt, field)],
        excerpt
    };
}
/** A cut trimmed to `range`, in excerpt frames; a start inside its hold shows the held frame. */
function trimCut(c, range) {
    const from = Math.max(c.startFrame, range.startFrame);
    const to = Math.min(endOf(c), endOf(range));
    const cut = from - c.startFrame;
    const visible = c.frames - (c.hold ?? 0);
    const inHold = cut >= visible;
    const srcIn = inHold ? c.srcOut - 1 : c.srcIn + cut;
    const srcOut = inHold ? c.srcOut : c.srcIn + Math.min(visible, to - c.startFrame);
    const frames = to - from;
    const hold = frames - (srcOut - srcIn);
    const { hold: _hold, ...rest } = c;
    return {
        ...rest,
        startFrame: from - range.startFrame,
        frames,
        srcIn,
        srcOut,
        handles: {
            before: srcIn,
            after: c.handles.after === null ? null : c.handles.after + (c.srcOut - srcOut)
        },
        ...(hold > 0 ? { hold } : {})
    };
}
/** A clip in excerpt time: the same clip, its program times moved, its own time unchanged. */
function shiftClip(c, first, fps) {
    const a = first / fps;
    const word = (w) => ({
        ...w,
        start: micro(w.start - a),
        end: micro(w.end - a)
    });
    const startFrame = c.startFrame - first;
    return {
        ...c,
        start: startFrame / fps,
        end: (startFrame + c.frames) / fps,
        startFrame,
        cues: Object.fromEntries(Object.entries(c.cues).map(([name, cue]) => [name, { ...cue, words: cue.words.map(word) }])),
        words: Object.fromEntries(Object.entries(c.words).map(([name, list]) => [name, list.map(word)])),
        ...(c.beats ? { beats: c.beats.map((beat) => ({ ...beat, time: micro(beat.time - a) })) } : {}),
        keys: c.keys.map((k) => ({ ...k, frame: k.frame - first }))
    };
}
/**
 * A sound cut to the program seconds `[from, to)`, or null when it plays outside them. A cut
 * start fades in over at least `fadeIn`, a cut end fades out over `fadeOut`.
 */
function trimPiece(p, from, to, fadeIn, fadeOut) {
    const stop = p.dur === null ? Infinity : p.at + p.dur;
    if (stop <= from || p.at >= to)
        return null;
    const out = { ...p };
    if (p.at < from) {
        const cut = from - p.at;
        out.at = from;
        out.srcIn = micro(p.srcIn + cut);
        out.dur = p.dur === null ? null : micro(p.dur - cut);
        out.fadeIn = micro(Math.max(fadeIn, p.fadeIn - cut));
    }
    if (stop > to) {
        out.dur = micro(to - out.at);
        out.fadeOut = micro(Math.min(out.dur, fadeOut));
        // It no longer ends on the bar it snapped to.
        delete out.snap;
    }
    return out;
}
const shiftPiece = (p, a) => ({ ...p, at: micro(p.at - a) });
/**
 * Gain keys inside `[from, until]` in excerpt seconds, with the level at each edge where keys
 * lie beyond it: the level holds before `from` and after `until` (under the end card).
 */
function keysWithin(keys, from, until) {
    const inside = keys.filter((k) => k.at >= from && k.at <= until);
    const out = [...inside];
    if (keys.some((k) => k.at < from))
        out.unshift({ at: from, gain: gainAt(keys, from) });
    if (keys.some((k) => k.at > until))
        out.push({ at: until, gain: gainAt(keys, until) });
    return out.map((k) => ({ at: micro(k.at - from), gain: micro(k.gain) }));
}
/** The dB of gain keys at `t`, as the mixer reads them: straight lines, held at both ends. */
function gainAt(keys, t) {
    const k = keys.findIndex((x) => x.at > t);
    if (k === 0)
        return keys[0].gain;
    if (k < 0)
        return keys[keys.length - 1].gain;
    const p = keys[k - 1];
    const q = keys[k];
    return p.gain + ((q.gain - p.gain) * (t - p.at)) / (q.at - p.at);
}
/**
 * What an excerpt's edges cut, for `program` and `check`: a word cut through (warning), a shot's
 * move or a transition window the excerpt starts or ends inside (warning: its first or last
 * frames are mid-move), and the clips that run across an edge (info).
 */
function excerptNotes(full, excerpt, at) {
    const fps = full.fps;
    const out = [];
    const note = (level, field, message) => out.push({ level, item: excerpt.id, field: `${at}.${field}`, message });
    const s = (f) => (f / fps).toFixed(2);
    const edges = [
        ['from', excerpt.startFrame],
        ['until', excerpt.startFrame + excerpt.frames]
    ];
    for (const [field, f] of edges) {
        const t = f / fps;
        const half = 0.5 / fps;
        const word = full.words.find((w) => w.start < t - half && w.end > t + half);
        if (word)
            note('warning', field, `The excerpt ${field === 'from' ? 'starts' : 'ends'} inside the word "${word.text}" (${word.start.toFixed(2)}–${word.end.toFixed(2)} s of the program, the edge at ${t.toFixed(2)} s).`);
        const move = full.shots.find((x) => x.morphFrames > 0 && x.startFrame < f && f < x.startFrame + x.morphFrames);
        if (move)
            note('warning', field, `The excerpt ${field === 'from' ? 'starts' : 'ends'} inside the move into shot "${move.id}" (${s(move.startFrame)}–${s(move.startFrame + move.morphFrames)} s), so its ${field === 'from' ? 'first' : 'last'} frames are mid-move, as in the full video.`);
        const window = full.transitions.find((x) => x.startFrame < f && f < x.startFrame + x.frames);
        if (window)
            note('warning', field, `The excerpt ${field === 'from' ? 'starts' : 'ends'} inside the ${window.type} window into "${window.owner}" (${s(window.startFrame)}–${s(window.startFrame + window.frames)} s), so its ${field === 'from' ? 'first' : 'last'} frames are mid-transition, as in the full video.`);
        const across = full.clips.filter((c) => c.startFrame < f && f < c.startFrame + c.frames);
        if (across.length)
            note('info', field, `${across.map((c) => `"${c.id}"`).join(', ')} ${across.length > 1 ? 'run' : 'runs'} across the ${field === 'from' ? 'start' : 'end'}: ${field === 'from' ? `shown from where it is at ${t.toFixed(2)} s, as in the full video` : `stopped at ${t.toFixed(2)} s${excerpt.end ? ' and held under the end card' : ''}`}.`);
    }
    return out;
}
