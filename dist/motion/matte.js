import fs from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { probeVideo } from './node.js';
import { MATTE_PLAN, rangesFileOf } from './matte-use.js';
import { removeOrphans } from './partials.js';
/** One API call; uploads and downloads get longer. */
const HTTP_TIMEOUT_MS = 60 * 1000;
const TRANSFER_TIMEOUT_MS = 10 * 60 * 1000;
/** A request still queued or running after this long is abandoned. */
const FAL_REQUEST_TIMEOUT_MS = 20 * 60 * 1000;
const FAL_ENDPOINT = 'fal-ai/birefnet/v2/video';
/**
 * BiRefNet v2 on fal.ai (`FAL_KEY`). `Matting` keeps hair and microphones; `Portrait` is tuned
 * for people. The API accepts at most 512 frames per request.
 */
export function falBiRefNet(opts = {}) {
    const key = opts.key ?? process.env.FAL_KEY;
    if (!key)
        throw new Error('FAL_KEY is not set. Get a key at https://fal.ai/dashboard/keys.');
    const doFetch = opts.fetch ?? fetch;
    const model = opts.model ?? 'Matting';
    async function json(url, init = {}) {
        const response = await doFetch(url, {
            signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
            ...init,
            headers: {
                Authorization: `Key ${key}`,
                'Content-Type': 'application/json',
                ...(init.headers ?? {})
            }
        });
        const text = await response.text();
        if (!response.ok)
            throw new Error(`fal.ai ${response.status} for ${url}: ${text.slice(0, 500)}`);
        return text ? JSON.parse(text) : {};
    }
    async function upload(file) {
        const { upload_url: uploadUrl, file_url: fileUrl } = await json('https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3', {
            method: 'POST',
            body: JSON.stringify({ content_type: 'video/mp4', file_name: path.basename(file) })
        });
        const put = await doFetch(uploadUrl, {
            signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS),
            method: 'PUT',
            body: new Uint8Array(await fs.readFile(file)),
            headers: { 'Content-Type': 'video/mp4' }
        });
        if (!put.ok)
            throw new Error(`fal.ai upload failed: ${put.status} ${await put.text()}`);
        return fileUrl;
    }
    return {
        name: `fal.ai BiRefNet v2 (${model})`,
        id: `fal-birefnet-v2:${model}:${opts.resolution ?? '1024x1024'}`,
        maxFrames: 512,
        parallel: 3,
        output: 'luma',
        recurrent: false,
        async segment(chunk) {
            const queued = await json(`https://queue.fal.run/${FAL_ENDPOINT}`, {
                method: 'POST',
                body: JSON.stringify({
                    video_url: await upload(chunk.input),
                    model,
                    operating_resolution: opts.resolution ?? '1024x1024',
                    output_mask: true,
                    refine_foreground: false,
                    video_output_type: 'X264 (.mp4)',
                    video_quality: 'maximum'
                })
            });
            const deadline = Date.now() + FAL_REQUEST_TIMEOUT_MS;
            for (;;) {
                if (Date.now() > deadline)
                    throw new Error(`fal.ai request ${queued.request_id} did not finish within 20 minutes.`);
                const status = await json(queued.status_url);
                if (status.status === 'COMPLETED')
                    break;
                if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS')
                    throw new Error(`fal.ai request ${queued.request_id} ended as ${status.status}.`);
                await new Promise((r) => setTimeout(r, 2000));
            }
            const result = await json(queued.response_url);
            const maskUrl = result.mask_video?.url;
            if (!maskUrl)
                throw new Error(`fal.ai returned no mask for frames ${chunk.first}–${chunk.last}.`);
            const response = await doFetch(maskUrl, {
                signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS)
            });
            if (!response.ok)
                throw new Error(`Mask download failed: ${response.status}`);
            await fs.writeFile(chunk.output, Buffer.from(await response.arrayBuffer()));
        }
    };
}
/**
 * Runs any local tool once per piece. `template` is a shell command with placeholders:
 * `{input}`, `{output}` (paths), `{fps}`, `{width}`, `{height}`, `{frames}`.
 * The tool must write a video to `{output}`: greyscale with white = subject (`output: 'luma'`)
 * or a video with transparency (`output: 'alpha'`; set `extension` to `.webm` for VP9).
 *
 *   commandMatte('python rvm.py --in {input} --out {output}')
 */
