import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Scene } from '../schemas/scene/index.js';
import type { AgentRenderPlan } from './renderPlan.js';
import type { EffectiveRenderRange } from './renderRanges.js';
import type { LocalRenderOptions, LocalRenderResult } from './localRender.js';

// Decision logic and page-driving steps of renderSceneLocally. They sit apart from the
// browser and dev-server setup so they can be tested with a fake page and a temp folder.

type FrameRange = { fromFrame: number; toFrame: number };
type FrameItem = LocalRenderResult['frames']['items'][number];
type Transport = LocalRenderResult['frames']['transport'];

// The browser page is driven through `evaluate` and `locator` only; tests pass a fake.
type RenderPage = any;

export type FramePayload = {
	frameIndex: number;
	isDuplicate?: boolean;
	dataUrl?: string;
};

export const contiguousFrameRange = (frameIndices: number[]): FrameRange | null => {
	if (!frameIndices.length) return null;
	const fromFrame = frameIndices[0];
	for (let index = 1; index < frameIndices.length; index += 1) {
		if (frameIndices[index] !== fromFrame + index) return null;
	}
	return { fromFrame, toFrame: fromFrame + frameIndices.length };
};

export const dataUrlToBuffer = (dataUrl: string): Buffer => {
	const commaIndex = dataUrl.indexOf(',');
	const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
	return Buffer.from(base64, 'base64');
};

export const writeDataUrlFrame = async (dataUrl: string, framePath: string): Promise<void> => {
	await fs.writeFile(framePath, dataUrlToBuffer(dataUrl));
};

export const resolveTmpParent = (tmpDir?: string): string =>
	tmpDir ||
	process.env.VISUALFRIES_TMPDIR ||
	(existsSync('/private/tmp') ? '/private/tmp' : os.tmpdir());

export const frameFileName = (position: number, imageFormat: string): string =>
	`frame-${String(position).padStart(6, '0')}.${imageFormat}`;

// A contiguous request renders through the range binding. The client environment always
// takes the sparse path because it screenshots the live page.
export const resolveFrameRanges = (
	frameIndices: number[],
	environment: LocalRenderOptions['environment']
): { activeRange: FrameRange | null; mediaPreparationRange: FrameRange | null } => {
	const activeRange = environment === 'client' ? null : contiguousFrameRange(frameIndices);
	if (activeRange) return { activeRange, mediaPreparationRange: activeRange };
	if (frameIndices.length === 0) return { activeRange, mediaPreparationRange: null };
	return {
		activeRange,
		mediaPreparationRange: {
			fromFrame: Math.min(...frameIndices),
			toFrame: Math.max(...frameIndices) + 1
		}
	};
};

export const resolveTransport = (
	streamEncode: boolean,
	activeRange: FrameRange | null
): Transport => {
	if (streamEncode) return 'range-binding-stream-encode';
	return activeRange ? 'range-binding' : 'sparse-evaluate';
};

export const buildRendererOptions = (options: LocalRenderOptions) => ({
	serverRendererMode: options.serverRendererMode ?? 'canvas',
	environment: options.environment ?? 'server',
	preferWebGL2: options.preferWebGL2 ?? true,
	powerPreference: options.powerPreference ?? 'high-performance'
});

export const buildRenderDiagnostic = (input: {
	engine: AgentRenderPlan['engine'];
	frameCount: number;
	requestedFrameCount: number;
	effectiveRanges: EffectiveRenderRange[];
	serverRendererMode?: 'canvas' | 'webgl';
	transport: Transport;
}): Record<string, unknown> => ({
	kind: 'visualfries-local-render',
	engine: input.engine,
	frameCount: input.frameCount,
	requestedFrameCount: input.requestedFrameCount,
	trimAwareRanges: input.effectiveRanges,
	serverRendererMode: input.serverRendererMode ?? 'canvas',
	transport: input.transport
});

// Frame folder for a frames-only run, otherwise next to the encoded video.
export const resolveMediaDiagnosticsPath = (input: {
	enabled: boolean | undefined;
	framesOnly: boolean;
	output: string;
	outputPath: string;
}): string | null => {
	if (!input.enabled) return null;
	return path.join(
		input.framesOnly ? path.resolve(input.output) : path.dirname(input.outputPath),
		'media-diagnostics.json'
	);
};

