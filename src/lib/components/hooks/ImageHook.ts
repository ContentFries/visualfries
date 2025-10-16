import type {
	IComponentContext,
	IComponentHook,
	HookType,
	HookHandlers
} from '$lib';
import { ImageComponentShape } from '$lib';
import { z } from 'zod';

export class ImageHook implements IComponentHook {
	types: HookType[] = ['setup', 'destroy'];

	#handlers: HookHandlers = {
		setup: this.#handleSetup.bind(this),
		destroy: this.#handleDestroy.bind(this)
	} as const;

	priority: number = 1;
	#context!: IComponentContext;
	#imageElement!: HTMLImageElement;
	componentElement!: z.infer<typeof ImageComponentShape>;

	async #handleSetup() {
		if (this.#imageElement) {
			return;
		}

		const img = new Image();
		img.src = this.componentElement.source.url as string;
		img.crossOrigin = 'anonymous';

		// Wait for the image to load
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = (error) => reject(new Error(`Failed to load image: ${this.componentElement.source.url}`));
		});

		this.#imageElement = img;
		this.#context.setResource('imageElement', img);
		this.#context.setResource('pixiResource', img);
	}

	async #handleDestroy() {
		// remove event listeners from video
		this.#imageElement.remove();
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		const data = this.#context.getResource('imageShape');
		if (!data) {
			return;
		}

		this.componentElement = data;

		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
