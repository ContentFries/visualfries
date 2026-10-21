import { SHOTS, TRANSITIONS } from './timeline.js';
import { NO_BEATS, resolveAnchor } from './anchors.js';
import { pickMusic } from './beat-grid.js';
import { resolveFormat } from './format.js';
import { resolveMoment } from './moment.js';
import { resolveMotionProject } from './resolve.js';
import { micro, resolveCutList, soundLength } from './cutlist.js';
import { sha1 } from './sha1.js';
import { defaultMorph, SHOT_MODULES, shotAt, shotEvents, shotLayout, shotModule, shotsDuring } from './shots/index.js';
import { parseEase } from './ease.js';
import { screenDirection, transitionEvents, transitionModule } from './transitions/index.js';
/** Seconds a transition not drawn yet lasts when the project does not say. */
export const DEFAULT_TRANSITION_SECONDS = 0.5;
/** Loudness of finished videos. */
const MASTER = { lufs: -14, truePeak: -1 };
const isCustom = (name, ext) => ext.test(name);
const CUSTOM_SHOT = /\.(ts|js)$/;
const CUSTOM_TRANSITION = /\.svelte$/;
/** The project's frame, or another size given as "1080x1350". */
export function programFormat(project, name) {
    let size = project.size;
    if (name) {
        const m = /^(\d+)x(\d+)$/.exec(name);
        if (!m)
            throw new Error(`Unknown format "${name}". Use the project size or WIDTHxHEIGHT.`);
        size = [Number(m[1]), Number(m[2])];
    }
    return { name: `${size[0]}x${size[1]}`, size, ...resolveFormat(size, project.safeZone) };
}
/** The project's music beats for program-level anchors. */
const beatsOf = (inputs) => inputs.music?.length ? { music: inputs.music, clip: undefined } : NO_BEATS;
/** Beats in seconds from `start`, for `{ moment }` keys; undefined without music beats. */
function localGrid(beats, start) {
    if (!beats.music.length)
        return undefined;
    try {
        return pickMusic(beats.music, beats.clip).grid.map((b) => ({ ...b, time: b.time - start }));
    }
    catch {
        return undefined;
    }
}
const endOf = (s) => s.startFrame + s.frames;
const overlaps = (a, b) => a.startFrame < endOf(b) && b.startFrame < endOf(a);
/**
 * Resolves a project into its program for one format: cuts, shots (gaps framed `full`), clips,
 * transition windows with handles and held frames, keys, events, audio pieces and segments.
 * Pure: the same project and inputs give the same JSON, in Node and in the browser.
 */
