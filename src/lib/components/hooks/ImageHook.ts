import type { IComponentContext, IComponentHook, HookType, HookHandlers } from '$lib';
import { ImageComponentShape } from '$lib';
import { z } from 'zod';

export class ImageHook implements IComponentHook {
	types: HookType[] = ['setup', 'refresh', 'refresh:content', 'destroy'];

	#handlers: HookHandlers = {
		setup: this.#handleSetup.bind(this),
		refresh: this.#handleRefreshContent.bind(this),
		'refresh:content': this.#handleRefreshContent.bind(this),
		destroy: this.#handleDestroy.bind(this)
	} as const;

	priority: number = 1;
	#context!: IComponentContext;
	#imageElement: HTMLImageElement | undefined;
	#lastUrl: string | undefined;
	componentElement!: z.infer<typeof ImageComponentShape>;

	async #loadImage(url: string): Promise<HTMLImageElement> {
		const img = new Image();
		// crossOrigin must be set before src to ensure CORS mode is applied from the first request
		img.crossOrigin = 'anonymous';
		img.src = url;

		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
		});

		return img;
	}

	#clearResources() {
		if (this.#imageElement) {
			this.#imageElement.remove();
			this.#imageElement = undefined;
		}
		this.#lastUrl = undefined;
		this.#context.removeResource('imageElement');
		this.#context.removeResource('pixiResource');
	}

	#resolveUrl(): string {
		const url = this.componentElement.source.url;
		if (!url || typeof url !== 'string') {
			// Clear stale resources before disabling so downstream hooks never see
			// an old image/pixiResource paired with the now-invalid source URL.
			this.#clearResources();
			this.#context.disabled = true;
			throw new Error(`ImageHook: source.url is missing or invalid (got ${JSON.stringify(url)})`);
		}
		return url;
	}

	async #handleSetup() {
		const url = this.#resolveUrl();

		if (this.#imageElement && this.#lastUrl === url) {
			// Already loaded and URL unchanged — re-assert resources in case context was cleared
			this.#context.setResource('imageElement', this.#imageElement);
			this.#context.setResource('pixiResource', this.#imageElement);
			return;
		}

		if (this.#imageElement) {
			this.#clearResources();
		}

		const img = await this.#loadImage(url);
		this.#imageElement = img;
		this.#lastUrl = url;
		this.#context.setResource('imageElement', img);
		this.#context.setResource('pixiResource', img);
	}

	async #handleRefreshContent() {
		const url = this.#resolveUrl();

		if (this.#lastUrl === url) {
			// URL unchanged — re-assert resources in case context was cleared between frames
			if (this.#imageElement) {
				this.#context.setResource('imageElement', this.#imageElement);
				this.#context.setResource('pixiResource', this.#imageElement);
			}
			return;
		}

		this.#clearResources();

		const img = await this.#loadImage(url);
		this.#imageElement = img;
		this.#lastUrl = url;
		this.#context.setResource('imageElement', img);
		this.#context.setResource('pixiResource', img);
	}

	async #handleDestroy() {
		this.#clearResources();
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		// Destroy must run regardless of whether imageShape is present,
		// so that stale resources are always cleaned up.
		if (type === 'destroy') {
			return await this.#handleDestroy();
		}

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
