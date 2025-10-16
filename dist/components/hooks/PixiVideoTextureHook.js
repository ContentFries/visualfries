import * as PIXI from 'pixi.js-legacy';
import { VideoComponentShape } from '../..';
import { z } from 'zod';
export class PixiVideoTextureHook {
    types = ['update'];
    priority = 1;
    #context;
    #videoTexture;
    componentElement;
    async #handleUpdate() {
        if (this.#videoTexture) {
            return;
        }
        const media = this.#context.getResource('videoElement');
        if (!media) {
            throw new Error('videoElement not found in resources.');
        }
        const res = new PIXI.VideoResource(media, {
            autoPlay: false,
            updateFPS: 30
        });
        const baseTexture = new PIXI.BaseTexture(res);
        this.#videoTexture = new PIXI.Texture(baseTexture);
        this.#context.setResource('pixiTexture', this.#videoTexture);
    }
    async handle(type, context) {
        this.#context = context;
        const data = this.#context.contextData;
        if (!data || data.type !== 'VIDEO') {
            return;
        }
        this.componentElement = data;
        return await this.#handleUpdate();
    }
}
