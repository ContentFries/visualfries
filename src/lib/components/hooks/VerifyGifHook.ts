import type { IComponentContext, IComponentHook, HookType } from '$lib';
import { GifComponentShape } from '$lib';

export class VerifyGifHook implements IComponentHook {
	types: HookType[] = ['setup', 'refresh'];
	priority: number = 1;
	#context!: IComponentContext;

	async #handleSetup() {
		const data = GifComponentShape.safeParse(this.#context.contextData);
		if (!data.success) {
			console.error('GIF Compononent verify failed: ' + data.error.message);
			this.#context.disabled = true;
			return;
		}

		this.#context.setResource('gifShape', data.data);
	}

	async #handleRefresh() {
		await this.#handleSetup();
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		if (type === 'setup') {
			return await this.#handleSetup();
		} else if (type === 'refresh') {
			return await this.#handleRefresh();
		}
	}
}
