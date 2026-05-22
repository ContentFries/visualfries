import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SceneShape } from '../schemas/scene/index.js';
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
        return { sourceStartSec, extractFrameCount: outputFrameCount, outputFrameCount, sourceEndLimited: false };
    }
    const availableFrames = Math.max(1, Math.ceil((sourceEndSec - sourceStartSec) * fps - 1e-6));
    return {
        sourceStartSec,
        extractFrameCount: Math.min(outputFrameCount, availableFrames),
        outputFrameCount,
        sourceEndLimited: availableFrames < outputFrameCount
    };
}
const runFfmpeg = async (args, label) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    await new Promise((resolve, reject) => {
        const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr?.on('data', (chunk) => {
            stderr = (stderr + String(chunk)).slice(-4000);
        });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`[visualfries deterministic media][${label}] ffmpeg exited ${code}. ${stderr}`));
            }
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
    await runFfmpeg(args, options.label ?? 'extract-frame-sequence');
    return listFrameFiles(options.outputDir, options.extension);
};
const padTrailingFrames = async (outputDir, extension, frames, expectedFrameCount) => {
    if (frames.length === expectedFrameCount || frames.length === 0 || frames.length > expectedFrameCount) {
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
export async function prepareLocalDeterministicMedia(input) {
    const scene = cloneScene(SceneShape.parse(input.scene));
    const fps = scene.settings.fps || 30;
    const publicBasePath = input.publicBasePath ?? '/deterministic-media';
    const frameExtension = input.frameExtension ?? 'jpg';
    const jpegQualityScale = Math.max(1, Math.min(31, Math.floor(input.jpegQualityScale ?? 2)));
    const assetsRoot = path.join(input.workDir, publicBasePath.replace(/^\/+/, ''));
    const predecodedRoot = path.join(assetsRoot, 'predecoded');
    await fs.mkdir(predecodedRoot, { recursive: true });
    const mediaComponents = collectLocalDeterministicMediaComponents(scene);
    const frameManifest = {};
    const preparedMedia = [];
    for (const media of mediaComponents) {
        const activeWindow = resolveLocalDeterministicActiveWindow(media, input.fromFrame, input.toFrame, fps);
        const componentDirName = safeFilePart(media.id);
        const componentOutputDir = path.join(predecodedRoot, componentDirName);
        await fs.rm(componentOutputDir, { recursive: true, force: true });
        await fs.mkdir(componentOutputDir, { recursive: true });
        const activeStartFrame = activeWindow?.activeStartFrame ?? input.fromFrame;
        const expectedFrameCount = activeWindow
            ? activeWindow.activeEndFrame - activeWindow.activeStartFrame
            : 1;
        if (expectedFrameCount <= 0)
            continue;
        const extractionPlan = resolveLocalPredecodedExtractionPlan(activeWindow?.sourceStartSec ?? media.sourceStartAt, media.sourceEndAt, expectedFrameCount, fps);
        if (extractionPlan.extractFrameCount <= 0)
            continue;
        const sourceInput = toInputPath(media.sourceUrl);
        if (!/^https?:\/\//.test(sourceInput) && !existsSync(sourceInput)) {
            throw new Error(`VisualFries deterministic media source does not exist: ${media.sourceUrl}`);
        }
        let frames = await extractFrameSequence({
            inputPath: sourceInput,
            outputDir: componentOutputDir,
            sourceStartSec: extractionPlan.sourceStartSec,
            expectedFrameCount: extractionPlan.extractFrameCount,
            fps,
            extension: frameExtension,
            jpegQualityScale,
            seekMode: 'fast',
            label: `${media.id}:fast`
        });
        if (frames.length < extractionPlan.extractFrameCount) {
            for (const framePath of frames)
                await fs.rm(framePath, { force: true });
            frames = await extractFrameSequence({
                inputPath: sourceInput,
                outputDir: componentOutputDir,
                sourceStartSec: extractionPlan.sourceStartSec,
                expectedFrameCount: extractionPlan.extractFrameCount,
                fps,
                extension: frameExtension,
                jpegQualityScale,
                seekMode: 'accurate',
                label: `${media.id}:accurate-retry`
            });
        }
        frames = await padTrailingFrames(componentOutputDir, frameExtension, frames, expectedFrameCount);
        if (frames.length < expectedFrameCount) {
            throw new Error(`VisualFries deterministic media missing frames for ${media.id}: expected ${expectedFrameCount}, got ${frames.length}`);
        }
        const firstDeterministicFrameIndex = activeWindow
            ? toLocalDeterministicFrameIndex(media, activeStartFrame, fps)
            : Math.round(media.sourceStartAt * fps);
        const firstFrameUrl = `${publicBasePath}/predecoded/${componentDirName}/1.${frameExtension}`;
        assignBoundaryFrames(frameManifest, media.id, Math.round(media.sourceStartAt * fps), firstFrameUrl);
        for (let index = 0; index < expectedFrameCount; index += 1) {
            const fileName = `${index + 1}.${frameExtension}`;
            const fullPath = path.join(componentOutputDir, fileName);
            if (!existsSync(fullPath)) {
                throw new Error(`VisualFries deterministic media frame missing: ${fullPath}`);
            }
            frameManifest[media.id] = frameManifest[media.id] ?? {};
            frameManifest[media.id][String(firstDeterministicFrameIndex + index)] =
                `${publicBasePath}/predecoded/${componentDirName}/${fileName}`;
        }
        const lastFrameUrl = `${publicBasePath}/predecoded/${componentDirName}/${expectedFrameCount}.${frameExtension}`;
        assignBoundaryFrames(frameManifest, media.id, firstDeterministicFrameIndex + expectedFrameCount - 1, lastFrameUrl);
        preparedMedia.push({
            componentId: media.id,
            type: media.type,
            sourceUrl: normalizeUrl(media.sourceUrl),
            framesPrepared: expectedFrameCount
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
