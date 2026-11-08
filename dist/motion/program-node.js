import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { bundleMotionProject, frameForAt, launch, openStagePage } from './node.js';
import { resolveProgram } from './program.js';
import { resolveMoment } from './moment.js';
import { cutoutEdgeMessage, cutoutEdges, cutoutPanelMessage, cutoutPanels, headCropMessage, headCrops } from './framing.js';
import { textBehindClip, textOverFaceClip } from './text-over-face.js';
import { frameFitKey } from './frame-fit.js';
import { captionsInMoveClip } from './shot-moves.js';
import { edgeFrames, scrambled, segmentAt, segmentCheckFrames, segmentStage, wholeProgram } from './segments.js';
/** One page with a segment of the program loaded; `capture` takes program frames. */
export async function openSegment(browser, bundle, program, segment, opts = {}) {
    const data = segmentStage(program, segment, bundle.footage, bundle.brand);
    if (opts.checkSafe)
        data.checkSafe = true;
    const page = await openStagePage(browser, bundle, {
        name: segment.id === 'program' ? 'Program' : `Segment "${segment.id}"`,
        size: program.format.size,
        alpha: false,
        load: 'loadSegment',
        data
    }, opts);
    return { ...page, segment: data };
}
/** Throws when the program has errors: its frames are not defined until they are fixed. */
export function assertProgramRenders(program) {
    if (program.mode !== 'program')
        throw new Error('The project has no "cuts" or "shots"; render its clips one by one instead.');
    const errors = program.diagnostics.filter((d) => d.level === 'error');
    if (errors.length)
        throw new Error('Project has errors:\n' +
            errors.map((e) => `  ${e.item ?? e.clip ?? '-'} ${e.field}: ${e.message}`).join('\n'));
}
/**
 * The program (in frame size `format`, `WIDTHxHEIGHT`, when given; with `excerpt`, that
 * excerpt's program), bundled with the blocks of all its clips and the footage it shows.
 */
async function prepareProgram(loaded, format, excerpt) {
    const program = resolveProgram(loaded.project, loaded.inputs, { format, excerpt });
    assertProgramRenders(program);
    const bundle = await bundleMotionProject(loaded, program.clips, excerpt === undefined ? undefined : program);
    return { program, bundle };
}
/**
 * Program frame of a moment: program-wide ("2.5s", "f120", "mid", "end", seconds), or inside a
 * clip when `clip` is given ("extra+0.3", the clip's own "end").
 */
export function programFrameForAt(program, at, clip) {
    if (clip) {
        const found = program.clips.find((c) => c.id === clip);
        if (!found)
            throw new Error(`Unknown clip "${clip}". Clips: ${program.clips.map((c) => c.id).join(', ') || 'none'}`);
        return found.startFrame + frameForAt(found, at);
    }
    const seconds = resolveMoment(at, {
        id: 'program',
        cues: {},
        duration: program.frames / program.fps,
        fps: program.fps
    });
    return Math.max(0, Math.min(program.frames - 1, Math.round(seconds * program.fps)));
}
/** Moments for a program contact sheet: the start, the middle and first frame of every cut, the end. */
export function defaultProgramMoments(program) {
    const frames = new Set([0]);
    for (const cut of program.cuts) {
        frames.add(cut.startFrame);
        frames.add(cut.startFrame + Math.floor(cut.frames / 2));
    }
    if (!program.cuts.length)
        frames.add(Math.floor(program.frames / 2));
    frames.add(program.frames - 1);
    return [...frames].sort((a, b) => a - b).map((f) => `f${f}`);
}
/**
 * Stills of the program (of an excerpt with `excerpt`, its moments in excerpt time): each
 * request is drawn on the page of the segment holding its frame, one page per segment; with
 * `format` in that frame size, as `render --format` draws it.
 */
