import * as PIXI from 'pixi.js-legacy';
import { defaultDeterministicMediaConfig } from '../schemas/runtime/deterministic.js';
const createDefaultDiagnosticsState = () => ({
    providerHits: 0,
    providerMisses: 0,
    cacheHits: 0,
    selectedRendererType: 'canvas',
    rendererFallbackOccurred: false,
    rendererFallbackReason: undefined,
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
    config;
    #provider;
    #maxCachedTextures;
    #cacheByCacheKey = new Map();
    #componentCacheKeys = new Map();
    #lastResolvedByComponent = new Map();
    #oneTimeOverrides = new Map();
    #diagnostics = createDefaultDiagnosticsState();
    constructor(cradle) {
        this.config = cradle.deterministicMediaConfig
            ? { ...defaultDeterministicMediaConfig, ...cradle.deterministicMediaConfig }
            : defaultDeterministicMediaConfig;
        this.#provider = this.config.provider ?? null;
        this.#maxCachedTextures =
            this.config.maxCachedTextures ?? Math.max(3, this.#countSceneMediaComponents(cradle.sceneData) * 3);
    }
    isEnabled() {
        return this.config.enabled;
    }
    setProvider(provider) {
        this.#provider = provider;
        this.#lastResolvedByComponent.clear();
    }
    getProvider() {
        return this.#provider;
    }
    async resolveOverride(request) {
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
        let payload = oneTimeOverride ?? null;
        if (!payload) {
            const provider = this.#provider;
            if (!provider) {
                this.#lastResolvedByComponent.delete(request.componentId);
                return null;
            }
            try {
                payload = await provider.getFrame(request);
                this.#recordProviderCall(payload !== null, startedAt);
            }
            catch {
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
    commitCacheKey(componentId, cacheKey) {
        const previous = this.#componentCacheKeys.get(componentId);
        if (previous === cacheKey) {
            return false;
        }
        this.#componentCacheKeys.set(componentId, cacheKey);
        return true;
    }
    clearCacheKey(componentId) {
        return this.#componentCacheKeys.delete(componentId);
    }
    getFingerprint() {
        const sorted = [...this.#componentCacheKeys.entries()].sort(([a], [b]) => a.localeCompare(b));
        return JSON.stringify(sorted);
    }
    setOneTimeOverride(componentId, frameIndex, payload) {
        let componentOverrides = this.#oneTimeOverrides.get(componentId);
        if (!componentOverrides) {
            componentOverrides = new Map();
            this.#oneTimeOverrides.set(componentId, componentOverrides);
        }
        componentOverrides.set(frameIndex, payload);
    }
    getDiagnosticsReport() {
        if (!this.config.diagnostics) {
            return null;
        }
        const requests = this.#diagnostics.providerHits + this.#diagnostics.providerMisses;
        const cacheHitRatio = requests > 0 ? this.#diagnostics.cacheHits / requests : 0;
        const avgLatency = this.#diagnostics.latencyCount > 0
            ? this.#diagnostics.latencyTotalMs / this.#diagnostics.latencyCount
            : 0;
        const minLatency = this.#diagnostics.latencyCount > 0 ? this.#diagnostics.latencyMinMs : 0;
        const perFrame = {};
        for (const [frameIndex, counters] of [...this.#diagnostics.perFrame.entries()].sort(([a], [b]) => a - b)) {
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
            selectedRendererType: this.#diagnostics.selectedRendererType,
            rendererFallbackOccurred: this.#diagnostics.rendererFallbackOccurred,
            rendererFallbackReason: this.#diagnostics.rendererFallbackReason,
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
    getSelectedRendererType() {
        return this.#diagnostics.selectedRendererType;
    }
    recordRendererSelection(args) {
        try {
            this.#diagnostics.selectedRendererType = args.rendererType;
            this.#diagnostics.rendererFallbackOccurred = Boolean(args.fallbackOccurred);
            this.#diagnostics.rendererFallbackReason = args.fallbackReason;
        }
        catch {
            // Diagnostics are best-effort and never allowed to fail the render path.
        }
    }
    recordReadyAttempt(sceneFrameIndex, count = 1) {
        this.#recordRuntimeCounter(sceneFrameIndex, 'readyAttempts', count);
    }
    recordExtraRenderPass(sceneFrameIndex, count = 1) {
        this.#recordRuntimeCounter(sceneFrameIndex, 'extraRenderPasses', count);
    }
    recordBlurRedraw(sceneFrameIndex, count = 1) {
        this.#recordRuntimeCounter(sceneFrameIndex, 'blurRedraws', count);
    }
    async destroy() {
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
    async releaseComponent(componentId) {
        this.#componentCacheKeys.delete(componentId);
        this.#lastResolvedByComponent.delete(componentId);
        this.#oneTimeOverrides.delete(componentId);
        if (this.#provider?.releaseComponent) {
            await this.#provider.releaseComponent(componentId);
        }
    }
    async #buildOverride(payload) {
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
                    const resource = pixiResource;
                    resource.destroy?.();
                }
            };
        }
        const blob = payload.kind === 'blob' ? payload.blob : new Blob([payload.arrayBuffer]);
        return await this.#buildFromBlob(payload.cacheKey, blob);
    }
    async #buildFromBlob(cacheKey, blob) {
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
                    const resource = pixiResource;
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
        }
        finally {
            URL.revokeObjectURL(objectUrl);
        }
    }
    #createImageBitmapResource(imageBitmap) {
        const resourceCtor = PIXI
            .ImageBitmapResource;
        if (typeof resourceCtor === 'function') {
            return new resourceCtor(imageBitmap);
        }
        return imageBitmap;
    }
    #touchCacheEntry(cacheKey, value) {
        this.#cacheByCacheKey.delete(cacheKey);
        this.#cacheByCacheKey.set(cacheKey, value);
    }
    #enforceCacheLimit() {
        while (this.#cacheByCacheKey.size > this.#maxCachedTextures) {
            const oldest = this.#cacheByCacheKey.entries().next().value;
            if (!oldest) {
                break;
            }
            this.#disposeCachedOverride(oldest[0], oldest[1]);
            this.#cacheByCacheKey.delete(oldest[0]);
        }
    }
    #disposeCachedOverride(_cacheKey, cached) {
        if (cached.dispose) {
            cached.dispose();
            return;
        }
        if (cached.imageElement && this.#isImageBitmap(cached.imageElement)) {
            cached.imageElement.close?.();
        }
        const resource = cached.pixiResource;
        resource.destroy?.();
    }
    #toOverride(cached) {
        return {
            cacheKey: cached.cacheKey,
            pixiResource: cached.pixiResource,
            imageElement: cached.imageElement
        };
    }
    #consumeOneTimeOverride(componentId, frameIndex) {
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
    async #loadImage(url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load deterministic frame: ${url}`));
        });
        return img;
    }
    #recordProviderCall(isHit, startedAt) {
        if (!this.config.diagnostics) {
            return;
        }
        try {
            if (isHit) {
                this.#diagnostics.providerHits += 1;
            }
            else {
                this.#diagnostics.providerMisses += 1;
            }
            const elapsed = this.#now() - startedAt;
            this.#diagnostics.latencyCount += 1;
            this.#diagnostics.latencyTotalMs += elapsed;
            this.#diagnostics.latencyMinMs = Math.min(this.#diagnostics.latencyMinMs, elapsed);
            this.#diagnostics.latencyMaxMs = Math.max(this.#diagnostics.latencyMaxMs, elapsed);
        }
        catch {
            // Diagnostics are best-effort and never allowed to fail the render path.
        }
    }
    #recordCacheHit() {
        if (!this.config.diagnostics) {
            return;
        }
        try {
            this.#diagnostics.cacheHits += 1;
        }
        catch {
            // Diagnostics are best-effort and never allowed to fail the render path.
        }
    }
    #recordRuntimeCounter(sceneFrameIndex, counter, count) {
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
        }
        catch {
            // Diagnostics are best-effort and never allowed to fail the render path.
        }
    }
    #countSceneMediaComponents(sceneData) {
        return sceneData.layers.reduce((count, layer) => {
            const mediaCount = layer.components.filter((component) => component.type === 'VIDEO' || component.type === 'GIF').length;
            return count + mediaCount;
        }, 0);
    }
    #now() {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    #isImageBitmap(value) {
        return typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap;
    }
}
