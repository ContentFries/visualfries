import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export const contiguousFrameRange = (frameIndices) => {
    if (!frameIndices.length)
        return null;
    const fromFrame = frameIndices[0];
    for (let index = 1; index < frameIndices.length; index += 1) {
        if (frameIndices[index] !== fromFrame + index)
            return null;
    }
    return { fromFrame, toFrame: fromFrame + frameIndices.length };
};
export const dataUrlToBuffer = (dataUrl) => {
    const commaIndex = dataUrl.indexOf(',');
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    return Buffer.from(base64, 'base64');
};
export const writeDataUrlFrame = async (dataUrl, framePath) => {
    await fs.writeFile(framePath, dataUrlToBuffer(dataUrl));
};
export const resolveTmpParent = (tmpDir) => tmpDir ||
    process.env.VISUALFRIES_TMPDIR ||
    (existsSync('/private/tmp') ? '/private/tmp' : os.tmpdir());
export const frameFileName = (position, imageFormat) => `frame-${String(position).padStart(6, '0')}.${imageFormat}`;
// A contiguous request renders through the range binding. The client environment always
// takes the sparse path because it screenshots the live page.
export const resolveFrameRanges = (frameIndices, environment) => {
    const activeRange = environment === 'client' ? null : contiguousFrameRange(frameIndices);
    if (activeRange)
        return { activeRange, mediaPreparationRange: activeRange };
    if (frameIndices.length === 0)
        return { activeRange, mediaPreparationRange: null };
    return {
        activeRange,
        mediaPreparationRange: {
            fromFrame: Math.min(...frameIndices),
            toFrame: Math.max(...frameIndices) + 1
        }
    };
};
export const resolveTransport = (streamEncode, activeRange) => {
    if (streamEncode)
        return 'range-binding-stream-encode';
    return activeRange ? 'range-binding' : 'sparse-evaluate';
};
export const buildRendererOptions = (options) => ({
    serverRendererMode: options.serverRendererMode ?? 'canvas',
    environment: options.environment ?? 'server',
    preferWebGL2: options.preferWebGL2 ?? true,
    powerPreference: options.powerPreference ?? 'high-performance'
});
export const buildRenderDiagnostic = (input) => ({
    kind: 'visualfries-local-render',
    engine: input.engine,
    frameCount: input.frameCount,
    requestedFrameCount: input.requestedFrameCount,
    trimAwareRanges: input.effectiveRanges,
    serverRendererMode: input.serverRendererMode ?? 'canvas',
    transport: input.transport
});
// Frame folder for a frames-only run, otherwise next to the encoded video.
export const resolveMediaDiagnosticsPath = (input) => {
    if (!input.enabled)
        return null;
    return path.join(input.framesOnly ? path.resolve(input.output) : path.dirname(input.outputPath), 'media-diagnostics.json');
};
// Result for a request whose frames are all trimmed away: nothing renders, but a frames-only
// caller still gets a well-formed answer.
export const buildEmptyRangeResult = (input) => ({
    ok: true,
    scene: {
        id: input.scene.id,
        width: input.scene.settings.width,
        height: input.scene.settings.height,
        duration: input.scene.settings.duration,
        fps: input.scene.settings.fps
    },
    frames: {
        count: 0,
        dir: input.framesDir,
        items: [],
        transport: 'range-binding',
        skippedDuplicates: 0
    },
    output: path.resolve(input.options.output),
    encoded: false,
    encoding: { mode: 'none' },
    audio: { mode: 'none', selectedSources: 0, skippedSources: 0, plannedSources: 0 },
    mediaDiagnosticsPath: null,
    mediaDiagnostics: input.options.mediaDiagnostics
        ? [
            buildRenderDiagnostic({
                engine: input.engine,
                frameCount: 0,
                requestedFrameCount: input.options.frameIndices.length,
                effectiveRanges: input.effectiveRanges,
                serverRendererMode: input.options.serverRendererMode,
                transport: 'range-binding'
            })
        ]
        : []
});
export const buildResolveAliases = (input) => {
    const aliases = {
        'visualfries-runtime': input.runtimeEntry,
        $lib: input.libRoot,
        url: path.join(input.tempRoot, 'node-url-shim.js'),
        eventemitter3: path.join(input.tempRoot, 'eventemitter3-shim.js'),
        earcut: path.join(input.tempRoot, 'earcut-shim.js'),
        md5: path.join(input.tempRoot, 'md5-shim.js'),
        'svelte/internal/client': input.svelteClientEntry,
        'svelte/internal/server': input.svelteServerEntry
    };
    if (input.deterministic) {
        aliases['gifuct-js'] = path.join(input.tempRoot, 'gifuct-js-shim.js');
    }
    return aliases;
};
// Receives frames pushed from the page: written to disk, or piped to the encoder when one
// is running. A duplicate repeats the previous frame without the page sending data again.
export const createFrameWriter = (input) => {
    const frames = [];
    let outputFrameIndex = 0;
    let previousFramePath;
    let previousFrameBuffer;
    const streamFrame = async (payload) => {
        let frameBuffer;
        if (payload.isDuplicate) {
            if (!previousFrameBuffer)
                throw new Error(`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`);
            frameBuffer = previousFrameBuffer;
        }
        else if (payload.dataUrl) {
            frameBuffer = dataUrlToBuffer(payload.dataUrl);
        }
        else {
            throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
        }
        await input.streamEncoder.writeFrame(frameBuffer);
        previousFrameBuffer = frameBuffer;
    };
    const diskFrame = async (payload, framePath) => {
        if (payload.isDuplicate) {
            if (!previousFramePath)
                throw new Error(`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`);
            await fs.copyFile(previousFramePath, framePath);
        }
        else if (payload.dataUrl) {
            await writeDataUrlFrame(payload.dataUrl, framePath);
        }
        else {
            throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
        }
        previousFramePath = framePath;
    };
    const write = async (payload) => {
        if (!input.rangeBinding)
            throw new Error('VisualFries frame writer is only available for contiguous frame ranges.');
        outputFrameIndex += 1;
        const framePath = path.join(input.framesDir, frameFileName(outputFrameIndex, input.imageFormat));
        if (input.streamEncoder)
            await streamFrame(payload);
        else
            await diskFrame(payload, framePath);
        frames.push({
            frame: payload.frameIndex,
            time: payload.frameIndex / input.fps,
            path: input.streamEncoder ? null : framePath,
            isDuplicate: Boolean(payload.isDuplicate)
        });
    };
    return { frames, write };
};
// Collects everything that went wrong in the page; the render result lists it so a blank
// frame can be traced to a failed request or a script error.
export const attachPageDiagnostics = (page, runtimeErrors) => {
    page.on('console', (message) => {
        if (message.type() === 'error') {
            runtimeErrors.push(`console: ${message.text()}`);
            console.error(`[browser] ${message.text()}`);
        }
    });
    page.on('pageerror', (error) => {
        runtimeErrors.push(`pageerror: ${error.message}`);
        console.error(`[browser pageerror] ${error.message}\n${error.stack || ''}`);
    });
    page.on('requestfailed', (request) => {
        runtimeErrors.push(`requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`);
    });
    page.on('response', (response) => {
        if (response.status() >= 400) {
            runtimeErrors.push(`http: ${response.status()} ${response.url()}`);
        }
    });
};
// Frames arrive through the frame writer binding; only the skipped count comes back here.
export const renderFrameRanges = async (page, ranges, input) => {
    let framesSkipped = 0;
    for (const range of ranges) {
        const summary = await page.evaluate((renderOptions) => window.__VISUALFRIES_RENDER__.renderFrameRange(renderOptions), {
            fromFrame: range.fromFrame,
            toFrame: range.toFrame,
            imageFormat: input.imageFormat,
            imageQuality: input.imageQuality,
            skipDuplicates: input.skipDuplicates
        });
        framesSkipped += summary?.framesSkipped ?? 0;
    }
    return { framesSkipped };
};
// Frame by frame for requests that are not one contiguous range. The client environment
// screenshots the live page; the server environment asks the renderer for the frame.
export const renderSparseFrames = async (page, input) => {
    const items = [];
    for (let index = 0; index < input.frameIndices.length; index += 1) {
        const frame = input.frameIndices[index];
        const time = frame / input.fps;
        const framePath = path.join(input.framesDir, frameFileName(index + 1, input.imageFormat));
        if (input.environment === 'client') {
            await page.evaluate((payload) => window.__VISUALFRIES_RENDER__.seek(payload), {
                time
            });
            const screenshot = await page.locator('#vf-root').screenshot({
                type: input.imageFormat === 'png' ? 'png' : 'jpeg',
                ...(input.imageFormat === 'png' ? {} : { quality: Math.round(input.imageQuality * 100) })
            });
            await fs.writeFile(framePath, screenshot);
        }
        else {
            const dataUrl = await page.evaluate((renderOptions) => window.__VISUALFRIES_RENDER__.renderFrame(renderOptions), { time, imageFormat: input.imageFormat, imageQuality: input.imageQuality });
            await writeDataUrlFrame(dataUrl, framePath);
        }
        items.push({ frame, time, path: framePath, isDuplicate: false });
    }
    return items;
};
