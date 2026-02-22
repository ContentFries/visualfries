import * as PIXI from 'pixi.js-legacy';
import type { TextureSource } from 'pixi.js-legacy';

import type { Scene } from '$lib/schemas/scene/core.js';
import type {
	DeterministicDiagnosticsReport,
	DeterministicFrameOverride,
	DeterministicFramePayload,
	DeterministicFrameProvider,
	DeterministicFrameRequest,
	DeterministicMediaConfig
} from '$lib/schemas/runtime/deterministic.js';
import { defaultDeterministicMediaConfig } from '$lib/schemas/runtime/deterministic.js';

type CachedOverride = DeterministicFrameOverride & {
	dispose?: () => void;
};

type DiagnosticsState = {
	providerHits: number;
	providerMisses: number;
	cacheHits: number;
	readyAttempts: number;
	extraRenderPasses: number;
	blurRedraws: number;
	perFrame: Map<number, { readyAttempts: number; extraRenderPasses: number; blurRedraws: number }>;
	latencyCount: number;
	latencyTotalMs: number;
	latencyMinMs: number;
	latencyMaxMs: number;
};

const createDefaultDiagnosticsState = (): DiagnosticsState => ({
	providerHits: 0,
	providerMisses: 0,
	cacheHits: 0,
	readyAttempts: 0,
	extraRenderPasses: 0,
	blurRedraws: 0,
	perFrame: new Map(),
	latencyCount: 0,
	latencyTotalMs: 0,
	latencyMinMs: Number.POSITIVE_INFINITY,
	latencyMaxMs: 0
});

export class DeterministicMediaManager {
	readonly config: DeterministicMediaConfig;

	#provider: DeterministicFrameProvider | null;
	#maxCachedTextures: number;
	#cacheByCacheKey = new Map<string, CachedOverride>();
	#componentCacheKeys = new Map<string, string>();
	#lastResolvedByComponent = new Map<
		string,
		{ frameIndex: number; override: DeterministicFrameOverride | null }
	>();
	#oneTimeOverrides = new Map<string, Map<number, DeterministicFramePayload>>();
	#diagnostics: DiagnosticsState = createDefaultDiagnosticsState();

	constructor(cradle: { deterministicMediaConfig?: DeterministicMediaConfig; sceneData: Scene }) {
		this.config = cradle.deterministicMediaConfig
			? { ...defaultDeterministicMediaConfig, ...cradle.deterministicMediaConfig }
			: defaultDeterministicMediaConfig;
		this.#provider = this.config.provider ?? null;
		this.#maxCachedTextures =
			this.config.maxCachedTextures ?? Math.max(3, this.#countSceneMediaComponents(cradle.sceneData) * 3);
	}

	isEnabled(): boolean {
		return this.config.enabled;
	}

	setProvider(provider: DeterministicFrameProvider | null): void {
		this.#provider = provider;
		this.#lastResolvedByComponent.clear();
	}

	getProvider(): DeterministicFrameProvider | null {
		return this.#provider;
	}

	async resolveOverride(
		request: DeterministicFrameRequest
	): Promise<DeterministicFrameOverride | null> {
		if (!this.config.enabled) {
			return null;
		}

		const oneTimeOverride = this.#consumeOneTimeOverride(request.componentId, request.frameIndex);
		if (!oneTimeOverride) {
			const cachedResult = this.#lastResolvedByComponent.get(request.componentId);
			if (cachedResult && cachedResult.frameIndex === request.frameIndex && cachedResult.override) {
				return cachedResult.override;
			}
		}

		const startedAt = this.#now();
		let payload: DeterministicFramePayload | null = oneTimeOverride ?? null;

		if (!payload) {
			const provider = this.#provider;
			if (!provider) {
				this.#lastResolvedByComponent.delete(request.componentId);
				return null;
			}

			try {
				payload = await provider.getFrame(request);
				this.#recordProviderCall(payload !== null, startedAt);
			} catch {
				this.#recordProviderCall(false, startedAt);
				this.#lastResolvedByComponent.delete(request.componentId);
				return null;
			}
		}

		if (!payload) {
			this.#lastResolvedByComponent.delete(request.componentId);
			return null;
		}

		const cached = this.#cacheByCacheKey.get(payload.cacheKey);
		if (cached) {
			this.#touchCacheEntry(payload.cacheKey, cached);
			this.#recordCacheHit();
			const override = this.#toOverride(cached);
			this.#lastResolvedByComponent.set(request.componentId, {
				frameIndex: request.frameIndex,
				override
			});
			return override;
		}