export function commandMatte(template, opts = {}) {
    if (!template.includes('{input}') || !template.includes('{output}'))
        throw new Error('The matte command needs {input} and {output} placeholders.');
    if (opts.output && opts.output !== 'luma' && opts.output !== 'alpha')
        throw new Error(`Matte output must be "luma" or "alpha", got "${opts.output}".`);
    const windows = process.platform === 'win32';
    // Paths reach the shell as environment variables, expanded once and never parsed again,
    // so quotes, spaces, `$` or `%` in a path cannot break or extend the command.
    const variable = (name) => (windows ? `"%${name}%"` : `"$${name}"`);
    return {
        name: `command: ${template}`,
        id: `command:${opts.output ?? 'luma'}:${opts.extension ?? ''}:${template}`,
        maxFrames: opts.maxFrames ?? Number.POSITIVE_INFINITY,
        parallel: opts.parallel ?? 1,
        output: opts.output ?? 'luma',
        extension: opts.extension,
        recurrent: opts.recurrent ?? true,
        async segment(chunk) {
            const command = template.replace(/\{(input|output|fps|width|height|frames)\}/g, (_, key) => key === 'input'
                ? variable('VF_MATTE_INPUT')
                : key === 'output'
                    ? variable('VF_MATTE_OUTPUT')
                    : String(chunk[key]));
            await run(windows ? process.env.ComSpec || 'cmd.exe' : 'sh', windows ? ['/d', '/s', '/c', `"${command}"`] : ['-c', command], 'Matte command', {
                env: { ...process.env, VF_MATTE_INPUT: chunk.input, VF_MATTE_OUTPUT: chunk.output },
                windowsVerbatimArguments: windows
            });
        }
    };
}
/** `scripts/<name>` of this package, found from dist/ (published) or src/ (tests) alike. */
function bundledScript(name) {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 5; i++) {
        const candidate = path.join(dir, 'scripts', name);
        if (existsSync(candidate))
            return candidate;
        dir = path.dirname(dir);
    }
    throw new Error(`Bundled script scripts/${name} not found next to the visualfries package.`);
}
/**
 * Local matte with RobustVideoMatting (mobilenetv3) on the CPU: no API key, no account, temporally
 * stable. Runs the bundled `scripts/rvm-matte.py` through `uv`, which brings Python, torch,
 * torchvision and numpy on first use (current CPU wheels); the model code (v1.0.0 tag) and the
 * weights (its GitHub release, SHA-256 checked) are fetched once into torch.hub's cache.
 * Needs `uv` and `ffmpeg`, and network on the first run.
 * About 3 fps at 1080p and 16 fps at 540p on a 12-core server. RVM is recurrent, so long chunks keep
 * it stable; 480 frames per chunk by default.
 */
export function rvmMatte(opts = {}) {
    const script = opts.script ?? bundledScript('rvm-matte.py');
    const threads = Math.max(1, Math.round(opts.threads ?? Math.min(10, os.cpus().length)));
    const uv = opts.uv ?? 'uv';
    return {
        name: `rvm (local CPU, ${threads} threads)`,
        id: 'rvm:mobilenetv3:v1.0.0',
        maxFrames: opts.maxFrames ?? 480,
        parallel: 1,
        output: 'luma',
        recurrent: true,
        async segment(chunk) {
            // No shell: the script path and the chunk paths are passed as plain arguments.
            await runUv(uv, [...uvArgs(script), chunk.input, chunk.output, String(threads)], 'RVM matte');
        },
        async segmentMany(chunks, onPiece) {
            // One process, the model loaded once; the script starts each piece afresh and says
            // when each one is written, so it is kept even when the run is stopped later.
            const pairs = chunks.flatMap((c) => [c.input, c.output]);
            await runUv(uv, [...uvArgs(script), '--batch', String(threads), ...pairs], 'RVM matte', (line) => {
                const done = /^VF_PIECE_DONE (\d+)$/.exec(line.trim());
                if (done)
                    onPiece?.(Number(done[1]));
            });
        }
    };
}
/** `uv run` arguments up to the script for the bundled RVM script. */
function uvArgs(script) {
    return [
        'run',
        '-q',
        // Never pick up a pyproject.toml or uv.toml from the folder the video sits in.
        '--no-project',
        '--no-config',
        '--index',
        'https://download.pytorch.org/whl/cpu',
        '--index-strategy',
        'unsafe-best-match',
        '--with',
        'torch',
        '--with',
        'torchvision',
        '--with',
        'numpy',
        'python',
        script
    ];
}
async function runUv(uv, args, label, onLine) {
    try {
        await run(uv, args, label, {}, onLine);
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
        throw new Error(`${label}: uv not found ("${uv}"). Install uv (https://docs.astral.sh/uv/) or use --provider fal (fal.ai, FAL_KEY).`);
    }
}
/**
 * Which provider `visualfries matte` uses: the one named, else `command` when a command is given,
 * `fal` when a fal-only option (model, resolution) is given, else local `rvm`.
 */
