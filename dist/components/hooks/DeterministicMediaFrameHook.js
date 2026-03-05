import { DeterministicRenderError } from '../../schemas/runtime/deterministic.js';
import { DeterministicMediaManager } from '../../managers/DeterministicMediaManager.js';
import { StateManager } from '../../managers/StateManager.svelte.js';
export class DeterministicMediaFrameHook {
    types = ['setup', 'update', 'destroy'];
    priority = 4;
    #context;
    #state;
    #manager;
    constructor(cradle) {
        this.#state = cradle.stateManager;
        this.#manager = cradle.deterministicMediaManager;
    }
    #clearDeterministicResources(componentId) {
        const cacheKeyChanged = this.#manager.clearCacheKey(componentId);
        this.#context.removeResource('pixiResource');
        this.#context.removeResource('imageElement');
        return cacheKeyChanged;
    }
    async #handleUpdate() {
        if (!this.#manager.isEnabled() || this.#state.environment !== 'server') {
            return;
        }
        const fps = this.#state.data.settings.fps || 30;
        const data = this.#context.contextData;
        if (!this.#context.isActive) {
            const cacheKeyChanged = this.#clearDeterministicResources(data.id);
            if (cacheKeyChanged) {
                this.#state.markDirty();
            }
            return;
        }
        const frameIndex = Math.max(0, Math.round(this.#context.currentComponentTime * fps));
        const override = await this.#manager.resolveOverride({
            componentId: data.id,
            componentType: data.type === 'GIF' ? 'GIF' : 'VIDEO',
            frameIndex,
            fps,
            width: this.#state.width,
            height: this.#state.height
        });
        if (!override) {
            const cacheKeyChanged = this.#clearDeterministicResources(data.id);
            if (cacheKeyChanged) {
                this.#state.markDirty();
            }
            if (this.#manager.config.strict && this.#manager.getProvider()) {
                throw new DeterministicRenderError('Deterministic frame provider returned null', {
                    componentId: data.id,
                    frameIndex,
                    sceneTime: this.#state.currentTime
                });
            }
            return;
        }
        this.#context.setResource('pixiResource', override.pixiResource);
        if (override.imageElement) {
            this.#context.setResource('imageElement', override.imageElement);
        }
        else {
            this.#context.removeResource('imageElement');
        }
        const cacheKeyChanged = this.#manager.commitCacheKey(data.id, override.cacheKey);
        if (cacheKeyChanged) {
            this.#state.markDirty();
        }
    }
    async #handleDestroy() {
        const data = this.#context.contextData;
        this.#clearDeterministicResources(data.id);
        try {
            await this.#manager.releaseComponent(data.id);
        }
        catch {
            // Best-effort cleanup only.
        }
    }
    async handle(type, context) {
        this.#context = context;
        const data = this.#context.contextData;
        if (data.type !== 'VIDEO' && data.type !== 'GIF') {
            return;
        }
        if (type === 'update') {
            await this.#handleUpdate();
            return;
        }
        if (type === 'destroy') {
            await this.#handleDestroy();
        }
    }
}
