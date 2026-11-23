import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SceneShape } from '../schemas/scene/index.js';
import { mediaFrameIndexAtSceneTime, sceneTimesOutsideWindow } from './sceneTime.js';
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
// file system that ignores it. The position in the scene makes every folder its own.
const componentFolder = (media, position) => `${position}-${safeFilePart(media.id)}`;
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
const frameUrlFor = (target, context, fileNumber) => `${context.publicBasePath}/predecoded/${target.folder}/${fileNumber}.${context.frameExtension}`;
// Only fills indices that have no frame yet, so real frames of the window always win.
const assignBootstrapFrames = (manifest, target, frameUrl) => {
    for (const frameIndex of target.bootstrapFrameIndices) {
        assignBoundaryFrames(manifest, target.media.id, frameIndex, frameUrl);
    }
};
// A component that is not on screen in the frame window needs a frame only when the page
// shows it at a scene time outside the window (where the scene tree is built, for one). That
// time is never rendered to a frame, so the component's first frame stands in for it. A
// component the page never shows gets no extraction, and its source is not even looked at.
const prepareBootstrapFrame = async (target, context, manifest) => {
    if (target.bootstrapFrameIndices.length === 0)
        return;
    const plan = resolveLocalPredecodedExtractionPlan(target.media.sourceStartAt, target.media.sourceEndAt, 1, context.fps);
    const { frames } = await extractComponentFrames(target, context, plan);
    if (frames.length < 1) {
        throw new Error(`VisualFries deterministic media missing bootstrap frame for ${target.media.id}`);
    }
    assignBootstrapFrames(manifest, target, frameUrlFor(target, context, 1));
};
// Every frame of the component inside the window, keyed by the index the renderer asks for.
// Returns the number of frames prepared.
const prepareWindowFrames = async (target, context, manifest, activeWindow) => {
    const { media } = target;
    const expectedFrameCount = activeWindow.activeEndFrame - activeWindow.activeStartFrame;
    const extractionPlan = resolveLocalPredecodedExtractionPlan(activeWindow.sourceStartSec, media.sourceEndAt, expectedFrameCount, context.fps);
    if (extractionPlan.extractFrameCount <= 0)
        return 0;
    const extracted = await extractComponentFrames(target, context, extractionPlan);
    const frames = await padTrailingFrames(extracted.outputDir, context.frameExtension, extracted.frames, expectedFrameCount);
    if (frames.length < expectedFrameCount) {
        throw new Error(`VisualFries deterministic media missing frames for ${media.id}: expected ${expectedFrameCount}, got ${frames.length}`);
    }
    const firstDeterministicFrameIndex = toLocalDeterministicFrameIndex(media, activeWindow.activeStartFrame, context.fps);
    const firstFrameUrl = frameUrlFor(target, context, 1);
    assignBoundaryFrames(manifest, media.id, Math.round(media.sourceStartAt * context.fps), firstFrameUrl);
    for (let index = 0; index < expectedFrameCount; index += 1) {
        const fullPath = path.join(extracted.outputDir, `${index + 1}.${context.frameExtension}`);
        if (!existsSync(fullPath)) {
            throw new Error(`VisualFries deterministic media frame missing: ${fullPath}`);
        }
        manifest[media.id][String(firstDeterministicFrameIndex + index)] = frameUrlFor(target, context, index + 1);
    }
    assignBoundaryFrames(manifest, media.id, firstDeterministicFrameIndex + expectedFrameCount - 1, frameUrlFor(target, context, expectedFrameCount));
    // After the real frames, so it only fills indices that are still missing.
    assignBootstrapFrames(manifest, target, firstFrameUrl);
    return expectedFrameCount;
};
// Media in a muted layer gets no frames (collectLocalDeterministicMediaComponents skips it),
// so the page must not ask for any: it is hidden, like a component with `visible: false`.
const hideMediaOfMutedLayers = (scene) => {
    for (const layer of scene.layers) {
        if (!layer.muted)
            continue;
        for (const component of layer.components) {
            if (component.type === 'VIDEO' || component.type === 'GIF')
                component.visible = false;
        }
    }
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
    const timesOutsideWindow = sceneTimesOutsideWindow({
        settings: scene.settings,
        fromFrame: input.fromFrame,
        toFrame: input.toFrame,
        seekTimes: input.seekTimes
    });
    const frameManifest = {};
    const preparedMedia = [];
    for (const [position, media] of collectLocalDeterministicMediaComponents(scene).entries()) {
        const target = {
            media,
            folder: componentFolder(media, position),
            bootstrapFrameIndices: timesOutsideWindow
                .map((time) => mediaFrameIndexAtSceneTime(media, time, scene.settings))
                .filter((frameIndex) => frameIndex !== null)
        };
        const activeWindow = resolveLocalDeterministicActiveWindow(media, input.fromFrame, input.toFrame, fps);
        if (!activeWindow) {
            await prepareBootstrapFrame(target, context, frameManifest);
            continue;
        }
        const framesPrepared = await prepareWindowFrames(target, context, frameManifest, activeWindow);
        if (framesPrepared === 0)
            continue;
        preparedMedia.push({
            componentId: media.id,
            type: media.type,
            sourceUrl: normalizeUrl(media.sourceUrl),
            framesPrepared
        });
    }
    hideMediaOfMutedLayers(scene);
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
