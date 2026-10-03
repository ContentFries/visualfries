import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MotionProjectShape } from './project.js';
import { parseTranscriptWords } from './transcript.js';
import { resolveMotionProject } from './resolve.js';
import { resolveMoment } from './moment.js';
import { footageFrameRange } from './footage.js';
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROMIUM_FLAGS = ['--enable-blink-features=CanvasDrawElement', '--font-render-hinting=none'];
/**
 * Pages load the bundle, fonts, styles and footage frames from this one origin (served by
 * Playwright from disk): HTML-in-Canvas leaves cross-origin images, such as file:// frames,
 * out of the captured frame.
 */
const ORIGIN = 'http://visualfries.local';
const originUrl = (abs) => `${ORIGIN}/@fs${pathToFileURL(abs).pathname}`;
/** `transcript` overrides the project's transcript (e.g. a re-recorded voiceover); relative to cwd. */
export async function loadMotionProject(file, opts = {}) {
    const abs = path.resolve(file);
    const dir = path.dirname(abs);
    const project = MotionProjectShape.parse(JSON.parse(await fs.readFile(abs, 'utf8')));
    const transcriptPath = opts.transcript
        ? path.resolve(opts.transcript)
        : project.transcript
            ? path.resolve(dir, project.transcript)
            : null;
    const words = transcriptPath
        ? parseTranscriptWords(JSON.parse(await fs.readFile(transcriptPath, 'utf8')))
        : null;
    const transcriptHash = words
        ? createHash('sha1')
            .update(JSON.stringify(words.map((w) => [w.raw, w.start, w.end])))
            .digest('hex')
            .slice(0, 12)
        : null;
    return {
        file: abs,
        dir,
        project,
        words,
        transcriptHash,
        resolved: resolveMotionProject(project, words)
    };
}
/** Throws when a requested clip id does not exist in the project. */
export function assertKnownClips(loaded, clipIds) {
    const known = loaded.project.clips.map((c) => c.id);
    const unknown = (clipIds ?? []).filter((id) => !known.includes(id));
    if (unknown.length) {
        throw new Error(`Unknown clip ${unknown.map((id) => `"${id}"`).join(', ')}. Clips: ${known.join(', ')}`);
    }
}
/** Throws on errors of the given clips (all clips when omitted), including clips that failed to resolve. */
export function assertNoErrors(loaded, clipIds) {
    const errors = loaded.resolved.diagnostics.filter((d) => d.level === 'error' && (!clipIds || !d.clip || clipIds.includes(d.clip)));
    const known = new Set([...loaded.project.clips.map((c) => c.id)]);
    for (const id of clipIds ?? []) {
        if (!known.has(id))
            errors.push({
                level: 'error',
                clip: id,
                field: 'id',
                message: `Unknown clip. Clips: ${[...known].join(', ')}`
            });
    }
    if (errors.length) {
        throw new Error('Project has errors:\n' +
            errors.map((e) => `  ${e.clip ?? '-'} ${e.field}: ${e.message}`).join('\n'));
    }
}
const BUILTIN_PREFIX = '@visualfries/';
/** Blocks that ship with VisualFries; a clip names them as `"block": "@visualfries/captions"`. */
const BUILTIN_BLOCKS = {
    captions: 'Captions.svelte',
    'speaker-depth': 'SpeakerDepth.svelte'
};
function blockFile(dir, block) {
    if (!block.startsWith(BUILTIN_PREFIX))
        return path.resolve(dir, block);
    const file = BUILTIN_BLOCKS[block.slice(BUILTIN_PREFIX.length)];
    return file ? path.join(HERE, 'blocks', file) : path.join(HERE, 'blocks', '__missing__');
}
/** Compile the project's blocks together with the stage runtime into one page. */
export async function bundleMotionProject(loaded, clips) {
    const esbuild = await import('esbuild');
    const { compile, compileModule } = await import('svelte/compiler');
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-motion-'));
    const stageModule = path.join(HERE, 'stage.js');
    const motionIndex = path.join(HERE, 'index.js');
    // Blocks may import anything VisualFries depends on (svelte, gsap) without their own node_modules.
    const packageRoot = path.resolve(HERE, '..', '..');
    const nodePaths = [
        path.join(packageRoot, 'node_modules'),
        path.resolve(path.dirname(require.resolve('svelte/package.json')), '..'),
        path.resolve(path.dirname(require.resolve('gsap/package.json')), '..')
    ];
    const blocks = [...new Set(clips.map((c) => c.block))];
    for (const block of blocks) {
        if (!existsSync(blockFile(loaded.dir, block)))
            throw new Error(block.startsWith(BUILTIN_PREFIX)
                ? `Unknown built-in block "${block}". Built-in blocks: ${Object.keys(BUILTIN_BLOCKS)
                    .map((b) => BUILTIN_PREFIX + b)
                    .join(', ')}.`
                : `Block file not found: ${block}`);
    }
    const entry = [
        `import { createMotionStage } from ${JSON.stringify(stageModule)};`,
        ...blocks.map((b, i) => `import B${i} from ${JSON.stringify(blockFile(loaded.dir, b))};`),
        `window.__vfMotionStage = createMotionStage({ blocks: { ${blocks
            .map((b, i) => `${JSON.stringify(b)}: B${i}`)
            .join(', ')} }, fonts: window.__vfFonts, css: window.__vfCss, invalidate: window.__vfInvalidate });`
    ].join('\n');
    await esbuild.build({
        stdin: { contents: entry, resolveDir: loaded.dir, sourcefile: 'motion-entry.js', loader: 'js' },
        bundle: true,
        format: 'iife',
        outfile: path.join(outDir, 'bundle.js'),
        nodePaths,
        conditions: ['svelte', 'browser'],
        mainFields: ['svelte', 'browser', 'module', 'main'],
        logLevel: 'silent',
        loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'text' },
        plugins: [
            {
                name: 'visualfries-motion',
                setup(build) {
                    build.onResolve({ filter: /^visualfries\/motion$/ }, () => ({ path: motionIndex }));
                    build.onLoad({ filter: /\.svelte$/ }, async (args) => {
                        const source = await fs.readFile(args.path, 'utf8');
                        const out = compile(source, {
                            filename: args.path,
                            generate: 'client',
                            css: 'injected',
                            dev: false
                        });
                        return { contents: out.js.code, loader: 'js', resolveDir: path.dirname(args.path) };
                    });
                    build.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async (args) => {
                        let source = await fs.readFile(args.path, 'utf8');
                        if (args.path.endsWith('.ts'))
                            source = (await esbuild.transform(source, { loader: 'ts' })).code;
                        const out = compileModule(source, {
                            filename: args.path,
                            generate: 'client',
                            dev: false
                        });
                        return { contents: out.js.code, loader: 'js', resolveDir: path.dirname(args.path) };
                    });
                }
            }
        ]
    });
    const roots = [outDir];
    const files = [];
    const fonts = (loaded.project.fonts ?? []).map((f) => {
        const abs = path.resolve(loaded.dir, f.src);
        files.push(abs);
        return { family: f.family, url: originUrl(abs), weight: f.weight, style: f.style };
    });
    let css = '';
    for (const file of loaded.project.styles ?? []) {
        const abs = path.resolve(loaded.dir, file);
        css += rebaseCssUrls(await fs.readFile(abs, 'utf8'), path.dirname(abs), files) + '\n';
    }
    roots.push(...(await prepareFootage(loaded, clips)));
    const cssBundle = path.join(outDir, 'bundle.css');
    const cssLink = existsSync(cssBundle) ? '<link rel="stylesheet" href="bundle.css">' : '';
    const html = path.join(outDir, 'index.html');
    await fs.writeFile(html, `<!doctype html><meta charset="utf-8">${cssLink}<script>window.__vfFonts=${JSON.stringify(fonts)};window.__vfCss=${JSON.stringify(css)};window.__vfInvalidate=new URLSearchParams(location.search).get('invalidate')||undefined;</script><body><script src="bundle.js"></script></body>`);
    return { dir: outDir, html, roots, files };
}
/** Project CSS is inlined into a page elsewhere; make its relative url(...) absolute. */
function rebaseCssUrls(css, dir, files) {
    return css.replace(/url\((\s*['"]?)([^'")]+)(['"]?\s*)\)/g, (all, open, ref, close) => {
        if (/^(data:|https?:|#)/.test(ref))
            return all;
        // Keep `#fragment` and `?query` (SVG filters and masks point into a file).
        const cut = ref.search(/[?#]/);
        const file = cut === -1 ? ref : ref.slice(0, cut);
        const suffix = cut === -1 ? '' : ref.slice(cut);
        const abs = file.startsWith('file:') ? fileURLToPath(file) : path.resolve(dir, file);
        files.push(abs);
        return `url(${open}${originUrl(abs)}${suffix}${close})`;
    });
}
// ---------------------------------------------------------------- browser
export function findChromium() {
    // Same order as `visualfries doctor`; without a match Playwright uses its own build.
    const candidates = [
        process.env.VISUALFRIES_CHROMIUM_PATH,
        process.env.VISUALFRIES_CHROMIUM, // earlier name, kept for existing setups
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];
    return candidates.find((c) => c && existsSync(c));
}
async function launch() {
    let chromium;
    try {
        ({ chromium } = await import('playwright'));
    }
    catch {
        throw new Error('playwright is required for rendering. Install it with `npm install playwright` (it is an optional peer dependency).');
    }
    const executablePath = findChromium();
    return chromium.launch({
        executablePath,
        args: CHROMIUM_FLAGS
    });
}
async function openClip(browser, bundle, clip, invalidate) {
    const page = await browser.newPage({
        viewport: { width: clip.size[0], height: clip.size[1] },
        deviceScaleFactor: 1
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.route(`${ORIGIN}/**`, (route) => serveAllowed(route, bundle, errors));
    await page.goto(originUrl(bundle.html) + (invalidate ? `?invalidate=${invalidate}` : ''));
    let info;
    try {
        info = await page.evaluate((data) => window.__vfMotionStage.load(data), clip);
    }
    catch (error) {
        // Keep the page's message, drop Playwright's prefix and the bundle stack trace.
        const message = error.message
            .replace(/^page\.evaluate: (Error: )?/, '')
            .split('\n    at ')[0];
        throw new Error([`Clip "${clip.id}" failed to load: ${message}`, ...errors].join('\n'));
    }
    return {
        mode: info.mode,
        async capture(frame) {
            if (errors.length)
                throw new Error(`Clip "${clip.id}" page errors:\n${errors.join('\n')}`);
            const r = await page.evaluate((n) => window.__vfMotionStage.frame(n, true), frame);
            if (r.image)
                return Buffer.from(r.image.slice(r.image.indexOf(',') + 1), 'base64');
            return page.locator('#vf-stage').screenshot({ omitBackground: clip.alpha, type: 'png' });
        },
        async check(frames) {
            const found = await page.evaluate((list) => window.__vfMotionStage.check(list), frames);
            for (const e of errors)
                found.errors.push({ frame: -1, message: e });
            return found;
        },
        close: () => page.close()
    };
}
const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
};
/** Serves `${ORIGIN}/@fs/<absolute path>` from disk: only allowed folders and files. */
async function serveAllowed(route, allowed, errors) {
    const { pathname } = new URL(route.request().url());
    if (!pathname.startsWith('/@fs/'))
        return route.fulfill({ status: 404 });
    let abs;
    let real;
    try {
        abs = fileURLToPath(`file://${pathname.slice('/@fs'.length)}`);
        // Resolve symlinks first, so a link inside the project cannot reach outside it.
        real = await fs.realpath(abs);
    }
    catch {
        return route.fulfill({ status: 404 });
    }
    const realOf = (p) => fs.realpath(p).catch(() => p);
    const realRoots = await Promise.all(allowed.roots.map(realOf));
    const realFiles = await Promise.all(allowed.files.map(realOf));
    const inRoot = realRoots.some((root) => real === root || real.startsWith(root + path.sep));
    if (!inRoot && !realFiles.includes(real)) {
        errors.push(`Blocked a request outside the project: ${abs}`);
        return route.fulfill({ status: 403 });
    }
    try {
        const body = await fs.readFile(real);
        return route.fulfill({
            status: 200,
            body,
            contentType: CONTENT_TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream'
        });
    }
    catch {
        return route.fulfill({ status: 404 });
    }
}
function ffprobeJson(file, args) {
    return new Promise((resolve, reject) => {
        const p = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
            '-v',
            'error',
            ...args,
            '-of',
            'json',
            file
        ]);
        let out = '';
        let err = '';
        p.stdout.on('data', (d) => (out += d));
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => code === 0
            ? resolve(JSON.parse(out))
            : reject(new Error(`ffprobe failed for ${file}: ${err.slice(-400)}`)));
    });
}
/**
 * Presentation timestamps (in time-base ticks) of the frames the first video stream shows.
 * Packets flagged for discard (edit-list preroll of a stream-copied cut) are left out.
 */
function packetTimestamps(file) {
    return new Promise((resolve, reject) => {
        const p = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'packet=pts,flags',
            '-of',
            'csv=p=0',
            file
        ]);
        let out = '';
        let err = '';
        p.stdout.on('data', (d) => (out += d));
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => code === 0
            ? resolve(out
                .split('\n')
                .map((line) => line.split(','))
                .filter(([pts, flags = '']) => {
                const value = pts?.trim();
                return value && value !== 'N/A' && !flags.includes('D');
            })
                .map(([pts]) => Number(pts))
                .filter((n) => Number.isFinite(n)))
            : reject(new Error(`ffprobe failed for ${file}: ${err.slice(-400)}`)));
    });
}
/**
 * Size, nominal frame rate, frame count and duration of a video's first stream, from its packet
 * timestamps. `constant` is false when any frame interval differs from the others (a dropped or
 * repeated frame, a variable-frame-rate recording).
 */
