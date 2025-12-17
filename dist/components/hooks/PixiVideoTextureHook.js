import * as PIXI from 'pixi.js-legacy';
import { VideoComponentShape } from '../..';
import { z } from 'zod';
export class PixiVideoTextureHook {
    // Note: 'refresh' is NOT included - timeline position changes don't need texture recreation.
    // The video element persists and the same texture can continue to be used.
    // Only 'refresh:content' (source change) should recreate the texture.
    types = ['update', 'destroy', 'refresh:content'];
    priority = 1;
    #context;
    #videoTexture;
    componentElement;
    #handlers = {
        update: this.#handleUpdate.bind(this),
        destroy: this.#handleDestroy.bind(this),
        'refresh:content': this.#handleRefreshContent.bind(this)
    };
    async #handleUpdate() {
        if (this.#videoTexture) {
            return;
        }
        const media = this.#context.getResource('videoElement');
        if (!media) {
            // Video element not ready yet - will be called again on next update
            return;
        }
        const res = new PIXI.VideoResource(media, {
            autoPlay: false,
            updateFPS: 30
        });
        const baseTexture = new PIXI.BaseTexture(res);
        this.#videoTexture = new PIXI.Texture(baseTexture);
        this.#context.setResource('pixiTexture', this.#videoTexture);
    }
    async #handleDestroy() {
        if (this.#videoTexture) {
            // Destroy the texture and its base texture to free GPU memory
            this.#videoTexture.destroy(true);
            this.#videoTexture = undefined;
            this.#context.removeResource('pixiTexture');
        }
    }
    async #handleRefreshContent() {
        // Only recreate texture when video source changes
        await this.#handleDestroy();
        // Texture will be recreated on next update when videoElement is available
    }
    async handle(type, context) {
        this.#context = context;
        const data = this.#context.contextData;
        if (!data || data.type !== 'VIDEO') {
            return;
        }
        this.componentElement = data;
        const handler = this.#handlers[type];
        if (handler) {
            await handler();
        }
    }
}