export function matteProviderName(flags) {
    if (flags.provider)
        return flags.provider;
    if (flags.command)
        return 'command';
    if (flags.model || flags.resolution)
        return 'fal';
    return 'rvm';
}
/** The provider the flags of `visualfries matte` ask for (see `matteProviderName`). */
export function matteProviderFromFlags(flags) {
    const name = matteProviderName(flags);
    if (name === 'fal')
        return falBiRefNet({
            model: flags.model,
            resolution: flags.resolution
        });
    if (name === 'rvm')
        return rvmMatte({ threads: flags.threads, maxFrames: flags.maxFrames });
    if (name !== 'command')
        throw new Error(`Unknown matte provider "${name}". Use rvm, fal or command.`);
    if (!flags.command)
        throw new Error('--provider command needs --command "tool {input} {output}".');
    return commandMatte(flags.command, {
        output: (flags.commandOutput ?? 'luma'),
        extension: flags.commandExt,
        maxFrames: flags.maxFrames,
        parallel: flags.jobs
    });
}
const REMOVED_FAL_OPTIONS = ['model', 'resolution', 'falKey', 'fetch'];
/** Options of the old fal.ai default; without a provider they would silently run locally. */
function rejectRemovedFalOptions(opts) {
    if (opts.provider)
        return;
    const found = REMOVED_FAL_OPTIONS.filter((key) => key in opts);
    if (found.length)
        throw new Error(`createSubjectMatte no longer takes ${found.join(', ')}: the default provider is local RVM. For fal.ai pass provider: falBiRefNet({ key, model, resolution }).`);
}
/** Frame ranges `[first, last]` that cover `frames` in pieces of at most `size` (≤ `max`). */
export function planMatteChunks(frames, size, max = Number.POSITIVE_INFINITY) {
    if (!(size > 0 && size <= max))
        throw new Error(`Chunk size must be between 1 and ${max} frames, got ${size}.`);
    const chunks = [];
    for (let first = 0; first < frames; first += size)
        chunks.push({ first, last: Math.min(frames, first + size) - 1 });
    return chunks;
}
function run(cmd, args, label = cmd, options = {}, onLine) {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, {
            stdio: ['ignore', onLine ? 'pipe' : 'ignore', 'pipe'],
            ...options
        });
        let err = '';
        let out = '';
        p.stdout?.on('data', (d) => {
            out += d;
            const lines = out.split('\n');
            out = lines.pop();
            for (const line of lines)
                onLine(line);
        });
        p.stderr?.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${label} failed (${code}): ${err.slice(-600)}`)));
    });
}
const ffmpeg = (args) => run(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', ...args]);
const ALPHA_PIXEL_FORMATS = /^(yuva|rgba|bgra|argb|abgr|gbrap|ya8|ya16|pal8)/;
/**
 * Throws unless the mask carries an alpha channel; returns the decoder arguments that keep it
 * (FFmpeg's native VP9 decoder drops the alpha of a WebM, libvpx keeps it).
 */
async function checkAlpha(file, provider) {
    const out = await new Promise((resolve, reject) => {
        const p = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'stream=codec_name,pix_fmt:stream_tags=alpha_mode',
            '-of',
            'json',
            file
        ]);
        let text = '';
        p.stdout.on('data', (d) => (text += d));
        p.on('error', reject);
        p.on('close', (code) => code === 0 ? resolve(text) : reject(new Error(`ffprobe failed for ${file}`)));
    });
    const stream = JSON.parse(out).streams?.[0] ?? {};
    const vp9Alpha = stream.codec_name === 'vp9' &&
        String(stream.tags?.alpha_mode ?? stream.tags?.ALPHA_MODE) === '1';
    if (!vp9Alpha && !ALPHA_PIXEL_FORMATS.test(String(stream.pix_fmt)))
        throw new Error(`${provider}: the mask has no alpha channel (${stream.codec_name}, ${stream.pix_fmt}). Write transparency (ProRes 4444, VP9 WebM with alpha) or use luma output.`);
    return vp9Alpha ? ['-c:v', 'libvpx-vp9'] : [];
}
/**
 * Seconds from the start of `input` (the earliest of its streams, often the sound) to its first
 * picture: an input seek counts from the former. Null when ffprobe cannot tell, and the piece
 * is then decoded from the start rather than risk a shift.
 */
async function videoLead(input) {
    const text = await new Promise((resolve) => {
        const p = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'format=start_time:stream=start_time',
            '-of',
            'json',
            input
        ]);
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.on('error', () => resolve(''));
        p.on('close', (code) => resolve(code === 0 ? out : ''));
    });
    const info = (() => {
        try {
            return JSON.parse(text);
        }
        catch {
            return null;
        }
    })();
    const video = Number(info?.streams?.[0]?.start_time);
    const start = Number(info?.format?.start_time);
    return Number.isFinite(video) && Number.isFinite(start) && video >= start ? video - start : null;
}
/** Seconds of the input decoded before a piece, so the seek lands on a keyframe before it. */
const SEEK_LEAD = 3;
/**
 * Writes frames `first`–`last` of `input` (its own frames) to `output`. A fast seek to a few
 * seconds before the frames, then `trim` by frame count from there, so a piece late in a long
 * video does not decode it from the start. The seek goes to half a frame before a frame start,
 * so the first frame kept is exactly that frame; `trim` counts the rest frame-exact.
 */
export async function extractFrames(input, fps, first, last, output) {
    let from = Math.max(0, first - Math.round(SEEK_LEAD * fps));
    // The seek counts from the file's start (often the sound's): add where the picture starts.
    const lead = from > 0 ? await videoLead(input) : 0;
    if (lead === null)
        from = 0;
    const seek = from > 0 ? ['-ss', ((lead ?? 0) + (from - 0.5) / fps).toFixed(6)] : [];
    await ffmpeg([
        ...seek,
        '-i',
        input,
        '-vf',
        `trim=start_frame=${first - from}:end_frame=${last + 1 - from},setpts=PTS-STARTPTS`,
        '-an',
        '-c:v',
        'libx264',
        '-crf',
        '12',
        '-pix_fmt',
        'yuv420p',
        output
    ]);
}
/** The mask a provider writes for chunk `i`. */
const rawMaskOf = (work, i, provider) => path.join(work, `mask-raw-${i}${provider.extension ?? (provider.output === 'alpha' ? '.mov' : '.mp4')}`);
/**
 * Checks the provider's mask of chunk `i` and rebuilds it as greyscale H.264 at the input's
 * size and rate with exactly as many frames as the chunk.
 */
async function normaliseMask(work, i, chunk, info, provider) {
    const { first, last } = chunk;
    const count = last - first + 1;
    const raw = rawMaskOf(work, i, provider);
    const extract = provider.output === 'alpha' ? 'format=rgba,alphaextract' : 'format=gray';
    const alphaDecoder = provider.output === 'alpha' ? await checkAlpha(raw, provider.name) : [];
    // Mask frame n belongs to piece frame n whatever rate or time base the provider wrote,
    // so the masks are decoded to numbered images and rebuilt at the piece's rate.
    const frameDir = path.join(work, `mask-frames-${i}`);
    await fs.mkdir(frameDir);
    await ffmpeg([
        ...alphaDecoder,
        '-i',
        raw,
        '-vf',
        `scale=${info.width}:${info.height},${extract}`,
        '-fps_mode',
        'passthrough',
        path.join(frameDir, '%06d.png')
    ]);
    const decoded = (await fs.readdir(frameDir)).filter((f) => f.endsWith('.png')).sort();
    // Up to two missing frames are normal and hold the last one; more means a wrong mask.
    if (decoded.length < count - 2 || decoded.length > count + 2)
        throw new Error(`${provider.name}: mask for frames ${first}–${last} has ${decoded.length} frames, expected ${count}.`);
    for (let n = decoded.length + 1; n <= count; n++)
        await fs.copyFile(path.join(frameDir, decoded[decoded.length - 1]), path.join(frameDir, `${String(n).padStart(6, '0')}.png`));
    const fixed = path.join(work, `mask-${i}.mp4`);
    await ffmpeg([
        '-framerate',
        String(info.fps),
        '-i',
        path.join(frameDir, '%06d.png'),
        '-frames:v',
        String(count),
        '-c:v',
        'libx264',
        '-crf',
        '10',
        '-pix_fmt',
        'yuv420p',
        fixed
    ]);
    await fs.rm(frameDir, { recursive: true, force: true });
    // The piece and the provider's mask are not needed any more.
    await fs.rm(path.join(work, `part-${i}.mp4`), { force: true });
    await fs.rm(raw, { force: true });
    return fixed;
}
/** The provider's view of chunk `i`. */
const chunkFor = (work, i, chunk, info, provider) => ({
    input: path.join(work, `part-${i}.mp4`),
    output: rawMaskOf(work, i, provider),
    index: i,
    first: chunk.first,
    last: chunk.last,
    frames: chunk.last - chunk.first + 1,
    fps: info.fps,
    width: info.width,
    height: info.height
});
/**
 * Segments frames `chunks` of `input` with the provider (in pieces at once as `jobs` allows, or
 * all in one provider run with `batch` when it has `segmentMany`) and returns each piece's
 * checked, normalised mask: greyscale H.264 at the input's size and rate, exactly as many
 * frames as the piece.
 */
async function segmentChunks(input, info, chunks, provider, work, opts) {
    if (opts.batch && provider.segmentMany && chunks.length > 1)
        return segmentBatch(input, info, chunks, provider, work, opts);
    const log = opts.onProgress ?? (() => { });
    const done = new Array(chunks.length);
    let next = 0;
    let failed = false;
    const worker = async () => {
        while (next < chunks.length && !failed) {
            const i = next++;
            const piece = chunkFor(work, i, chunks[i], info, provider);
            await extractFrames(input, info.fps, piece.first, piece.last, piece.input);
            await provider.segment(piece);
            done[i] = await normaliseMask(work, i, chunks[i], info, provider);
            await opts.onMask?.(i, done[i]);
            log(`matte: frames ${piece.first}–${piece.last} done (${i + 1}/${chunks.length})`);
        }
    };
    // The first failure stops the other workers from starting more (possibly paid) pieces;
    // the caller removes the work folder only after every worker has stopped.
    const results = await Promise.allSettled(Array.from({ length: Math.min(opts.jobs ?? provider.parallel ?? 1, chunks.length) }, () => worker().catch((error) => {
        failed = true;
        throw error;
    })));
    const rejected = results.find((r) => r.status === 'rejected');
    if (rejected)
        throw rejected.reason;
    return done;
}
/**
 * `segmentChunks` in one provider run: every piece is cut first, then segmented together. Each
 * mask is kept as soon as the provider says it is written (`onPiece`), so a run stopped later
 * keeps it; masks of a provider that does not say are taken when the run ends, also when it
 * failed on a later piece.
 */
async function segmentBatch(input, info, chunks, provider, work, opts) {
    const pieces = chunks.map((c, i) => chunkFor(work, i, c, info, provider));
    const done = new Array(chunks.length);
    const take = async (i, failed) => {
        if (done[i] || (failed && !existsSync(pieces[i].output)))
            return;
        const mask = await normaliseMask(work, i, chunks[i], info, provider).catch((error) => {
            if (!failed)
                throw error;
            return null;
        });
        if (!mask)
            return;
        done[i] = mask;
        await opts.onMask?.(i, mask);
        opts.onProgress?.(`matte: frames ${chunks[i].first}–${chunks[i].last} done (${i + 1}/${chunks.length})`);
    };
    // Runs of at most `batchPieces` pieces: the command line stays bounded and only one run's
    // pieces sit on disk at a time.
    const size = opts.batchPieces ?? BATCH_PIECES;
    for (let from = 0; from < pieces.length; from += size) {
        const group = pieces.slice(from, from + size);
        for (const p of group)
            await extractFrames(input, info.fps, p.first, p.last, p.input);
        await segmentGroup(group, from, provider, take);
    }
    return done;
}
/** Pieces in one provider run at most: a long batch is split so its arguments stay bounded. */
const BATCH_PIECES = 64;
/**
 * One `segmentMany` run over `group` (pieces `from`… of the batch). Masks are taken one after
 * another while the provider goes on; a failure to keep one is held until the run ends, so it
 * never surfaces as an unhandled rejection.
 */
async function segmentGroup(group, from, provider, take) {
    let taking = Promise.resolve();
    const run = await provider.segmentMany(group, (i) => {
        if (i < 0 || i >= group.length)
            return;
        taking = taking.then(() => take(from + i, true));
        taking.catch(() => { });
    }).then(() => null, (error) => ({ error }));
    await taking;
    for (const i of group.keys())
        await take(from + i, !!run);
    if (run)
        throw run.error;
}
/**
 * Joins mask videos into `output` at the input's rate, frame after frame (`skip` frames of the
 * first one left out), and checks the frame count.
 */
async function joinMasks(parts, output, fps, frames, work, skip = 0) {
    const list = path.join(work, `list-${randomUUID()}.txt`);
    await fs.writeFile(list, parts.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
    // Every frame gets its place by count, so pieces of any time base line up frame-exact.
    const retime = `setpts=N/(${fps}*TB)`;
    await ffmpeg([
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        list,
        '-vf',
        skip ? `trim=start_frame=${skip},${retime}` : retime,
        '-r',
        String(fps),
        '-frames:v',
        String(frames),
        '-c:v',
        'libx264',
        '-crf',
        '10',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        output
    ]);
    const out = await probeVideo(output);
    if (out.frames !== frames)
        throw new Error(`Matte has ${out.frames} frames, the input has ${frames}.`);
}
/**
 * Makes a greyscale matte video of `input` (white = subject) with a matte provider: splits the
 * video into pieces the provider accepts, checks and normalises every mask and joins them, so
 * the matte has the same size, frame rate and frame count as the input. A ranges file a partial
 * matte left at `output` (see `createRangeMatte`) is removed: this matte covers every frame.
 */
export async function createSubjectMatte(input, opts) {
    rejectRemovedFalOptions(opts);
    refuseOverwrite(input, opts.output);
    const provider = opts.provider ?? rvmMatte();
    const started = Date.now();
    const info = await constantVideo(input);
    const size = opts.chunkFrames ?? Math.min(480, provider.maxFrames, info.frames);
    const chunks = planMatteChunks(info.frames, size, provider.maxFrames);
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
    try {
        const done = await segmentChunks(input, info, chunks, provider, work, opts);
        await joinMasks(done, opts.output, info.fps, info.frames, work);
        await fs.rm(rangesFileOf(opts.output), { force: true });
        return {
            output: opts.output,
            frames: info.frames,
            fps: info.fps,
            width: info.width,
            height: info.height,
            chunks: chunks.length,
            provider: provider.name,
            seconds: (Date.now() - started) / 1000
        };
    }
    finally {
        await fs.rm(work, { recursive: true, force: true });
    }
}
/**
 * The real path of `file` with symlinks resolved: of the file when it exists, else of the
 * nearest folder above it that does, with the rest of the path as written.
 */
export function realPath(file) {
    const abs = path.resolve(file);
    try {
        return realpathSync(abs);
    }
    catch {
        const parent = path.dirname(abs);
        return parent === abs ? abs : path.join(realPath(parent), path.basename(abs));
    }
}
/** Throws when the matte would be written over the video it is made of. */
function refuseOverwrite(input, output) {
    if (realPath(input) === realPath(output))
        throw new Error(`The matte would overwrite the video it is made of (${output}). Give it another name.`);
}
/** Probes `input` and throws unless it has a constant frame rate. */
async function constantVideo(input) {
    const info = await probeVideo(input);
    if (!info.constant)
        throw new Error(`${input} has a variable frame rate. Convert it first, e.g. ffmpeg -i in.mp4 -vf fps=30 -c:a copy out.mp4.`);
    return info;
}
/** Bytes read from each end of a file for its fingerprint. */
const FINGERPRINT_BYTES = 1 << 20;
/**
 * A cheap fingerprint of a file's content: its size and a hash of its first and last MiB. It
 * survives copying and renaming, and changes when the file is replaced by another.
 */
export async function fileFingerprint(file) {
    const handle = await fs.open(file, 'r');
    try {
        const { size } = await handle.stat();
        const head = Buffer.alloc(Math.min(size, FINGERPRINT_BYTES));
        await handle.read(head, 0, head.length, 0);
        const tail = Buffer.alloc(Math.min(FINGERPRINT_BYTES, size - head.length));
        await handle.read(tail, 0, tail.length, size - tail.length);
        return createHash('sha1')
            .update(String(size))
            .update(head)
            .update(tail)
            .digest('hex')
            .slice(0, 16);
    }
    finally {
        await handle.close();
    }
}
/** Cache key of one block's mask: the input's content, the block, the warm-up and the provider. */
export function blockMaskKey(input) {
    return createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}
/** The blocks of `size` frames that hold any frame of `ranges`, in order. */
export function blocksOf(ranges, size) {
    const out = new Set();
    for (const r of ranges)
        for (let k = Math.floor(r.first / size); k <= Math.floor(r.last / size); k++)
            out.add(k);
    return [...out].sort((a, b) => a - b);
}
/** Runs of consecutive block numbers, as inclusive `{ first, last }` blocks. */
export function blockRuns(blocks) {
    const runs = [];
    for (const k of blocks) {
        const last = runs[runs.length - 1];
        if (last && k === last.last + 1)
            last.last = k;
        else
            runs.push({ first: k, last: k });
    }
    return runs;
}
/** The frames of block `k` of `size` frames in a video of `total` frames. */
const blockFramesOf = (k, size, total) => ({
    first: k * size,
    last: Math.min(total, (k + 1) * size) - 1
});
/** The pieces of a full-length matte: masks of `ranges` and the black gaps between them. */
export function matteLayout(ranges, total) {
    const out = [];
    let at = 0;
    ranges.forEach((r, i) => {
        if (r.first > at)
            out.push({ gap: r.first - at });
        out.push({ range: i });
        at = r.last + 1;
    });
    if (at < total)
        out.push({ gap: total - at });
    return out;
}
/** Throws unless `ranges` are sorted, apart, and inside `total` frames. */
function checkRanges(ranges, total) {
    let previous = -1;
    for (const r of ranges) {
        if (!(Number.isInteger(r.first) && Number.isInteger(r.last)) || r.first > r.last)
            throw new Error(`Bad matte range ${r.first}–${r.last}.`);
        if (r.first <= previous || r.last >= total)
            throw new Error(`Matte ranges must be sorted, apart and inside the video's ${total} frames; got ${r.first}–${r.last}.`);
        previous = r.last;
    }
}
/** A black greyscale video of `frames` frames (no subject). */
async function blackVideo(file, info, frames) {
    await ffmpeg([
        '-f',
        'lavfi',
        '-i',
        `color=c=black:s=${info.width}x${info.height}:r=${info.fps}`,
        '-frames:v',
        String(frames),
        '-c:v',
        'libx264',
        '-crf',
        '10',
        '-pix_fmt',
        'yuv420p',
        file
    ]);
}
/**
 * Mattes `blocks`, each on its own from `warmup` frames before it (those left out), so a block's
 * mask never depends on which blocks were matted with it or before it. Every piece is cut from
 * the input with a seek and goes to the provider in one run when it can take several
 * (`segmentMany`). Each block enters the cache as soon as its mask is ready, so a failure
 * later on keeps it.
 */
