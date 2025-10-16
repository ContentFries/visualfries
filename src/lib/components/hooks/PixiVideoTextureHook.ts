import * as PIXI from 'pixi.js-legacy';

import type { IComponentContext, IComponentHook, HookType } from '$lib';
import { VideoComponentShape } from '$lib';
import { z } from 'zod';

export class PixiVideoTextureHook implements IComponentHook {
	types: HookType[] = ['update'];
	priority: number = 1;
	#context!: IComponentContext;
	#videoTexture: PIXI.Texture | undefined;
	componentElement!: z.infer<typeof VideoComponentShape>;

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

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		const data = this.#context.contextData;
		if (!data || data.type !== 'VIDEO') {
			return;
		}
		this.componentElement = data as z.infer<typeof VideoComponentShape>;

		return await this.#handleUpdate();
	}
}
