import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	attachPageDiagnostics,
	buildEmptyRangeResult,
	buildRenderDiagnostic,
	buildRendererOptions,
	buildResolveAliases,
	contiguousFrameRange,
	createFrameWriter,
	dataUrlToBuffer,
	frameFileName,
	initRenderPage,
	renderFrameRanges,
	renderSparseFrames,
	resolveFrameRanges,
	resolveRenderTimes,
	resolveMediaDiagnosticsPath,
	resolveTmpParent,
	resolveTransport,
	withPhaseTimeout
} from '$lib/agent/localRenderSteps.js';
import type { LocalRenderOptions } from '$lib/agent';
import type { Scene } from '$lib/schemas/scene';

const dataUrl = (text: string) => `data:image/png;base64,${Buffer.from(text).toString('base64')}`;

let workDir: string;

beforeEach(async () => {
	workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-steps-test-'));
});

afterEach(async () => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	await fs.rm(workDir, { recursive: true, force: true });
});

describe('frame range resolution', () => {
	it('finds a contiguous range and rejects gaps, repeats and empty input', () => {
		expect(contiguousFrameRange([])).toBeNull();
		expect(contiguousFrameRange([4])).toEqual({ fromFrame: 4, toFrame: 5 });
		expect(contiguousFrameRange([3, 4, 5])).toEqual({ fromFrame: 3, toFrame: 6 });
		expect(contiguousFrameRange([3, 5])).toBeNull();
		expect(contiguousFrameRange([3, 3])).toBeNull();
		expect(contiguousFrameRange([5, 4])).toBeNull();
	});

	it('uses the contiguous range for both active and media preparation on the server', () => {
		expect(resolveFrameRanges([2, 3, 4], undefined)).toEqual({
			activeRange: { fromFrame: 2, toFrame: 5 },
			mediaPreparationRange: { fromFrame: 2, toFrame: 5 }
		});
	});

	it('covers sparse requests with the min..max span for media preparation', () => {
		expect(resolveFrameRanges([7, 2, 9], 'server')).toEqual({
			activeRange: null,
			mediaPreparationRange: { fromFrame: 2, toFrame: 10 }
		});
	});

	it('never uses the range binding in the client environment', () => {
		expect(resolveFrameRanges([0, 1, 2], 'client')).toEqual({
			activeRange: null,
			mediaPreparationRange: { fromFrame: 0, toFrame: 3 }
		});
	});

	it('has no ranges when no frames are requested', () => {
		expect(resolveFrameRanges([], 'server')).toEqual({
			activeRange: null,
			mediaPreparationRange: null
		});
	});

	it('gives the scene times of a range render: its frames at the frame rate of the scene', () => {
		// A trim zone took frames 150-269 out of the request; the page never seeks there.
		expect(
			resolveRenderTimes({
				activeRange: { fromFrame: 150, toFrame: 273 },
				effectiveRanges: [
					{ fromFrame: 148, toFrame: 150 },
					{ fromFrame: 270, toFrame: 273 }
				],
				frameIndices: [],
				fps: 60,
				sceneFps: 30
			})
		).toEqual([148 / 30, 149 / 30, 9, 271 / 30, 272 / 30]);
	});

	it('gives the scene times of a frame-by-frame render: the asked frames at the asked rate', () => {
		// Two frames, not the billion between them.
		expect(
			resolveRenderTimes({
				activeRange: null,
				effectiveRanges: [],
				frameIndices: [120, 1_000_000_000],
				fps: 60,
				sceneFps: 30
			})
		).toEqual([2, 1_000_000_000 / 60]);
	});

	it('names the transport after how frames are delivered', () => {
		const range = { fromFrame: 0, toFrame: 1 };
		expect(resolveTransport(true, range)).toBe('range-binding-stream-encode');
		expect(resolveTransport(false, range)).toBe('range-binding');
		expect(resolveTransport(false, null)).toBe('sparse-evaluate');
	});
});

