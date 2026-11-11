import { snapSpan } from './flash-frames.js';
import { pickMusic } from './beat-grid.js';
import { AnchorError, isProgramEnd, orderPoint, resolveAnchor, resolvePhrase } from './anchors.js';
import { NEUTRAL_BRAND } from './brand.js';
import { NEUTRAL_STYLE } from './style.js';
import { resolveFormat } from './format.js';
function toRef(word, clipStart) {
    return { ...word, localStart: word.start - clipStart, localEnd: word.end - clipStart };
}
function resolveWords(spec, words, fps, window, clipStart, beats) {
    if (!words)
        throw new AnchorError('Word bindings need a transcript; set "transcript" in the project.');
    if (spec === 'clip')
        return words.filter((w) => w.start >= window.from && w.start < window.to);
    const ctx = { words, fps, window, localBase: clipStart, beats };
    if (typeof spec === 'string')
        return resolvePhrase(spec, ctx, undefined).words;
    const a = resolveAnchor(spec.from, ctx, 'start');
    const b = resolveAnchor(spec.until, ctx, 'end');
    return words.filter((w) => w.start >= a.time - 1e-6 && w.start < b.time);
}
/** Whether a props value names a project file: an object with a string `file` and nothing else. */
export function isPropFile(value) {
    return (!!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        typeof value.file === 'string');
}
/** Every `{ file }` in props, with where it sits (`shot`, `items[2].icon`). */
export function propFileRefs(props) {
    return walkProps(props).filter((r) => r.file !== null);
}
/**
 * Objects in props with a `file` key, by where they sit: `file` is the path of a `{ file }`, or
 * null for an object that has other keys next to it (handed to the block as it is).
 */
function walkProps(props) {
    const out = [];
    const walk = (value, at) => {
        if (isPropFile(value))
            out.push({ at, file: value.file });
        else if (Array.isArray(value))
            value.forEach((v, i) => walk(v, `${at}[${i}]`));
        else if (value && typeof value === 'object') {
            if ('file' in value)
                out.push({ at, file: null });
            for (const [k, v] of Object.entries(value))
                walk(v, `${at}.${k}`);
        }
    };
    for (const [k, v] of Object.entries(props ?? {}))
        walk(v, k);
    return out;
}
/**
 * Props with every `{ file }` replaced by `url(file)`: the node tooling serves those files to the
 * page, so a block reads a URL string. Props without files come back as they are.
 */
