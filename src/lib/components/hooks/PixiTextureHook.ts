import * as PIXI from 'pixi.js-legacy';

import type { IComponentContext, IComponentHook, HookType } from '$lib';
// import { setPlacement } from '$lib/utils/utils.js';

export class PixiTextureHook implements IComponentHook {
	types: HookType[] = ['update'];
	priority: number = 1;
	#context!: IComponentContext;
	#texture: PIXI.Texture | undefined;

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
		} else {
			throw new Error('Failed to create texture from resource.');
		}
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		return await this.#handleUpdate();
	}
}