export function resolveProgram(project, inputs, opts = {}) {
    const fps = project.fps;
    const format = programFormat(project, opts.format);
    const cutList = resolveCutList(project, inputs);
    const program = cutList.mode === 'program';
    const diagnostics = [...cutList.diagnostics];
    const words = program ? cutList.words : inputs.words;
    const warn = (level, item, field, message) => diagnostics.push({ level, item, field, message });
    // Clips resolve exactly as in `ResolvedProject`, against the program transcript.
    const beats = beatsOf(inputs);
    const resolved = resolveMotionProject(opts.format ? { ...project, size: format.size } : project, words, inputs.music ?? [], inputs.look ?? {});
    diagnostics.push(...resolved.diagnostics);
    const anchorCtx = { words, fps, window: null, localBase: null, beats };
    const at = (anchor, from) => resolveAnchor(anchor, from === undefined ? anchorCtx : { ...anchorCtx, window: { from, to: Infinity } }, from === undefined ? 'start' : 'end').time;
    // Program length: the cut list, else `duration`, else the latest end of clips or music.
    const musicEnds = (project.music ?? []).flatMap((m) => m.until === undefined ? [] : [Math.round(m.until * fps)]);
    const frames = cutList.frames ??
        (project.duration !== undefined
            ? Math.round(project.duration * fps)
            : Math.max(0, ...resolved.clips.map(endOf), ...musicEnds));
    const sources = programSources(project, inputs);
    const cuts = cutList.cuts.map((c) => ({
        id: c.id,
        index: c.index,
        source: c.source,
        startFrame: c.startFrame,
        frames: c.frames,
        srcIn: c.srcIn,
        srcOut: c.srcOut,
        handles: {
            before: c.srcIn,
            after: sources[c.source]?.frames == null ? null : sources[c.source].frames - c.srcOut
        },
        transition: null,
        audio: { edit: c.edit, split: c.split, crossfade: c.crossfade, gain: c.gain, mute: c.mute },
        native: c.native
    }));
    const shots = program ? resolveShots(project, inputs, words, cuts, frames, at, diagnostics) : [];
    const clips = resolved.clips.map((clip) => {
        const spec = project.clips.find((c) => c.id === clip.id);
        if (!program)
            for (const field of ['slot', 'transition', 'keys'])
                if (spec[field] !== undefined)
                    diagnostics.push({
                        level: 'warning',
                        clip: clip.id,
                        field,
                        message: `"${field}" has no effect without "cuts" or "shots" (inserts mode).`
                    });
        return {
            ...clip,
            slot: program ? (spec.slot ?? null) : null,
            layer: spec.layer ?? 'front',
            transition: null,
            keys: program
                ? resolveKeys(spec.keys, clip, 'clip', clip.id, { words, beats: { music: inputs.music ?? [], clip: spec.music } }, fps, diagnostics)
                : [],
            z: project.clips.indexOf(spec),
            native: spec.native ?? null
        };
    });
    if (program)
        checkBehind(clips, cuts, shots, project, diagnostics);
    if (program)
        checkSlots(clips, shots, format, fps, diagnostics);
    if (program && cuts.length)
        checkHardCuts(shots, cutList.cuts, diagnostics);
    const transitions = program
        ? resolveTransitions(project, cutList.cuts, cuts, shots, clips, fps, format.class, warn)
        : [];
    const events = resolveEvents(shots, transitions);
    const audio = {
        speech: program ? speechPieces(project, cutList.cuts, sources, inputs, frames / fps) : [],
        sfx: resolveSfx(project, at, diagnostics),
        music: resolveMusic(project, frames / fps),
        master: { ...MASTER }
    };
    // Clips, music and sfx share one id space only in a program (inserts mode keeps them apart).
    if (program)
        checkIds(project, cuts, shots, clips, diagnostics);
    const hashes = {
        project: inputs.hashes?.project ?? null,
        transcript: inputs.hashes?.transcript ?? null,
        transcripts: inputs.hashes?.transcripts ?? {},
        sources: inputs.hashes?.sources ?? {},
        assets: inputs.hashes?.assets ?? {},
        music: inputs.hashes?.music ?? null,
        brand: inputs.hashes?.brand ?? null,
        style: inputs.hashes?.style ?? null
    };
    const base = {
        version: 1,
        mode: cutList.mode,
        format,
        fps,
        frames,
        background: project.background ?? null,
        hashes,
        sources,
        cuts,
        shots,
        clips,
        transitions
    };
    return {
        ...base,
        words: cutList.words ?? [],
        events,
        audio,
        segments: resolveSegments(base, project),
        diagnostics
    };
}
function programSources(project, inputs) {
    const out = {};
    for (const [name, f] of Object.entries(project.footage ?? {})) {
        const info = inputs.sources?.[name];
        out[name] = {
            src: f.src,
            matte: f.matte ?? null,
            frames: info?.frames ?? null,
            width: info?.width ?? null,
            height: info?.height ?? null,
            fps: info?.fps ?? null,
            audio: f.audio === false
                ? null
                : typeof f.audio === 'string'
                    ? f.audio
                    : info?.audio === false
                        ? null
                        : f.src,
            ...(f.provenance ? { provenance: f.provenance } : {})
        };
    }
    return out;
}
/** Item-local keys: numbers and frames from the item start, phrases inside it, `{ moment }`. */
function resolveKeys(keys, item, kind, id, { words, beats }, fps, diagnostics) {
    const start = item.startFrame / fps;
    const duration = item.frames / fps;
    const out = [];
    (keys ?? []).forEach((key, i) => {
        const field = `keys[${i}].at`;
        const report = (level, message) => diagnostics.push({
            level,
            ...(kind === 'clip' ? { clip: id } : { item: id }),
            field,
            message
        });
        let time;
        try {
            const anchor = key.at;
            if (typeof anchor === 'object' && 'moment' in anchor) {
                const cues = kind === 'clip' ? item.cues : {};
                time =
                    start +
                        resolveMoment(anchor.moment, { id, cues, duration, fps, beats: localGrid(beats, start) });
            }
            else {
                time = resolveAnchor(anchor, {
                    words,
                    fps,
                    window: { from: start - 1e-6, to: start + duration },
                    localBase: start,
                    scope: kind,
                    beats
                }, 'start').time;
            }
        }
        catch (error) {
            report('error', error.message);
            return;
        }
        const frame = Math.round(time * fps);
        if (frame < item.startFrame || frame > endOf(item))
            report('warning', `Key at ${time.toFixed(2)} s is outside the ${kind} (${start.toFixed(2)}–${(start + duration).toFixed(2)} s).`);
        const values = Object.fromEntries(Object.entries(key).filter(([k]) => k !== 'at' && k !== 'ease' && k !== 'mix'));
        out.push({ frame, values, ease: key.ease ?? null, mix: key.mix ?? 'oklch' });
    });
    return out.sort((a, b) => a.frame - b.frame);
}
function resolveShots(project, inputs, words, cuts, frames, at, diagnostics) {
    const fps = project.fps;
    const written = [];
    /** What each written shot says about its morph: seconds, and whether a transition replaces it. */
    const asked = new Map();
    (project.shots ?? []).forEach((shot, i) => {
        const id = shot.id ?? `shot${i + 1}`;
        const fail = (field, message) => diagnostics.push({ level: 'error', item: id, field: `shots[${i}].${field}`, message });
        if (!SHOTS.includes(shot.shot) && !isCustom(shot.shot, CUSTOM_SHOT)) {
            fail('shot', `Unknown shot "${shot.shot}". Built in: ${SHOTS.join(', ')}; or a file such as "shots/My.ts".`);
            return;
        }
        const module = shotModule(shot.shot);
        for (const message of module?.check?.(shot.params ?? {}) ?? [])
            fail('params', message);
        if (!module)
            diagnostics.push({
                level: 'warning',
                item: id,
                field: `shots[${i}].shot`,
                message: isCustom(shot.shot, CUSTOM_SHOT)
                    ? `Custom shot files are not drawn yet; "${shot.shot}" is framed full.`
                    : `The "${shot.shot}" shot is not drawn yet; it is framed full.`
            });
        let start;
        let end;
        try {
            start = at(shot.from);
        }
        catch (error) {
            fail('from', error.message);
            return;
        }
        try {
            end = at(shot.until, start);
        }
        catch (error) {
            fail('until', error.message);
            return;
        }
        const startFrame = Math.max(0, Math.round(start * fps));
        if (startFrame >= frames) {
            fail('from', `Shot starts at ${start.toFixed(2)} s, after the program ends (${(frames / fps).toFixed(2)} s).`);
            return;
        }
        let endFrame = Math.round(end * fps);
        if (endFrame > frames) {
            diagnostics.push({
                level: 'warning',
                item: id,
                field: `shots[${i}].until`,
                message: `Shot ends at ${end.toFixed(2)} s, after the program (${(frames / fps).toFixed(2)} s); it is cut there.`
            });
            endFrame = frames;
        }
        if (endFrame <= startFrame) {
            fail('until', `Shot ends (${end.toFixed(2)} s) before it starts (${start.toFixed(2)} s).`);
            return;
        }
        let source = null;
        if (shot.source !== undefined) {
            const name = typeof shot.source === 'string' ? shot.source : shot.source.name;
            const srcTime = typeof shot.source === 'string' ? undefined : shot.source.in;
            if (!project.footage?.[name]) {
                fail('source', `Unknown footage "${name}". Footage: ${Object.keys(project.footage ?? {}).join(', ') || 'none'}`);
                return;
            }
            let srcIn = 0;
            if (srcTime !== undefined) {
                try {
                    srcIn = Math.round(resolveAnchor(srcTime, {
                        words: inputs.transcripts?.[name] ?? null,
                        fps,
                        window: null,
                        localBase: null,
                        scope: 'source',
                        needs: `set "transcript" on footage "${name}"`
                    }, 'start').time * fps);
                }
                catch (error) {
                    fail('source.in', error.message);
                    return;
                }
            }
            source = { name, srcIn };
        }
        const span = { startFrame, frames: endFrame - startFrame };
        const resolved = {
            id,
            shot: shot.shot,
            implicit: false,
            ...span,
            source,
            params: shot.params ?? {},
            morphFrames: 0,
            morphEase: 'none',
            transition: null,
            keys: resolveKeys(shot.keys, span, 'shot', id, { words, beats: beatsOf(inputs) }, fps, diagnostics),
            native: shot.native ?? null
        };
        written.push(resolved);
        asked.set(resolved, { morph: shot.morph, transition: shot.transition !== undefined });
    });
    written.sort((a, b) => a.startFrame - b.startFrame);
    for (let i = 1; i < written.length; i++) {
        if (overlaps(written[i - 1], written[i]))
            diagnostics.push({
                level: 'error',
                item: written[i].id,
                field: 'shots',
                message: `Shot "${written[i].id}" (${(written[i].startFrame / fps).toFixed(2)} s) starts before shot "${written[i - 1].id}" ends (${(endOf(written[i - 1]) / fps).toFixed(2)} s).`
            });
    }
    if (!cuts.length)
        return morphs(written, asked, fps);
    // Gaps show the cut list as it is: an implicit full frame.
    const out = [];
    let frame = 0;
    const gap = (until) => {
        if (until > frame)
            out.push({
                id: `full-${frame}`,
                shot: 'full',
                implicit: true,
                startFrame: frame,
                frames: until - frame,
                source: null,
                params: {},
                morphFrames: 0,
                morphEase: 'none',
                transition: null,
                keys: [],
                native: null
            });
    };
    for (const shot of written) {
        gap(shot.startFrame);
        out.push(shot);
        frame = Math.max(frame, endOf(shot));
    }
    gap(frames);
    return morphs(out, asked, fps);
}
/** The shot before shot `i`: the one ending where it starts, `full` across a gap, else null. */
function previousShot(shots, i) {
    const before = shots[i - 1];
    if (before && endOf(before) === shots[i].startFrame)
        return before.shot;
    return shots[i].startFrame > 0 ? 'full' : null;
}
/**
 * Fills in each shot's morph from the shot before it (`full` across a gap): the project's
 * `morph`, else none under a shot transition, else the shots' defaults (see `defaultMorph`).
 * The first shot of the program has nothing to morph from. A morph never outlasts its shot.
 */
