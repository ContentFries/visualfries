import { footageAt, footageMap, mergeRanges } from './footage-map.js';
import { programFraming } from './framing.js';
import { clipShowRange, segmentStage, wholeProgram } from './segments.js';
import { shotAt, shotModule } from './shots/index.js';
import { SUBJECT_SMOOTH } from './shots/layout.js';
import { transitionModule } from './transitions/index.js';
/** Made-up subjects the framing is laid out for: one left and small, one right and tall, none. */
const PROBES = [
    { x: 0.1, y: 0.1, width: 0.4, height: 0.9, headX: 0.3, headY: 0.1, headHeight: 0.2 },
    { x: 0.45, y: 0.35, width: 0.5, height: 0.65, headX: 0.7, headY: 0.35, headHeight: 0.45 },
    null
];
/** Program frames as a sorted, merged list of ranges. */
class FrameSet {
    end;
    frames = new Set();
    constructor(end) {
        this.end = end;
    }
    add(first, last) {
        for (let f = Math.max(0, first); f <= Math.min(this.end - 1, last); f++)
            this.frames.add(f);
    }
    has(f) {
        return this.frames.has(f);
    }
    list() {
        return [...this.frames].sort((a, b) => a - b);
    }
}
/** The footage of each source with a matte, every frame measuring `box`. */
function probeFootage(program, box) {
    const out = {};
    for (const [name, s] of Object.entries(program.sources)) {
        if (!s.matte || !s.frames)
            continue;
        out[name] = {
            url: '',
            first: 0,
            last: s.frames - 1,
            total: s.frames,
            width: s.width ?? 1920,
            height: s.height ?? 1080,
            startFrame: 0,
            subject: true,
            boxes: new Array(s.frames).fill(box)
        };
    }
    return out;
}
const drawsSubject = (layout) => !!layout.room || (layout.cutout ?? 0) > 0;
/**
 * Program frames whose picture reads the matte, and shots whose framing does (see the module
 * comment), found by laying the program out for each made-up subject.
 */
function framingReads(program, map) {
    const seg = segmentStage(program, wholeProgram(program), { frames: {}, map });
    const probes = PROBES.map((box) => programFraming({ ...seg, footage: probeFootage(program, box) }));
    const drawn = new FrameSet(program.frames);
    const shots = new Set();
    const byId = new Map(seg.shots.map((s) => [s.id, s]));
    for (let f = 0; f < program.frames; f++) {
        const views = footageAt(map, f);
        if (!views.length)
            continue;
        // The shot track, and each shot a shot transition on screen holds on one of its sides.
        const named = program.transitions
            .filter((t) => t.kind === 'shot' && f >= t.startFrame && f < t.startFrame + t.frames)
            .flatMap((t) => [t.owner, t.outgoing])
            .map((id) => (id === null ? undefined : byId.get(id)))
            .filter((s) => s !== undefined);
        const on = shotAt(seg.shots, f);
        // Each shot that decides the frame, alone: a morph mixes two layouts, and only the shot
        // whose own layout follows the subject reads it.
        const deciding = [on.shot, ...(on.prev ? [on.prev] : []), ...named];
        for (const view of views) {
            if (probes.some((p) => drawsSubject(p.layoutFor(f, view))))
                drawn.add(f, f);
            for (const shot of deciding) {
                const layouts = probes.map((p) => p.layoutFor(f, view, shot));
                if (layouts.some(drawsSubject))
                    drawn.add(f, f);
                const first = JSON.stringify(layouts[0]);
                if (layouts.every((l) => JSON.stringify(l) === first))
                    continue;
                // This frame (a morph out of a shot lies past its end), and the whole shot: it frames
                // by one head size measured over all its frames.
                drawn.add(f, f);
                if (shot.id)
                    shots.add(shot.id);
            }
        }
    }
    return { drawn, shots };
}
/**
 * Source frames on each side of a read that the subject's measures reach: the smoothing window,
 * twice over when a shot keeps the head in (how high the head gets is a smoothed low percentile
 * of tops already taken over a window, see `headTopOf` in framing.ts).
 */