		const built = await this.#buildOverride(payload);
		if (!built) {
			this.#lastResolvedByComponent.delete(request.componentId);
			return null;
		}

		this.#cacheByCacheKey.set(payload.cacheKey, built);
		this.#enforceCacheLimit();

		const override = this.#toOverride(built);
		this.#lastResolvedByComponent.set(request.componentId, {
			frameIndex: request.frameIndex,
			override
		});
		return override;
	}

	commitCacheKey(componentId: string, cacheKey: string): boolean {
		const previous = this.#componentCacheKeys.get(componentId);
		if (previous === cacheKey) {
			return false;
		}
		this.#componentCacheKeys.set(componentId, cacheKey);
		return true;
	}

	clearCacheKey(componentId: string): boolean {
		return this.#componentCacheKeys.delete(componentId);
	}

	getFingerprint(): string {
		const sorted = [...this.#componentCacheKeys.entries()].sort(([a], [b]) => a.localeCompare(b));
		return JSON.stringify(sorted);
	}

	setOneTimeOverride(componentId: string, frameIndex: number, payload: DeterministicFramePayload): void {
		let componentOverrides = this.#oneTimeOverrides.get(componentId);
		if (!componentOverrides) {
			componentOverrides = new Map<number, DeterministicFramePayload>();
			this.#oneTimeOverrides.set(componentId, componentOverrides);
		}
		componentOverrides.set(frameIndex, payload);
	}

	getDiagnosticsReport(): DeterministicDiagnosticsReport | null {
		if (!this.config.diagnostics) {
			return null;
		}

		const requests = this.#diagnostics.providerHits + this.#diagnostics.providerMisses;
		const cacheHitRatio = requests > 0 ? this.#diagnostics.cacheHits / requests : 0;
		const avgLatency =
			this.#diagnostics.latencyCount > 0
				? this.#diagnostics.latencyTotalMs / this.#diagnostics.latencyCount
				: 0;
		const minLatency = this.#diagnostics.latencyCount > 0 ? this.#diagnostics.latencyMinMs : 0;

		const perFrame: Record<
			string,
			{ readyAttempts: number; extraRenderPasses: number; blurRedraws: number }
		> = {};
		for (const [frameIndex, counters] of [...this.#diagnostics.perFrame.entries()].sort(
			([a], [b]) => a - b
		)) {
			perFrame[String(frameIndex)] = {
				readyAttempts: counters.readyAttempts,
				extraRenderPasses: counters.extraRenderPasses,
				blurRedraws: counters.blurRedraws
			};
		}

		return {
			providerHits: this.#diagnostics.providerHits,
			providerMisses: this.#diagnostics.providerMisses,
			cacheHits: this.#diagnostics.cacheHits,
			cacheHitRatio,
			readyAttempts: this.#diagnostics.readyAttempts,
			extraRenderPasses: this.#diagnostics.extraRenderPasses,
			blurRedraws: this.#diagnostics.blurRedraws,
			perFrame,
			latency: {
				minMs: minLatency,
				maxMs: this.#diagnostics.latencyMaxMs,
				avgMs: avgLatency
			}
		};
	}

	recordReadyAttempt(sceneFrameIndex: number, count = 1): void {
		this.#recordRuntimeCounter(sceneFrameIndex, 'readyAttempts', count);
	}

	recordExtraRenderPass(sceneFrameIndex: number, count = 1): void {
		this.#recordRuntimeCounter(sceneFrameIndex, 'extraRenderPasses', count);
	}

	recordBlurRedraw(sceneFrameIndex: number, count = 1): void {
		this.#recordRuntimeCounter(sceneFrameIndex, 'blurRedraws', count);
	}

	async destroy(): Promise<void> {
		for (const [cacheKey, cached] of this.#cacheByCacheKey.entries()) {
			this.#disposeCachedOverride(cacheKey, cached);
		}
		this.#cacheByCacheKey.clear();
		this.#componentCacheKeys.clear();
		this.#lastResolvedByComponent.clear();
		this.#oneTimeOverrides.clear();

		if (this.#provider?.destroy) {
			await this.#provider.destroy();
		}
		this.#provider = null;
	}

	async releaseComponent(componentId: string): Promise<void> {
		this.#componentCacheKeys.delete(componentId);
		this.#lastResolvedByComponent.delete(componentId);
		this.#oneTimeOverrides.delete(componentId);
		if (this.#provider?.releaseComponent) {
			await this.#provider.releaseComponent(componentId);
		}
	}

	async #buildOverride(payload: DeterministicFramePayload): Promise<CachedOverride | null> {
		if (payload.kind === 'url') {
			const imageElement = await this.#loadImage(payload.url);
			return {
				cacheKey: payload.cacheKey,
				pixiResource: imageElement,
				imageElement
			};
		}

		if (payload.kind === 'imageBitmap') {
			const pixiResource = this.#createImageBitmapResource(payload.imageBitmap);
			return {
				cacheKey: payload.cacheKey,
				pixiResource,
				imageElement: payload.imageBitmap,
				dispose: () => {
					if (typeof payload.imageBitmap.close === 'function') {
						payload.imageBitmap.close();
					}
					const resource = pixiResource as { destroy?: () => void };
					resource.destroy?.();
				}
			};
		}

		const blob = payload.kind === 'blob' ? payload.blob : new Blob([payload.arrayBuffer]);
		return await this.#buildFromBlob(payload.cacheKey, blob);
	}

	async #buildFromBlob(cacheKey: string, blob: Blob): Promise<CachedOverride | null> {
		if (typeof createImageBitmap === 'function') {
			const imageBitmap = await createImageBitmap(blob);
			const pixiResource = this.#createImageBitmapResource(imageBitmap);
			return {
				cacheKey,
				pixiResource,
				imageElement: imageBitmap,
				dispose: () => {
					if (typeof imageBitmap.close === 'function') {
						imageBitmap.close();
					}
					const resource = pixiResource as { destroy?: () => void };
					resource.destroy?.();
				}
			};
		}

		const objectUrl = URL.createObjectURL(blob);
		try {
			const imageElement = await this.#loadImage(objectUrl);
			return {
				cacheKey,
				pixiResource: imageElement,
				imageElement
			};
		} finally {
			URL.revokeObjectURL(objectUrl);
		}
	}

	#createImageBitmapResource(imageBitmap: ImageBitmap): TextureSource {
		const resourceCtor = (PIXI as unknown as { ImageBitmapResource?: new (bitmap: ImageBitmap) => any })
			.ImageBitmapResource;
		if (typeof resourceCtor === 'function') {
			return new resourceCtor(imageBitmap) as TextureSource;
		}
		return imageBitmap as unknown as TextureSource;
	}

	#touchCacheEntry(cacheKey: string, value: CachedOverride): void {
		this.#cacheByCacheKey.delete(cacheKey);
		this.#cacheByCacheKey.set(cacheKey, value);
	}

	#enforceCacheLimit(): void {
		while (this.#cacheByCacheKey.size > this.#maxCachedTextures) {
			const oldest = this.#cacheByCacheKey.entries().next().value as [string, CachedOverride] | undefined;
			if (!oldest) {
				break;
			}
			this.#disposeCachedOverride(oldest[0], oldest[1]);
			this.#cacheByCacheKey.delete(oldest[0]);
		}
	}

	#disposeCachedOverride(_cacheKey: string, cached: CachedOverride): void {
		if (cached.dispose) {
			cached.dispose();
			return;
		}
		if (cached.imageElement && this.#isImageBitmap(cached.imageElement)) {
			cached.imageElement.close?.();
		}
		const resource = cached.pixiResource as { destroy?: () => void };
		resource.destroy?.();
	}

	#toOverride(cached: CachedOverride): DeterministicFrameOverride {
		return {
			cacheKey: cached.cacheKey,
			pixiResource: cached.pixiResource,
			imageElement: cached.imageElement
		};
	}

	#consumeOneTimeOverride(
		componentId: string,
		frameIndex: number
	): DeterministicFramePayload | null {
		const byComponent = this.#oneTimeOverrides.get(componentId);
		if (!byComponent) {
			return null;
		}
		const payload = byComponent.get(frameIndex) ?? null;
		if (!payload) {
			return null;
		}
		byComponent.delete(frameIndex);
		if (byComponent.size === 0) {
			this.#oneTimeOverrides.delete(componentId);
		}
		return payload;
	}

	async #loadImage(url: string): Promise<HTMLImageElement> {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = url;
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error(`Failed to load deterministic frame: ${url}`));
		});
		return img;
	}

	#recordProviderCall(isHit: boolean, startedAt: number): void {
		if (!this.config.diagnostics) {
			return;
		}
		try {
			if (isHit) {
				this.#diagnostics.providerHits += 1;
			} else {
				this.#diagnostics.providerMisses += 1;
			}

			const elapsed = this.#now() - startedAt;
			this.#diagnostics.latencyCount += 1;
			this.#diagnostics.latencyTotalMs += elapsed;
			this.#diagnostics.latencyMinMs = Math.min(this.#diagnostics.latencyMinMs, elapsed);
			this.#diagnostics.latencyMaxMs = Math.max(this.#diagnostics.latencyMaxMs, elapsed);
		} catch {
			// Diagnostics are best-effort and never allowed to fail the render path.
		}
	}

	#recordCacheHit(): void {
		if (!this.config.diagnostics) {
			return;
		}
		try {
			this.#diagnostics.cacheHits += 1;
		} catch {
			// Diagnostics are best-effort and never allowed to fail the render path.
		}
	}

	#recordRuntimeCounter(
		sceneFrameIndex: number,
		counter: 'readyAttempts' | 'extraRenderPasses' | 'blurRedraws',
		count: number
	): void {
		if (!this.config.diagnostics) {
			return;
		}
		if (!Number.isFinite(count) || count <= 0) {
			return;
		}

		try {
			this.#diagnostics[counter] += count;
			const existing = this.#diagnostics.perFrame.get(sceneFrameIndex) ?? {
				readyAttempts: 0,
				extraRenderPasses: 0,
				blurRedraws: 0
			};
			existing[counter] += count;
			this.#diagnostics.perFrame.set(sceneFrameIndex, existing);
		} catch {
			// Diagnostics are best-effort and never allowed to fail the render path.
		}
	}

	#countSceneMediaComponents(sceneData: Scene): number {
		return sceneData.layers.reduce((count, layer) => {
			const mediaCount = layer.components.filter(
				(component) => component.type === 'VIDEO' || component.type === 'GIF'
			).length;
			return count + mediaCount;
		}, 0);
	}

	#now(): number {
		return typeof performance !== 'undefined' ? performance.now() : Date.now();
	}

	#isImageBitmap(value: unknown): value is ImageBitmap {
		return typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap;
	}
}