describe('option resolution', () => {
	it('prefers the explicit temp dir, then the environment, then a platform default', () => {
		const original = process.env.VISUALFRIES_TMPDIR;
		try {
			process.env.VISUALFRIES_TMPDIR = '/from/env';
			expect(resolveTmpParent('/explicit')).toBe('/explicit');
			expect(resolveTmpParent(undefined)).toBe('/from/env');
			delete process.env.VISUALFRIES_TMPDIR;
			expect(resolveTmpParent(undefined)).toBe(
				existsSync('/private/tmp') ? '/private/tmp' : os.tmpdir()
			);
		} finally {
			if (original === undefined) delete process.env.VISUALFRIES_TMPDIR;
			else process.env.VISUALFRIES_TMPDIR = original;
		}
	});

	it('fills renderer defaults and keeps explicit choices', () => {
		const base = { scene: {}, output: 'o', frameIndices: [], fps: 30 } as LocalRenderOptions;
		expect(buildRendererOptions(base)).toEqual({
			serverRendererMode: 'canvas',
			environment: 'server',
			preferWebGL2: true,
			powerPreference: 'high-performance'
		});
		expect(
			buildRendererOptions({
				...base,
				serverRendererMode: 'webgl',
				environment: 'client',
				preferWebGL2: false,
				powerPreference: 'low-power'
			})
		).toEqual({
			serverRendererMode: 'webgl',
			environment: 'client',
			preferWebGL2: false,
			powerPreference: 'low-power'
		});
	});

	it('builds the module aliases and adds the GIF shim only for deterministic renders', () => {
		const input = {
			runtimeEntry: '/rt.ts',
			libRoot: '/lib',
			tempRoot: '/tmp/root',
			svelteClientEntry: '/svelte/client.js',
			svelteServerEntry: '/svelte/server.js',
			deterministic: false
		};
		const plain = buildResolveAliases(input);
		expect(plain).toEqual({
			'visualfries-runtime': '/rt.ts',
			$lib: '/lib',
			url: '/tmp/root/node-url-shim.js',
			eventemitter3: '/tmp/root/eventemitter3-shim.js',
			earcut: '/tmp/root/earcut-shim.js',
			md5: '/tmp/root/md5-shim.js',
			'svelte/internal/client': '/svelte/client.js',
			'svelte/internal/server': '/svelte/server.js'
		});
		expect(buildResolveAliases({ ...input, deterministic: true })).toEqual({
			...plain,
			'gifuct-js': '/tmp/root/gifuct-js-shim.js'
		});
	});

	it('pads frame file names to six digits', () => {
		expect(frameFileName(7, 'png')).toBe('frame-000007.png');
		expect(frameFileName(123456, 'jpg')).toBe('frame-123456.jpg');
	});

	it('decodes data URLs and bare base64', () => {
		expect(dataUrlToBuffer(dataUrl('hello')).toString()).toBe('hello');
		expect(dataUrlToBuffer(Buffer.from('bare').toString('base64')).toString()).toBe('bare');
	});
});

describe('diagnostics output', () => {
	it('describes the render with defaults for the renderer mode', () => {
		expect(
			buildRenderDiagnostic({
				engine: 'deterministic-local',
				frameCount: 4,
				requestedFrameCount: 5,
				effectiveRanges: [{ fromFrame: 0, toFrame: 4, startSec: 0, endSec: 0.4 }],
				transport: 'range-binding'
			})
		).toEqual({
			kind: 'visualfries-local-render',
			engine: 'deterministic-local',
			frameCount: 4,
			requestedFrameCount: 5,
			trimAwareRanges: [{ fromFrame: 0, toFrame: 4, startSec: 0, endSec: 0.4 }],
			serverRendererMode: 'canvas',
			transport: 'range-binding'
		});
	});

	it('writes diagnostics into the frames folder for frames-only runs, else next to the video', () => {
		expect(
			resolveMediaDiagnosticsPath({
				enabled: undefined,
				framesOnly: true,
				output: 'frames',
				outputPath: '/x/frames'
			})
		).toBeNull();
		expect(
			resolveMediaDiagnosticsPath({
				enabled: true,
				framesOnly: true,
				output: '/x/frames',
				outputPath: '/x/frames'
			})
		).toBe('/x/frames/media-diagnostics.json');
		expect(
			resolveMediaDiagnosticsPath({
				enabled: true,
				framesOnly: false,
				output: '/x/video.mp4',
				outputPath: '/x/video.mp4'
			})
		).toBe('/x/media-diagnostics.json');
	});

	it('builds the empty result for a fully trimmed request', () => {
		const scene = {
			id: 's',
			settings: { width: 10, height: 20, duration: 3, fps: 12 }
		} as unknown as Scene;
		const options = {
			scene,
			output: 'out/dir',
			frameIndices: [0, 1],
			fps: 12,
			mediaDiagnostics: true
		} as LocalRenderOptions;
		const result = buildEmptyRangeResult({
			scene,
			framesDir: '/frames',
			options,
			engine: 'browser-preview',
			effectiveRanges: []
		});
		expect(result.scene).toEqual({ id: 's', width: 10, height: 20, duration: 3, fps: 12 });
		expect(result.output).toBe(path.resolve('out/dir'));
		expect(result.mediaDiagnostics).toHaveLength(1);
		expect(result.mediaDiagnostics[0]).toMatchObject({
			engine: 'browser-preview',
			frameCount: 0,
			requestedFrameCount: 2,
			serverRendererMode: 'canvas'
		});
		expect(
			buildEmptyRangeResult({
				scene,
				framesDir: '/frames',
				options: { ...options, mediaDiagnostics: false },
				engine: 'browser-preview',
				effectiveRanges: []
			}).mediaDiagnostics
		).toEqual([]);
	});

	it('records browser errors and ignores other console output', () => {
		const handlers: Record<string, (arg: any) => void> = {};
		const page = { on: (name: string, handler: (arg: any) => void) => (handlers[name] = handler) };
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const errors: string[] = [];
		attachPageDiagnostics(page, errors);

		handlers.console({ type: () => 'log', text: () => 'noise' });
		handlers.console({ type: () => 'error', text: () => 'boom' });
		handlers.pageerror(Object.assign(new Error('crash'), { stack: '' }));
		handlers.requestfailed({
			method: () => 'GET',
			url: () => 'http://x/a.png',
			failure: () => ({ errorText: 'net::ERR' })
		});
		handlers.requestfailed({ method: () => 'GET', url: () => 'http://x/b', failure: () => null });
		handlers.response({ status: () => 200, url: () => 'http://x/ok' });
		handlers.response({ status: () => 404, url: () => 'http://x/missing' });

		expect(errors).toEqual([
			'console: boom',
			'pageerror: crash',
			'requestfailed: GET http://x/a.png (net::ERR)',
			'requestfailed: GET http://x/b (unknown)',
			'http: 404 http://x/missing'
		]);
		expect(errorSpy).toHaveBeenCalledWith('[browser] boom');
	});
});

