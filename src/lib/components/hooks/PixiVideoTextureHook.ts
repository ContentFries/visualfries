import * as PIXI from 'pixi.js-legacy';

import type { IComponentContext, IComponentHook, HookType, HookHandlers } from '$lib';
import { VideoComponentShape } from '$lib';
import { z } from 'zod';

export class PixiVideoTextureHook implements IComponentHook {
	// Note: 'refresh' is NOT included - timeline position changes don't need texture recreation.
	// The video element persists and the same texture can continue to be used.
	// Only 'refresh:content' (source change) should recreate the texture.
	types: HookType[] = ['update', 'destroy', 'refresh:content'];
	priority: number = 1;
	#context!: IComponentContext;
	#videoTexture: PIXI.Texture | undefined;
	#videoElement: HTMLVideoElement | undefined;
	#pixiResource: unknown | undefined;
	componentElement!: z.infer<typeof VideoComponentShape>;

	#handlers: HookHandlers = {
		update: this.#handleUpdate.bind(this),
		destroy: this.#handleDestroy.bind(this),
		'refresh:content': this.#handleRefreshContent.bind(this)
	} as const;

	async #handleUpdate() {
		const preSuppliedResource = this.#context.getResource('pixiResource');
		if (preSuppliedResource) {
			if (!this.#videoTexture || this.#pixiResource !== preSuppliedResource) {
				await this.#handleDestroy();
				this.#videoTexture = PIXI.Texture.from(preSuppliedResource);
				this.#pixiResource = preSuppliedResource;
				this.#videoElement = undefined;
			}

			if (this.#videoTexture) {
				this.#context.setResource('pixiTexture', this.#videoTexture);
			}
			return;
		}

		const media = this.#context.getResource('videoElement');
		
		// If element changed or texture is missing, recreate it
		if (media && (media !== this.#videoElement || !this.#videoTexture)) {
			await this.#handleDestroy();
			
			const res = new PIXI.VideoResource(media, {
				autoPlay: false,
				updateFPS: 30
			});

			const baseTexture = new PIXI.BaseTexture(res);
			this.#videoTexture = new PIXI.Texture(baseTexture);
			this.#videoElement = media;
			this.#pixiResource = undefined;
		}

		// Always re-assert the resource in case the context was cleared or updated
		if (this.#videoTexture) {
			this.#context.setResource('pixiTexture', this.#videoTexture);
		}
	}

	async #handleDestroy() {
		if (this.#videoTexture) {
			// Destroy the texture and its base texture to free GPU memory
			this.#videoTexture.destroy(true);
		}
		this.#videoTexture = undefined;
		this.#videoElement = undefined;
		this.#pixiResource = undefined;
		this.#context.removeResource('pixiTexture');
	}

	async #handleRefreshContent() {
		// Only recreate texture when video source changes
		await this.#handleDestroy();
		// Texture will be recreated on next update when videoElement is available
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		const data = this.#context.contextData;
		if (!data || data.type !== 'VIDEO') {
			return;
		}
		this.componentElement = data as z.infer<typeof VideoComponentShape>;

		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
