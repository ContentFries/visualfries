import { isCutBeat, isProgramProject } from './timeline.js';
import { resolveAnchor } from './anchors.js';
import { placeMusic } from './music.js';
/** Seconds of sound a probed source has; Infinity when it was not probed. */
export const soundLength = (info) => info ? (info.audioDuration ?? info.duration) : Infinity;
/** Audio times are kept to the microsecond (a 48 kHz sample is ~21 µs): no float noise in files. */
export const micro = (seconds) => Math.round(seconds * 1e6) / 1e6;
/** Default anti-click crossfade at every audio edit point, seconds. */
export const DEFAULT_CROSSFADE = 0.01;
const cutName = (index) => `cut ${index + 1}`;
const defaultCutId = (index) => `cut${index + 1}`;
/** The cuts as written, or the one-range shorthand for a single footage. */
function cutsOf(project, diagnostics) {
    if (project.cuts?.length)
        return project.cuts;
    const names = Object.keys(project.footage ?? {});
    if (names.length > 1) {
        diagnostics.push({
            level: 'error',
            field: 'cuts',
            message: `Several footage (${names.join(', ')}) and no "cuts": list the ranges, e.g. "cuts": [{ "source": "${names[0]}" }, { "source": "${names[1]}", "in": "…" }].`
        });
        return [];
    }
    if (!names.length)
        return [];
    const name = names[0];
    const start = project.footage[name].start ?? 0;
    if (start > 0) {
        diagnostics.push({
            level: 'error',
            field: `footage.${name}.start`,
            message: `Footage "${name}" starts at ${start} s, but a program starts with its footage. Choose where it begins with "cuts": [{ "source": "${name}", "in": … }].`
        });
        return [];
    }
    return [{ source: name, in: Math.max(0, -start) }];
}
function checkTranscripts(project, diagnostics) {
    if (!project.transcript)
        return;
    const perSource = Object.entries(project.footage ?? {})
        .filter(([, f]) => f.transcript)
        .map(([name]) => name);
    const target = Object.keys(project.footage ?? {})[0] ?? '<name>';
    if (perSource.length)
        diagnostics.push({
            level: 'error',
            field: 'transcript',
            message: `"transcript" (program time) cannot be combined with "footage.${perSource[0]}.transcript" (source time). Move it to "footage.${target}.transcript".`
        });
    else if (project.cuts?.length)
        diagnostics.push({
            level: 'error',
            field: 'transcript',
            message: `"transcript" is program time, but the cut list changes program time. Move it to "footage.${target}.transcript"; the cut list maps it.`
        });
}
const isNumeric = (t) => t !== undefined && (typeof t === 'number' || (typeof t === 'object' && 'frame' in t));
/**
 * Resolves the cut list: cut points in source time (phrases against the source's transcript,
 * `out` searched from `in`, frame-rounded), program positions, audio edit points and the program
 * transcript. Projects without `cuts` or `shots` stay in inserts mode: their transcript is
 * program time, untouched.
 */