function smoothReach(program) {
    const w = Math.round(SUBJECT_SMOOTH * program.fps);
    return program.shots.some((s) => typeof s.params.headroom === 'number') ? 2 * w : w;
}
/** Program frames a clip is on screen, transitions included. */
function shownFrames(clip, program) {
    const show = clipShowRange(clip, program.transitions);
    return { first: Math.max(0, show.from), last: Math.min(program.frames, show.until) - 1 };
}
/**
 * Source frames each matte is read at, by footage name (only footage with a matte), as sorted
 * inclusive ranges in source frames at the project rate. Frames around each read that the
 * subject's smoothing reaches are included.
 */
export function matteReads(program, opts) {
    const matted = Object.entries(program.sources)
        .filter(([, s]) => s.matte && s.frames)
        .map(([name]) => name);
    if (!matted.length)
        return {};
    const totals = Object.fromEntries(matted.map((n) => [n, program.sources[n].frames]));
    const map = footageMap(program, totals);
    const smooth = smoothReach(program);
    const { drawn, shots } = framingReads(program, map);
    // The stage centres every drawn transition on the face of each side it shows (`focusOf` in
    // the program stage), whatever the transition then does with it.
    for (const t of program.transitions)
        if (transitionModule(t.type))
            drawn.add(Math.max(0, t.startFrame), t.startFrame + t.frames - 1);
    for (const span of opts.extra ?? [])
        drawn.add(Math.max(0, span.startFrame), span.startFrame + span.frames - 1);
    const byShot = (s) => drawn.add(Math.max(0, s.startFrame), Math.min(program.frames, s.startFrame + s.frames) - 1);
    for (const s of program.shots)
        if (shots.has(s.id) || shotModule(s.shot)?.needsMatte)
            byShot(s);
    for (const clip of program.clips)
        if (clip.layer === 'behind') {
            const { first, last } = shownFrames(clip, program);
            drawn.add(first, last);
        }
    const found = {};
    const add = (source, first, last) => {
        if (!(source in totals))
            return;
        const range = { first: Math.max(0, first), last: Math.min(totals[source] - 1, last) };
        if (range.last >= range.first)
            (found[source] ??= []).push(range);
    };
    for (const f of drawn.list())
        for (const v of footageAt(map, f))
            add(v.source, v.frame - smooth, v.frame + smooth);
    for (const clip of program.clips) {
        if (!opts.readsSubject(clip.block))
            continue;
        const { first, last } = shownFrames(clip, program);
        for (let f = first; f <= last; f++)
            for (const v of footageAt(map, f)) {
                const margin = Math.max(smooth, opts.margins?.[v.source] ?? 0);
                add(v.source, v.frame - margin, v.frame + margin);
            }
    }
    for (const s of program.shots)
        for (const away of s.away ?? [])
            for (const look of [away.looks?.exit, away.looks?.enter])
                if (look)
                    add(look.source, look.first - smooth, look.last + smooth);
    addExcerptReads(program, drawn, add);
    return mergeRanges(found);
}
/**
 * An excerpt's framing also reads the whole program's footage around its edges and over the
 * whole of each shot that runs across them (see `ExcerptFootage`); counted when the excerpt reads
 * a matte at all.
 */
function addExcerptReads(program, drawn, add) {
    const footage = program.excerpt?.footage;
    if (!footage || !drawn.list().length)
        return;
    for (const [source, ranges] of Object.entries(footage.around))
        for (const r of ranges)
            add(source, r.first, r.last);
    for (const runs of Object.values(footage.heads))
        for (const run of runs)
            add(run.source, run.frame, run.held ? run.frame : run.frame + run.frames - 1);
}
/**
 * Default seconds kept around every read, merged across, matted before a stretch to warm up, and
 * per cached block.
 */
export const MATTE_PLAN = { margin: 1, gap: 3, warmup: 1, block: 4 };
/**
 * Converts source frames at the project rate to frames of a footage at its own rate, rounding
 * outward so every frame the conversion may pick is inside.
 */