function quarterTurn(stream) {
    const fromSideData = (stream.side_data_list ?? []).find((d) => d.rotation !== undefined)?.rotation;
    const rotation = Number(fromSideData ?? stream.tags?.rotate ?? 0);
    return Math.abs(rotation) % 180 === 90;
}
export async function probeVideo(file) {
    const info = await ffprobeJson(file, [
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,r_frame_rate,time_base:stream_side_data=rotation:stream_tags=rotate'
    ]);
    const stream = info.streams?.[0];
    if (!stream)
        throw new Error(`No video stream in ${file}`);
    const rate = (value) => {
        const [num, den] = String(value).split('/').map(Number);
        return den ? num / den : num;
    };
    const fps = rate(stream.r_frame_rate);
    const timeBase = rate(stream.time_base);
    const pts = (await packetTimestamps(file)).sort((x, y) => x - y);
    if (!pts.length)
        throw new Error(`No video frames in ${file}`);
    const step = 1 / fps / timeBase;
    let constant = true;
    for (let i = 1; i < pts.length; i++) {
        // Allow one tick of rounding; anything else is a gap or a repeat.
        if (Math.abs(pts[i] - pts[i - 1] - step) > 1) {
            constant = false;
            break;
        }
    }
    return {
        // Decoders apply the rotation, so a portrait phone video decodes with swapped sides.
        ...(quarterTurn(stream)
            ? { width: stream.height, height: stream.width }
            : { width: stream.width, height: stream.height }),
        fps,
        frames: pts.length,
        duration: (pts[pts.length - 1] - pts[0]) * timeBase + 1 / fps,
        constant
    };
}
/** Default seconds extracted around the clips, for `offset` and delayed copies. */
const FOOTAGE_MARGIN_SECONDS = 2;
function edgeFrame(clips, startFrame, total) {
    if (total <= 0)
        return { first: 0, last: 0 };
    const before = clips.every((c) => c.startFrame + c.frames <= startFrame);
    const index = before ? 0 : total - 1;
    return { first: index, last: index };
}
/**
 * Extracts the footage frames the given clips need (with a margin) into
 * `<project>/.visualfries/footage/`, attaches them to the clips and returns the folders to serve.
 * Frames are cached by source, matte, frame rate and range.
 */