export function resolveCutList(project, inputs) {
    const diagnostics = [];
    if (!isProgramProject(project))
        return {
            mode: 'inserts',
            cuts: [],
            frames: null,
            words: inputs.words?.map((w) => ({ ...w, ...NO_SOURCE })) ?? null,
            diagnostics
        };
    const fps = project.fps;
    checkTranscripts(project, diagnostics);
    const written = cutsOf(project, diagnostics);
    // Cut points on beats read the music placed without words (the cut list decides the words).
    let musicForCuts = null;
    const cutBeats = () => (musicForCuts ??= inputs.tracks
        ? (() => {
            const placed = placeMusic(project, {
                tracks: inputs.tracks,
                words: null,
                sounds: inputs.sounds,
                stage: 'cuts'
            });
            return {
                beats: { music: placed.beats, clip: undefined },
                deferred: placed.deferred,
                failed: placed.failed
            };
        })()
        : { beats: { music: inputs.music ?? [], clip: undefined }, deferred: [], failed: [] });
    /**
     * The program frame of a beat a cut ends on. `at` is a point in the cut's own source, mapped
     * to program time through where the cut starts (`start`, a program frame).
     */
    const beatFrame = (point, ctx, inSec, srcIn, start) => {
        let anchor = point;
        if ('at' in point) {
            const src = resolveAnchor(point.at, { ...ctx, window: { from: inSec, to: Infinity }, scope: 'cut' }, 'end').time;
            anchor = { ...point, at: micro((start - srcIn) / fps + src) };
        }
        const { beats, deferred, failed } = cutBeats();
        // The music the anchor reads: the one it names, else the only one with beats.
        const named = point.music;
        if (named === undefined && deferred.length && beats.music.length)
            throw new Error(`Several music items have beats (${[...beats.music.map((m) => m.name), ...deferred].join(', ')}); say which with "music": "<id>".`);
        try {
            const time = resolveAnchor(anchor, { words: null, fps, window: null, localBase: null, beats }, 'end').time;
            return Math.round(time * fps);
        }
        catch (error) {
            if (named !== undefined && failed.includes(named))
                throw new Error(`Music "${named}" could not be placed; see its error.`);
            const waits = named === undefined ? !beats.music.length && deferred.length : deferred.includes(named);
            if (!waits)
                throw error;
            const which = named ?? deferred[0];
            throw new Error(`Music "${which}" is placed by a phrase (its own "from", or that of the music it starts on), and the cut list decides where phrases play, so cut points cannot read its beats. Start it in seconds or on the beats of other music, or end the cut on a phrase.`);
        }
    };
    const cuts = [];
    let at = 0;
    written.forEach((cut, index) => {
        const id = cut.id ?? defaultCutId(index);
        const fail = (field, message) => diagnostics.push({ level: 'error', item: id, field: `cuts[${index}].${field}`, message });
        const footage = project.footage?.[cut.source];
        if (!footage) {
            fail('source', `${cutName(index)}: unknown footage "${cut.source}". Footage: ${Object.keys(project.footage ?? {}).join(', ') || 'none'}`);
            return;
        }
        const info = inputs.sources?.[cut.source];
        const ctx = {
            words: inputs.transcripts?.[cut.source] ?? null,
            fps,
            window: null,
            localBase: null,
            scope: 'source',
            needs: `set "transcript" on footage "${cut.source}"`
        };
        if (isCutBeat(cut.in)) {
            fail('in', `${cutName(index)}: "in" is a point in the source; a cut starts where the one before it ends. Put the beat on the "out" of ${index ? cutName(index - 1) : 'the cut before'}.`);
            return;
        }
        let inSec;
        let outSec;
        try {
            inSec = resolveAnchor(cut.in ?? 0, ctx, 'start').time;
        }
        catch (error) {
            fail('in', `${cutName(index)}: ${error.message}`);
            return;
        }
        const srcIn = Math.round(inSec * fps);
        /** Source frame after the last, when the cut ends on a beat. */
        let beatOut = null;
        try {
            if (isCutBeat(cut.out)) {
                const frame = beatFrame(cut.out, ctx, inSec, srcIn, at);
                if (frame <= at) {
                    fail('out', `${cutName(index)}: "out" on the music lands at ${(frame / fps).toFixed(2)} s, not after the cut starts (${(at / fps).toFixed(2)} s).`);
                    return;
                }
                beatOut = srcIn + frame - at;
                outSec = beatOut / fps;
            }
            else if (cut.out !== undefined)
                outSec = resolveAnchor(cut.out, { ...ctx, window: { from: inSec, to: Infinity }, scope: 'cut' }, 'end').time;
            else if (info)
                outSec = info.frames / fps;
            else {
                fail('out', `${cutName(index)}: no "out" and the length of "${footage.src}" is unknown (file not found or not probed). Give "out".`);
                return;
            }
        }
        catch (error) {
            fail('out', `${cutName(index)}: ${error.message}`);
            return;
        }
        // The end edge rounds up, so the frame holding the last word's end stays in the cut; a
        // word ending inside the source's last frame keeps the source end. A beat is a frame.
        const srcOut = beatOut ??
            Math.min(Math.ceil(outSec * fps - 1e-6), Math.max(Math.round(outSec * fps), info?.frames ?? Infinity));
        if (srcIn < 0) {
            fail('in', `${cutName(index)}: "in" lands before the source starts (${inSec.toFixed(2)} s).`);
            return;
        }
        if (info && srcOut > info.frames) {
            fail('out', `${cutName(index)}: "out" (${outSec.toFixed(2)} s) is after the end of "${footage.src}" (${(info.frames / fps).toFixed(2)} s).`);
            return;
        }
        if (srcOut <= srcIn) {
            fail('out', `${cutName(index)}: "out" (${outSec.toFixed(2)} s) is not after "in" (${inSec.toFixed(2)} s).`);
            return;
        }
        const split = cut.audio?.split ?? 0;
        if (split && !cuts.length)
            diagnostics.push({
                level: 'warning',
                item: id,
                field: `cuts[${index}].audio.split`,
                message: `${cutName(index)} is the first cut: there is no edit point to split, the split is ignored.`
            });
        const numeric = project.cuts?.length
            ? ['in', 'out'].filter((k) => isNumeric(cut[k]))
            : [];
        for (const k of numeric)
            diagnostics.push({
                level: 'info',
                item: id,
                field: `cuts[${index}].${k}`,
                message: `${cutName(index)}: "${k}" is ${((k === 'in' ? srcIn : srcOut) / fps).toFixed(2)} s of "${cut.source}"; it does not follow a retake.`
            });
        cuts.push({
            id,
            index: cuts.length,
            source: cut.source,
            srcIn,
            srcOut,
            startFrame: at,
            frames: srcOut - srcIn,
            edit: cuts.length ? micro(at / fps + split) : 0,
            split: cuts.length ? split : 0,
            crossfade: cut.audio?.crossfade ?? DEFAULT_CROSSFADE,
            gain: cut.audio?.gain ?? 0,
            mute: cut.audio?.mute ?? false,
            transition: cut.transition ?? null,
            native: cut.native ?? null,
            numeric
        });
        at += srcOut - srcIn;
    });
    const end = at / fps;
    checkEdits(cuts, end, project, inputs, diagnostics);
    return {
        mode: 'program',
        cuts,
        frames: written.length ? at : null,
        words: programWords(project, cuts, end, inputs, diagnostics),
        diagnostics
    };
}
const NO_SOURCE = {
    source: null,
    sourceIndex: null,
    cut: null,
    sourceStart: null,
    sourceEnd: null
};
/** Program seconds where cut `i`'s sound ends. */
const editAfter = (cuts, i, end) => i + 1 < cuts.length ? cuts[i + 1].edit : end;
/** J/L splits must keep edit points in order and stay inside the source's sound. */
function checkEdits(cuts, end, project, inputs, diagnostics) {
    const fps = project.fps;
    cuts.forEach((cut, i) => {
        if (!cut.split)
            return;
        const field = `cuts[${i}].audio.split`;
        const prev = cuts[i - 1];
        if (cut.edit <= prev.edit || cut.edit >= editAfter(cuts, i, end)) {
            diagnostics.push({
                level: 'error',
                item: cut.id,
                field,
                message: `${cutName(i)}: a split of ${cut.split} s moves the edit point (${cut.edit.toFixed(2)} s) past a neighbouring one.`
            });
            return;
        }
        // J cut: this source plays before "in"; L cut: the previous source plays after its "out".
        const [source, need, have, side] = cut.split < 0
            ? [cut.source, -cut.split, cut.srcIn / fps, 'before "in"']
            : [
                prev.source,
                cut.split,
                soundLength(inputs.sources?.[prev.source]) - prev.srcOut / fps,
                'after "out" of the previous cut'
            ];
        if (need > have + 1e-9)
            diagnostics.push({
                level: 'error',
                item: cut.id,
                field,
                message: `${cutName(i)}: the ${cut.split < 0 ? 'J' : 'L'} cut needs ${need.toFixed(2)} s of "${source}" sound ${side}, ${Math.max(0, have).toFixed(2)} s available.`
            });
    });
}
/**
 * Source words land in the cut whose sound range [edit, next edit) holds their midpoint, at
 * `start − in + P`, clamped to that range: J and L cuts move words with the sound. A range used
 * twice gives its words twice.
 */