async function matteBlocks(input, info, blocks, provider, plan, opts) {
    const chunks = [];
    const pieces = blocks.map((k) => {
        const block = blockFramesOf(k, plan.size, info.frames);
        const start = Math.max(0, block.first - plan.warmup);
        const own = planMatteChunks(block.last - start + 1, plan.chunkFrames, provider.maxFrames).map((c) => ({ first: c.first + start, last: c.last + start }));
        const at = chunks.length;
        chunks.push(...own);
        return { k, block, start, chunks: own.map((_, j) => at + j) };
    });
    const pieceOf = new Map(pieces.flatMap((p) => p.chunks.map((i) => [i, p])));
    const masks = [];
    // The work folder sits next to the cache (not in a small temporary file system); folders a
    // killed run left are removed first.
    const tmpRoot = path.join(plan.dirname, 'tmp');
    await removeOrphans(tmpRoot, ORPHAN_WORK);
    const work = path.join(tmpRoot, `run.tmp-${process.pid}-${randomUUID()}`);
    await fs.mkdir(work, { recursive: true });
    try {
        const onMask = async (i, file) => {
            masks[i] = file;
            const p = pieceOf.get(i);
            if (!p.chunks.every((j) => masks[j]))
                return;
            const own = p.chunks.map((j) => masks[j]);
            const tmp = `${plan.file(p.k)}.tmp-${process.pid}-${randomUUID()}.mp4`;
            const frames = p.block.last - p.block.first + 1;
            await joinMasks(own, tmp, info.fps, frames, work, p.block.first - p.start);
            await fs.rename(tmp, plan.file(p.k));
            for (const mask of own)
                await fs.rm(mask, { force: true });
        };
        await segmentChunks(input, info, chunks, provider, work, { ...opts, onMask, batch: true });
    }
    finally {
        await fs.rm(work, { recursive: true, force: true });
        await fs.rmdir(tmpRoot).catch(() => { });
    }
}
/** Work folders of matte runs (`run.tmp-<pid>-<uuid>`), removed once their process is gone. */
const ORPHAN_WORK = /\.tmp-(\d+)-[0-9a-f-]{36}$/;
/**
 * Makes a full-length matte of `input` that covers `ranges` in whole blocks (black, no subject,
 * elsewhere) and writes its ranges file next to it (see `MatteRangesFile`), so `check` and
 * `render` know which frames it covers. Each block's mask is cached in `cacheDir`: running it
 * again after an edit mattes only new blocks, and leaves a matte that would not change alone.
 * The matte and its ranges file are published by renaming, the ranges file first and naming
 * the new matte's fingerprint, so a run stopped half way never passes for another matte.
 */
