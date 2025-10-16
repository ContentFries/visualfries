import { GifComponentShape } from '../..';
import { z } from 'zod';
import { AnimatedGIF } from '../AnimatedGIF.js';
import { Container } from 'pixi.js-legacy';
import { setPlacementAndOpacity } from '../../utils/utils.js';
export class PixiGifHook {
    types = ['setup', 'update', 'destroy', 'refresh'];
    priority = 1;
    #context;
    #imageElement;
    #displayObject;
    componentElement;
    state;
    #destroyed = false;
    #previousUrlLoaded = '';
    constructor(cradle) {
        this.state = cradle.stateManager;
    }
    async #handleSetup() {
        if (this.#imageElement && !this.#destroyed) {
            return;
        }
        // use cached imageElement if url did not change
        if (this.#previousUrlLoaded !== this.componentElement.source.url) {
            const res = await fetch(this.componentElement.source.url);
            const ab = await res.arrayBuffer();
            const img = AnimatedGIF.fromBuffer(ab);
            if (img) {
                this.#displayObject = this.#displayObject || new Container();
                this.#imageElement = img;
                this.#previousUrlLoaded = this.componentElement.source.url;
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
        if (this.#displayObject)
            this.#displayObject.removeChildren();
    }
    async #handleUpdate() {
        if (!this.#imageElement || this.#destroyed) {
            return;
        }
        if (this.state.isPlaying) {
            this.#imageElement.play();
        }
        else {
            this.#imageElement.stop();
            const gifFrame = this.#imageElement.totalFrames > 0
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
    async handle(type, context) {
        this.#context = context;
        const data = this.#context.contextData;
        if (!data || data.type !== 'GIF') {
            return;
        }
        this.componentElement = data;
        if (type === 'setup') {
            return await this.#handleSetup();
        }
        else if (type === 'destroy') {
            return await this.#handleDestroy();
        }
        else if (type === 'refresh') {
            return await this.#handleRefresh();
        }
        await this.#handleUpdate();
    }
}