function morphs(shots, asked, fps) {
    shots.forEach((shot, i) => {
        const prev = previousShot(shots, i);
        const morph = defaultMorph(prev ?? 'full', shot.shot);
        const wish = asked.get(shot);
        const seconds = wish?.morph ?? (prev === null || wish?.transition ? 0 : morph.seconds);
        shot.morphFrames = Math.min(shot.frames, Math.round(seconds * fps));
        shot.morphEase = shot.morphFrames > 0 ? morph.ease : 'none';
    });
    return shots;
}
/** A clip behind the subject needs a matte on every footage on screen with it. */
function checkBehind(clips, cuts, shots, project, diagnostics) {
    for (const clip of clips) {
        if (clip.layer !== 'behind')
            continue;
        const names = new Set([
            ...cuts.filter((c) => overlaps(c, clip)).map((c) => c.source),
            ...shots.filter((s) => s.source && overlaps(s, clip)).map((s) => s.source.name)
        ]);
        const bare = [...names].filter((n) => !project.footage?.[n]?.matte);
        if (bare.length || !names.size)
            diagnostics.push({
                level: 'error',
                clip: clip.id,
                field: 'layer',
                message: names.size
                    ? `"behind" needs a matte, but footage ${bare.map((n) => `"${n}"`).join(', ')} has none (visualfries matte).`
                    : '"behind" needs footage with a matte on screen with the clip.'
            });
    }
}
/**
 * A slotted clip shows only while the shot on screen frees its slot (or a morph slides the slot
 * in or out); elsewhere it is hidden, which is worth a warning.
 */
