import * as PIXI from 'pixi.js-legacy';

import type { IComponentContext, IComponentHook, HookType, HookHandlers } from '$lib';

export class PixiTextureHook implements IComponentHook {
	types: HookType[] = ['update', 'refresh:content', 'destroy'];
	priority: number = 1;
	static #textureRefs: WeakMap<PIXI.Texture, number> = new WeakMap();
	#context!: IComponentContext;
	#texture: PIXI.Texture | undefined;
	#resource: unknown | undefined;

	#handlers: HookHandlers = {
		update: this.#handleUpdate.bind(this),
		'refresh:content': this.#handleRefreshContent.bind(this),
		destroy: this.#handleDestroy.bind(this)
	} as const;

	#retainTexture(texture: PIXI.Texture) {
		const refs = PixiTextureHook.#textureRefs.get(texture) ?? 0;
		PixiTextureHook.#textureRefs.set(texture, refs + 1);
	}

	#releaseTexture(texture: PIXI.Texture) {
		const refs = PixiTextureHook.#textureRefs.get(texture) ?? 0;
		if (refs <= 1) {
			PixiTextureHook.#textureRefs.delete(texture);
			texture.destroy(true);
			return;
		}

		PixiTextureHook.#textureRefs.set(texture, refs - 1);
	}

	#setTexture(texture: PIXI.Texture, resource: unknown) {
		if (this.#texture === texture) {
			this.#resource = resource;
			this.#context.setResource('pixiTexture', texture);
			return;
		}

		if (this.#texture) {
			this.#releaseTexture(this.#texture);
		}

		this.#texture = texture;
		this.#resource = resource;
		this.#retainTexture(texture);
		this.#context.setResource('pixiTexture', texture);
	}

	#destroyTexture() {
		// Always clear local state and remove the context resource, even when
		// #texture is already undefined, so a desync between hook state and the
		// context map can never leave a stale pixiTexture visible downstream.
		if (this.#texture) {
			this.#releaseTexture(this.#texture);
		}
		this.#texture = undefined;
		this.#resource = undefined;
		this.#context.removeResource('pixiTexture');
	}

	async #handleUpdate() {
		const resource = this.#context.getResource('pixiResource');
		if (!resource) {
			const type = this.#context.contextData.type;
			if (type === 'VIDEO' || type === 'GIF') {
				return;
			}
			throw new Error('pixiResource not found in resources.');
		}

		// Skip recreation only when both the resource identity AND the cached texture are unchanged
		if (
			this.#texture &&
			this.#resource === resource &&
			this.#context.getResource('pixiTexture') === this.#texture
		) {
			return;
		}

		const texture = PIXI.Texture.from(resource);
		if (texture) {
			this.#setTexture(texture, resource);
		} else {
			throw new Error('Failed to create texture from resource.');
		}
	}

	async #handleRefreshContent() {
		// Eagerly destroy the stale texture so display hooks pick up the new one
		// in the same refresh:content cycle. #handleUpdate will recreate it on the
		// next update tick once ImageHook has written a fresh pixiResource.
		this.#destroyTexture();

		// If a new pixiResource is already available in this same cycle (ImageHook
		// runs at lower priority and resolves before us), create the texture now so
		// display hooks downstream in the same cycle have it immediately.
		const resource = this.#context.getResource('pixiResource');
		if (resource) {
			const texture = PIXI.Texture.from(resource);
			if (texture) {
				this.#setTexture(texture, resource);
			}
		}
	}

	async #handleDestroy() {
		this.#destroyTexture();
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