export async function createRangeMatte(input, opts) {
    rejectRemovedFalOptions(opts);
    refuseOverwrite(input, opts.output);
    const provider = opts.provider ?? rvmMatte();
    const started = Date.now();
    const info = await constantVideo(input);
    checkRanges(opts.ranges, info.frames);
    const source = await fileFingerprint(input);
    const size = opts.blockFrames ?? Math.round(MATTE_PLAN.block * info.fps);
    if (!(Number.isInteger(size) && size > 0))
        throw new Error(`The block size must be a whole number of frames above 0, got ${size}.`);
    // A model that segments every frame on its own needs no warm-up (nor pays for one).
    const warmup = opts.warmup ?? (provider.recurrent === false ? 0 : Math.round(MATTE_PLAN.warmup * info.fps));
    const chunkFrames = opts.chunkFrames ?? Math.min(480, provider.maxFrames);
    const blocks = blocksOf(opts.ranges, size);
    const keyOf = (block) => blockMaskKey({
        source,
        frames: info.frames,
        fps: info.fps,
        // 2: each block matted on its own from its warm-up (earlier caches matted runs).
        version: 2,
        block,
        blockFrames: size,
        warmup,
        provider: provider.id ?? provider.name,
        chunkFrames
    });
    const plan = {
        size,
        warmup,
        chunkFrames,
        dirname: opts.cacheDir,
        file: (k) => path.join(opts.cacheDir, `${keyOf(k)}.mp4`)
    };
    const covered = blockRuns(blocks).map((run) => ({
        first: blockFramesOf(run.first, size, info.frames).first,
        last: blockFramesOf(run.last, size, info.frames).last
    }));
    const key = createHash('sha1')
        .update(JSON.stringify({ blocks: blocks.map(keyOf), frames: info.frames, source }))
        .digest('hex')
        .slice(0, 16);
    const result = (matted, written) => ({
        output: opts.output,
        frames: info.frames,
        fps: info.fps,
        width: info.width,
        height: info.height,
        chunks: blocks.length,
        provider: provider.name,
        seconds: (Date.now() - started) / 1000,
        covered: covered.reduce((n, r) => n + r.last - r.first + 1, 0),
        matted,
        ranges: covered,
        written
    });
    if (await upToDate(opts.output, key))
        return result(0, false);
    const missing = blocks.filter((k) => !existsSync(plan.file(k)));
    if (missing.length)
        await matteBlocks(input, info, missing, provider, plan, opts);
    const matted = missing.reduce((n, k) => {
        const b = blockFramesOf(k, size, info.frames);
        return n + b.last - b.first + 1;
    }, 0);
    const masks = blockRuns(blocks).map((run) => Array.from({ length: run.last - run.first + 1 }, (_, i) => plan.file(run.first + i)));
    await publishMatte(info, masks, covered, opts.output, {
        version: 2,
        source: { file: path.basename(input), fingerprint: source, frames: info.frames, fps: info.fps },
        matte: { fingerprint: '' },
        ranges: covered.map((r) => [r.first, r.last]),
        provider: provider.name,
        key
    });
    return result(matted, true);
}
/**
 * Joins the block masks and black gaps into the full-length matte next to `output`, then
 * publishes it: the ranges file (naming the new matte's fingerprint) is renamed into place
 * first, the matte second, so a run stopped between the two leaves a ranges file that the
 * matte present does not match (an error, never a silent black matte).
 */
