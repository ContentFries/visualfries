import * as PIXI from 'pixi.js-legacy';
import { VideoComponentShape } from '../..';
import { z } from 'zod';
export class PixiVideoTextureHook {
    types = ['update', 'destroy', 'refresh'];
    priority = 1;
    #context;
    #videoTexture;
    componentElement;
    #handlers = {
        update: this.#handleUpdate.bind(this),
        destroy: this.#handleDestroy.bind(this),
        refresh: this.#handleRefresh.bind(this),
        'refresh:config': this.#handleRefresh.bind(this)
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
    async #handleRefresh() {
        await this.#handleDestroy();
        // #handleUpdate will recreate texture on next update call
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