export async function prepareFootage(loaded, clips) {
    const footage = loaded.project.footage ?? {};
    const fps = loaded.project.fps;
    const roots = [];
    const frames = {};
    for (const [name, spec] of Object.entries(footage)) {
        const src = path.resolve(loaded.dir, spec.src);
        const matte = spec.matte ? path.resolve(loaded.dir, spec.matte) : null;
        for (const file of [src, matte])
            if (file && !existsSync(file))
                throw new Error(`Footage "${name}": file not found: ${file}`);
        const info = await probeVideo(src);
        if (matte) {
            const m = await probeVideo(matte);
            // Two frames of difference are allowed; the epsilon absorbs float rounding.
            if (Math.abs(m.duration - info.duration) > 2 / info.fps + 1e-6)
                throw new Error(`Footage "${name}": the matte is ${m.duration.toFixed(2)} s long, the video ${info.duration.toFixed(2)} s. Make the matte from this video (visualfries matte).`);
        }
        // Same constant frame rate as the project: footage frames are program frames and a fast
        // input seek is exact. Otherwise decode from the start so the rate conversion keeps one
        // phase whatever range is extracted.
        const direct = info.constant && Math.abs(info.fps - fps) < 0.01;
        const total = direct ? info.frames : Math.round(info.duration * fps);
        const startFrame = Math.round((spec.start ?? 0) * fps);
        const margin = Math.round((spec.margin ?? FOOTAGE_MARGIN_SECONDS) * fps);
        // Clips that never overlap the footage hold its nearest edge frame.
        const range = footageFrameRange(clips, startFrame, total, margin) ?? edgeFrame(clips, startFrame, total);
        const stats = await Promise.all([src, matte].map((f) => (f ? fs.stat(f) : null)));
        const key = createHash('sha1')
            .update(JSON.stringify({
            src,
            matte,
            sizes: stats.map((st) => st && [st.size, st.mtimeMs]),
            fps,
            range
        }))
            .digest('hex')
            .slice(0, 12);
        const dir = path.join(loaded.dir, '.visualfries', 'footage', `${name}-${key}`);
        if (!existsSync(path.join(dir, 'done.json'))) {
            const tmp = `${dir}.tmp-${process.pid}-${randomUUID()}`;
            await fs.mkdir(path.join(tmp, 'plate'), { recursive: true });
            try {
                const count = range.last - range.first + 1;
                const seek = direct ? ['-ss', (range.first / fps).toFixed(6)] : [];
                const pick = direct
                    ? `fps=${fps}`
                    : `fps=${fps},trim=start_frame=${range.first}:end_frame=${range.last + 1},setpts=PTS-STARTPTS`;
                await ffmpeg([
                    '-y',
                    ...seek,
                    '-i',
                    src,
                    '-vf',
                    pick,
                    '-frames:v',
                    String(count),
                    '-start_number',
                    String(range.first),
                    '-q:v',
                    '2',
                    path.join(tmp, 'plate', '%06d.jpg')
                ]);
                if (matte) {
                    await fs.mkdir(path.join(tmp, 'subject'), { recursive: true });
                    await ffmpeg([
                        '-y',
                        ...seek,
                        '-i',
                        src,
                        '-i',
                        matte,
                        '-filter_complex',
                        // The matte is padded before it is cut to the range, so a matte a frame or two
                        // short holds its last frame even when only the end of the footage is extracted.
                        `[0:v]${pick}[c];[1:v]fps=${fps},scale=${info.width}:${info.height},format=gray,tpad=stop_mode=clone:stop_duration=2,trim=start_frame=${range.first}:end_frame=${range.last + 1},setpts=PTS-STARTPTS[m];[c][m]alphamerge,format=rgba`,
                        '-frames:v',
                        String(count),
                        '-start_number',
                        String(range.first),
                        '-compression_level',
                        '1',
                        path.join(tmp, 'subject', '%06d.png')
                    ]);
                }
                const written = (await fs.readdir(path.join(tmp, 'plate'))).length;
                if (matte) {
                    const cutOuts = (await fs.readdir(path.join(tmp, 'subject'))).length;
                    if (cutOuts !== written)
                        throw new Error(`Footage "${name}": ${cutOuts} subject frames for ${written} picture frames; the matte does not cover the clips.`);
                }
                await fs.writeFile(path.join(tmp, 'done.json'), JSON.stringify({
                    name,
                    src,
                    matte,
                    first: range.first,
                    last: range.first + written - 1,
                    total,
                    width: info.width,
                    height: info.height
                }));
                // Publish atomically. If another run published the same frames first, keep theirs:
                // never delete a published folder another page may be reading.
                await fs.rename(tmp, dir).catch(async (error) => {
                    if (!existsSync(path.join(dir, 'done.json')))
                        throw error;
                });
            }
            finally {
                await fs.rm(tmp, { recursive: true, force: true });
            }
        }
        const done = JSON.parse(await fs.readFile(path.join(dir, 'done.json'), 'utf8'));
        frames[name] = {
            url: originUrl(dir) + '/',
            first: done.first,
            last: done.last,
            total: done.total,
            width: done.width,
            height: done.height,
            startFrame,
            subject: !!matte
        };
        roots.push(dir);
    }
    for (const clip of clips)
        clip.footage = frames;
    return roots;
}
/** Width of the downscaled matte the subject boxes are measured on. */
const BOX_SAMPLE_WIDTH = 160;
/**
 * Bounding box of the subject in every extracted frame, measured on a downscaled matte
 * (white above half = subject). Frames without a subject get null.
 */
