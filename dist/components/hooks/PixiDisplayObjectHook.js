import * as PIXI from 'pixi.js-legacy';
import { setPlacementAndOpacity } from '../../utils/utils.js';
import { StateManager } from '../../managers/StateManager.svelte.js';
export class PixiDisplayObjectHook {
    types = ['update', 'destroy', 'refresh', 'refresh:content'];
    #handlers = {
        update: this.#handleUpdate.bind(this),
        destroy: this.#handleDestroy.bind(this),
        refresh: this.#handleRefresh.bind(this),
        'refresh:config': this.#handleRefresh.bind(this),
        'refresh:content': this.#handleRefresh.bind(this)
    };
    priority = 1;
    #context;
    #pixiTexture;
    #displayObject;
    state;
    constructor(cradle) {
        this.state = cradle.stateManager;
    }
    get sceneWidth() {
        return this.#context.sceneState.width;
    }
    get sceneHeight() {
        return this.#context.sceneState.height;
    }
    initMainSprite() {
        const sprite = new PIXI.Sprite(this.#pixiTexture);
        setPlacementAndOpacity(sprite, this.#context.data.appearance);
        this.#displayObject.addChild(sprite);
    }
    #initDisplayObject() {
        this.initMainSprite();
    }
    async #handleRefresh() {
        // Check if texture has changed (e.g., video source change)
        const currentTexture = this.#context.getResource('pixiTexture');
        if (currentTexture && currentTexture !== this.#pixiTexture) {
            // Texture changed - need to recreate sprite with new texture
            await this.#handleDestroy();
            this.#pixiTexture = currentTexture;
            this.#initDisplayObject();
        }
        else if (this.#displayObject?.children?.length > 0) {
            // Same texture - just update sprite properties (position, size, opacity, etc.)
            const sprite = this.#displayObject.children[0];
            if (sprite) {
                setPlacementAndOpacity(sprite, this.#context.data.appearance);
                this.state.markDirty();
            }
        }
        // If no texture yet, #handleUpdate will handle initial creation
    }
    async #handleUpdate() {
        const isActive = this.#context.isActive;
        if (this.#displayObject) {
            // If the texture was swapped (e.g. by refresh:content), rebuild the sprite
            const currentTexture = this.#context.getResource('pixiTexture');
            if (currentTexture && currentTexture !== this.#pixiTexture) {
                await this.#handleRefresh();
            }
            // Always re-assert the resource in case the context was cleared or updated
            this.#context.setResource('pixiRenderObject', this.#displayObject);
            // Only mark dirty if visibility actually changed
            if (this.#displayObject.visible !== isActive) {
                this.#displayObject.visible = isActive;
                // Mark scene as dirty when visibility changes
                this.state.markDirty();
            }
            return;
        }
        // Check if this is a progress shape (which creates pixiRenderObject directly)
        const existingRenderObject = this.#context.getResource('pixiRenderObject');
        if (existingRenderObject) {
            // Progress shapes already have their display object set up
            this.#displayObject = existingRenderObject;
            return;
        }
        // Regular shapes need texture to create sprite
        const texture = this.#context.getResource('pixiTexture');
        if (!texture) {
            const type = this.#context.contextData.type;
            if (type === 'VIDEO' || type === 'GIF') {
                return;
            }
            throw new Error('pixiTexture not found in resources.');
        }
        this.#pixiTexture = texture;
        this.#displayObject = new PIXI.Container();
        this.#initDisplayObject();
        this.#context.setResource('pixiRenderObject', this.#displayObject);
    }
    async #handleDestroy() {
        if (this.#displayObject) {
            this.#displayObject.removeChildren();
        }
    }
    async handle(type, context) {
        this.#context = context;
        const handler = this.#handlers[type];
        if (handler) {
            await handler();
        }
    }
}