function checkSlots(clips, shots, format, fps, diagnostics) {
    const names = new Map();
    const slotsOf = (shot) => {
        const key = JSON.stringify([shot.shot, shot.params]);
        let found = names.get(key);
        if (!found) {
            const input = { cls: format.class, size: format.size, footage: null, subject: null };
            found = new Set(Object.keys(shotLayout(shot, input).slots));
            names.set(key, found);
        }
        return found;
    };
    for (const clip of clips) {
        if (!clip.slot)
            continue;
        const hidden = [];
        for (let f = clip.startFrame; f < endOf(clip); f++) {
            const { shot, prev } = shotAt(shots, f);
            if (!slotsOf(shot).has(clip.slot) && !(prev && slotsOf(prev).has(clip.slot)))
                hidden.push(f);
        }
        if (!hidden.length)
            continue;
        const offering = Object.values(SHOT_MODULES)
            .filter((m) => slotsOf({ shot: m.name, params: {} }).has(clip.slot))
            .map((m) => m.name);
        const from = (hidden[0] / fps).toFixed(2);
        diagnostics.push({
            level: 'warning',
            clip: clip.id,
            field: 'slot',
            message: `No shot frees the "${clip.slot}" slot for ${hidden.length} of the clip's ${clip.frames} frames (first at ${from} s); the clip is hidden there. ${offering.length ? `Shots with a "${clip.slot}" slot: ${offering.join(', ')}.` : `No built-in shot has a "${clip.slot}" slot.`}`
        });
    }
}
/** A written shot that runs across a hard cut keeps framing new footage with the old layout. */
function checkHardCuts(shots, cuts, diagnostics) {
    for (const shot of shots) {
        if (shot.implicit || shot.source)
            continue;
        const crossed = cuts.filter((c) => c.index > 0 && !c.transition && c.startFrame > shot.startFrame && c.startFrame < endOf(shot));
        for (const cut of crossed)
            diagnostics.push({
                level: 'warning',
                item: shot.id,
                field: 'shots',
                message: `Shot "${shot.id}" runs across the hard cut into ${cut.id} at frame ${cut.startFrame}.`
            });
    }
}
const normalizeTransition = (t) => (typeof t === 'string' ? { type: t } : t);
function resolveTransitions(project, resolvedCuts, cuts, shots, clips, fps, cls, warn) {
    const out = [];
    const window = (owner, kind, field, spec, cutFrame, outgoing) => {
        const t = normalizeTransition(spec);
        if (!TRANSITIONS.includes(t.type) &&
            !isCustom(t.type, CUSTOM_TRANSITION)) {
            warn('error', owner, field, `Unknown transition "${t.type}". Built in: ${TRANSITIONS.join(', ')}; or a file such as "transitions/My.svelte".`);
            return null;
        }
        // Built-in modules give the defaults and check params, ease and direction; the rest cut.
        const module = transitionModule(t.type);
        if (!module)
            warn('warning', owner, field, isCustom(t.type, CUSTOM_TRANSITION)
                ? `Custom transition files are not drawn yet; "${t.type}" cuts on the cut.`
                : `The "${t.type}" transition is not drawn yet; it cuts on the cut.`);
        for (const message of module?.check?.(t.params ?? {}) ?? [])
            warn('error', owner, `${field}.params`, message);
        if (t.ease !== undefined && !parseEase(t.ease)) {
            warn('error', owner, `${field}.ease`, `Unknown ease "${t.ease}". Use a GSAP ease such as "expo.inOut", "power3.out" or "none".`);
            return null;
        }
        const duration = t.duration ?? module?.defaultDuration ?? DEFAULT_TRANSITION_SECONDS;
        const frames = Math.max(1, Math.round(duration * fps));
        const align = t.align ?? 'center';
        const before = align === 'center' ? Math.floor(frames / 2) : align === 'start' ? 0 : frames;
        return {
            id: `${owner}.transition`,
            owner,
            kind,
            outgoing,
            type: t.type,
            startFrame: cutFrame - before,
            frames,
            cutFrame,
            align,
            // Directional modules take a screen direction for this format's class.
            direction: module?.directional
                ? screenDirection(t.direction ?? null, cls)
                : (t.direction ?? null),
            ease: t.ease ?? module?.ease ?? null,
            params: t.params ?? {},
            sound: t.sound ?? null,
            native: t.native ?? null,
            held: { out: 0, in: 0 }
        };
    };
    const seconds = (n) => (n / fps).toFixed(2);
    const fits = (t, prev, next, field, name) => {
        if (t.startFrame >= prev.startFrame && endOf(t) <= endOf(next))
            return true;
        warn('error', t.owner, field, `${name}: the ${t.type} window (${t.frames} frames, ${seconds(t.cutFrame - t.startFrame)} s before the cut, ${seconds(endOf(t) - t.cutFrame)} s after) is longer than a neighbouring range (${prev.frames} and ${next.frames} frames).`);
        return false;
    };
    resolvedCuts.forEach((cut, i) => {
        if (!cut.transition)
            return;
        const field = `cuts[${i}].transition`;
        const name = `cut ${i + 1}`;
        if (i === 0) {
            warn('error', cut.id, field, `${name} is the first cut: there is nothing to transition from.`);
            return;
        }
        const t = window(cut.id, 'cut', field, cut.transition, cut.startFrame, cuts[i - 1].id);
        if (!t || !fits(t, cuts[i - 1], cuts[i], field, name))
            return;
        // The incoming side starts early (handle before its "in"), the outgoing side runs on past
        // its "out"; without enough source the edge frame holds.
        const needIn = t.cutFrame - t.startFrame;
        const needOut = endOf(t) - t.cutFrame;
        const haveIn = cuts[i].handles.before;
        const haveOut = cuts[i - 1].handles.after;
        t.held.in = Math.max(0, needIn - haveIn);
        t.held.out = haveOut === null ? 0 : Math.max(0, needOut - haveOut);
        if (t.held.in)
            warn('warning', cut.id, field, `${name}: ${t.type} needs ${seconds(needIn)} s of incoming handle, ${seconds(haveIn)} s available; the first frame holds ${t.held.in} frames.`);
        if (t.held.out)
            warn('warning', cut.id, field, `${name}: ${t.type} needs ${seconds(needOut)} s of outgoing handle, ${seconds(haveOut)} s available; the last frame holds ${t.held.out} frames.`);
        cuts[i].transition = t.id;
        out.push(t);
    });
    const written = project.shots ?? [];
    shots.forEach((shot, i) => {
        if (shot.implicit)
            return;
        const index = written.findIndex((s, k) => (s.id ?? `shot${k + 1}`) === shot.id);
        const spec = written[index]?.transition;
        if (!spec)
            return;
        const field = `shots[${index}].transition`;
        const prev = shots[i - 1];
        if (!prev || endOf(prev) !== shot.startFrame) {
            warn('error', shot.id, field, `Shot "${shot.id}" has no shot right before it to transition from.`);
            return;
        }
        const t = window(shot.id, 'shot', field, spec, shot.startFrame, prev.id);
        if (!t || !fits(t, prev, shot, field, `shot "${shot.id}"`))
            return;
        shot.transition = t.id;
        out.push(t);
    });
    for (const clip of clips) {
        const spec = project.clips.find((c) => c.id === clip.id)?.transition;
        if (!spec)
            continue;
        const t = window(clip.id, 'clip', 'transition', spec, clip.startFrame, null);
        if (!t)
            continue;
        if (t.startFrame < 0) {
            warn('error', clip.id, 'transition', `The ${t.type} window starts before the program.`);
            continue;
        }
        // A push slides everything below the clip off the frame (the footage plate, for a clip
        // behind the subject); `check` measures whether a front clip covers the frame.
        if (t.type === 'push' && (clip.layer === 'behind' || clip.slot))
            warn('warning', clip.id, 'transition', clip.layer === 'behind'
                ? 'A push on a clip behind the subject slides the footage plate off the frame while the speaker stays: the empty stage shows around the speaker. Use wipe, or put the clip in front.'
                : `A push on a slotted clip slides everything below it off the frame, but the clip fills only its "${clip.slot}" slot: the empty stage shows around it. Use wipe, or a clip that covers the frame.`);
        // Before its first frame the clip holds that frame.
        t.held.in = t.cutFrame - t.startFrame;
        clip.transition = t.id;
        out.push(t);
    }
    // Cut and shot transitions share the two sides of the stage: one at a time.
    const staged = out.filter((t) => t.kind !== 'clip').sort((a, b) => a.startFrame - b.startFrame);
    for (let i = 1; i < staged.length; i++)
        if (overlaps(staged[i - 1], staged[i]))
            warn('error', staged[i].owner, 'transition', `The ${staged[i].type} window into ${staged[i].owner} overlaps the ${staged[i - 1].type} window into ${staged[i - 1].owner}.`);
    return out.sort((a, b) => a.startFrame - b.startFrame || a.cutFrame - b.cutFrame);
}
function resolveEvents(shots, transitions) {
    const events = [
        ...shots.flatMap((s, i) => shotEvents(s, previousShot(shots, i)).map((e) => ({ ...e, owner: s.id }))),
        ...transitions.flatMap((t) => transitionEvents(t).map((e) => ({ ...e, owner: t.id })))
    ];
    return events.sort((a, b) => a.frame - b.frame || a.owner.localeCompare(b.owner));
}
/**
 * One piece per cut over its sound range [edit, next edit], widened by half the crossfade on
 * each side so equal-power fades centre on the edit points. A piece never reads outside the
 * source's sound: where the widening would start before it or run past its end, the piece starts
 * (or ends) with the sound and that fade is shorter. Transitions never touch it.
 */