async function matteBoxes(matte, info, fps, range, count) {
    const w = BOX_SAMPLE_WIDTH;
    const h = Math.max(2, Math.round((info.height / info.width) * w));
    const raw = await ffmpegOutput([
        '-i',
        matte,
        '-vf',
        `fps=${fps},scale=${w}:${h}:flags=area,format=gray,tpad=stop_mode=clone:stop_duration=2,trim=start_frame=${range.first}:end_frame=${range.last + 1}`,
        '-frames:v',
        String(count),
        '-f',
        'rawvideo',
        '-pix_fmt',
        'gray',
        'pipe:1'
    ]);
    const boxes = [];
    for (let i = 0; i < count; i++) {
        const frame = raw.subarray(i * w * h, (i + 1) * w * h);
        boxes.push(frame.length === w * h ? measureSubject(frame, w, h) : null);
    }
    return boxes;
}
/** Subject box of one greyscale matte frame, in 0–1 coordinates. Exported for tests. */
export function measureSubject(gray, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            if (gray[y * w + x] >= 128) {
                if (x < x0)
                    x0 = x;
                if (x > x1)
                    x1 = x;
                if (y < y0)
                    y0 = y;
                if (y > y1)
                    y1 = y;
            }
    if (x1 < 0)
        return null;
    // The head: the subject's top rows (about a twelfth of the frame height), centred.
    const band = Math.max(1, Math.round(h / 12));
    let sum = 0, n = 0;
    for (let y = y0; y < Math.min(h, y0 + band); y++)
        for (let x = x0; x <= x1; x++)
            if (gray[y * w + x] >= 128) {
                sum += x;
                n++;
            }
    const r = (v) => Math.round(v * 10000) / 10000;
    return {
        x: r(x0 / w),
        y: r(y0 / h),
        width: r((x1 + 1 - x0) / w),
        height: r((y1 + 1 - y0) / h),
        headX: r((sum / n + 0.5) / w),
        headY: r(y0 / h)
    };
}
/** Frame for "extra", "extra.end+0.3", "2.5s", "f120", "end", "mid". */
export function frameForAt(clip, at) {
    const seconds = resolveMoment(at, {
        id: clip.id,
        cues: clip.cues,
        duration: clip.duration,
        fps: clip.fps
    });
    return Math.max(0, Math.min(clip.frames - 1, Math.round(seconds * clip.fps)));
}
/**
 * Mount every block and run its logic across the clip without rendering video: resolution
 * errors, runtime errors (unknown cue, bad ease, map order), wall-clock CSS animations and,
 * optionally, whether sampled frames come out identical in two seek orders.
 */
