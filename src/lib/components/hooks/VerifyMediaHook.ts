import type { IComponentContext, IComponentHook, HookType } from '$lib';
import { VideoComponentShape } from '$lib';

export class VerifyMediaHook implements IComponentHook {
	types: HookType[] = ['setup', 'refresh'];
	priority: number = 1;
	#context!: IComponentContext;

	async #handleSetup() {
		const data = VideoComponentShape.safeParse(this.#context.contextData);
		if (!data.success) {
			console.error('Video Compoponent verify failed: ' + data.error.message);
			this.#context.disabled = true;
			return;
		}
		
		this.#context.setResource('mediaShape', data.data);
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		if (type === 'setup' || type === 'refresh') {
			return await this.#handleSetup();
		}
	}
}