export async function renderProgramStills(loaded, requests, opts = {}) {
    const { program, bundle } = await prepareProgram(loaded, opts.format, opts.excerpt);
    const wanted = requests.map((r) => ({ ...r, frame: programFrameForAt(program, r.at, r.clip) }));
    for (const r of wanted)
        if (r.frame < 0 || r.frame >= program.frames) {
            await fs.rm(bundle.dir, { recursive: true, force: true });
            throw new Error(`Moment "${r.at}"${r.clip ? ` of clip "${r.clip}"` : ''} is frame ${r.frame}, outside the ${program.excerpt ? `excerpt "${program.excerpt.id}"` : 'program'} (frames 0–${program.frames - 1}).`);
        }
    const browser = await launch();
    const out = new Map();
    try {
        for (const segment of program.segments) {
            const frames = wanted
                .map((r) => r.frame)
                .filter((f) => segmentAt(program, f) === segment && !out.has(f));
            if (!frames.length)
                continue;
            const page = await openSegment(browser, bundle, program, segment, opts);
            try {
                for (const f of frames)
                    out.set(f, { png: await page.capture(f), mode: page.mode });
            }
            finally {
                await page.close();
            }
        }
    }
    finally {
        await browser.close();
        await fs.rm(bundle.dir, { recursive: true, force: true });
    }
    return wanted.map((r) => ({ ...r, ...out.get(r.frame) }));
}
/**
 * Captures `frames` of the program in the given order, on segment pages (default) or on one page
 * holding the whole program. Returns PNGs by program frame. Mainly for tests and checks.
 */
export async function captureProgramFrames(loaded, frames, opts = {}) {
    const { program, bundle } = await prepareProgram(loaded, undefined, opts.excerpt);
    const browser = await launch();
    const out = new Map();
    try {
        const spans = opts.whole ? [wholeProgram(program)] : program.segments;
        for (const span of spans) {
            const own = frames.filter((f) => f >= span.startFrame && f < span.startFrame + span.frames);
            if (!own.length)
                continue;
            const page = await openSegment(browser, bundle, program, span, opts);
            try {
                for (const f of own)
                    out.set(f, await page.capture(f));
            }
            finally {
                await page.close();
            }
        }
    }
    finally {
        await browser.close();
        await fs.rm(bundle.dir, { recursive: true, force: true });
    }
    return out;
}
const sha1 = (b) => createHash('sha1').update(b).digest('hex');
/**
 * Checks a program on segment pages: runs every clip's logic at the frames around cuts, clip
 * edges, cues and transitions, and with `determinism` captures a sample of frames forward,
 * backward and scrambled on the segment's page and once more on a page holding the whole
 * program; all four must give identical pixels. One result per segment; `clips` limits the
 * check to the segments those clips are on screen in. With `format` (`WIDTHxHEIGHT`) the program
 * is checked in that frame size, as `render --format` draws it, and text outside the format's
 * safe zone warns too. With `excerpt`, the excerpt's program is checked (its format unless
 * `format` overrides it, its end card).
 */
