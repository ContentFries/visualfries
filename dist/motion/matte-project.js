import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { mergeRanges } from './footage-map.js';
import { matteReads, planMatteRanges, rangeSeconds, rangesFileOf, rangesFileProblem, toFootageFrames, uncovered } from './matte-use.js';
import { blockFile, FOOTAGE_MARGIN_SECONDS, probeVideo } from './node.js';
import { resolveProgram } from './program.js';
import { createRangeMatte } from './matte.js';
/**
 * Partial mattes of a project's footage, in Node: which frames `visualfries matte <project>`
 * mattes, and the check that a program never reads a partial matte where it is black.
 */
/** Words that tell a block reads the subject: `<Subject>`, `layer="subject"`, `subject()`. */
const SUBJECT_WORD = /subject/i;
/** Local files a block imports (`./x.svelte`, `../lib/y.js`). */
const LOCAL_IMPORT = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;
/**
 * Whether a block draws or measures the subject: its file, or a file of the project it imports,
 * names it. Files of VisualFries itself are not followed (only its subject blocks name it).
 */
export async function blockReadsSubject(dir, block) {
    const seen = new Set();
    // The engine's own folder (`motion/`, which holds `blocks/`).
    const own = path.dirname(path.dirname(blockFile(dir, '@visualfries/subject')));
    const visit = async (file) => {
        if (seen.has(file) || seen.size > 200)
            return false;
        seen.add(file);
        const text = await fs.readFile(file, 'utf8').catch(() => null);
        if (text === null)
            return false;
        if (SUBJECT_WORD.test(text))
            return true;
        for (const [, ref] of text.matchAll(LOCAL_IMPORT)) {
            const next = path.resolve(path.dirname(file), ref);
            if (next.startsWith(own + path.sep))
                continue;
            for (const candidate of [next, `${next}.ts`, `${next}.js`])
                if (await visit(candidate))
                    return true;
        }
        return false;
    };
    return visit(blockFile(dir, block));
}
/** Matte reads of `program` by footage, in source frames at the project rate. */
async function programReads(loaded, program) {
    const blocks = [...new Set(program.clips.map((c) => c.block))];
    const reading = new Set();
    for (const block of blocks)
        if (await blockReadsSubject(loaded.dir, block))
            reading.add(block);
    const fps = loaded.project.fps;
    const margins = Object.fromEntries(Object.entries(loaded.project.footage ?? {}).map(([name, spec]) => [
        name,
        spec.margin === 'all'
            ? Number.MAX_SAFE_INTEGER
            : Math.round((spec.margin ?? FOOTAGE_MARGIN_SECONDS) * fps)
    ]));
    return matteReads(program, { readsSubject: (b) => reading.has(b), margins });
}
/** The footage with a matte (with `partial`, only one with a ranges file), probed. */
async function mattedFootage(loaded, partial = false) {
    const out = [];
    for (const [name, spec] of Object.entries(loaded.project.footage ?? {})) {
        if (!spec.matte)
            continue;
        const matte = path.resolve(loaded.dir, spec.matte);
        if (partial && !existsSync(rangesFileOf(matte)))
            continue;
        const src = path.resolve(loaded.dir, spec.src);
        const info = await probeVideo(src);
        out.push({ name, src, matte, ...info });
    }
    return out;
}
/**
 * What `visualfries matte <project>` mattes of each footage with a matte: the frames the program
 * reads it at, in the project's frame size, in each excerpt and in each of `formats` (frame sizes
 * `render --format` draws), widened by a margin, moved out of words and joined. A project
 * without cuts or shots (inserts mode) reads every frame.
 */
export async function projectMattePlan(loaded, opts = {}) {
    const footage = await mattedFootage(loaded);
    const reads = await neededReads(loaded, footage, opts.formats ?? []);
    return footage.map((f) => ({
        ...f,
        reads: reads[f.name],
        ranges: planMatteRanges(reads[f.name], {
            total: f.frames,
            fps: f.fps,
            margin: opts.margin,
            gap: opts.gap,
            words: loaded.inputs.transcripts?.[f.name] ?? null
        })
    }));
}
/** The programs `render` can draw of a project: its own, each excerpt and each extra format. */
function programsOf(loaded, formats) {
    const { project, inputs } = loaded;
    const out = [resolveProgram(project, inputs)];
    if (out[0].mode !== 'program')
        return out;
    for (const e of project.excerpts ?? [])
        out.push(resolveProgram(project, inputs, { excerpt: e.id }));
    for (const format of formats)
        out.push(resolveProgram(project, inputs, { format }));
    return out;
}
/** Frames of each footage (its own rate) that `programs` read the matte at. */
async function neededReads(loaded, footage, formats) {
    const found = {};
    for (const f of footage)
        found[f.name] = [];
    for (const program of programsOf(loaded, formats))
        await addReads(loaded, program, footage, found);
    return mergeRanges(found);
}
async function addReads(loaded, program, footage, found) {
    const reads = program.mode === 'program'
        ? await programReads(loaded, program)
        : Object.fromEntries(footage.map((f) => [
            f.name,
            [{ first: 0, last: Math.round((f.frames / f.fps) * loaded.project.fps) - 1 }]
        ]));
    for (const f of footage)
        found[f.name].push(...toFootageFrames(reads[f.name] ?? [], loaded.project.fps, f.fps, f.frames));
}
/** The frames a partial matte covers (its ranges file); null: the whole footage. */
async function coveredFrames(f) {
    const ranges = rangesFileOf(f.matte);
    const text = await fs.readFile(ranges, 'utf8').catch(() => null);
    if (text === null)
        return null;
    let parsed = null;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        // Reported below as a file this version cannot read.
    }
    const [src, matte] = await Promise.all([fs.stat(f.src), fs.stat(f.matte)]);
    const problem = rangesFileProblem(parsed, {
        source: { size: src.size, frames: f.frames },
        matte: { size: matte.size }
    });
    if (problem)
        throw new Error(`Footage "${f.name}": ${path.basename(ranges)} cannot be used: ${problem}. Run visualfries matte on the project again (or delete that file if the matte covers the whole video).`);
    return parsed.ranges.map(([first, last]) => ({
        first,
        last
    }));
}
/**
 * Throws when `program` reads a partial matte (one `visualfries matte <project>` made) at a
 * frame it does not cover, where it is black: the program changed since. Mattes without a
 * ranges file cover the whole footage and pass.
 */