export function withFileUrls(props, url) {
    if (!propFileRefs(props).length)
        return props;
    const swap = (value) => isPropFile(value)
        ? url(value.file)
        : Array.isArray(value)
            ? value.map(swap)
            : value && typeof value === 'object'
                ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swap(v)]))
                : value;
    return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, swap(v)]));
}
/** Records why a clip's `field` could not be resolved. */
function failField(diagnostics, clip, field, error) {
    diagnostics.push({ level: 'error', clip: clip.id, field, message: error.message });
}
/** Where the clip starts and ends in seconds (`tail` included), or null once a diagnostic says why not. */
function resolveClipSpan(clip, words, fps, beats, programEnd, previous, diagnostics, edges = null) {
    const order = (field, after, what) => ({
        after,
        what,
        picked: (message) => diagnostics.push({ level: 'info', clip: clip.id, field, message })
    });
    let startSec;
    let endSec;
    try {
        const hit = resolveAnchor(clip.from, {
            words,
            fps,
            window: null,
            localBase: null,
            beats,
            end: programEnd,
            order: order('from', previous.at, 'the previous clip')
        }, 'start');
        startSec = hit.time;
        previous.at = orderPoint(hit);
    }
    catch (error) {
        failField(diagnostics, clip, 'from', error);
        return null;
    }
    try {
        endSec = resolveAnchor(clip.until, {
            words,
            fps,
            window: { from: startSec, to: Infinity },
            localBase: null,
            beats,
            end: programEnd,
            order: order('until', startSec, "the clip's start")
        }, 'end').time;
    }
    catch (error) {
        failField(diagnostics, clip, 'until', error);
        return null;
    }
    const snapped = snapSpan(clip.snap, { start: startSec, end: endSec }, edges, fps, (_, message) => diagnostics.push({ level: 'warning', clip: clip.id, field: 'snap', message }));
    return { startSec: snapped.start, endSec: snapped.end + (clip.tail ?? 0) };
}
/** A one-word phrase anchor easily matches the wrong spot after a re-take; say so. */
function warnOneWordAnchors(clip, programEnd, diagnostics) {
    for (const field of ['from', 'until']) {
        const anchor = clip[field];
        const say = typeof anchor === 'string' && !isProgramEnd(anchor, { end: programEnd })
            ? anchor
            : typeof anchor === 'object' && 'say' in anchor
                ? anchor.say
                : null;
        if (say && say.trim().split(/\s+/).length === 1) {
            diagnostics.push({
                level: 'warning',
                clip: clip.id,
                field,
                message: `One-word anchor "${say}" is searched ${field === 'until' ? 'from the clip start onward' : 'in the whole transcript'} and easily becomes ambiguous after a re-take. Use 2–3 words.`
            });
        }
    }
}
/** The clip's end frame, cut at the program end when it runs past it (with a diagnostic). */
function cutAtProgramEnd(clip, startSec, endSec, startFrame, endFrame, fps, programEnd, diagnostics) {
    const programFrames = typeof programEnd === 'number' ? Math.round(programEnd * fps) : null;
    if (programFrames !== null && startFrame >= programFrames)
        diagnostics.push({
            level: 'warning',
            clip: clip.id,
            field: 'from',
            message: `Clip starts at ${startSec.toFixed(2)} s, at or after the program end (${programEnd.toFixed(2)} s): it is never shown.`
        });
    // A clip that runs past the program end is cut there, its own length included.
    else if (programFrames !== null && endFrame > programFrames) {
        diagnostics.push({
            level: 'info',
            clip: clip.id,
            field: 'until',
            message: `Clip ends at ${endSec.toFixed(2)} s, after the program (${programEnd.toFixed(2)} s); it is cut there. "until": "end" ends it with the program.`
        });
        return programFrames;
    }
    return endFrame;
}
/** The clip's named cues, in clip-local time; a cue that fails or never shows says so. */
function resolveCues(clip, words, fps, window, start, end, beats, diagnostics) {
    const cues = {};
    for (const [name, anchor] of Object.entries(clip.cues ?? {})) {
        try {
            const hit = resolveAnchor(anchor, { words, fps, window, localBase: start, beats }, 'start');
            const local = hit.time - start;
            if (local < -1 / fps || local >= end - start) {
                diagnostics.push({
                    level: 'warning',
                    clip: clip.id,
                    field: `cues.${name}`,
                    message: `Cue at ${hit.time.toFixed(2)}s is never shown: the clip covers ${start.toFixed(2)}–${end.toFixed(2)}s (end exclusive).`
                });
            }
            cues[name] = {
                start: local,
                end: hit.end - start,
                frame: Math.round(local * fps),
                words: hit.words.map((w) => toRef(w, start))
            };
        }
        catch (error) {
            failField(diagnostics, clip, `cues.${name}`, error);
        }
    }
    return cues;
}
/** The clip's named word ranges, in clip-local time. */
function resolveBoundWords(clip, words, fps, window, start, beats, diagnostics) {
    const bound = {};
    for (const [name, spec] of Object.entries(clip.words ?? {})) {
        try {
            bound[name] = resolveWords(spec, words, fps, window, start, beats).map((w) => toRef(w, start));
            if (!bound[name].length) {
                diagnostics.push({
                    level: 'warning',
                    clip: clip.id,
                    field: `words.${name}`,
                    message: 'No words matched.'
                });
            }
        }
        catch (error) {
            failField(diagnostics, clip, `words.${name}`, error);
        }
    }
    return bound;
}
/** Warns about `file` objects the block gets as they are, and fails files the tooling cannot serve. */
function checkPropFiles(clip, files, diagnostics) {
    for (const ref of walkProps(clip.props)) {
        if (ref.file === null)
            diagnostics.push({
                level: 'warning',
                clip: clip.id,
                field: `props.${ref.at}`,
                message: 'This object has "file" next to other keys, so the block gets it as it is. To name a project file, write { "file": "…" } alone (the block then gets its URL) and put the other values beside it.'
            });
        else if (files?.[ref.file])
            failField(diagnostics, clip, `props.${ref.at}`, new Error(files[ref.file]));
    }
}
/** The clip's beat grid in clip-local time, or why it has none; null without music. */
function resolveMusicFields(clip, music, beats, start) {
    // Without music the clip gets no beat fields at all, so it resolves exactly as before.
    if (!music.length)
        return null;
    try {
        return {
            beats: pickMusic(beats.music, beats.clip).grid.map(({ index, time, bar, beat }) => ({
                index,
                time,
                local: time - start,
                bar,
                beat
            }))
        };
    }
    catch (error) {
        return { noBeats: error.message };
    }
}
export function resolveMotionClip(clip, project, words, diagnostics, music = [], look = {}, previous = { at: null }) {
    const fps = project.fps;
    const beats = { music, clip: clip.music };
    const programEnd = look.end;
    const span = resolveClipSpan(clip, words, fps, beats, programEnd, previous, diagnostics, look.cutEdges ?? null);
    if (!span)
        return null;
    const { startSec, endSec } = span;
    warnOneWordAnchors(clip, programEnd, diagnostics);
    const startFrame = Math.round(startSec * fps);
    const endFrame = cutAtProgramEnd(clip, startSec, endSec, startFrame, Math.round(endSec * fps), fps, programEnd, diagnostics);
    if (endFrame <= startFrame) {
        failField(diagnostics, clip, 'until', new Error(`Clip ends (${endSec.toFixed(2)}s) before it starts (${startSec.toFixed(2)}s).`));
        return null;
    }
    const start = startFrame / fps;
    const end = endFrame / fps;
    // Search with the unrounded anchors too: a word at 1.02 s must not fall out of a clip
    // whose first frame lands at 1.0333 s.
    const window = { from: Math.min(start, startSec) - 1e-6, to: Math.max(end, endSec) };
    const cues = resolveCues(clip, words, fps, window, start, end, beats, diagnostics);
    const bound = resolveBoundWords(clip, words, fps, window, start, beats, diagnostics);
    checkPropFiles(clip, look.files, diagnostics);
    const musicFields = resolveMusicFields(clip, music, beats, start);
    return {
        id: clip.id,
        block: clip.block,
        fps,
        size: project.size,
        start,
        end,
        startFrame,
        frames: endFrame - startFrame,
        duration: end - start,
        cues,
        words: bound,
        props: clip.props ?? {},
        alpha: clip.alpha ?? false,
        background: clip.alpha ? null : (clip.background ?? project.background ?? null),
        audio: clip.audio ?? null,
        ...musicFields,
        brand: look.brand ?? NEUTRAL_BRAND,
        style: look.style ?? NEUTRAL_STYLE,
        format: look.format ?? resolveFormat(project.size, project.safeZone)
    };
}
/** `music`: beats of the project's music items, placed in the program (see `programBeats`). */
export function resolveMotionProject(project, words, music = [], look = {}) {
    const diagnostics = [];
    const format = resolveFormat(project.size, project.safeZone);
    // A project-wide setting: one warning for the project, not one per clip.
    if (format.fallback)
        diagnostics.push({ level: 'warning', field: 'safeZone', message: format.fallback });
    const ids = new Set();
    const clips = [];
    const previous = { at: null };
    for (const clip of project.clips) {
        if (ids.has(clip.id)) {
            diagnostics.push({
                level: 'error',
                clip: clip.id,
                field: 'id',
                message: 'Duplicate clip id.'
            });
            continue;
        }
        ids.add(clip.id);
        if (clip.audio && !project.footage?.[clip.audio]) {
            diagnostics.push({
                level: 'error',
                clip: clip.id,
                field: 'audio',
                message: `Unknown footage "${clip.audio}". Footage: ${Object.keys(project.footage ?? {}).join(', ') || 'none'}`
            });
        }
        if (clip.music && !music.some((m) => m.id === clip.music)) {
            diagnostics.push({
                level: 'error',
                clip: clip.id,
                field: 'music',
                message: `Unknown music "${clip.music}". Music with beats: ${music.map((m) => m.id ?? m.name).join(', ') || 'none'}`
            });
        }
        const resolved = resolveMotionClip(clip, project, words, diagnostics, music, { ...look, format }, previous);
        if (resolved)
            clips.push(resolved);
    }
    return { fps: project.fps, size: project.size, clips, diagnostics };
}