function speechPieces(project, cuts, sources, inputs, end) {
    const fps = project.fps;
    const pieces = [];
    cuts.forEach((cut, i) => {
        const file = sources[cut.source]?.audio;
        if (!file || cut.mute)
            return;
        const next = cuts[i + 1];
        let from = i ? Math.max(0, cut.edit - cut.crossfade / 2) : 0;
        let to = next ? Math.min(end, next.edit + next.crossfade / 2) : end;
        let fadeIn = i ? cut.crossfade : 0;
        let fadeOut = next ? next.crossfade : 0;
        // Source seconds = program seconds + shift.
        const shift = cut.srcIn / fps - cut.startFrame / fps;
        const before = -(from + shift);
        if (before > 0) {
            from += before;
            fadeIn = Math.max(0, fadeIn - before);
        }
        const after = to + shift - soundLength(inputs.sources?.[cut.source]);
        if (after > 0) {
            to -= after;
            fadeOut = Math.max(0, fadeOut - after);
        }
        pieces.push({
            owner: cut.id,
            file,
            srcIn: micro(Math.max(0, from + shift)),
            dur: micro(Math.max(0, to - from)),
            at: micro(from),
            fadeIn: micro(fadeIn),
            fadeOut: micro(fadeOut),
            gain: cut.gain
        });
    });
    return pieces;
}
function resolveSfx(project, at, diagnostics) {
    const out = [];
    (project.sfx ?? []).forEach((sfx, i) => {
        const id = sfx.id ?? `sfx${i + 1}`;
        try {
            out.push({
                owner: id,
                file: sfx.sound,
                srcIn: 0,
                dur: null,
                at: micro(Math.round(at(sfx.at) * project.fps) / project.fps),
                fadeIn: 0,
                fadeOut: 0,
                gain: sfx.gain ?? 0
            });
        }
        catch (error) {
            diagnostics.push({
                level: 'error',
                item: id,
                field: `sfx[${i}].at`,
                message: error.message
            });
        }
    });
    return out.sort((a, b) => a.at - b.at);
}
/**
 * Where each music item plays: its first sample at `from` (cut off before the program start)
 * until `until` or the program end. Gain, fades and gain keys come with the mixer (T9).
 */
