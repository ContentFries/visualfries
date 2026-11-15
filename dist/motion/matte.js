import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { probeVideo } from './node.js';
import { MATTE_PLAN, rangesFileOf } from './matte-use.js';
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
        async segment(chunk) {
            // No shell: the script path and the chunk paths are passed as plain arguments.
            await runUv(uv, [
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
                script,
                chunk.input,
                chunk.output,
                String(threads)
            ], 'RVM matte');
        }
    };
}
async function runUv(uv, args, label) {
    try {
        await run(uv, args, label);
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
function run(cmd, args, label = cmd, options = {}) {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'], ...options });
        let err = '';
        p.stderr.on('data', (d) => (err += d));
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
 * Segments frames `chunks` of `input` with the provider (in pieces at once as `jobs` allows) and
 * returns each piece's checked, normalised mask: greyscale H.264 at the input's size and rate,
 * exactly as many frames as the piece.
 */
async function segmentChunks(input, info, chunks, provider, work, opts) {
    const log = opts.onProgress ?? (() => { });
    const extract = provider.output === 'alpha' ? 'format=rgba,alphaextract' : 'format=gray';
    const done = new Array(chunks.length);
    let next = 0;
    let failed = false;
    const worker = async () => {
        while (next < chunks.length && !failed) {
            const i = next++;
            const { first, last } = chunks[i];
            const count = last - first + 1;
            const part = path.join(work, `part-${i}.mp4`);
            await ffmpeg([
                '-i',
                input,
                '-vf',
                `trim=start_frame=${first}:end_frame=${last + 1},setpts=PTS-STARTPTS`,
                '-an',
                '-c:v',
                'libx264',
                '-crf',
                '12',
                '-pix_fmt',
                'yuv420p',
                part
            ]);
            const raw = path.join(work, `mask-raw-${i}${provider.extension ?? (provider.output === 'alpha' ? '.mov' : '.mp4')}`);
            await provider.segment({
                input: part,
                output: raw,
                index: i,
                first,
                last,
                frames: count,
                fps: info.fps,
                width: info.width,
                height: info.height
            });
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
            done[i] = fixed;
            log(`matte: frames ${first}–${last} done (${i + 1}/${chunks.length})`);
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
/** Probes `input` and throws unless it has a constant frame rate. */
async function constantVideo(input) {
    const info = await probeVideo(input);
    if (!info.constant)
        throw new Error(`${input} has a variable frame rate. Convert it first, e.g. ffmpeg -i in.mp4 -vf fps=30 -c:a copy out.mp4.`);
    return info;
}
/** Cache key of one range's mask: the input file, the range, the warm-up and the provider. */
export function rangeMaskKey(input) {
    return createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}
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
 * The mask of one range from the cache, or matted now (from `warmup` frames earlier, those
 * left out) and kept there. Returns the file and whether it was matted now.
 */
async function rangeMask(input, info, range, key, provider, opts) {
    const file = path.join(opts.cacheDir, `${key}.mp4`);
    if (existsSync(file))
        return { file, matted: false };
    const start = Math.max(0, range.first - opts.warmup);
    const chunks = planMatteChunks(range.last - start + 1, opts.chunkFrames, provider.maxFrames).map((c) => ({ first: c.first + start, last: c.last + start }));
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
    try {
        const parts = await segmentChunks(input, info, chunks, provider, work, opts);
        const tmp = path.join(work, 'range.mp4');
        await joinMasks(parts, tmp, info.fps, range.last - range.first + 1, work, range.first - start);
        await fs.mkdir(opts.cacheDir, { recursive: true });
        await fs.copyFile(tmp, `${file}.tmp-${process.pid}`);
        await fs.rename(`${file}.tmp-${process.pid}`, file);
        return { file, matted: true };
    }
    finally {
        await fs.rm(work, { recursive: true, force: true });
    }
}
/**
 * Makes a full-length matte of `input` that covers only `ranges` (black, no subject, elsewhere)
 * and writes its ranges file next to it (see `MatteRangesFile`), so `check` and `render` know
 * which frames it covers. Each range's mask is cached in `cacheDir`: running it again after an
 * edit mattes only new or changed ranges, and leaves a matte that would not change alone.
 */
export async function createRangeMatte(input, opts) {
    rejectRemovedFalOptions(opts);
    const provider = opts.provider ?? rvmMatte();
    const started = Date.now();
    const info = await constantVideo(input);
    checkRanges(opts.ranges, info.frames);
    const warmup = opts.warmup ?? Math.round(MATTE_PLAN.warmup * info.fps);
    const chunkFrames = opts.chunkFrames ?? Math.min(480, provider.maxFrames);
    const stat = await fs.stat(input);
    const keys = opts.ranges.map((range) => rangeMaskKey({
        file: path.basename(input),
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        frames: info.frames,
        fps: info.fps,
        range,
        warmup,
        provider: provider.id ?? provider.name,
        chunkFrames
    }));
    const key = createHash('sha1')
        .update(JSON.stringify({ keys, frames: info.frames }))
        .digest('hex')
        .slice(0, 16);
    const covered = opts.ranges.reduce((n, r) => n + r.last - r.first + 1, 0);
    const result = (matted, written) => ({
        output: opts.output,
        frames: info.frames,
        fps: info.fps,
        width: info.width,
        height: info.height,
        chunks: opts.ranges.length,
        provider: provider.name,
        seconds: (Date.now() - started) / 1000,
        covered,
        matted,
        ranges: opts.ranges.map((r) => ({ ...r })),
        written
    });
    if (await upToDate(opts.output, key))
        return result(0, false);
    const settings = { ...opts, warmup, chunkFrames };
    let matted = 0;
    const masks = [];
    for (const [i, range] of opts.ranges.entries()) {
        const mask = await rangeMask(input, info, range, keys[i], provider, settings);
        if (mask.matted)
            matted += range.last - range.first + 1;
        masks.push(mask.file);
    }
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
    try {
        const pieces = [];
        for (const [n, piece] of matteLayout(opts.ranges, info.frames).entries()) {
            if ('range' in piece) {
                pieces.push(masks[piece.range]);
                continue;
            }
            const gap = path.join(work, `gap-${n}.mp4`);
            await blackVideo(gap, info, piece.gap);
            pieces.push(gap);
        }
        const tmp = path.join(work, `matte${path.extname(opts.output) || '.mp4'}`);
        await joinMasks(pieces, tmp, info.fps, info.frames, work);
        await fs.mkdir(path.dirname(path.resolve(opts.output)), { recursive: true });
        await fs.copyFile(tmp, opts.output);
    }
    finally {
        await fs.rm(work, { recursive: true, force: true });
    }
    const file = {
        version: 1,
        source: {
            file: path.basename(input),
            size: stat.size,
            frames: info.frames,
            fps: info.fps
        },
        matte: { size: (await fs.stat(opts.output)).size },
        ranges: opts.ranges.map((r) => [r.first, r.last]),
        provider: provider.name,
        key
    };
    await fs.writeFile(rangesFileOf(opts.output), JSON.stringify(file, null, '\t') + '\n');
    return result(matted, true);
}
/** Whether the matte at `output` is the one its ranges file says `key` made, unchanged. */
async function upToDate(output, key) {
    const file = await fs
        .readFile(rangesFileOf(output), 'utf8')
        .then((text) => JSON.parse(text))
        .catch(() => null);
    const stat = await fs.stat(output).catch(() => null);
    return !!file && !!stat && file.key === key && file.matte?.size === stat.size;
}