async function publishMatte(info, masks, covered, output, file) {
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
    const tag = `tmp-${process.pid}-${randomUUID()}`;
    const tmpMatte = `${output}.${tag}${path.extname(output) || '.mp4'}`;
    const tmpRanges = `${rangesFileOf(output)}.${tag}`;
    try {
        const pieces = [];
        for (const [n, piece] of matteLayout(covered, info.frames).entries()) {
            if ('gap' in piece) {
                const gap = path.join(work, `gap-${n}.mp4`);
                await blackVideo(gap, info, piece.gap);
                pieces.push(gap);
                continue;
            }
            // A covered run is its blocks, in order.
            pieces.push(...masks[piece.range]);
        }
        const joined = path.join(work, `matte${path.extname(output) || '.mp4'}`);
        await joinMasks(pieces, joined, info.fps, info.frames, work);
        await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
        await fs.copyFile(joined, tmpMatte);
        const written = { ...file, matte: { fingerprint: await fileFingerprint(tmpMatte) } };
        await fs.writeFile(tmpRanges, JSON.stringify(written, null, '\t') + '\n');
        await fs.rename(tmpRanges, rangesFileOf(output));
        await fs.rename(tmpMatte, output);
    }
    finally {
        await fs.rm(work, { recursive: true, force: true });
        await fs.rm(tmpMatte, { force: true });
        await fs.rm(tmpRanges, { force: true });
    }
}
/** Whether the matte at `output` is the one its ranges file says `key` made, unchanged. */
async function upToDate(output, key) {
    const file = await fs
        .readFile(rangesFileOf(output), 'utf8')
        .then((text) => JSON.parse(text))
        .catch(() => null);
    if (!file || file.key !== key || !existsSync(output))
        return false;
    return file.matte?.fingerprint === (await fileFingerprint(output));
}
