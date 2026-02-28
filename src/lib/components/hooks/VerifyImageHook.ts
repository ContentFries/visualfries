import type { IComponentContext, IComponentHook, HookType } from '$lib';
import { ImageComponentShape } from '$lib';

export class VerifyImageHook implements IComponentHook {
	types: HookType[] = ['setup', 'refresh', 'refresh:content'];
	priority: number = 1;
	#context!: IComponentContext;

	async #handleSetup() {
		const data = ImageComponentShape.safeParse(this.#context.contextData);
		if (!data.success) {
			console.error('Image Compononent verify failed: ' + data.error.message);
			this.#context.disabled = true;
			return;
		}

		this.#context.setResource('imageShape', data.data);
	}

	async #handleRefresh() {
		await this.#handleSetup();
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		if (type === 'setup') {
			return await this.#handleSetup();
		} else if (type === 'refresh' || type === 'refresh:content') {
			return await this.#handleRefresh();
		}
	}
}
