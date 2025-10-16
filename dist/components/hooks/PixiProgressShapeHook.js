import * as PIXI from 'pixi.js-legacy';
import { setPlacementAndOpacity } from '../../utils/utils.js';
import { StateManager } from '../../managers/StateManager.svelte.js';
import { ProgressRenderer, LinearProgressRenderer, RadialProgressRenderer, PerimeterProgressRenderer, DoubleProgressRenderer, CustomProgressRenderer } from './shapes/progress/index.js';
class ProgressRendererFactory {
    static create(context, width, height, config) {
        const type = config.type;
        switch (config.type) {
            case 'linear':
                return new LinearProgressRenderer(context, width, height, config);
            case 'radial':
                return new RadialProgressRenderer(context, width, height, config);
            case 'perimeter':
                return new PerimeterProgressRenderer(context, width, height, config);
            case 'double':
                return new DoubleProgressRenderer(context, width, height, config);
            case 'custom':
                return new CustomProgressRenderer(context, width, height, config);
            default:
                throw new Error(`Unsupported progress type: ${type}`);
        }
    }
}
export class PixiProgressShapeHook {
    types = ['setup', 'update', 'destroy', 'refresh'];
    priority = 1;
    #context;
    #renderer;
    #lastProgress = -1;
    state;
    constructor(cradle) {
        this.state = cradle.stateManager;
    }
    #handlers = {
        setup: this.#handleSetup.bind(this),
        update: this.#handleUpdate.bind(this),
        refresh: this.#handleRefresh.bind(this),
        destroy: this.#handleDestroy.bind(this)
    };
    async #handleSetup(force = false) {
        if (this.#context.data.type !== 'SHAPE')
            return;
        if (this.#renderer && !force)
            return;
        const shapeData = this.#context.data;
        if (shapeData.shape.type !== 'progress')
            return;
        const { width, height } = shapeData.appearance;
        const progressConfig = shapeData.shape.progressConfig || {
            type: 'linear',
            direction: 'horizontal',
            reverse: false,
            anchor: 'start'
        };
        this.#renderer = ProgressRendererFactory.create(this.#context, width, height, progressConfig);
        const displayObject = this.#renderer.getDisplayObject();
        this.#context.setResource('pixiRenderObject', displayObject);
        setPlacementAndOpacity(displayObject, shapeData.appearance);
        this.#renderer.update(this.#context.progress);
    }
    async #handleRefresh() {
        // Preserve parent and index so the new display object is re-attached
        const oldDisplayObject = this.#renderer?.getDisplayObject();
        const parent = oldDisplayObject?.parent;
        const index = parent && oldDisplayObject ? parent.getChildIndex(oldDisplayObject) : -1;
        await this.#handleDestroy();
        await this.#handleSetup(true);
        // Re-attach new display object to the same parent/index
        if (parent && this.#renderer) {
            const newDisplayObject = this.#renderer.getDisplayObject();
            if (index >= 0 && index <= parent.children.length) {
                parent.addChildAt(newDisplayObject, index);
            }
            else {
                parent.addChild(newDisplayObject);
            }
        }
    }
    async #handleUpdate() {
        if (!this.#renderer) {
            await this.#handleSetup();
            return;
        }
        if (this.#context.data.type !== 'SHAPE')
            return;
        const shapeData = this.#context.data;
        if (shapeData.shape.type !== 'progress')
            return;
        const displayObject = this.#renderer.getDisplayObject();
        const isActive = this.#context.isActive;
        if (displayObject.visible !== isActive) {
            displayObject.visible = isActive;
            this.state.markDirty();
        }
        setPlacementAndOpacity(displayObject, shapeData.appearance);
        const currentProgress = this.#context.progress;
        if (this.#lastProgress !== currentProgress) {
            this.#renderer.update(currentProgress);
            this.#lastProgress = currentProgress;
            // Mark dirty only if progress actually changed
            this.state.markDirty();
        }
    }
    async #handleDestroy() {
        if (this.#renderer) {
            const displayObject = this.#renderer.getDisplayObject();
            // Detach from parent before destroying to avoid dangling references in the layer
            if (displayObject.parent) {
                displayObject.parent.removeChild(displayObject);
            }
            displayObject.destroy();
            this.#renderer = undefined;
            // Remove stale resource pointer
            this.#context.removeResource('pixiRenderObject');
        }
    }
    async handle(type, context) {
        this.#context = context;
        if (this.#context.data.type !== 'SHAPE')
            return;
        const shapeData = this.#context.data;
        if (shapeData.shape.type !== 'progress')
            return;
        const handler = this.#handlers[type];
        if (handler)
            await handler();
    }
}
