import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { blockImports, bundleOptions, ffmpeg, matteBoxes, missingPackages, motionProgram, openFootageSource, originUrl, ownModule, pageAssets, programRanges } from './node.js';
import { assertProgramRenders } from './program-node.js';
import { encodeProgramMix } from './audio.js';
import { footageMap } from './footage-map.js';
import { segmentStage, wholeProgram } from './segments.js';
import { LIVE_MANIFEST_VERSION, liveFootageFrames } from './live-manifest.js';
import { assetNames, liveAudio, liveRanges, proxyArgs, proxyCacheKey, proxyLine, proxySize, relativeUrls } from './live-proxy.js';
import { removeOrphans } from './partials.js';
const ORIGIN = new URL(originUrl('/')).origin;
/** The entry of the player bundle: the blocks and `createPlayer(host, manifest, base)`. */
function playerEntry(loaded, clips) {
    const used = blockImports(loaded, clips);
    return [
        `import { mountLivePreview } from ${JSON.stringify(ownModule('live-player'))};`,
        ...used.imports,
        `const blocks = ${used.blocks};`,
        `const animatable = ${used.animatable};`,
        'export const createPlayer = (host, manifest, base) => mountLivePreview(host, manifest, base, blocks, animatable);'
    ].join('\n');
}
async function bundlePlayer(loaded, clips, dir) {
    const { esbuild, options } = await bundleOptions();
    await esbuild
        .build({
        ...options,
        stdin: {
            contents: playerEntry(loaded, clips),
            resolveDir: loaded.dir,
            sourcefile: 'live-entry.js',
            loader: 'js'
        },
        format: 'esm',
        minify: true,
        outfile: path.join(dir, 'player.js')
    })
        .catch((error) => {
        throw missingPackages(error, loaded.dir, options.nodePaths) ?? error;
    });
    return existsSync(path.join(dir, 'player.css')) ? 'player.css' : null;
}
/**
 * A file in the folder: a hard link to `from` (same disk, no copy), else a copy; a symlink's
 * target, so the folder holds its files.
 */