function programWords(project, cuts, end, inputs, diagnostics) {
    const fps = project.fps;
    if (inputs.words) {
        // A project-level transcript is already program time (footage shorthand).
        const only = cuts.length === 1 ? cuts[0] : null;
        return inputs.words.map((w) => only
            ? {
                ...w,
                source: only.source,
                sourceIndex: w.index,
                cut: 0,
                sourceStart: w.start + only.srcIn / fps,
                sourceEnd: w.end + only.srcIn / fps
            }
            : { ...w, ...NO_SOURCE });
    }
    if (!cuts.some((c) => inputs.transcripts?.[c.source]))
        return null;
    const out = [];
    // Frame-rounded cut points may clip a word by up to half a frame; that is not worth a warning.
    const slack = 0.5 / fps + 1e-6;
    /** Warns that the edge of cut `i`'s sound range at `at` cuts through a word. */
    const cutThrough = (i, side, at, w, shift, dropped) => {
        const edit = side === 'start' ? i : i + 1;
        const edge = edit === 0
            ? `"in" of ${cutName(0)}`
            : edit === cuts.length
                ? `"out" of ${cutName(cuts.length - 1)}`
                : `the audio edit point at ${at.toFixed(2)} s`;
        const owner = Math.min(edit, cuts.length - 1);
        diagnostics.push({
            level: 'warning',
            item: cuts[owner].id,
            field: `cuts[${owner}]`,
            message: `${cutName(owner)}: ${edge} cuts through "${w.text}" (${(w.start + shift).toFixed(2)}–${(w.end + shift).toFixed(2)} s)${dropped ? '; only part of it is heard, and it is left out of the program transcript' : ''}.`
        });
    };
    cuts.forEach((cut, i) => {
        const words = inputs.transcripts?.[cut.source];
        if (!words)
            return;
        const shift = cut.startFrame / fps - cut.srcIn / fps;
        const from = cut.edit;
        const to = editAfter(cuts, i, end);
        for (const w of words) {
            const wStart = w.start + shift;
            const wEnd = w.end + shift;
            const mid = (wStart + wEnd) / 2;
            if (mid < from || mid >= to) {
                // Mostly outside this cut's sound, but a part longer than the slack is heard.
                if (Math.min(wEnd, to) - Math.max(wStart, from) > slack)
                    cutThrough(i, mid < from ? 'start' : 'end', mid < from ? from : to, w, shift, true);
                continue;
            }
            if (wStart < from - slack)
                cutThrough(i, 'start', from, w, shift, false);
            if (wEnd > to + slack)
                cutThrough(i, 'end', to, w, shift, false);
            out.push({
                ...w,
                id: `w${out.length}`,
                index: out.length,
                start: Math.min(to, Math.max(from, wStart)),
                end: Math.min(to, Math.max(from, wEnd)),
                source: cut.source,
                sourceIndex: w.index,
                cut: i,
                sourceStart: w.start,
                sourceEnd: w.end
            });
        }
    });
    return out;
}