export async function checkProgram(loaded, opts = {}) {
    const program = resolveProgram(loaded.project, loaded.inputs, {
        format: opts.format,
        excerpt: opts.excerpt
    });
    const checkSafe = opts.format !== undefined;
    const known = new Set(loaded.project.clips.map((c) => c.id));
    const unknown = (opts.clips ?? []).filter((id) => !known.has(id));
    if (unknown.length)
        throw new Error(`Unknown clip ${unknown.map((id) => `"${id}"`).join(', ')}. Clips: ${[...known].join(', ')}`);
    const segments = program.segments.filter((s) => !opts.clips?.length || opts.clips.some((id) => s.items.includes(id)));
    const results = segments.map((s) => ({
        id: s.id,
        ok: false,
        errors: [],
        warnings: []
    }));
    const failing = program.diagnostics.filter((d) => d.level === 'error');
    if (failing.length) {
        // Frames are not defined until the program resolves; the program diagnostics say why.
        for (const r of results)
            r.errors.push({ message: 'The program has errors (listed above), so it was not drawn.' });
        return results;
    }
    const bundle = await bundleMotionProject(loaded, program.clips, opts.excerpt === undefined ? undefined : program);
    // Frames the clean plate could not be built for belong to the footage, not to a segment:
    // they are told once, with the first segment checked.
    for (const message of bundle.footage.warnings ?? [])
        results[0]?.warnings.push({ message });
    // Over the whole program: a crop across a hard cut is one crop, reported in the segment it
    // starts in.
    const crops = headCropWarnings(segmentStage(program, wholeProgram(program), bundle.footage, bundle.brand));
    const within = (s, f) => f >= s.startFrame && f < s.startFrame + s.frames;
    const browser = await launch();
    /** Hash of every sampled frame on its segment's page, by segment. */
    const sampled = new Map();
    try {
        for (const segment of segments) {
            const result = results.find((r) => r.id === segment.id);
            let page;
            try {
                page = await openSegment(browser, bundle, program, segment, { checkSafe });
                result.mode = page.mode;
                const list = segmentCheckFrames(program, segment);
                const found = await page.check(list);
                result.errors.push(...found.errors);
                result.warnings.push(...found.warnings);
                result.warnings.push(...crops.filter((w) => within(segment, w.frame)));
                if (!opts.determinism || found.errors.length)
                    continue;
                const sample = determinismSample(program, segment, list);
                const first = new Map();
                const differ = new Set();
                for (const order of [sample, [...sample].reverse(), scrambled(sample)])
                    for (const f of order) {
                        const hash = sha1(await page.capture(f));
                        if (!first.has(f))
                            first.set(f, hash);
                        else if (first.get(f) !== hash)
                            differ.add(f);
                    }
                if (differ.size) {
                    result.nondeterministic = [...differ].sort((a, b) => a - b);
                    result.errors.push({
                        message: `Frames ${result.nondeterministic.join(', ')} look different depending on seek order. Something depends on history: wall-clock time, stateful random, state kept between frames, or an image that decodes after it mounts (an <img> whose src changes; preload images, see "Images" in docs/MOTION.md).`
                    });
                }
                sampled.set(segment.id, first);
            }
            catch (error) {
                result.errors.push({ message: error.message });
            }
            finally {
                await page?.close();
            }
        }
        if (opts.determinism)
            await compareWithWholeProgram(browser, bundle, program, results, sampled);
    }
    finally {
        await browser.close();
        await fs.rm(bundle.dir, { recursive: true, force: true });
    }
    // Warnings about a clip's text or content are told once per clip (and kind), in the first
    // segment they are found in.
    const told = new Set();
    const onceKey = (message) => {
        const face = textOverFaceClip(message);
        if (face !== null)
            return `face\u0000${face}`;
        const behind = textBehindClip(message);
        if (behind !== null)
            return `behind\u0000${behind}`;
        const captions = captionsInMoveClip(message);
        if (captions !== null)
            return `captions\u0000${captions}`;
        const fit = frameFitKey(message);
        return fit === null ? null : `fit\u0000${fit}`;
    };
    for (const r of results)
        r.warnings = r.warnings.filter((w) => {
            const key = onceKey(w.message);
            if (key === null)
                return true;
            if (told.has(key))
                return false;
            told.add(key);
            return true;
        });
    for (const r of results)
        r.ok = r.errors.length === 0;
    return results;
}
/**
 * Warnings for every stretch where a shot's camera window cuts the speaker's head (see
 * `headCrops`), a cutout shows the speaker cut (see `cutoutEdges`) or leaves a filled slot no
 * room (see `cutoutPanels`), each at its first frame.
 */
export function headCropWarnings(segment) {
    const shot = (id) => segment.shots.find((s) => s.id === id);
    return [
        ...headCrops(segment, segment).map((crop) => ({
            frame: crop.from,
            message: headCropMessage(crop, shot(crop.shot), segment.fps)
        })),
        ...cutoutEdges(segment, segment).map((cut) => ({
            frame: cut.from,
            message: cutoutEdgeMessage(cut, shot(cut.shot), segment.fps)
        })),
        ...cutoutPanels(segment).map((panel) => ({
            frame: panel.from,
            message: cutoutPanelMessage(panel, shot(panel.shot), segment.fps)
        }))
    ].sort((a, b) => a.frame - b.frame);
}
/** Up to about a dozen evenly spread frames plus the frames on both sides of every change. */
function determinismSample(program, segment, list) {
    const step = Math.max(1, Math.floor(list.length / 12));
    const end = segment.startFrame + segment.frames;
    const picked = new Set([
        ...list.filter((_, i) => i % step === 0),
        ...edgeFrames(program).filter((f) => f >= segment.startFrame && f < end)
    ]);
    return [...picked].sort((a, b) => a - b);
}
/** One page holding the whole program must draw every sampled frame like its segment's page. */
async function compareWithWholeProgram(browser, bundle, program, results, sampled) {
    const checked = results.filter((r) => sampled.has(r.id) && !r.errors.length);
    if (!checked.length)
        return;
    const page = await openSegment(browser, bundle, program, wholeProgram(program));
    try {
        for (const result of checked) {
            const differ = [];
            for (const [f, hash] of sampled.get(result.id))
                if (sha1(await page.capture(f)) !== hash)
                    differ.push(f);
            if (differ.length)
                result.errors.push({
                    message: `Frames ${differ.join(', ')} look different on a page holding the whole program than on the segment's own page. Something depends on what else is loaded (state shared between clips, a clip seeked outside its window).`
                });
        }
    }
    catch (error) {
        for (const r of checked)
            r.errors.push({ message: error.message });
    }
    finally {
        await page.close();
    }
}