describe('createFrameWriter', () => {
	const input = (extra: Record<string, unknown> = {}) => ({
		rangeBinding: true,
		framesDir: workDir,
		imageFormat: 'png' as const,
		fps: 10,
		...extra
	});

	it('writes frames to numbered files and records their times', async () => {
		const writer = createFrameWriter(input());
		await writer.write({ frameIndex: 5, dataUrl: dataUrl('one') });
		await writer.write({ frameIndex: 6, dataUrl: dataUrl('two') });
		expect(writer.frames).toEqual([
			{ frame: 5, time: 0.5, path: path.join(workDir, 'frame-000001.png'), isDuplicate: false },
			{ frame: 6, time: 0.6, path: path.join(workDir, 'frame-000002.png'), isDuplicate: false }
		]);
		expect(await fs.readFile(path.join(workDir, 'frame-000002.png'), 'utf8')).toBe('two');
	});

	it('reports when the last frame was written', async () => {
		const writer = createFrameWriter(input());
		expect(writer.lastWriteAt()).toBe(0);
		const before = Date.now();
		await writer.write({ frameIndex: 5, dataUrl: dataUrl('one') });
		expect(writer.lastWriteAt()).toBeGreaterThanOrEqual(before);
	});

	it('copies the previous file for a duplicate frame', async () => {
		const writer = createFrameWriter(input());
		await writer.write({ frameIndex: 0, dataUrl: dataUrl('same') });
		await writer.write({ frameIndex: 1, isDuplicate: true });
		expect(await fs.readFile(path.join(workDir, 'frame-000002.png'), 'utf8')).toBe('same');
		expect(writer.frames[1].isDuplicate).toBe(true);
	});

	it('rejects duplicates without a predecessor and frames without data', async () => {
		const writer = createFrameWriter(input());
		await expect(writer.write({ frameIndex: 3, isDuplicate: true })).rejects.toThrow(
			'Frame 3 was marked duplicate without a previous frame.'
		);
		await expect(writer.write({ frameIndex: 4 })).rejects.toThrow(
			'Frame 4 did not include frame data.'
		);
		expect(writer.frames).toEqual([]);
	});

	it('refuses frames when the request is not one contiguous range', async () => {
		const writer = createFrameWriter(input({ rangeBinding: false }));
		await expect(writer.write({ frameIndex: 0, dataUrl: dataUrl('x') })).rejects.toThrow(
			'VisualFries frame writer is only available for contiguous frame ranges.'
		);
	});

	it('pipes frames to the encoder instead of disk and repeats the last buffer for duplicates', async () => {
		const written: string[] = [];
		const streamEncoder = {
			writeFrame: async (buffer: Buffer) => {
				written.push(buffer.toString());
			}
		};
		const writer = createFrameWriter(input({ streamEncoder }));
		await writer.write({ frameIndex: 0, dataUrl: dataUrl('a') });
		await writer.write({ frameIndex: 1, isDuplicate: true });
		await writer.write({ frameIndex: 2, dataUrl: dataUrl('b') });
		expect(written).toEqual(['a', 'a', 'b']);
		expect(writer.frames.map((item) => item.path)).toEqual([null, null, null]);
		expect(await fs.readdir(workDir)).toEqual([]);
	});

	it('rejects bad stream frames the same way', async () => {
		const writer = createFrameWriter(input({ streamEncoder: { writeFrame: async () => {} } }));
		await expect(writer.write({ frameIndex: 8, isDuplicate: true })).rejects.toThrow(
			'Frame 8 was marked duplicate without a previous frame.'
		);
		await expect(writer.write({ frameIndex: 9 })).rejects.toThrow(
			'Frame 9 did not include frame data.'
		);
	});
});

