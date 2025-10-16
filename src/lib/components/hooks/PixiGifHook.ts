import type { IComponentContext, IComponentHook, HookType } from '$lib';
import { GifComponentShape } from '$lib';
import { z } from 'zod';
import { AnimatedGIF } from '../AnimatedGIF.js';
import { Container } from 'pixi.js-legacy';
import { setPlacementAndOpacity } from '$lib/utils/utils.js';
import type { StateManager } from '$lib/managers/StateManager.svelte.ts';

export class PixiGifHook implements IComponentHook {
	types: HookType[] = ['setup', 'update', 'destroy', 'refresh'];
	priority: number = 1;
	#context!: IComponentContext;
	#imageElement!: AnimatedGIF;
	#displayObject!: Container;
	componentElement!: z.infer<typeof GifComponentShape>;
	private state: StateManager;
	#destroyed = false;
	#previousUrlLoaded = '';

	constructor(cradle: { stateManager: StateManager }) {
		this.state = cradle.stateManager;
	}

	async #handleSetup() {
		if (this.#imageElement && !this.#destroyed) {
			return;
		}

		// use cached imageElement if url did not change
		if (this.#previousUrlLoaded !== this.componentElement.source.url) {
			const res = await fetch(this.componentElement.source.url as string);
			const ab = await res.arrayBuffer();
			const img = AnimatedGIF.fromBuffer(ab);

			if (img) {
				this.#displayObject = this.#displayObject || new Container();
				this.#imageElement = img;
				this.#previousUrlLoaded = this.componentElement.source.url as string;
			}
		}

		if (this.#imageElement) {
			const { appearance } = this.componentElement;
			setPlacementAndOpacity(this.#imageElement, appearance);

			this.#displayObject.addChild(this.#imageElement);
			this.#context.setResource('pixiRenderObject', this.#displayObject);
			this.#imageElement.play();

			// await new promise 100ms timeout
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		this.#destroyed = false;
	}

	async #handleRefresh() {
		await this.#handleDestroy();
		await this.#handleSetup();
		await this.#handleUpdate();
	}

	async #handleDestroy() {
		this.#destroyed = true;
		if (this.#displayObject) this.#displayObject.removeChildren();
	}

	async #handleUpdate() {
		if (!this.#imageElement || this.#destroyed) {
			return;
		}

		if (this.state.isPlaying) {
			this.#imageElement.play();
		} else {
			this.#imageElement.stop();
			const gifFrame =
				this.#imageElement.totalFrames > 0
					? this.state.currentFrame % this.#imageElement.totalFrames
					: 0;
			this.#imageElement.currentFrame = gifFrame;
		}

		const isActive = this.#context.isActive;
		if (this.#displayObject) {
			if (this.#displayObject.visible != isActive) {
				this.#displayObject.visible = isActive;
			}

			if (!isActive) {
				this.#imageElement.stop();
			}
		}
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		const data = this.#context.contextData;
		if (!data || data.type !== 'GIF') {
			return;
		}

		this.componentElement = data as z.infer<typeof GifComponentShape>;

		if (type === 'setup') {
			return await this.#handleSetup();
		} else if (type === 'destroy') {
			return await this.#handleDestroy();
		} else if (type === 'refresh') {
			return await this.#handleRefresh();
		}

		await this.#handleUpdate();
	}
}