function resolveMusic(project, end) {
    return (project.music ?? []).map((music, i) => {
        const from = music.from ?? 0;
        const until = music.until ?? end;
        return {
            owner: music.id ?? `music${i + 1}`,
            file: music.src,
            srcIn: micro(Math.max(0, -from)),
            dur: micro(Math.max(0, until - Math.max(0, from))),
            at: micro(Math.max(0, from)),
            fadeIn: 0,
            fadeOut: 0,
            gain: 0
        };
    });
}
function checkIds(project, cuts, shots, clips, diagnostics) {
    const seen = new Map();
    const items = [
        ...cuts.map((c) => [c.id, 'cut']),
        ...shots.filter((s) => !s.implicit).map((s) => [s.id, 'shot']),
        ...clips.map((c) => [c.id, 'clip']),
        ...(project.music ?? []).map((m, i) => [m.id ?? `music${i + 1}`, 'music']),
        ...(project.sfx ?? []).map((s, i) => [s.id ?? `sfx${i + 1}`, 'sfx'])
    ];
    for (const [id, kind] of items) {
        const other = seen.get(id);
        if (other)
            diagnostics.push({
                level: 'error',
                item: id,
                field: 'id',
                message: `The ${kind} id "${id}" is also used by a ${other}; item ids must be unique.`
            });
        else
            seen.set(id, kind);
    }
}
/** Strings in clip props that may name a project file (no URLs, data or colours). */
export function propFiles(props) {
    const found = new Set();
    const walk = (value) => {
        if (typeof value === 'string') {
            if (value.length < 512 &&
                /\.[a-z0-9]{1,5}$/i.test(value) &&
                !/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value))
                found.add(value);
        }
        else if (Array.isArray(value))
            value.forEach(walk);
        else if (value && typeof value === 'object')
            Object.values(value).forEach(walk);
    };
    props.forEach(walk);
    return [...found].sort();
}
/**
 * Segments split the program at cuts without a transition, never inside a transition window.
 * A segment's hash covers what is on screen in it (resolved data, source files, blocks, custom
 * shots and transitions, fonts, styles), so it changes exactly when its pixels may.
 */