export async function checkMotionProject(loaded, opts = {}) {
    assertKnownClips(loaded, opts.clips);
    const wanted = opts.clips?.length ? opts.clips : loaded.project.clips.map((c) => c.id);
    const results = wanted.map((id) => {
        const diags = loaded.resolved.diagnostics.filter((d) => d.clip === id);
        return {
            id,
            ok: false,
            errors: diags
                .filter((d) => d.level === 'error')
                .map((d) => ({ message: `${d.field}: ${d.message}` })),
            warnings: diags
                .filter((d) => d.level === 'warning')
                .map((d) => ({ message: `${d.field}: ${d.message}` }))
        };
    });
    for (const r of results) {
        if (r.errors.length || loaded.resolved.clips.some((c) => c.id === r.id))
            continue;
        r.errors.push({
            message: loaded.project.clips.some((c) => c.id === r.id)
                ? 'Clip did not resolve, so it was not checked.'
                : `Unknown clip "${r.id}". Clips: ${loaded.project.clips.map((c) => c.id).join(', ')}.`
        });
    }
    const runnable = results
        .filter((r) => !r.errors.length)
        .map((r) => loaded.resolved.clips.find((c) => c.id === r.id))
        .filter((c) => !!c);
    if (runnable.length) {
        const bundle = await bundleMotionProject(loaded, runnable);
        const browser = await launch();
        try {
            for (const clip of runnable) {
                const result = results.find((r) => r.id === clip.id);
                let page;
                try {
                    page = await openClip(browser, bundle, clip);
                    result.mode = page.mode;
                    // Every 5th frame plus the frames around each cue.
                    const frames = new Set();
                    for (let f = 0; f < clip.frames; f += 5)
                        frames.add(f);
                    for (const cue of Object.values(clip.cues))
                        for (const d of [-1, 0, 1, 18])
                            frames.add(cue.frame + d);
                    frames.add(clip.frames - 1);
                    const list = [...frames].filter((f) => f >= 0 && f < clip.frames).sort((a, b) => a - b);
                    const found = await page.check(list);
                    result.errors.push(...found.errors);
                    result.warnings.push(...found.warnings);
                    if (opts.determinism && !found.errors.length) {
                        const sample = list.filter((_, i) => i % Math.max(1, Math.floor(list.length / 12)) === 0);
                        const hash = (b) => createHash('sha1').update(b).digest('hex');
                        const forward = new Map();
                        for (const f of sample)
                            forward.set(f, hash(await page.capture(f)));
                        const differ = [];
                        for (const f of [...sample].reverse())
                            if (hash(await page.capture(f)) !== forward.get(f))
                                differ.push(f);
                        if (differ.length) {
                            result.nondeterministic = differ.sort((a, b) => a - b);
                            result.errors.push({
                                message: `Frames ${result.nondeterministic.join(', ')} look different depending on seek order. Something depends on history (wall-clock time, stateful random, state kept between frames).`
                            });
                        }
                    }
                }
                catch (error) {
                    result.errors.push({ message: error.message });
                }
                finally {
                    await page?.close();
                }
            }
        }
        finally {
            await browser.close();
            await fs.rm(bundle.dir, { recursive: true, force: true });
        }
    }
    for (const r of results)
        r.ok = r.errors.length === 0;
    return results;
}
/** Moments worth checking: start, each cue + 0.6 s settle, end. */
export function defaultMoments(clip) {
    const cueMoments = Object.entries(clip.cues)
        .sort((a, b) => a[1].start - b[1].start)
        .map(([name]) => `${name}+0.6`);
    return ['f0', 'f10', ...cueMoments, 'end'];
}
export async function renderStills(loaded, requests, opts = {}) {
    const byId = new Map(loaded.resolved.clips.map((c) => [c.id, c]));
    const ids = [...new Set(requests.map((r) => r.clip))];
    assertNoErrors(loaded, ids);
    const clips = ids.map((id) => byId.get(id));
    const bundle = await bundleMotionProject(loaded, clips);
    const browser = await launch();
    const out = [];
    try {
        for (const clip of clips) {
            const page = await openClip(browser, bundle, clip, opts.invalidate);
            for (const r of requests.filter((q) => q.clip === clip.id)) {
                const frame = frameForAt(clip, r.at);
                out.push({
                    clip: clip.id,
                    at: r.at,
                    frame,
                    png: await page.capture(frame),
                    mode: page.mode
                });
            }
            await page.close();
        }
    }
    finally {
        await browser.close();
        await fs.rm(bundle.dir, { recursive: true, force: true });
    }
    return out;
}
/** One labelled grid image so an agent can review many moments in a single look. */
export async function composeSheet(images, opts = {}) {
    const columns = opts.columns ?? Math.min(3, images.length);
    const cell = Math.floor((opts.width ?? 1920) / columns);
    const browser = await launch();
    try {
        const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
        const data = images.map((i) => ({
            label: i.label,
            src: 'data:image/png;base64,' + i.png.toString('base64')
        }));
        const url = await page.evaluate(async ({ data, columns, cell }) => {
            const imgs = await Promise.all(data.map((d) => new Promise((ok, fail) => {
                const im = new Image();
                im.onload = () => ok(im);
                im.onerror = fail;
                im.src = d.src;
            })));
            const h = Math.round((cell * imgs[0].height) / imgs[0].width);
            const label = 28;
            const c = document.createElement('canvas');
            c.width = cell * columns;
            c.height = Math.ceil(imgs.length / columns) * (h + label);
            const g = c.getContext('2d');
            g.fillStyle = '#111';
            g.fillRect(0, 0, c.width, c.height);
            imgs.forEach((im, i) => {
                const x = (i % columns) * cell;
                const y = Math.floor(i / columns) * (h + label);
                g.fillStyle = '#333';
                g.fillRect(x, y + label, cell, h);
                g.drawImage(im, x, y + label, cell - 2, h - 2);
                g.fillStyle = '#fff';
                g.font = '600 18px sans-serif';
                g.fillText(data[i].label, x + 8, y + 20);
            });
            return c.toDataURL('image/png');
        }, { data, columns, cell });
        return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    }
    finally {
        await browser.close();
    }
}
function ffmpegOutput(args) {
    return new Promise((resolve, reject) => {
        const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        const out = [];
        let err = '';
        p.stdout.on('data', (d) => out.push(d));
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => code === 0
            ? resolve(Buffer.concat(out))
            : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`)));
    });
}
function ffmpeg(args, input) {
    return new Promise((resolve, reject) => {
        const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
            stdio: ['pipe', 'ignore', 'pipe']
        });
        let err = '';
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`)));
        if (input)
            input.pipe(p.stdin);
        else
            p.stdin.end();
    });
}
/**
 * ffmpeg input and mapping that mux the sound of the clip's `audio` footage, cut to the clip's
 * program range. Silence fills anything the footage does not cover.
 */
