import fs from 'node:fs/promises';
import { existsSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { H264_FINAL, bundleMotionProject, chromiumExecutable, ffmpegFramePipe, launch, motionProgram, pipeFrames } from './node.js';
import { STEMS, mixProgram, writeWav } from './audio.js';
import { assertProgramRenders, openSegment } from './program-node.js';
/**
 * `render --export video`: the whole program as one video. Each segment is drawn on its own
 * pages and encoded losslessly to `.visualfries/segments/`, where it stays as a cache: a later
 * render draws only segments whose hash changed. The segments are then joined without
 * re-encoding and go through one final encode with the settings of every other render.
 */
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
/**
 * Lossless intermediate: H.264 in RGB with quantiser 0, so decoded frames are the captured
 * pixels exactly (no colour conversion).
 */
const INTERMEDIATE = ['-c:v', 'libx264rgb', '-qp', '0', '-preset', 'veryfast', '-pix_fmt', 'rgb24'];
/** Renders the program of a project with `cuts` or `shots` into one video. */
export async function renderProgramVideo(loaded, opts) {
    if (opts.jobs !== undefined && !(Number.isInteger(opts.jobs) && opts.jobs > 0))
        throw new Error(`--jobs must be a positive integer, got ${opts.jobs}.`);
    const t0 = Date.now();
    const { program } = await motionProgram(loaded, { format: opts.format, write: true });
    assertProgramRenders(program);
    // Saved as resolved: bundling attaches extracted footage to the clips.
    const resolved = JSON.stringify(program, null, 2) + '\n';
    const [w, h] = program.format.size;
    if (w % 2 || h % 2)
        throw new Error(`Format ${program.format.name} must have even dimensions for H.264; use an even width and height.`);
    const file = outputFile(loaded, opts);
    const sidecar = file.replace(/\.mp4$/i, '.program.json');
    await fs.mkdir(path.dirname(file), { recursive: true });
    const cacheDir = path.join(loaded.dir, '.visualfries', 'segments');
    await fs.mkdir(cacheDir, { recursive: true });
    // Left by a render that was killed before it could clean up.
    await removeOrphans(cacheDir, /\.(?:partial|concat)-(\d+)-[^/]*\.(?:mkv|txt)$/);
    await removeOrphans(path.dirname(file), /^\..+\.partial-(\d+)\.(?:mp4|wav)$/);
    const engine = await engineHash(opts.invalidate);
    const segments = program.segments.map((s) => {
        const cached = path.join(cacheDir, `${s.hash}-${engine}.mkv`);
        return {
            id: s.id,
            startFrame: s.startFrame,
            frames: s.frames,
            hash: s.hash,
            file: cached,
            cached: !opts.fresh && existsSync(cached),
            seconds: 0
        };
    });
    const todo = segments.filter((s) => !s.cached);
    const log = opts.onProgress ?? (() => { });
    for (const s of segments.filter((x) => x.cached))
        log(`${s.id}: frames ${span(s)} cached (${s.hash.slice(0, 12)})`);
    let mode = 'cached';
    if (todo.length) {
        const bundle = await bundleMotionProject(loaded, program.clips);
        const browser = await launch();
        try {
            mode = await renderSegments(browser, bundle, program, todo, {
                jobs: opts.jobs ?? Math.min(6, os.cpus().length),
                invalidate: opts.invalidate,
                schedule: opts.schedule ?? 'auto',
                log
            });
        }
        finally {
            await browser.close();
            await fs.rm(bundle.dir, { recursive: true, force: true });
        }
    }
    const tMix = Date.now();
    const mixed = await mixProgram(program, { dir: loaded.dir, stems: opts.stems });
    if (mixed)
        log(`mix in ${((Date.now() - tMix) / 1000).toFixed(1)} s: speech ${mixed.report.speech ?? '–'} LUFS, ${mixed.report.lufs} LUFS and ${mixed.report.truePeak} dBTP after ${mixed.report.gain} dB${mixed.report.limiter ? ` (limiter ${mixed.report.limiter} dB)` : ''}`);
    const t1 = Date.now();
    await joinAndEncode(program, segments, file, mixed?.samples ?? null);
    const encodeSeconds = (Date.now() - t1) / 1000;
    let stems = null;
    if (mixed?.stems) {
        stems = {};
        for (const stem of STEMS) {
            stems[stem] = file.replace(/\.mp4$/i, `.${stem}.wav`);
            await writeWav(stems[stem], mixed.stems[stem]);
        }
    }
    await fs.writeFile(sidecar, resolved);
    await pruneSegments(cacheDir, loaded, program.format.name, segments, t0);
    log(`final encode: ${program.frames} frames in ${encodeSeconds.toFixed(1)} s${mixed ? '' : ' (silent)'}`);
    return {
        file,
        program: sidecar,
        format: program.format.name,
        fps: program.fps,
        frames: program.frames,
        audio: mixed ? 'mixed' : 'silent',
        mix: mixed?.report ?? null,
        stems,
        mode,
        segments,
        seconds: (Date.now() - t0) / 1000,
        encodeSeconds
    };
}
const span = (s) => `${s.startFrame}–${s.startFrame + s.frames - 1}`;
function outputFile(loaded, opts) {
    if (/\.mp4$/i.test(opts.output))
        return path.resolve(opts.output);
    if (path.extname(opts.output))
        throw new Error(`--output ${opts.output}: a program renders an .mp4; name one, or a directory.`);
    const name = path.basename(loaded.file).replace(/(\.vf)?\.json$/i, '');
    return path.resolve(opts.output, `${name}${opts.format ? `.${opts.format}` : ''}.mp4`);
}
/**
 * What the pixels of a segment depend on besides its own hash: the VisualFries runtime that
 * draws it (stage, shots, transitions, built-in blocks), the Svelte and GSAP it is bundled with,
 * the bundler, the browser binary, the stage invalidation and the intermediate encoding.
 */
async function engineHash(invalidate) {
    const hash = createHash('sha1');
    const files = (await fs.readdir(HERE, { recursive: true }))
        .filter((f) => /\.(js|ts|svelte|css)$/.test(f) && !f.endsWith('.d.ts'))
        .sort();
    for (const f of files)
        hash.update(f).update(await fs.readFile(path.join(HERE, f)));
    for (const pkg of ['svelte', 'gsap', 'playwright', 'esbuild']) {
        try {
            hash.update(`${pkg}@${require(`${pkg}/package.json`).version}`);
        }
        catch {
            hash.update(`${pkg}@-`);
        }
    }
    // The binary pages really run in (a system Chromium or Playwright's own build).
    const chromium = await chromiumExecutable();
    if (chromium) {
        const st = statSync(chromium);
        hash.update(`${chromium}:${st.size}:${st.mtimeMs}`);
    }
    else
        hash.update('chromium:-');
    hash.update(JSON.stringify({ invalidate: invalidate ?? null, intermediate: INTERMEDIATE }));
    return hash.digest('hex').slice(0, 12);
}
/**
 * Draws segments into their intermediates. With at least as many segments as jobs and none much
 * longer than its share, each page takes whole segments (no reorder buffer across pages, every
 * page encodes its own file);
 * otherwise the segments go one after another with their frames spread over `jobs` pages. The
 * first failure, a crashed page included, stops every other page at its next frame.
 */
async function renderSegments(browser, bundle, program, todo, opts) {
    const abort = new AbortController();
    let mode = '';
    const one = async (s, pages) => {
        const t0 = Date.now();
        const segment = program.segments.find((x) => x.id === s.id);
        const partial = s.file.replace(/\.mkv$/, `.partial-${process.pid}-${s.id}.mkv`);
        const untrack = trackPartial(partial);
        try {
            const sink = ffmpegFramePipe([
                '-y',
                '-f',
                'image2pipe',
                '-framerate',
                String(program.fps),
                '-c:v',
                'png',
                '-i',
                'pipe:0',
                ...INTERMEDIATE,
                partial
            ]);
            const open = async () => {
                const page = await openSegment(browser, bundle, program, segment, {
                    invalidate: opts.invalidate
                });
                mode = page.mode;
                // Pipe frames count from 0; the page takes program frames.
                return { capture: (i) => page.capture(s.startFrame + i), close: page.close };
            };
            await pipeFrames(s.frames, Math.min(pages, s.frames), open, sink, {
                signal: abort.signal
            });
            await fs.rename(partial, s.file);
        }
        finally {
            await fs.rm(partial, { force: true });
            untrack();
        }
        s.seconds = (Date.now() - t0) / 1000;
        opts.log(`${s.id}: frames ${span(s)} rendered in ${s.seconds.toFixed(1)} s (${(s.frames / s.seconds).toFixed(1)} fps)`);
    };
    let failed = null;
    const guard = (work) => work.catch((error) => {
        failed ??= error;
        abort.abort(error);
    });
    // Whole segments per page only pay off when they balance: one long segment on one page while
    // the others idle is slower than sharing its frames (measured: 22.6 s against 15.9 s).
    const total = todo.reduce((sum, s) => sum + s.frames, 0);
    const balanced = Math.max(...todo.map((s) => s.frames)) <= (1.5 * total) / opts.jobs;
    const whole = opts.schedule === 'segments' ||
        (opts.schedule === 'auto' && todo.length >= opts.jobs && balanced);
    if (whole) {
        const queue = [...todo];
        const worker = async () => {
            for (let s = queue.shift(); s && !failed; s = queue.shift())
                await one(s, 1);
        };
        const workers = Math.min(opts.jobs, todo.length);
        await Promise.all(Array.from({ length: workers }, () => guard(worker())));
    }
    else {
        for (const s of todo) {
            await guard(one(s, opts.jobs));
            if (failed)
                break;
        }
    }
    if (failed)
        throw failed;
    return mode;
}
/**
 * Joins the intermediates in order (stream copy through the concat demuxer, no decode between
 * segments) and encodes the result once, with the program mix when there is one (written beside
 * the target as a float WAV for the encode). Encodes beside the target and replaces it only on
 * success.
 */
async function joinAndEncode(program, segments, file, mix) {
    const list = path.join(path.dirname(segments[0].file), `.concat-${process.pid}-${Date.now()}.txt`);
    const partial = path.join(path.dirname(file), `.${path.basename(file, '.mp4')}.partial-${process.pid}.mp4`);
    const wav = partial.replace(/\.mp4$/, '.wav');
    const untrack = [trackPartial(list), trackPartial(partial), trackPartial(wav)];
    await fs.writeFile(list, segments.map((s) => `file '${s.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
    const seconds = program.frames / program.fps;
    try {
        if (mix)
            await writeWav(wav, mix);
        await run([
            '-y',
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            list,
            ...(mix
                ? ['-i', wav, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k']
                : ['-map', '0:v']),
            // Number frames by count: timestamps of joined files must not drop or repeat a frame.
            '-vf',
            `setpts=N/(${program.fps}*TB)`,
            '-r',
            String(program.fps),
            // A hard end: the sound must never keep the encode running past the picture.
            '-t',
            seconds.toFixed(6),
            ...H264_FINAL,
            partial
        ]);
        await fs.rename(partial, file);
    }
    finally {
        await fs.rm(list, { force: true });
        await fs.rm(partial, { force: true });
        await fs.rm(wav, { force: true });
        for (const done of untrack)
            done();
    }
}
// ---------------------------------------------------------------- cache housekeeping
/** Temporary files of this process, removed when it is interrupted. */
const partials = new Set();
let onSignal = null;
/** Set by SIGINT or SIGTERM: no render of this process writes another temporary file. */
let interrupted = null;
/**
 * Registers a temporary file: SIGINT or SIGTERM removes it before the process exits, and a
 * render still running then stops at its next file. Returns the call that unregisters it.
 */
function trackPartial(file) {
    if (interrupted)
        throw new Error(`Render stopped by ${interrupted}.`);
    partials.add(file);
    if (!onSignal) {
        onSignal = (signal) => {
            interrupted = signal;
            for (const f of partials)
                rmSync(f, { force: true });
            partials.clear();
            process.off('SIGINT', onSignal);
            process.off('SIGTERM', onSignal);
            onSignal = null;
            // Others listening (Playwright closes its browsers) end the process; else end it as
            // the signal would have.
            if (!process.listenerCount(signal))
                process.kill(process.pid, signal);
        };
        process.on('SIGINT', onSignal);
        process.on('SIGTERM', onSignal);
    }
    return () => {
        partials.delete(file);
        if (!partials.size && onSignal) {
            process.off('SIGINT', onSignal);
            process.off('SIGTERM', onSignal);
            onSignal = null;
        }
    };
}
const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code === 'EPERM';
    }
};
/**
 * Removes temporary files (partial intermediates and encodes, join lists) whose name carries
 * the id of a process no longer running: `pattern` captures it.
 */
async function removeOrphans(dir, pattern) {
    const names = await fs.readdir(dir).catch(() => []);
    await Promise.all(names.map(async (name) => {
        const m = pattern.exec(name);
        if (!m || Number(m[1]) === process.pid || alive(Number(m[1])))
            return;
        await fs.rm(path.join(dir, name), { force: true });
    }));
}
/**
 * Keeps the intermediates some render of a project in this folder still uses. Each project and
 * format records the files of its latest render (`<project>.<format>.json`); an intermediate no
 * record names (an edited segment, an older engine) is removed, unless it is newer than this
 * render's start (another render in the folder may still be writing its record).
 */
async function pruneSegments(cacheDir, loaded, format, segments, since) {
    const name = path.basename(loaded.file).replace(/(\.vf)?\.json$/i, '');
    await fs.writeFile(path.join(cacheDir, `${name}.${format}.json`), JSON.stringify({ files: segments.map((s) => path.basename(s.file)) }, null, 2) + '\n');
    const names = await fs.readdir(cacheDir);
    const used = new Set();
    for (const record of names.filter((n) => n.endsWith('.json'))) {
        try {
            const { files } = JSON.parse(await fs.readFile(path.join(cacheDir, record), 'utf8'));
            for (const f of files ?? [])
                used.add(f);
        }
        catch {
            // A record being written by another render: keep everything this round.
            return;
        }
    }
    await Promise.all(names
        .filter((n) => /^[0-9a-f]{40}-[0-9a-f]{12}\.mkv$/.test(n) && !used.has(n))
        .map(async (n) => {
        const st = await fs.stat(path.join(cacheDir, n)).catch(() => null);
        if (st && st.mtimeMs < since)
            await fs.rm(path.join(cacheDir, n), { force: true });
    }));
}
function run(args) {
    return new Promise((resolve, reject) => {
        const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
            stdio: ['ignore', 'ignore', 'pipe']
        });
        let err = '';
        p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
        p.on('error', reject);
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`)));
    });
}