// Result for a request whose frames are all trimmed away: nothing renders, but a frames-only
// caller still gets a well-formed answer.
export const buildEmptyRangeResult = (input: {
	scene: Scene;
	framesDir: string;
	options: LocalRenderOptions;
	engine: AgentRenderPlan['engine'];
	effectiveRanges: EffectiveRenderRange[];
}): LocalRenderResult => ({
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

export const buildResolveAliases = (input: {
	runtimeEntry: string;
	libRoot: string;
	tempRoot: string;
	svelteClientEntry: string;
	svelteServerEntry: string;
	deterministic: boolean;
}): Record<string, string> => {
	const aliases: Record<string, string> = {
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

type FrameWriterInput = {
	// False when the frames are not one contiguous range, which the binding cannot serve.
	rangeBinding: boolean;
	framesDir: string;
	imageFormat: 'png' | 'jpg';
	fps: number;
	streamEncoder?: { writeFrame(buffer: Buffer): Promise<void> };
};

// Receives frames pushed from the page: written to disk, or piped to the encoder when one
// is running. A duplicate repeats the previous frame without the page sending data again.
export const createFrameWriter = (input: FrameWriterInput) => {
	const frames: FrameItem[] = [];
	let outputFrameIndex = 0;
	let previousFramePath: string | undefined;
	let previousFrameBuffer: Buffer | undefined;

	const streamFrame = async (payload: FramePayload) => {
		let frameBuffer: Buffer;
		if (payload.isDuplicate) {
			if (!previousFrameBuffer)
				throw new Error(
					`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`
				);
			frameBuffer = previousFrameBuffer;
		} else if (payload.dataUrl) {
			frameBuffer = dataUrlToBuffer(payload.dataUrl);
		} else {
			throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
		}
		await input.streamEncoder!.writeFrame(frameBuffer);
		previousFrameBuffer = frameBuffer;
	};

	const diskFrame = async (payload: FramePayload, framePath: string) => {
		if (payload.isDuplicate) {
			if (!previousFramePath)
				throw new Error(
					`Frame ${payload.frameIndex} was marked duplicate without a previous frame.`
				);
			await fs.copyFile(previousFramePath, framePath);
		} else if (payload.dataUrl) {
			await writeDataUrlFrame(payload.dataUrl, framePath);
		} else {
			throw new Error(`Frame ${payload.frameIndex} did not include frame data.`);
		}
		previousFramePath = framePath;
	};

	const write = async (payload: FramePayload): Promise<void> => {
		if (!input.rangeBinding)
			throw new Error('VisualFries frame writer is only available for contiguous frame ranges.');
		outputFrameIndex += 1;
		const framePath = path.join(
			input.framesDir,
			frameFileName(outputFrameIndex, input.imageFormat)
		);
		if (input.streamEncoder) await streamFrame(payload);
		else await diskFrame(payload, framePath);
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
export const attachPageDiagnostics = (page: RenderPage, runtimeErrors: string[]): void => {
	page.on('console', (message: any) => {
		if (message.type() === 'error') {
			runtimeErrors.push(`console: ${message.text()}`);
			console.error(`[browser] ${message.text()}`);
		}
	});
	page.on('pageerror', (error: Error) => {
		runtimeErrors.push(`pageerror: ${error.message}`);
		console.error(`[browser pageerror] ${error.message}\n${error.stack || ''}`);
	});
	page.on('requestfailed', (request: any) => {
		runtimeErrors.push(
			`requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`
		);
	});
	page.on('response', (response: any) => {
		if (response.status() >= 400) {
			runtimeErrors.push(`http: ${response.status()} ${response.url()}`);
		}
	});
};

// Frames arrive through the frame writer binding; only the skipped count comes back here.
export const renderFrameRanges = async (
	page: RenderPage,
	ranges: FrameRange[],
	input: { imageFormat: 'png' | 'jpg'; imageQuality: number; skipDuplicates: boolean }
): Promise<{ framesSkipped: number }> => {
	let framesSkipped = 0;
	for (const range of ranges) {
		const summary = await page.evaluate(
			(renderOptions: any) =>
				(window as any).__VISUALFRIES_RENDER__.renderFrameRange(renderOptions),
			{
				fromFrame: range.fromFrame,
				toFrame: range.toFrame,
				imageFormat: input.imageFormat,
				imageQuality: input.imageQuality,
				skipDuplicates: input.skipDuplicates
			}
		);
		framesSkipped += summary?.framesSkipped ?? 0;
	}
	return { framesSkipped };
};

// Frame by frame for requests that are not one contiguous range. The client environment
// screenshots the live page; the server environment asks the renderer for the frame.
export const renderSparseFrames = async (
	page: RenderPage,
	input: {
		frameIndices: number[];
		fps: number;
		framesDir: string;
		imageFormat: 'png' | 'jpg';
		imageQuality: number;
		environment: LocalRenderOptions['environment'];
	}
): Promise<FrameItem[]> => {
	const items: FrameItem[] = [];
	for (let index = 0; index < input.frameIndices.length; index += 1) {
		const frame = input.frameIndices[index];
		const time = frame / input.fps;
		const framePath = path.join(input.framesDir, frameFileName(index + 1, input.imageFormat));
		if (input.environment === 'client') {
			await page.evaluate((payload: any) => (window as any).__VISUALFRIES_RENDER__.seek(payload), {
				time
			});
			const screenshot = await page.locator('#vf-root').screenshot({
				type: input.imageFormat === 'png' ? 'png' : 'jpeg',
				...(input.imageFormat === 'png' ? {} : { quality: Math.round(input.imageQuality * 100) })
			});
			await fs.writeFile(framePath, screenshot);
		} else {
			const dataUrl = await page.evaluate(
				(renderOptions: any) => (window as any).__VISUALFRIES_RENDER__.renderFrame(renderOptions),
				{ time, imageFormat: input.imageFormat, imageQuality: input.imageQuality }
			);
			await writeDataUrlFrame(dataUrl, framePath);
		}
		items.push({ frame, time, path: framePath, isDuplicate: false });
	}
	return items;
};
