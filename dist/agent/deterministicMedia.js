import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SceneShape } from '../schemas/scene/index.js';
import { mediaFrameIndexAtSceneTime, shownSceneTimes } from './sceneTime.js';
export const DEFAULT_EXTRACTION_TIMEOUT_MS = 600_000;
const cloneScene = (scene) => JSON.parse(JSON.stringify(scene));
const normalizeUrl = (value) => {
    try {
        const parsed = new URL(value);
        parsed.search = '';
        parsed.hash = '';
        return parsed.toString();
    }
    catch {
        return value;
    }
};
const safeFilePart = (value) => value.replace(/[^a-zA-Z0-9._-]/g, '_');
export const normalizeDeterministicPublicBasePath = (value) => {
    const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
        throw new Error('publicBasePath must be a relative URL path without "." or ".." segments.');
    }
    return `/${segments.join('/')}`;
};
const resolveSafeAssetRoot = (workDir, publicBasePath) => {
    const root = path.resolve(workDir);
    const target = path.resolve(root, publicBasePath.slice(1));
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('publicBasePath must resolve inside workDir.');
    }
    return target;
};
const toInputPath = (sourceUrl) => {
    if (sourceUrl.startsWith('file://'))
        return fileURLToPath(sourceUrl);
    return sourceUrl;
};
const sourceForComponent = (scene, component) => {
    if (!('source' in component))
        return undefined;
    const directUrl = component.source?.url ?? component.source?.streamUrl;
    if (directUrl)
        return directUrl;
    const assetId = component.source?.assetId;
    return assetId ? scene.assets.find((asset) => asset.id === assetId)?.url : undefined;
};
export function collectLocalDeterministicMediaComponents(input) {
    const scene = SceneShape.parse(input);
    const media = [];
    for (const layer of scene.layers ?? []) {
        if (!layer || layer.muted)
            continue;
        for (const component of layer.components ?? []) {
            if (!component || component.visible === false)
                continue;
            if (component.type !== 'VIDEO' && component.type !== 'GIF')
                continue;
            const sourceUrl = sourceForComponent(scene, component);
            if (!sourceUrl)
                continue;
            media.push({
                component,
                id: component.id || crypto.randomUUID(),
                type: component.type,
                sourceUrl,
                sourceStartAt: 'source' in component ? (component.source?.startAt ?? 0) : 0,
                sourceEndAt: 'source' in component && typeof component.source?.endAt === 'number'
                    ? component.source.endAt
                    : undefined,
                timelineStartAt: component.timeline?.startAt ?? 0,
                timelineEndAt: component.timeline?.endAt ?? scene.settings.duration
            });
        }
    }
    return media;
}
export function resolveLocalDeterministicActiveWindow(component, fromFrame, toFrame, fps) {
    const frameBoundaryEpsilon = 1e-6;
    const chunkStartSec = fromFrame / fps;
    const chunkEndSec = toFrame / fps;
    const activeStartSec = Math.max(chunkStartSec, component.timelineStartAt);
    const activeEndSec = Math.min(chunkEndSec, component.timelineEndAt);
    if (activeEndSec <= activeStartSec)
        return null;
    const activeStartFrame = Math.max(fromFrame, Math.ceil(activeStartSec * fps - frameBoundaryEpsilon));
    const activeEndFrame = Math.min(toFrame, Math.ceil(activeEndSec * fps - frameBoundaryEpsilon));
    if (activeEndFrame <= activeStartFrame)
        return null;
    return {
        activeStartSec,
        activeEndSec,
        activeStartFrame,
        activeEndFrame,
        sourceStartSec: component.sourceStartAt + (activeStartFrame / fps - component.timelineStartAt)
    };
}
export function toLocalDeterministicFrameIndex(component, sceneFrameIndex, fps) {
    const timelineStartInFrames = component.timelineStartAt * fps;
    const sourceStartInFrames = component.sourceStartAt * fps;
    return Math.max(0, Math.round(sourceStartInFrames + sceneFrameIndex - timelineStartInFrames));
}
export function resolveLocalPredecodedExtractionPlan(sourceStartSec, sourceEndSec, expectedFrameCount, fps) {
    const outputFrameCount = Math.max(0, Math.floor(expectedFrameCount));
    if (outputFrameCount <= 0) {
        return { sourceStartSec, extractFrameCount: 0, outputFrameCount: 0, sourceEndLimited: false };
    }
    if (typeof sourceEndSec !== 'number' ||
        !Number.isFinite(sourceEndSec) ||
        sourceEndSec <= sourceStartSec) {
        if (typeof sourceEndSec === 'number' && sourceEndSec <= sourceStartSec) {
            return {
                sourceStartSec: Math.max(0, sourceEndSec - 1 / fps),
                extractFrameCount: 1,
                outputFrameCount,
                sourceEndLimited: true
            };
        }
        return {
            sourceStartSec,
            extractFrameCount: outputFrameCount,
            outputFrameCount,
            sourceEndLimited: false
        };
    }
    const availableFrames = Math.max(1, Math.ceil((sourceEndSec - sourceStartSec) * fps - 1e-6));
    return {
        sourceStartSec,
        extractFrameCount: Math.min(outputFrameCount, availableFrames),
        outputFrameCount,
        sourceEndLimited: availableFrames < outputFrameCount
    };
}
// ffmpeg reads the source before the page loads, so nothing else bounds it: a source that
// never answers would hang the render. ffmpeg prints nothing while it seeks, so the limit is
// on the whole call, not on silence.
const runFfmpeg = async (args, input) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const tag = `[visualfries deterministic media][${input.label}]`;
    await new Promise((resolve, reject) => {
        const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        let timedOut = false;
        const timer = input.timeoutMs > 0
            ? setTimeout(() => {
                timedOut = true;
                child.kill('SIGKILL');
            }, input.timeoutMs)
            : undefined;
        child.stderr?.on('data', (chunk) => {
            stderr = (stderr + String(chunk)).slice(-4000);
        });
        child.on('error', (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0)
                return resolve();
            reject(new Error(timedOut
                ? `${tag} ffmpeg timed out: no result for ${input.timeoutMs} ms.`
                : `${tag} ffmpeg exited ${code}. ${stderr}`));
        });
    });
};
const listFrameFiles = async (dir, extension) => {
    const files = (await fs.readdir(dir))
        .filter((file) => file.toLowerCase().endsWith(`.${extension}`))
        .sort((a, b) => Number(path.basename(a, `.${extension}`)) - Number(path.basename(b, `.${extension}`)))
        .map((file) => path.join(dir, file));
    return files;
};
const extractFrameSequence = async (options) => {
    await fs.mkdir(options.outputDir, { recursive: true });
    const outputPattern = path.join(options.outputDir, `%d.${options.extension}`);
    const seekMode = options.seekMode ?? 'fast';
    const paddedDurationSec = options.expectedFrameCount / options.fps + 0.5 / options.fps;
    const args = ['-y'];
    if (seekMode === 'fast') {
        args.push('-ss', options.sourceStartSec.toFixed(6));
    }
    args.push('-i', options.inputPath);
    if (seekMode === 'accurate') {
        args.push('-ss', options.sourceStartSec.toFixed(6));
    }
    args.push('-t', paddedDurationSec.toFixed(6), '-vf', `fps=${options.fps}:round=near:start_time=0`, '-frames:v', String(options.expectedFrameCount), '-vsync', 'cfr', '-start_number', '1');
    if (options.extension === 'jpg') {
        args.push('-q:v', String(options.jpegQualityScale), '-pix_fmt', 'yuvj420p');
    }
    else {
        args.push('-compression_level', '3');
    }
    args.push(outputPattern);
    await runFfmpeg(args, {
        label: options.label ?? 'extract-frame-sequence',
        timeoutMs: options.timeoutMs
    });
    return listFrameFiles(options.outputDir, options.extension);
};
const padTrailingFrames = async (outputDir, extension, frames, expectedFrameCount) => {
    if (frames.length === expectedFrameCount ||
        frames.length === 0 ||
        frames.length > expectedFrameCount) {
        return frames;
    }
    const lastFrame = frames[frames.length - 1];
    for (let index = frames.length + 1; index <= expectedFrameCount; index += 1) {
        await fs.copyFile(lastFrame, path.join(outputDir, `${index}.${extension}`));
    }
    return listFrameFiles(outputDir, extension);
};
const assignBoundaryFrames = (manifest, componentId, frameIndex, frameUrl, radius = 2) => {
    manifest[componentId] = manifest[componentId] ?? {};
    for (let index = Math.max(0, frameIndex - radius); index <= frameIndex + radius; index += 1) {
        manifest[componentId][String(index)] ??= frameUrl;
    }
};
// Ids differ in characters a file name cannot hold (`clip/a`, `clip_a`), or only in case on a
// file system that ignores it. The position in the scene makes every folder its own, so a
// long id can be cut to fit the 255 bytes of a file name.
const componentFolder = (media, position) => `${position}-${safeFilePart(media.id).slice(0, 80)}`;
const resolveSourceInput = (media) => {
    const sourceInput = toInputPath(media.sourceUrl);
    if (!/^https?:\/\//.test(sourceInput) && !existsSync(sourceInput)) {
        throw new Error(`VisualFries deterministic media source does not exist: ${media.sourceUrl}`);
    }
    return sourceInput;
};
// A fast seek can come back short near the end of a source; the accurate seek is the retry.
const extractComponentFrames = async (target, context, plan) => {
    const outputDir = path.join(context.predecodedRoot, target.folder);
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });
    const extract = (seekMode, label) => extractFrameSequence({
        inputPath: resolveSourceInput(target.media),
        outputDir,
        sourceStartSec: plan.sourceStartSec,
        expectedFrameCount: plan.extractFrameCount,
        fps: context.fps,
        extension: context.frameExtension,
        jpegQualityScale: context.jpegQualityScale,
        seekMode,
        label: `${target.media.id}:${label}`,
        timeoutMs: context.timeoutMs
    });
    let frames = await extract('fast', 'fast');
    if (frames.length < plan.extractFrameCount) {
        for (const framePath of frames)
            await fs.rm(framePath, { force: true });
        frames = await extract('accurate', 'accurate-retry');
    }
    return { outputDir, frames };
};
// The frame indices the page asks a component for at the given scene times, by the arithmetic
// of the runtime itself.
const frameIndicesAt = (media, sceneTimes, settings) => sceneTimes.flatMap((time) => mediaFrameIndexAtSceneTime(media, time, settings) ?? []);
const runHolds = (run, frameIndex) => frameIndex >= run.firstIndex && frameIndex < run.firstIndex + run.frameCount;
/** The file of a frame index in a run; the run's first file for an index it does not hold. */
const frameUrlIn = (context, run, frameIndex) => {
    const fileNumber = runHolds(run, frameIndex) ? frameIndex - run.firstIndex + 1 : 1;
    return `${context.publicBasePath}/predecoded/${run.folder}/${fileNumber}.${context.frameExtension}`;
};
// Where in the source the picture of a frame index lies, by the numbering of the window run:
// toLocalDeterministicFrameIndex rounds the distance between the two starts to whole frames,
// and the part of a frame it drops is added back here.
const sourceTimeOfFrameIndex = (media, frameIndex, fps) => {
    const startsApart = media.sourceStartAt * fps - media.timelineStartAt * fps;
    return Math.max(0, (frameIndex + startsApart - Math.round(startsApart)) / fps);
};
const extractRun = async (media, context, run) => {
    const extracted = await extractComponentFrames({ media, folder: run.folder }, context, resolveLocalPredecodedExtractionPlan(run.sourceStartSec, media.sourceEndAt, run.frameCount, context.fps));
    const frames = await padTrailingFrames(extracted.outputDir, context.frameExtension, extracted.frames, run.frameCount);
    if (frames.length < run.frameCount) {
        throw new Error(`VisualFries deterministic media missing frames for ${media.id}: expected ${run.frameCount}, got ${frames.length}`);
    }
    return run;
};
// The component's frames in the frame window, extracted and keyed as they have always been:
// the frames of the window under toLocalDeterministicFrameIndex, and the first and the last
// file also under the two indices around them. Renders that worked keep exactly the pictures
// they had this way. One of them is a repeated first picture: for a source start between two
// frames the page asks for the frame before the first one of the window, and the slack
// answers with the first file.
const windowRun = (media, window, folder, fps) => ({
    folder,
    firstIndex: toLocalDeterministicFrameIndex(media, window.activeStartFrame, fps),
    frameCount: window.activeEndFrame - window.activeStartFrame,
    sourceStartSec: window.sourceStartSec
});
const assignWindowFrames = (manifest, media, context, run) => {
    const lastIndex = run.firstIndex + run.frameCount - 1;
    assignBoundaryFrames(manifest, media.id, Math.round(media.sourceStartAt * context.fps), frameUrlIn(context, run, run.firstIndex));
    for (let index = run.firstIndex; index <= lastIndex; index += 1) {
        manifest[media.id][String(index)] = frameUrlIn(context, run, index);
    }
    assignBoundaryFrames(manifest, media.id, lastIndex, frameUrlIn(context, run, lastIndex));
};
// A run for the drawn frames the manifest has no file for, from the first to the last of them.
// Next to a window run its frames are counted from that run, so the two number the source the
// same way whichever side the window's rounding fell to.
const runForMissingFrames = (media, missing, folder, fps, window) => {
    if (missing.length === 0)
        return null;
    const sorted = [...missing].sort((a, b) => a - b);
    return {
        folder,
        firstIndex: sorted[0],
        frameCount: sorted[sorted.length - 1] - sorted[0] + 1,
        sourceStartSec: window
            ? Math.max(0, window.sourceStartSec + (sorted[0] - window.firstIndex) / fps)
            : sourceTimeOfFrameIndex(media, sorted[0], fps)
    };
};
// Prepares the frames of one component and returns how many it extracted for drawn frames.
//
// 1. The component's frames in the frame window, as always (windowRun).
// 2. The frames the page asks for, by the arithmetic of the runtime, that are still missing.
//    A drawn frame gets its picture from a second run. A frame the page only looks at takes
//    its file from a run that holds it, and the first file otherwise.
//
// A frame that has a file keeps it. A component the page never shows gets no extraction, and
// its source is not even looked at.
const prepareMediaFrames = async (target, context, manifest, asked) => {
    const { media, folder } = target;
    const askedFrames = [...asked.rendered, ...asked.other];
    if (askedFrames.length === 0)
        return 0;
    const frames = (manifest[media.id] ??= {});
    const runs = [];
    if (asked.window && asked.rendered.length) {
        runs.push(await extractRun(media, context, windowRun(media, asked.window, folder, context.fps)));
        assignWindowFrames(manifest, media, context, runs[0]);
    }
    const missing = runForMissingFrames(media, asked.rendered.filter((frameIndex) => !(String(frameIndex) in frames)), runs.length ? `${folder}-outside` : folder, context.fps, runs[0]);
    if (missing)
        runs.push(await extractRun(media, context, missing));
    const framesPrepared = runs.reduce((sum, run) => sum + run.frameCount, 0);
    if (runs.length === 0) {
        // Only looked at, never drawn: the first picture of the clip stands for all of it.
        const firstIndex = Math.round(media.sourceStartAt * context.fps);
        const sourceStartSec = media.sourceStartAt;
        runs.push(await extractRun(media, context, { folder, firstIndex, frameCount: 1, sourceStartSec }));
    }
    for (const frameIndex of askedFrames) {
        const run = runs.find((candidate) => runHolds(candidate, frameIndex)) ?? runs[0];
        frames[String(frameIndex)] ??= frameUrlIn(context, run, frameIndex);
    }
    return framesPrepared;
};
// Every frame of the window, at the frame rate of the scene. Seeks past the end of the scene
// all land on its last frame, so one of them stands for the rest.
const windowRenderTimes = (window, settings) => {
    const sceneEndFrame = Math.ceil(settings.duration * settings.fps);
    const toFrame = Math.min(window.toFrame, Math.max(window.fromFrame, sceneEndFrame) + 1);
    return Array.from({ length: Math.max(0, toFrame - window.fromFrame) }, (_, index) => (window.fromFrame + index) / settings.fps);
};
export async function prepareLocalDeterministicMedia(input) {
    const scene = cloneScene(SceneShape.parse(input.scene));
    const fps = scene.settings.fps || 30;
    const publicBasePath = normalizeDeterministicPublicBasePath(input.publicBasePath ?? '/deterministic-media');
    const assetsRoot = resolveSafeAssetRoot(input.workDir, publicBasePath);
    const context = {
        fps,
        frameExtension: input.frameExtension ?? 'jpg',
        jpegQualityScale: Math.max(1, Math.min(31, Math.floor(input.jpegQualityScale ?? 2))),
        predecodedRoot: path.join(assetsRoot, 'predecoded'),
        publicBasePath,
        timeoutMs: input.extractionTimeoutMs ?? DEFAULT_EXTRACTION_TIMEOUT_MS
    };
    await fs.mkdir(context.predecodedRoot, { recursive: true });
    const shown = shownSceneTimes({
        settings: scene.settings,
        renderTimes: input.renderTimes ?? windowRenderTimes(input, scene.settings),
        seekTimes: input.seekTimes
    });
    const frameManifest = {};
    const preparedMedia = [];
    for (const [position, media] of collectLocalDeterministicMediaComponents(scene).entries()) {
        const framesPrepared = await prepareMediaFrames({ media, folder: componentFolder(media, position) }, context, frameManifest, {
            rendered: frameIndicesAt(media, shown.rendered, scene.settings),
            other: frameIndicesAt(media, shown.other, scene.settings),
            window: resolveLocalDeterministicActiveWindow(media, input.fromFrame, input.toFrame, fps)
        });
        if (framesPrepared === 0)
            continue;
        preparedMedia.push({
            componentId: media.id,
            type: media.type,
            sourceUrl: normalizeUrl(media.sourceUrl),
            framesPrepared
        });
    }
    return {
        preparedScene: scene,
        payload: {
            strategy: 'visualfries-provider-predecoded',
            frameManifest,
            diagnosticsEnabled: input.diagnostics ?? false,
            mediaDeterministicStrict: input.strict ?? true
        },
        media: preparedMedia,
        assetsRoot,
        strategyUsed: 'predecoded-image-sequence'
    };
}