export async function assertMatteCovers(loaded, program, format) {
    // Mattes without a ranges file cover every frame: nothing to probe or check.
    const footage = await mattedFootage(loaded, true);
    const partial = [];
    for (const f of footage) {
        const covered = await coveredFrames(f);
        if (covered)
            partial.push({ f, covered });
    }
    if (!partial.length)
        return;
    const found = {};
    for (const { f } of partial)
        found[f.name] = [];
    await addReads(loaded, program, partial.map((p) => p.f), found);
    const problems = [];
    for (const { f, covered } of partial) {
        const missing = uncovered(mergeRanges(found)[f.name] ?? [], covered);
        if (missing.length)
            problems.push(`Footage "${f.name}": the program reads its matte at ${rangeSeconds(missing, f.fps)} of the footage, which the matte does not cover (it is black there: it was made for an earlier version of the program).`);
    }
    if (problems.length) {
        const relative = path.relative(process.cwd(), loaded.file);
        const project = relative && !relative.startsWith('..') ? relative : loaded.file;
        const flag = format === undefined ? '' : ` --format ${format}`;
        throw new Error(`${problems.join('\n')}\nRun visualfries matte ${project}${flag} again: it mattes only the frames that are new.`);
    }
}
/**
 * `visualfries matte <project>`: for each footage with a `matte`, mattes only the frames the
 * program reads it at (see `projectMattePlan`) into one full-length matte at that path, black
 * elsewhere, with its ranges file. Ranges matted before are reused from
 * `.visualfries/matte/<footage>/`.
 */
export async function matteProject(loaded, opts) {
    const plans = await projectMattePlan(loaded, { formats: opts.formats });
    if (!plans.length)
        throw new Error('No footage of this project has a "matte". Add "matte": "<name>.matte.mp4" to the footage that needs one, then run this again.');
    const out = [];
    for (const plan of plans) {
        const count = `${plan.ranges.length} range${plan.ranges.length === 1 ? '' : 's'}`;
        opts.onProgress?.(`matte: footage "${plan.name}": ${count} (${rangeSeconds(plan.ranges, plan.fps) || 'none'})`);
        const r = await createRangeMatte(plan.src, {
            ...opts,
            output: plan.matte,
            ranges: plan.ranges,
            cacheDir: path.join(loaded.dir, '.visualfries', 'matte', plan.name)
        });
        out.push({
            footage: plan.name,
            matte: plan.matte,
            frames: r.frames,
            covered: r.covered,
            matted: r.matted,
            ranges: r.ranges,
            fps: r.fps,
            seconds: r.seconds,
            fullSeconds: r.matted ? (r.seconds / r.matted) * r.frames : null,
            written: r.written
        });
    }
    return out;
}
const duration = (s) => (s < 90 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1)} min`);
/** What `matteProject` did, one line per footage for the terminal. */
export function matteReportLines(reports) {
    return reports.map((r) => {
        const share = r.frames ? Math.round((r.covered / r.frames) * 100) : 0;
        const head = `${r.footage}: ${r.covered} of ${r.frames} frames covered (${share} %), ${r.matted} matted now in ${duration(r.seconds)}`;
        const full = r.fullSeconds === null
            ? ''
            : `; every frame would take about ${duration(r.fullSeconds)} at this pace`;
        const file = r.written ? `. Wrote ${r.matte}` : `. ${r.matte} is up to date`;
        return head + full + file;
    });
}
/**
 * `--ranges` of `visualfries matte <video>`: seconds as `from-to` pairs separated by commas
 * ("12.5-20,31-40.2"), as sorted, joined frame ranges of a video at `fps` with `total` frames.
 */
export function parseRangesFlag(text, fps, total) {
    const ranges = text.split(',').map((part) => {
        const m = /^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*$/.exec(part);
        if (!m || Number(m[2]) <= Number(m[1]))
            throw new Error(`--ranges takes seconds as from-to pairs, e.g. 12.5-20,31-40; got "${part}".`);
        return {
            first: Math.max(0, Math.floor(Number(m[1]) * fps)),
            last: Math.min(total - 1, Math.ceil(Number(m[2]) * fps) - 1)
        };
    });
    return mergeRanges({ x: ranges.filter((r) => r.last >= r.first) }).x ?? [];
}
