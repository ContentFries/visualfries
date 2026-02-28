import { ImageComponentShape } from '../..';
export class VerifyImageHook {
    types = ['setup', 'refresh', 'refresh:content'];
    priority = 1;
    #context;
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
    async handle(type, context) {
        this.#context = context;
        if (type === 'setup') {
            return await this.#handleSetup();
        }
        else if (type === 'refresh' || type === 'refresh:content') {
            return await this.#handleRefresh();
        }
    }
}