const never = () => new Promise<never>(() => {});

describe('withPhaseTimeout', () => {
	it('returns the result and passes an error on', async () => {
		await expect(
			withPhaseTimeout({ phase: 'init', timeoutMs: 1000 }, async () => 'built')
		).resolves.toBe('built');
		await expect(
			withPhaseTimeout({ phase: 'init', timeoutMs: 1000 }, async () => {
				throw new Error('page failed');
			})
		).rejects.toThrow('page failed');
	});

	it('rejects with the phase and the limit when nothing comes back', async () => {
		vi.useFakeTimers();
		const waiting = withPhaseTimeout({ phase: 'init', timeoutMs: 1000 }, never);
		const failed = expect(waiting).rejects.toThrow(
			'VisualFries local render timed out in phase "init": no result for 1000 ms.'
		);

		await vi.advanceTimersByTimeAsync(1000);
		await failed;
	});

	it('measures from the last progress when the phase reports it', async () => {
		vi.useFakeTimers();
		let lastProgressAt = 0;
		let settled = false;
		const waiting = withPhaseTimeout(
			{ phase: 'render frames 0-9', timeoutMs: 1000, lastProgressAt: () => lastProgressAt },
			never
		).catch((error: Error) => {
			settled = true;
			return error.message;
		});

		// A frame arrives after 0.9 s: the limit now runs out at 1.9 s, not at 1 s.
		await vi.advanceTimersByTimeAsync(900);
		lastProgressAt = Date.now();
		await vi.advanceTimersByTimeAsync(999);
		expect(settled).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		expect(await waiting).toContain('phase "render frames 0-9": no result for 1000 ms');
	});

	it('waits without a limit when the limit is 0', async () => {
		vi.useFakeTimers();
		let settled = false;
		void withPhaseTimeout({ phase: 'init', timeoutMs: 0 }, never).finally(() => {
			settled = true;
		});

		await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
		expect(settled).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});
});

const noTimeout = { frameTimeoutMs: 0, lastFrameAt: () => 0 };