export function toFootageFrames(ranges, projectFps, fps, total) {
    if (Math.abs(projectFps - fps) < 0.01)
        return ranges.map((r) => ({ ...r }));
    return ranges.map((r) => ({
        first: Math.max(0, Math.floor((r.first / projectFps) * fps) - 1),
        last: Math.min(total - 1, Math.ceil(((r.last + 1) / projectFps) * fps) + 1)
    }));
}
/** The frame of the pause before the word holding frame `f`; `f` when no word holds it. */
function pauseBefore(f, fps, words) {
    const t = (f + 0.5) / fps;
    const i = words.findIndex((w) => w.start < t && t < w.end);
    if (i < 0)
        return f;
    const before = i > 0 ? words[i - 1].end : 0;
    return Math.min(f, Math.floor(((before + words[i].start) / 2) * fps));
}
/** The frame of the pause after the word holding frame `f`; `f` when no word holds it. */
function pauseAfter(f, fps, words) {
    const t = (f + 0.5) / fps;
    const i = words.findIndex((w) => w.start < t && t < w.end);
    if (i < 0)
        return f;
    const after = i + 1 < words.length ? words[i + 1].start : words[i].end + 1;
    return Math.max(f, Math.ceil(((words[i].end + after) / 2) * fps));
}
/**
 * The ranges to matte for the reads of one footage (in its own frames): each widened by
 * `margin` seconds, its bounds moved out of any word into the pause next to it, ranges closer
 * than `gap` seconds joined, all inside the footage.
 */
export function planMatteRanges(reads, opts) {
    const margin = Math.round((opts.margin ?? MATTE_PLAN.margin) * opts.fps);
    const gap = Math.round((opts.gap ?? MATTE_PLAN.gap) * opts.fps);
    const words = [...(opts.words ?? [])].sort((a, b) => a.start - b.start);
    const clamp = (f) => Math.max(0, Math.min(opts.total - 1, f));
    let ranges = reads.map((r) => ({ first: r.first - margin, last: r.last + margin }));
    // Joining can move a bound into a word again (never): bounds move out of words after it.
    ranges = mergeRanges({ x: ranges }, gap).x ?? [];
    ranges = ranges.map((r) => ({
        first: clamp(pauseBefore(clamp(r.first), opts.fps, words)),
        last: clamp(pauseAfter(clamp(r.last), opts.fps, words))
    }));
    return mergeRanges({ x: ranges }, gap).x ?? [];
}
/** The parts of `needed` outside `covered` (both sorted inclusive ranges). */
export function uncovered(needed, covered) {
    const out = [];
    for (const r of needed) {
        let from = r.first;
        for (const c of covered) {
            if (c.last < from || c.first > r.last)
                continue;
            if (c.first > from)
                out.push({ first: from, last: c.first - 1 });
            from = Math.max(from, c.last + 1);
            if (from > r.last)
                break;
        }
        if (from <= r.last)
            out.push({ first: from, last: r.last });
    }
    return out;
}
export const rangesFileOf = (matte) => `${matte}.ranges.json`;
/** Checks a parsed ranges file; returns the problem, or null when it can be used. */
export function rangesFileProblem(file, now) {
    const f = file;
    if (!f || f.version !== 2 || !Array.isArray(f.ranges) || !f.source || !f.matte)
        return 'it is not a ranges file this version of VisualFries reads';
    if (f.matte.fingerprint !== now.matte.fingerprint)
        return 'the matte changed after it was written (or a run was stopped half way)';
    if (f.source.fingerprint !== now.source.fingerprint || f.source.frames !== now.source.frames)
        return `it was made from another video (${f.source.frames} frames; this one has ${now.source.frames}, or other content)`;
    return null;
}
/** Inclusive frame ranges as readable seconds, "12.40–13.10 s, 20.00–21.00 s". */
export function rangeSeconds(ranges, fps) {
    const s = (f) => (f / fps).toFixed(2);
    return ranges.map((r) => `${s(r.first)}–${s(r.last + 1)} s`).join(', ');
}