function audioInput(loaded, clip) {
    if (!clip.audio)
        return [];
    const footage = loaded.project.footage?.[clip.audio];
    if (!footage)
        throw new Error(`Clip "${clip.id}": unknown audio footage "${clip.audio}".`);
    const src = path.resolve(loaded.dir, footage.src);
    // The picture places the footage on a whole frame; the sound follows the same frame.
    const from = clip.start - Math.round((footage.start ?? 0) * clip.fps) / clip.fps;
    const delayMs = Math.max(0, Math.round(-from * 1000));
    return [
        '-ss',
        Math.max(0, from).toFixed(6),
        '-i',
        src,
        '-map',
        '0:v',
        '-map',
        '1:a:0',
        '-af',
        `${delayMs ? `adelay=${delayMs}:all=1,` : ''}apad`,
        '-t',
        clip.duration.toFixed(6),
        ...(clip.alpha ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'aac', '-b:a', '192k'])
    ];
}
export async function renderMotionClips(loaded, opts) {
    if (opts.jobs !== undefined && !(Number.isInteger(opts.jobs) && opts.jobs > 0)) {
        throw new Error(`--jobs must be a positive integer, got ${opts.jobs}.`);
    }
    assertNoErrors(loaded, opts.clips?.length ? opts.clips : undefined);
    const clips = opts.clips?.length
        ? opts.clips.map((id) => loaded.resolved.clips.find((x) => x.id === id))
        : loaded.resolved.clips;
    await fs.mkdir(opts.output, { recursive: true });
    const bundle = await bundleMotionProject(loaded, clips);
    // libx264 with yuv420p needs even dimensions; fail before capturing, not after.
    for (const clip of clips) {
        if (!clip.alpha && clip.size.some((n) => n % 2))
            throw new Error(`Clip "${clip.id}": size ${clip.size.join('×')} must be even for H.264. Use even dimensions or "alpha": true.`);
    }
    const browser = await launch();
    const jobs = opts.jobs ?? Math.min(6, os.cpus().length);
    const results = [];
    try {
        for (const clip of clips) {
            const t0 = Date.now();
            const framesDir = await fs.mkdtemp(path.join(os.tmpdir(), `vf-frames-${clip.id}-`));
            const per = Math.ceil(clip.frames / jobs);
            let mode = '';
            const file = path.resolve(opts.output, `${clip.id}.${clip.alpha ? 'mov' : 'mp4'}`);
            try {
                await Promise.all(Array.from({ length: Math.min(jobs, clip.frames) }, async (_, j) => {
                    const from = j * per;
                    const to = Math.min(clip.frames, from + per);
                    if (from >= to)
                        return;
                    const page = await openClip(browser, bundle, clip, opts.invalidate);
                    mode = page.mode;
                    for (let f = from; f < to; f++) {
                        await fs.writeFile(path.join(framesDir, `${String(f).padStart(6, '0')}.png`), await page.capture(f));
                    }
                    await page.close();
                }));
                const written = (await fs.readdir(framesDir)).filter((f) => f.endsWith('.png')).length;
                if (written !== clip.frames)
                    throw new Error(`Clip "${clip.id}": rendered ${written} of ${clip.frames} frames.`);
                const codec = clip.alpha
                    ? [
                        '-c:v',
                        'prores_ks',
                        '-profile:v',
                        '4444',
                        '-pix_fmt',
                        'yuva444p10le',
                        '-alpha_bits',
                        '16'
                    ]
                    : [
                        '-c:v',
                        'libx264',
                        '-crf',
                        '14',
                        '-preset',
                        'medium',
                        '-pix_fmt',
                        'yuv420p',
                        '-movflags',
                        '+faststart'
                    ];
                await ffmpeg([
                    '-y',
                    '-framerate',
                    String(clip.fps),
                    '-i',
                    path.join(framesDir, '%06d.png'),
                    ...audioInput(loaded, clip),
                    ...codec,
                    file
                ]);
            }
            finally {
                if (!opts.keepFrames)
                    await fs.rm(framesDir, { recursive: true, force: true });
            }
            const r = {
                id: clip.id,
                file,
                frames: clip.frames,
                programStartFrame: clip.startFrame,
                programStart: clip.start,
                programEnd: clip.end,
                alpha: clip.alpha,
                mode,
                seconds: (Date.now() - t0) / 1000,
                transcript: loaded.transcriptHash
            };
            results.push(r);
            opts.onProgress?.(`${clip.id}: ${clip.frames} frames in ${r.seconds.toFixed(1)} s (${mode})`);
        }
    }
    finally {
        await browser.close();
        await fs.rm(bundle.dir, { recursive: true, force: true });
    }
    // Re-rendering some clips updates their entries and keeps the rest of the manifest.
    const manifestPath = path.resolve(opts.output, 'manifest.json');
    let previous = [];
    try {
        previous = JSON.parse(await fs.readFile(manifestPath, 'utf8')).clips ?? [];
    }
    catch {
        previous = [];
    }
    const rendered = new Set(results.map((r) => r.id));
    const current = new Set(loaded.project.clips.map((c) => c.id));
    const kept = previous
        .filter((c) => !rendered.has(c.id) && current.has(c.id))
        .map((c) => ({ ...c, stale: c.transcript !== loaded.transcriptHash || undefined }));
    const stale = kept.filter((c) => c.stale).map((c) => c.id);
    if (stale.length) {
        opts.onProgress?.(`Warning: ${stale.join(', ')} were rendered against another transcript; their placement may be off. Re-render them.`);
    }
    const merged = [...kept, ...results].sort((a, b) => a.programStartFrame - b.programStartFrame);
    await fs.writeFile(manifestPath, JSON.stringify({
        fps: loaded.project.fps,
        size: loaded.project.size,
        transcript: loaded.transcriptHash,
        clips: merged
    }, null, 2));
    return results;
}
