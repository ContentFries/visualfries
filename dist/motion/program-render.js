import fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { H264_FINAL, bundleMotionProject, chromiumExecutable, ffmpegFramePipe, launch, motionProgram, pipeFrames } from './node.js';
import { removeOrphans, trackPartial } from './partials.js';
import { STEMS, encodeProgramMix, writeWav } from './audio.js';
import { assertProgramRenders, openSegment } from './program-node.js';
/**
 * `render --export video`: the whole program as one video. Each chunk of the grid (see
 * `programChunks`) is drawn part by part on pages of its segments and encoded once, with the
 * settings of every other render, to `.visualfries/segments/`, where it stays as a cache: a
 * later render draws and encodes only chunks whose hash changed. The video is the chunks
 * joined as they are (stream copy) with the program audio: no frame is encoded twice.
 */
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
/**
 * A chunk's encode: the final video settings, each chunk a file of its own that starts on a
 * keyframe, so chunks join by stream copy. No `+faststart` here: the joined video gets it.
 */
const CHUNK_ENCODE = H264_FINAL.filter((a, i, all) => a !== '-movflags' && all[i - 1] !== '-movflags');
/** Renders the program of a project with `cuts` or `shots` into one video. */
export async function renderProgramVideo(loaded, opts) {
    if (opts.jobs !== undefined && !(Number.isInteger(opts.jobs) && opts.jobs > 0))
        throw new Error(`--jobs must be a positive integer, got ${opts.jobs}.`);
    const t0 = Date.now();
    if (opts.chunkSeconds !== undefined && !(opts.chunkSeconds > 0))
        throw new Error(`--chunk-seconds must be a positive number, got ${opts.chunkSeconds}.`);
    const { program } = await motionProgram(loaded, {
        format: opts.format,
        excerpt: opts.excerpt,
        chunkSeconds: opts.chunkSeconds,
        write: true
    });
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
    await removeOrphans(cacheDir, /\.(?:partial|concat)-(\d+)-[^/]*\.(?:mkv|mp4|txt)$/);
    await removeOrphans(path.dirname(file), /^\..+\.partial-(\d+)\.(?:mp4|m4a|wav|(?:speech|sfx|music)\.wav)$/);
    const engine = await engineHash(opts.invalidate);
    const chunks = program.chunks.map((c) => {
        const cached = path.join(cacheDir, `${c.hash}-${engine}.mp4`);
        return {
            id: c.id,
            startFrame: c.startFrame,
            frames: c.frames,
            hash: c.hash,
            parts: c.parts,
            file: cached,
            cached: !opts.fresh && existsSync(cached),
            seconds: 0
        };
    });
    const todo = chunks.filter((s) => !s.cached);
    const log = opts.onProgress ?? (() => { });
    // Sound first: a missing or unreadable sound file fails the render before any picture is
    // drawn. The encoded audio and the stems wait in partial files beside the target.
    const partial = path.join(path.dirname(file), `.${path.basename(file, '.mp4')}.partial-${process.pid}`);
    const audioFile = `${partial}.m4a`;
    const stemFile = (stem) => `${partial}.${stem}.wav`;
    const temporary = [audioFile, `${partial}.wav`, ...STEMS.map(stemFile)];
    const untrack = temporary.map(trackPartial);
    try {
        const tMix = Date.now();
        const mixed = await encodeProgramMix(program, {
            dir: loaded.dir,
            stems: opts.stems,
            wav: `${partial}.wav`,
            output: audioFile
        });
        const mix = mixed?.report ?? null;
        if (mixed?.stems)
            for (const stem of STEMS)
                await writeWav(stemFile(stem), mixed.stems[stem]);
        if (mix) {
            const d = mix.delivered;
            log(`mix in ${((Date.now() - tMix) / 1000).toFixed(1)} s: speech ${mix.speech ?? '–'} LUFS, delivered ${d.lufs} LUFS and ${d.truePeak} dBTP after ${mix.gain} dB${mix.limiter ? ` (limiter ${mix.limiter} dB)` : ''}`);
            for (const warning of mix.warnings)
                log(`warning: ${warning}`);
        }
        return await renderPictures(mix);
    }
    finally {
        for (const f of temporary)
            await fs.rm(f, { force: true });
        for (const done of untrack)
            done();
    }
    async function renderPictures(mix) {
        for (const s of chunks.filter((x) => x.cached))
            log(`${s.id}: frames ${span(s)} cached (${s.hash.slice(0, 12)})`);
        let mode = 'cached';
        if (todo.length) {
            const bundle = await bundleMotionProject(loaded, program.clips, opts.excerpt === undefined ? undefined : program);
            for (const message of bundle.footage.warnings ?? [])
                log(`warning: ${message}`);
            const browser = await launch();
            try {
                mode = await renderChunks(browser, bundle, program, todo, {
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
        const t1 = Date.now();
        await join(program, chunks, file, mix ? audioFile : null);
        const encodeSeconds = (Date.now() - t1) / 1000;
        // Stems beside the video replace earlier ones; without --stems earlier ones are removed, as
        // they no longer match the video.
        let stems = null;
        if (mix && opts.stems)
            stems = {};
        for (const stem of STEMS) {
            const target = file.replace(/\.mp4$/i, `.${stem}.wav`);
            if (stems) {
                await fs.rename(stemFile(stem), target);
                stems[stem] = target;
            }
            else
                await fs.rm(target, { force: true });
        }
        await fs.writeFile(sidecar, resolved);
        await pruneChunks(cacheDir, recordName(loaded, opts.excerpt), program.format.name, chunks, t0);
        log(`joined ${chunks.length} chunks (${program.frames} frames) in ${encodeSeconds.toFixed(1)} s${mix ? '' : ' (silent)'}`);
        return {
            file,
            program: sidecar,
            format: program.format.name,
            fps: program.fps,
            frames: program.frames,
            audio: mix ? 'mixed' : 'silent',
            mix,
            stems,
            mode,
            chunks,
            seconds: (Date.now() - t0) / 1000,
            encodeSeconds
        };
    }
}
const span = (s) => `${s.startFrame}–${s.startFrame + s.frames - 1}`;
function outputFile(loaded, opts) {
    if (/\.mp4$/i.test(opts.output))
        return path.resolve(opts.output);
    if (path.extname(opts.output))
        throw new Error(`--output ${opts.output}: a program renders an .mp4; name one, or a directory.`);
    return path.resolve(opts.output, `${recordName(loaded, opts.excerpt)}${opts.format ? `.${opts.format}` : ''}.mp4`);
}
/** The project's name, and the excerpt's id after it: `<project>[.<excerpt>]`. */
const recordName = (loaded, excerpt) => `${path.basename(loaded.file).replace(/(\.vf)?\.json$/i, '')}${excerpt ? `.${excerpt}` : ''}`;
/**
 * What a chunk depends on besides its own hash: the VisualFries runtime that draws it (stage,
 * shots, transitions, built-in blocks), the Svelte and GSAP it is bundled with, the bundler, the
 * browser binary, the stage invalidation, the encoder settings and the ffmpeg that encodes.
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
    hash.update(JSON.stringify({
        invalidate: invalidate ?? null,
        encode: CHUNK_ENCODE,
        ffmpeg: await ffmpegVersion()
    }));
    return hash.digest('hex').slice(0, 12);
}
/**
 * Draws and encodes chunks. With at least as many chunks as jobs and none much longer than its
 * share, each page takes whole chunks (no reorder buffer across pages, every page encodes its
 * own file); otherwise the chunks go one after another with their frames spread over `jobs`
 * pages. A chunk's parts are drawn in order on pages of their segments into the one encode of
 * the chunk. The first failure, a crashed page included, stops every other page at its next
 * frame.
 */
async function renderChunks(browser, bundle, program, todo, opts) {
    const abort = new AbortController();
    let mode = '';
    const idle = new Map();
    let live = 0;
    let waiting = [];
    const wake = () => {
        const w = waiting;
        waiting = [];
        w.forEach((f) => f());
    };
    const left = new Map();
    for (const c of todo)
        for (const p of c.parts)
            left.set(p.segment, (left.get(p.segment) ?? 0) + 1);
    const close = async (page) => {
        try {
            await page.close();
        }
        finally {
            live--;
            wake();
        }
    };
    const closeIdle = async (segment) => {
        const pages = idle.get(segment) ?? [];
        idle.delete(segment);
        await Promise.all(pages.map(close));
    };
    const take = async (segment) => {
        for (;;) {
            const own = idle.get(segment.id)?.pop();
            if (own)
                return own;
            if (live < opts.jobs)
                break;
            const other = [...idle.values()].find((pages) => pages.length);
            if (other)
                await close(other.pop());
            else
                await new Promise((r) => waiting.push(r));
        }
        // Counted before any wait, so pages opening at the same time see each other.
        live++;
        try {
            return await openSegment(browser, bundle, program, segment, {
                invalidate: opts.invalidate
            });
        }
        catch (error) {
            live--;
            wake();
            throw error;
        }
    };
    const one = async (c, pages) => {
        const t0 = Date.now();
        const partial = c.file.replace(/\.mp4$/, `.partial-${process.pid}-${c.id}.mp4`);
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
                ...CHUNK_ENCODE,
                partial
            ]);
            // Every part writes into the chunk's one encode; the last one ends it.
            const shared = { write: sink.write, end: async () => { }, kill: sink.kill };
            try {
                for (const part of c.parts) {
                    const segment = program.segments.find((x) => x.id === part.segment);
                    const open = async () => {
                        const page = await take(segment);
                        mode = page.mode;
                        return {
                            // Pipe frames count from 0; the page takes program frames.
                            capture: (i) => page.capture(part.startFrame + i),
                            close: async () => {
                                if (abort.signal.aborted)
                                    return close(page);
                                idle.set(segment.id, [...(idle.get(segment.id) ?? []), page]);
                                wake();
                            }
                        };
                    };
                    await pipeFrames(part.frames, Math.min(pages, part.frames), open, shared, {
                        signal: abort.signal
                    });
                    const rest = left.get(part.segment) - 1;
                    left.set(part.segment, rest);
                    if (!rest)
                        await closeIdle(part.segment);
                }
            }
            catch (error) {
                sink.kill();
                throw error;
            }
            await sink.end();
            await fs.rename(partial, c.file);
        }
        finally {
            await fs.rm(partial, { force: true });
            untrack();
        }
        c.seconds = (Date.now() - t0) / 1000;
        opts.log(`${c.id}: frames ${span(c)} rendered in ${c.seconds.toFixed(1)} s (${(c.frames / c.seconds).toFixed(1)} fps)`);
    };
    let failed = null;
    const guard = (work) => work.catch((error) => {
        failed ??= error;
        abort.abort(error);
    });
    // Whole chunks per page only pay off when they balance: one long chunk on one page while
    // the others idle is slower than sharing its frames (measured: 22.6 s against 15.9 s).
    const total = todo.reduce((sum, s) => sum + s.frames, 0);
    const balanced = Math.max(...todo.map((s) => s.frames)) <= (1.5 * total) / opts.jobs;
    const whole = opts.schedule === 'segments' ||
        (opts.schedule === 'auto' && todo.length >= opts.jobs && balanced);
    try {
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
    }
    finally {
        await Promise.all([...idle.keys()].map(closeIdle));
    }
    if (failed)
        throw failed;
    return mode;
}
/**
 * Joins the encoded chunks in order by stream copy (the concat demuxer: no decode, no encode)
 * and muxes the encoded program audio (copied as it is). Writes beside the target and replaces
 * it only on success.
 */
async function join(program, chunks, file, audio) {
    const list = path.join(path.dirname(chunks[0].file), `.concat-${process.pid}-${Date.now()}.txt`);
    const partial = path.join(path.dirname(file), `.${path.basename(file, '.mp4')}.partial-${process.pid}.mp4`);
    const untrack = [trackPartial(list), trackPartial(partial)];
    await fs.writeFile(list, chunks.map((s) => `file '${s.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
    const seconds = program.frames / program.fps;
    try {
        await run([
            '-y',
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            list,
            // The audio as encoded and measured before: copied, never encoded twice.
            ...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a'] : ['-map', '0:v']),
            '-c',
            'copy',
            // A hard end: the sound must never run past the picture.
            '-t',
            seconds.toFixed(6),
            '-movflags',
            '+faststart',
            partial
        ]);
        await fs.rename(partial, file);
    }
    finally {
        await fs.rm(list, { force: true });
        await fs.rm(partial, { force: true });
        for (const done of untrack)
            done();
    }
}
// ---------------------------------------------------------------- cache housekeeping
/** Milliseconds a file time may lag the clock it is compared with (see `pruneSegments`). */
const MTIME_SLACK = 100;
/**
 * Keeps the intermediates some render of a project in this folder still uses. Each project (and
 * each of its excerpts) and format records the files of its latest render
 * (`<project>[.<excerpt>].<format>.json`); an intermediate no
 * record names (an edited segment, an older engine) is removed, unless it is newer than this
 * render's start (another render in the folder may still be writing its record). File times
 * come from a coarse kernel clock, up to a few milliseconds behind `Date.now()`: a file written
 * right after the start can look older than it, so "newer" allows `MTIME_SLACK` of that.
 */
async function pruneChunks(cacheDir, name, format, chunks, since) {
    await fs.writeFile(path.join(cacheDir, `${name}.${format}.json`), JSON.stringify({ files: chunks.map((s) => path.basename(s.file)) }, null, 2) + '\n');
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
        // Chunks of earlier versions were lossless .mkv files: no record names them any more.
        .filter((n) => /^[0-9a-f]{40}-[0-9a-f]{12}\.(?:mkv|mp4)$/.test(n) && !used.has(n))
        .map(async (n) => {
        const st = await fs.stat(path.join(cacheDir, n)).catch(() => null);
        if (st && st.mtimeMs < since - MTIME_SLACK)
            await fs.rm(path.join(cacheDir, n), { force: true });
    }));
}
let ffmpegId = null;
/** The first line of `ffmpeg -version`: another build may encode the same frames differently. */
function ffmpegVersion() {
    ffmpegId ??= new Promise((resolve) => {
        const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'], {
            stdio: ['ignore', 'pipe', 'ignore']
        });
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.on('error', () => resolve('ffmpeg:-'));
        p.on('close', () => resolve(out.split('\n')[0] || 'ffmpeg:-'));
    });
    return ffmpegId;
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