async function place(from, to) {
    const file = await fs.realpath(from);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.link(file, to).catch(() => fs.copyFile(file, to));
}
/** One footage's proxy from the cache, made first when it is not there. */
async function proxyOf(loaded, source, fps) {
    const size = proxySize(source.info.width, source.info.height);
    const spec = {
        src: source.src,
        matte: source.matte,
        sizes: source.sizes,
        fps,
        total: source.total,
        size
    };
    const cache = path.join(loaded.dir, '.visualfries', 'live');
    const file = path.join(cache, `${source.name}-${proxyCacheKey(spec)}.mp4`);
    const cached = existsSync(file);
    if (!cached) {
        await fs.mkdir(cache, { recursive: true });
        await removeOrphans(cache, /\.tmp-(\d+)-[0-9a-f-]{36}\.mp4$/);
        const tmp = `${file.slice(0, -4)}.tmp-${process.pid}-${randomUUID()}.mp4`;
        try {
            await ffmpeg(proxyArgs(spec, tmp));
            await fs.rename(tmp, file);
        }
        finally {
            await fs.rm(tmp, { force: true });
        }
    }
    return { file, size, cached };
}
/** Subject boxes of every frame of a matte, cached beside its proxy. */
async function wholeBoxes(proxy, source, fps) {
    if (!source.matte)
        return null;
    const file = proxy.replace(/\.mp4$/, '.boxes.json');
    if (existsSync(file))
        return JSON.parse(await fs.readFile(file, 'utf8'));
    const range = { first: 0, last: Math.max(0, source.total - 1) };
    const boxes = await matteBoxes(source.matte, source.info, fps, range, source.total);
    await fs.writeFile(file, JSON.stringify(boxes));
    return boxes;
}
async function openSources(loaded, fps) {
    const sources = [];
    for (const [name, spec] of Object.entries(loaded.project.footage ?? {}))
        sources.push(await openFootageSource(name, spec, loaded.dir, fps));
    return sources;
}
/** One footage's proxy placed in the folder `dir`, with its subject boxes and report. */
async function oneFootage(loaded, source, wanted, { dir, fps, log }) {
    const t = Date.now();
    const proxy = await proxyOf(loaded, source, fps);
    const url = `media/${source.name}.mp4`;
    await place(proxy.file, path.join(dir, url));
    const packed = !!source.matte;
    const boxes = liveRanges(wanted, await wholeBoxes(proxy.file, source, fps));
    log(proxyLine(source.name, proxy.cached, Date.now() - t));
    return {
        source: {
            url,
            packed,
            size: proxy.size,
            total: source.total,
            width: source.info.width,
            height: source.info.height
        },
        boxes,
        report: { proxy: proxy.file, packed, size: proxy.size, cached: proxy.cached }
    };
}
async function liveFootage(loaded, sources, wanted, build) {
    const live = { footage: {}, boxes: {}, report: {} };
    for (const source of sources) {
        const one = await oneFootage(loaded, source, wanted[source.name] ?? [], build);
        live.footage[source.name] = one.source;
        live.boxes[source.name] = one.boxes;
        live.report[source.name] = one.report;
    }
    return live;
}
/** The program's own mix (the render's), encoded into the folder; null without sound. */
async function mixInto(loaded, program, dir, log) {
    const mix = await encodeProgramMix(program, {
        dir: loaded.dir,
        wav: path.join(dir, 'audio.wav'),
        output: path.join(dir, 'audio.m4a'),
        bitrate: '128k'
    });
    log(mix ? 'mix done' : 'no sound');
    return mix;
}
/** The manifest, with the page's files placed in the folder and every URL made relative. */
async function liveManifest(loaded, program, map, live, dir, parts) {
    const assets = await pageAssets(loaded, program.clips);
    const names = assetNames(assets.files);
    for (const [abs, name] of names)
        await place(abs, path.join(dir, name));
    const local = (text) => relativeUrls(text, names, originUrl, ORIGIN);
    const frames = liveFootageFrames(live.footage, live.boxes);
    const seg = segmentStage(program, wholeProgram(program), { frames, map }, loaded.brand.resolved);
    const props = assets.props;
    const segment = {
        ...seg,
        footage: {},
        clips: seg.clips.map((c) => (props[c.id] ? { ...c, props: props[c.id] } : c))
    };
    return {
        version: LIVE_MANIFEST_VERSION,
        fps: program.fps,
        frames: program.frames,
        duration: program.frames / program.fps,
        size: seg.size,
        bundle: 'player.js',
        styles: parts.styles,
        segment: JSON.parse(local(JSON.stringify(segment))),
        footage: live.footage,
        boxes: live.boxes,
        fonts: assets.fonts.map((f) => ({ ...f, url: local(f.url) })),
        css: local(assets.css),
        audio: parts.audio ? 'audio.m4a' : null,
        files: [...names.values()]
    };
}
/** Everything of the preview into `dir`: bundle, proxies, mix, page files and manifest. */
async function buildPreview(loaded, program, dir, log) {
    const styles = await bundlePlayer(loaded, program.clips, dir);
    log('bundle done');
    const build = { dir, fps: program.fps, log };
    const sources = await openSources(loaded, program.fps);
    const map = footageMap(program, Object.fromEntries(sources.map((s) => [s.name, s.total])));
    const wanted = programRanges(loaded, map, program.clips, sources);
    const live = await liveFootage(loaded, sources, wanted, build);
    const mix = await mixInto(loaded, program, dir, log);
    const manifest = await liveManifest(loaded, program, map, live, dir, { styles, audio: !!mix });
    await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
    return { manifest, footage: live.report, mix };
}
/** Writes the live preview folder of a program project to `opts.output` (replacing it). */
export async function writeLivePreview(loaded, opts) {
    const started = Date.now();
    const { program } = await motionProgram(loaded, { format: opts.format });
    assertProgramRenders(program);
    const output = path.resolve(opts.output);
    const tmp = `${output}.partial-${process.pid}`;
    await fs.rm(tmp, { recursive: true, force: true });
    await fs.mkdir(tmp, { recursive: true });
    try {
        const built = await buildPreview(loaded, program, tmp, opts.onProgress ?? (() => { }));
        await fs.rm(output, { recursive: true, force: true });
        await fs.rename(tmp, output);
        return {
            output,
            manifest: path.join(output, 'manifest.json'),
            fps: program.fps,
            frames: program.frames,
            duration: built.manifest.duration,
            size: built.manifest.size,
            footage: built.footage,
            audio: liveAudio(built.mix, path.join(output, 'audio.m4a')),
            files: built.manifest.files.length,
            seconds: Math.round((Date.now() - started) / 100) / 10
        };
    }
    finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
}