describe('page-driving steps', () => {
	const renderPage = (init: () => Promise<unknown>) => {
		const steps: string[] = [];
		return {
			steps,
			goto: async (url: string, options: { waitUntil: string }) => {
				steps.push(`goto ${url} ${options.waitUntil}`);
			},
			waitForFunction: async () => {
				steps.push('wait for client');
			},
			evaluate: async () => {
				steps.push('init');
				return init();
			}
		};
	};

	it('loads the page, waits for the render client and builds the scene', async () => {
		const scene = { id: 'scene', width: 64, height: 48, duration: 1, fps: 30 };
		const page = renderPage(async () => scene);

		expect(await initRenderPage(page, { url: 'http://localhost:1/', timeoutMs: 1000 })).toBe(scene);
		expect(page.steps).toEqual(['goto http://localhost:1/ networkidle', 'wait for client', 'init']);
	});

	it('rejects with the page error when the scene cannot build', async () => {
		const page = renderPage(async () => {
			throw new Error(
				'page.evaluate: DeterministicRenderError: Deterministic frame provider returned null (component clip, frame 0, scene time 0)'
			);
		});

		await expect(
			initRenderPage(page, { url: 'http://localhost:1/', timeoutMs: 1000 })
		).rejects.toThrow('Deterministic frame provider returned null (component clip, frame 0');
	});

	it('rejects when the page does not finish init in time', async () => {
		vi.useFakeTimers();
		const page = renderPage(never);
		const failed = expect(
			initRenderPage(page, { url: 'http://localhost:1/', timeoutMs: 5000 })
		).rejects.toThrow('timed out in phase "init": no result for 5000 ms');

		await vi.advanceTimersByTimeAsync(5000);
		await failed;
	});

	it('rejects when a frame range stops delivering frames', async () => {
		vi.useFakeTimers();
		const failed = expect(
			renderFrameRanges({ evaluate: never }, [{ fromFrame: 1351, toFrame: 2676 }], {
				imageFormat: 'jpg',
				imageQuality: 0.5,
				skipDuplicates: true,
				frameTimeoutMs: 2000,
				lastFrameAt: () => 0
			})
		).rejects.toThrow('timed out in phase "render frames 1351-2676": no result for 2000 ms');

		await vi.advanceTimersByTimeAsync(2000);
		await failed;
	});

	it('rejects when a sparse frame does not come back', async () => {
		vi.useFakeTimers();
		const failed = expect(
			renderSparseFrames(
				{ evaluate: never },
				{
					frameIndices: [7],
					fps: 10,
					framesDir: workDir,
					imageFormat: 'png',
					imageQuality: 1,
					environment: 'server',
					frameTimeoutMs: 2000
				}
			)
		).rejects.toThrow('timed out in phase "render frame 7": no result for 2000 ms');

		await vi.advanceTimersByTimeAsync(2000);
		await failed;
	});

	it('renders each range and sums the skipped frames', async () => {
		const calls: any[] = [];
		const results = [{ framesSkipped: 2 }, undefined, { framesSkipped: 3 }];
		const page = {
			evaluate: async (fn: unknown, payload: unknown) => {
				calls.push(payload);
				return results[calls.length - 1];
			}
		};
		const summary = await renderFrameRanges(
			page,
			[
				{ fromFrame: 0, toFrame: 5 },
				{ fromFrame: 8, toFrame: 9 },
				{ fromFrame: 12, toFrame: 20 }
			],
			{ imageFormat: 'jpg', imageQuality: 0.5, skipDuplicates: true, ...noTimeout }
		);
		expect(summary).toEqual({ framesSkipped: 5 });
		expect(calls[1]).toEqual({
			fromFrame: 8,
			toFrame: 9,
			imageFormat: 'jpg',
			imageQuality: 0.5,
			skipDuplicates: true
		});
		expect(
			await renderFrameRanges(page, [], {
				imageFormat: 'png',
				imageQuality: 1,
				skipDuplicates: false,
				...noTimeout
			})
		).toEqual({ framesSkipped: 0 });
	});

	it('asks the renderer for each sparse frame in the server environment', async () => {
		const payloads: any[] = [];
		const page = {
			evaluate: async (fn: unknown, payload: any) => {
				payloads.push(payload);
				return dataUrl(`frame-${payload.time}`);
			}
		};
		const items = await renderSparseFrames(page, {
			frameIndices: [0, 5],
			fps: 10,
			framesDir: workDir,
			imageFormat: 'png',
			imageQuality: 0.9,
			environment: 'server',
			frameTimeoutMs: 0
		});
		expect(payloads).toEqual([
			{ time: 0, imageFormat: 'png', imageQuality: 0.9 },
			{ time: 0.5, imageFormat: 'png', imageQuality: 0.9 }
		]);
		expect(items).toEqual([
			{ frame: 0, time: 0, path: path.join(workDir, 'frame-000001.png'), isDuplicate: false },
			{ frame: 5, time: 0.5, path: path.join(workDir, 'frame-000002.png'), isDuplicate: false }
		]);
		expect(await fs.readFile(path.join(workDir, 'frame-000002.png'), 'utf8')).toBe('frame-0.5');
	});

	it('seeks and screenshots the live page in the client environment', async () => {
		const seeks: any[] = [];
		const shots: any[] = [];
		const page = {
			evaluate: async (fn: unknown, payload: any) => {
				seeks.push(payload);
			},
			locator: (selector: string) => ({
				screenshot: async (shot: any) => {
					shots.push({ selector, shot });
					return Buffer.from('pixels');
				}
			})
		};
		await renderSparseFrames(page, {
			frameIndices: [3],
			fps: 10,
			framesDir: workDir,
			imageFormat: 'jpg',
			imageQuality: 0.876,
			environment: 'client',
			frameTimeoutMs: 0
		});
		await renderSparseFrames(page, {
			frameIndices: [4],
			fps: 10,
			framesDir: workDir,
			imageFormat: 'png',
			imageQuality: 0.876,
			environment: 'client',
			frameTimeoutMs: 0
		});
		expect(seeks).toEqual([{ time: 0.3 }, { time: 0.4 }]);
		expect(shots).toEqual([
			{ selector: '#vf-root', shot: { type: 'jpeg', quality: 88 } },
			{ selector: '#vf-root', shot: { type: 'png' } }
		]);
		expect(await fs.readFile(path.join(workDir, 'frame-000001.jpg'), 'utf8')).toBe('pixels');
	});
});
