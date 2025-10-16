import { VideoComponentShape } from '../..';
export class VerifyMediaHook {
    types = ['setup', 'refresh'];
    priority = 1;
    #context;
    async #handleSetup() {
        const data = VideoComponentShape.safeParse(this.#context.contextData);
        if (!data.success) {
            console.error('Video Compoponent verify failed: ' + data.error.message);
            this.#context.disabled = true;
            return;
        }
        this.#context.setResource('mediaShape', data.data);
    }
    async handle(type, context) {
        this.#context = context;
        if (type === 'setup' || type === 'refresh') {
            return await this.#handleSetup();
        }
    }
}