function resolveSegments(program, project) {
    const inWindow = (frame) => program.transitions.some((t) => t.startFrame < frame && frame < endOf(t));
    const bounds = program.cuts
        .filter((c) => c.index > 0 && !c.transition && !inWindow(c.startFrame))
        .map((c) => c.startFrame);
    const edges = [0, ...bounds, program.frames];
    const segments = [];
    for (let i = 0; i + 1 < edges.length; i++) {
        const span = { startFrame: edges[i], frames: edges[i + 1] - edges[i] };
        if (span.frames <= 0)
            continue;
        const on = (list) => list.filter((x) => overlaps(x, span));
        const cuts = on(program.cuts);
        const shots = on(program.shots);
        const clips = on(program.clips);
        const transitions = on(program.transitions);
        const sourceNames = [
            ...new Set([
                ...cuts.map((c) => c.source),
                ...shots.flatMap((s) => (s.source ? [s.source.name] : []))
            ])
        ].sort();
        const assets = [
            ...new Set([
                ...clips.map((c) => c.block),
                ...shots.map((s) => s.shot).filter((s) => isCustom(s, CUSTOM_SHOT)),
                ...transitions.map((t) => t.type).filter((t) => isCustom(t, CUSTOM_TRANSITION)),
                ...(project.fonts ?? []).map((f) => f.src),
                ...(project.css ?? []),
                // Project files a clip names in its props (hashed when they exist).
                ...propFiles(clips.map((c) => c.props)).filter((f) => f in program.hashes.assets)
            ])
        ];
        const hash = sha1(JSON.stringify({
            span,
            format: program.format,
            fps: program.fps,
            background: program.background,
            sources: sourceNames.map((n) => [
                n,
                picture(program.sources[n]),
                program.hashes.sources[n] ?? null
            ]),
            assets: assets.map((a) => [a, program.hashes.assets[a] ?? null]),
            look: [program.hashes.brand, program.hashes.style],
            cuts: cuts.map(picture),
            // The shot a morph starts from shapes the first frames too.
            shots: shotsDuring(program.shots, span),
            clips,
            transitions: transitions.map(picture)
        }));
        segments.push({
            id: `seg${segments.length + 1}`,
            ...span,
            items: [...cuts, ...shots, ...clips, ...transitions].map((x) => x.id),
            hash
        });
    }
    return segments;
}
/**
 * An item without its sound (a cut's audio edit, gain and crossfade, a source's audio file, a
 * transition's sound): the final mix lays the sound fresh on every render, so a segment's
 * pictures do not depend on it.
 */
function picture(item) {
    const { audio: _audio, sound: _sound, ...rest } = item;
    return rest;
}
