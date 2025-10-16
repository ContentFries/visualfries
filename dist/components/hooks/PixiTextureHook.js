import * as PIXI from 'pixi.js-legacy';
// import { setPlacement } from '../../utils/utils.js';
export class PixiTextureHook {
    types = ['update'];
    priority = 1;
    #context;
    #texture;
    async #handleUpdate() {
        const resource = this.#context.getResource('pixiResource');
        if (!resource) {
            throw new Error('pixiResource not found in resources.');
        }
        if (this.#texture && this.#context.getResource('pixiTexture') === this.#texture) {
            return;
        }
        const texture = PIXI.Texture.from(resource);
        if (texture) {
            this.#context.setResource('pixiTexture', texture);
            this.#texture = texture;
        }
        else {
            throw new Error('Failed to create texture from resource.');
        }
    }
    async handle(type, context) {
        this.#context = context;
        return await this.#handleUpdate();
    }
}
