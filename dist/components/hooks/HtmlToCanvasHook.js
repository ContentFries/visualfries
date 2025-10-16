import { Texture, BaseTexture, Sprite, Container } from 'pixi.js-legacy';
import { StateManager } from '../../managers/StateManager.svelte.js';
import { svgGenerator } from '../../utils/svgGenerator.js';
export class HtmlToCanvasHook {
    #handlers = {
        setup: this.#handleSetup.bind(this),
        destroy: this.#handleDestroy.bind(this),
        update: this.#handleUpdate.bind(this),
        'refresh:content': this.#handleRefresh.bind(this)
    };
    #context;
    #htmlEl = undefined;
    #currentId = undefined;
    shouldCreateObjectURL;
    #displayObject;
    #sprite;
    #lastHtml = undefined;
    svgBase = null;
    svgEnd = null;
    svg = null;
    types = Object.keys(this.#handlers);
    priority = 1;
    state;
    constructor(cradle) {
        this.state = cradle.stateManager;
        this.shouldCreateObjectURL = navigator.userAgent.includes('Firefox');
    }
    async #svgToTexture(svgString) {
        // seems fastest
        const { width, height } = this.state;
        let imgPath = '';
        if (this.shouldCreateObjectURL) {
            const svgBlob = new Blob([svgString], {
                type: 'image/svg+xml'
            });
            imgPath = URL.createObjectURL(svgBlob);
        }
        else {
            imgPath = `data:image/svg+xml;charset=utf8,${encodeURIComponent(svgString)}`;
        }
        // const svgBlobArrayBuffer = new Uint8Array(await svgBlob.arrayBuffer());
        return new Promise((resolve, reject) => {
            const img = new Image(width, height);
            img.crossOrigin = 'anonymous';
            img.src = imgPath;
            img.width = width;
            img.height = height;
            img.onload = () => {
                const base = new BaseTexture(img);
                const texture = new Texture(base);
                // const texture = PIXI.Texture.from(canvas); // true
                img.remove();
                if (this.shouldCreateObjectURL) {
                    URL.revokeObjectURL(imgPath);
                }
                resolve(texture);
            };
            img.onerror = () => {
                console.warn('img.onerror', svgString);
                reject(new Error('Failed to load SVG'));
            };
        });
    }
    async #renderSvg() {
        if (!this.#htmlEl) {
            return false;
        }
        const { width, height } = this.state;
        if (!this.svgBase) {
            const { base, content, end } = await svgGenerator.generateSVG(this.#htmlEl, this.#context.data.appearance.text, width, height, 'svg-' + this.#context.contextData.id, encodeURIComponent(this.state.getCharactersList().join('')));
            this.svgBase = base;
            this.svgEnd = end;
            this.svg = base + content + end;
            return true;
        }
        else {
            const html = this.#htmlEl.outerHTML.replace(/<br\s*>/gi, '<br />');
            const svg = this.svgBase + html + this.svgEnd;
            if (this.svg !== svg) {
                this.svg = svg;
            }
            if (html !== this.#lastHtml) {
                this.state.markDirty();
                this.#lastHtml = html;
                return true;
            }
        }
        return false;
    }
    async #handleSetup() {
        if (this.#htmlEl) {
            return;
        }
        const wrapperEl = this.#context.getResource('wrapperHtmlEl');
        const el = wrapperEl ? wrapperEl : this.#context.getResource('htmlEl');
        if (!el) {
            return;
        }
        this.#htmlEl = el;
        this.#currentId = this.#context.contextData.id;
        if (!this.#displayObject) {
            this.#displayObject = new Container();
            this.#sprite = new Sprite(Texture.EMPTY);
            this.#sprite.x = this.state.width / 2;
            this.#sprite.y = this.state.height / 2;
            this.#sprite.anchor.set(0.5);
            this.#sprite.width = this.state.width;
            this.#sprite.height = this.state.height;
            this.#displayObject.addChild(this.#sprite);
            this.#context.setResource('pixiRenderObject', this.#displayObject);
        }
    }
    async #handleRefresh() {
        await this.#handleDestroy();
        await this.#handleSetup();
    }
    // update on context id change, for example, subtitle changed so id changed as well
    async #handleUpdate() {
        if (this.#currentId !== this.#context.contextData.id) {
            await this.#handleRefresh();
        }
        if (this.#htmlEl && this.#lastHtml == this.#htmlEl.outerHTML) {
            return;
        }
        const rerendered = await this.#renderSvg();
        if (this.svg && rerendered) {
            const texture = await this.#svgToTexture(this.svg);
            if (texture) {
                this.#sprite.texture.destroy();
                this.#sprite.texture = texture;
            }
        }
    }
    async #handleDestroy() {
        this.#htmlEl = undefined;
    }
    // we need to set context here and not inject it is bound to component and we can update any of the components at any time
    async handle(type, context) {
        this.#context = context;
        if (this.#context.disabled) {
            return;
        }
        const handler = this.#handlers[type];
        if (handler) {
            await handler();
        }
    }
}
