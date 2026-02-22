import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js-legacy', () => {
	class ImageBitmapResource {
		public destroy = vi.fn();
		constructor(_bitmap: ImageBitmap) {}
	}

	return {
		ImageBitmapResource
	};
});

import { DeterministicMediaManager } from '$lib/managers/DeterministicMediaManager.ts';
import type { DeterministicFrameProvider, DeterministicFrameRequest, Scene } from '$lib';

const createScene = (): Scene =>
	({
		id: 'scene-1',
		settings: {
			width: 1920,
			height: 1080,
			duration: 2,
			fps: 30,
			backgroundColor: '#ffffff'
		},
		assets: [],
		layers: [],
		transitions: [],
		audioTracks: []
	}) as Scene;

const createRequest = (frameIndex: number): DeterministicFrameRequest => ({
	componentId: 'video-1',
	componentType: 'VIDEO',
	frameIndex,
	fps: 30,
	width: 1920,
	height: 1080
});

describe('DeterministicMediaManager', () => {
	let scene: Scene;

	beforeEach(() => {
		scene = createScene();
	});

	it('returns cached override on repeated same-frame resolve without re-calling provider', async () => {
		const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
		const provider: DeterministicFrameProvider = {
			getFrame: vi.fn().mockResolvedValue({
				kind: 'imageBitmap',
				cacheKey: 'cache-1',
				imageBitmap: bitmap
			})
		};

		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: { enabled: true, strict: false, diagnostics: false, provider }
		});

		const first = await manager.resolveOverride(createRequest(0));
		const second = await manager.resolveOverride(createRequest(0));

		expect(provider.getFrame).toHaveBeenCalledTimes(1);
		expect(first?.cacheKey).toBe('cache-1');
		expect(second?.cacheKey).toBe('cache-1');
	});

	it('returns null when provider returns null', async () => {
		const provider: DeterministicFrameProvider = {
			getFrame: vi.fn().mockResolvedValue(null)
		};

		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: { enabled: true, strict: false, diagnostics: false, provider }
		});

		const resolved = await manager.resolveOverride(createRequest(0));
		expect(resolved).toBeNull();
	});

	it('retries provider on same frame after null response', async () => {
		const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
		const provider: DeterministicFrameProvider = {
			getFrame: vi
				.fn()
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({
					kind: 'imageBitmap',
					cacheKey: 'retry-hit',
					imageBitmap: bitmap
				})
		};

		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: { enabled: true, strict: false, diagnostics: false, provider }
		});

		const first = await manager.resolveOverride(createRequest(0));
		const second = await manager.resolveOverride(createRequest(0));

		expect(first).toBeNull();
		expect(second?.cacheKey).toBe('retry-hit');
		expect(provider.getFrame).toHaveBeenCalledTimes(2);
	});

	it('evicts least-recently-used cached entries and closes resources on destroy', async () => {
		const firstBitmap = { close: vi.fn() } as unknown as ImageBitmap;
		const secondBitmap = { close: vi.fn() } as unknown as ImageBitmap;
		const provider: DeterministicFrameProvider = {
			getFrame: vi.fn().mockImplementation(async (request: DeterministicFrameRequest) => {
				if (request.frameIndex === 0) {
					return {
						kind: 'imageBitmap',
						cacheKey: 'cache-1',
						imageBitmap: firstBitmap
					};
				}
				return {
					kind: 'imageBitmap',
					cacheKey: 'cache-2',
					imageBitmap: secondBitmap
				};
			})
		};

		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: {
				enabled: true,
				strict: false,
				diagnostics: false,
				maxCachedTextures: 1,
				provider
			}
		});

		await manager.resolveOverride(createRequest(0));
		await manager.resolveOverride(createRequest(1));
		expect(firstBitmap.close).toHaveBeenCalledTimes(1);

		await manager.destroy();
		expect(secondBitmap.close).toHaveBeenCalledTimes(1);
	});

	it('generates deterministic fingerprint that changes when cache key changes', () => {
		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: { enabled: true, strict: false, diagnostics: false }
		});

		manager.commitCacheKey('video-1', 'cache-1');
		const first = manager.getFingerprint();

		manager.commitCacheKey('video-1', 'cache-2');
		const second = manager.getFingerprint();

		expect(first).not.toBe(second);
	});

	it('returns null diagnostics report when diagnostics are disabled', () => {
		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: { enabled: true, strict: false, diagnostics: false }
		});

		expect(manager.getDiagnosticsReport()).toBeNull();
	});

	it('reports aggregate and per-frame runtime diagnostics counters when enabled', () => {
		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: { enabled: true, strict: false, diagnostics: true }
		});

		manager.recordReadyAttempt(12);
		manager.recordExtraRenderPass(12, 2);
		manager.recordBlurRedraw(13, 3);

		const report = manager.getDiagnosticsReport();
		expect(report).not.toBeNull();
		expect(report?.selectedRendererType).toBe('canvas');
		expect(report?.rendererFallbackOccurred).toBe(false);
		expect(report?.readyAttempts).toBe(1);
		expect(report?.extraRenderPasses).toBe(2);
		expect(report?.blurRedraws).toBe(3);
		expect(report?.perFrame['12']).toEqual({
			readyAttempts: 1,
			extraRenderPasses: 2,
			blurRedraws: 0
		});
		expect(report?.perFrame['13']).toEqual({
			readyAttempts: 0,
			extraRenderPasses: 0,
			blurRedraws: 3
		});
	});

	it('stores renderer selection fallback metadata in diagnostics', () => {
		const manager = new DeterministicMediaManager({
			sceneData: scene,
			deterministicMediaConfig: { enabled: true, strict: false, diagnostics: true }
		});

		manager.recordRendererSelection({
			rendererType: 'canvas',
			fallbackOccurred: true,
			fallbackReason: 'WebGL unavailable'
		});

		const report = manager.getDiagnosticsReport();
		expect(report?.selectedRendererType).toBe('canvas');
		expect(report?.rendererFallbackOccurred).toBe(true);
		expect(report?.rendererFallbackReason).toBe('WebGL unavailable');
	});
});
