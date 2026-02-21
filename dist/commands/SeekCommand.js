import { z } from 'zod';
import { TimelineManager } from '../managers/TimelineManager.svelte.js';
import { StateManager } from '../managers/StateManager.svelte.js';
import { RenderManager } from '../managers/RenderManager.js';
import { ComponentsManager } from '../managers/ComponentsManager.svelte.js';
import { DeterministicMediaManager } from '../managers/DeterministicMediaManager.js';
const seekSchema = z.object({
    time: z.number()
});
export class SeekCommand {
    timeline;
    state;
    renderManager;
    componentsManager;
    deterministicMediaManager;
    constructor(cradle) {
        this.timeline = cradle.timelineManager;
        this.state = cradle.stateManager;
        this.renderManager = cradle.renderManager;
        this.componentsManager = cradle.componentsManager;
        this.deterministicMediaManager = cradle.deterministicMediaManager;
    }
    #isDeterministicMediaComponent(component) {
        return component.type === 'VIDEO' || component.type === 'GIF';
    }
    #hasBlurEffect(component) {
        const effectsMap = component.context.data?.effects?.map ?? {};
        if ('fillBackgroundBlur' in effectsMap) {
            return true;
        }
        for (const effect of Object.values(effectsMap)) {
            const entry = effect;
            if (entry.type === 'fillBackgroundBlur') {
                return true;
            }
        }
        return false;
    }
    #getPendingDeterministicComponents() {
        const components = this.componentsManager.getAll();
        const pending = [];
        for (const component of components) {
            if (!this.#isDeterministicMediaComponent(component)) {
                continue;
            }
            if (!component.context.isActive) {
                continue;
            }
            const pixiTexture = component.context.getResource('pixiTexture');
            const pixiRenderObject = component.context.getResource('pixiRenderObject');
            if (!pixiTexture || !pixiRenderObject) {
                pending.push(component.id);
                continue;
            }
            if (this.#hasBlurEffect(component)) {
                const sourceElement = component.context.getResource('videoElement') || component.context.getResource('imageElement');
                if (!sourceElement) {
                    pending.push(component.id);
                }
            }
        }
        return pending;
    }
    async #renderUntilDeterministicReady() {
        const maxAttempts = 12;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            await this.renderManager.render();
            const pending = this.#getPendingDeterministicComponents();
            if (pending.length === 0) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const pending = this.#getPendingDeterministicComponents();
        if (pending.length > 0) {
            throw new Error(`Deterministic media was not ready after seek for active components: ${pending.join(', ')}`);
        }
    }
    async execute(args) {
        const check = seekSchema.safeParse(args);
        if (!check.success) {
            return;
        }
        const time = Math.max(0, Math.min(check.data.time, this.state.duration));
        this.timeline.seek(time);
        // Ensure a deterministic render on server after seek to advance media frames
        if (this.state.environment === 'server') {
            // Wait for fonts to be ready before rendering
            // This is critical for subtitle animations that use SplitText -
            // if fonts aren't loaded, text measurements will be wrong and
            // animations may fail silently or not appear on first subtitles
            if (typeof document !== 'undefined' && document.fonts?.ready) {
                try {
                    await Promise.race([
                        document.fonts.ready,
                        new Promise((resolve) => setTimeout(resolve, 2000)) // 2s timeout
                    ]);
                }
                catch {
                    // Ignore font loading errors, continue with rendering
                }
            }
            // Try multiple render passes until loading state clears or attempts exhausted
            const maxAttempts = 10;
            for (let i = 0; i < maxAttempts; i += 1) {
                await this.renderManager.render();
                if (this.state.state !== 'loading')
                    break;
                await new Promise((resolve) => setTimeout(resolve, 30));
            }
            if (this.state.state === 'loading') {
                console.warn('SeekCommand: Max render attempts exhausted while still loading');
            }
            // Re-seek to apply correct animation state to any animations
            // that were added during the render passes above.
            // This fixes the race condition where subtitle animations are added
            // AFTER the initial seek, causing them to miss their initial state.
            this.timeline.seek(time);
            if (this.deterministicMediaManager.isEnabled()) {
                await this.#renderUntilDeterministicReady();
            }
            else {
                await this.renderManager.render();
            }
        }
    }
}
