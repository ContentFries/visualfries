import * as PIXI from 'pixi.js-legacy';
import { createPixiAnimationTarget } from '../../animations/PixiAnimationTarget.js';
/**
 * Publishes one stable outer Pixi container as the visual animation owner.
 * Renderer hooks remain responsible for their inner geometry; animation x/y
 * are component-relative translation offsets around the fixed center pivot.
 */
export class PixiVisualTransformHook {
    types = ['setup', 'update', 'refresh', 'refresh:content', 'destroy'];
    priority = 1;
    #context;
    #outer;
    #content;
    #target;
    #state;
    #handlers = {
        setup: this.#publish.bind(this),
        update: this.#publish.bind(this),
        refresh: this.#publish.bind(this),
        'refresh:content': this.#publish.bind(this),
        destroy: this.#destroy.bind(this)
    };
    constructor(cradle) {
        this.#state = cradle.stateManager;
    }
    #ensureOuter() {
        if (this.#outer)
            return;
        const appearance = this.#context.data.appearance;
        const centerX = appearance.x + appearance.width / 2;
        const centerY = appearance.y + appearance.height / 2;
        this.#outer = new PIXI.Container();
        this.#outer.pivot.set(centerX, centerY);
        this.#outer.position.set(centerX, centerY);
        this.#target = createPixiAnimationTarget(this.#outer, () => this.#state.markDirty(), {
            x: centerX,
            y: centerY
        });
    }
    async #publish() {
        const renderObject = this.#context.getResource('pixiRenderObject');
        if (!renderObject && !this.#outer)
            return;
        this.#ensureOuter();
        if (!this.#outer || !this.#target)
            return;
        if (renderObject && renderObject !== this.#outer && renderObject !== this.#content) {
            if (this.#content?.parent === this.#outer)
                this.#outer.removeChild(this.#content);
            if (renderObject.parent)
                renderObject.parent.removeChild(renderObject);
            this.#outer.addChild(renderObject);
            this.#content = renderObject;
            this.#state.markDirty();
        }
        const visible = this.#context.isActive && this.#context.data.visible !== false;
        if (this.#outer.visible !== visible) {
            this.#outer.visible = visible;
            this.#state.markDirty();
        }
        this.#context.setResource('pixiRenderObject', this.#outer);
        this.#context.setResource('animationTarget', this.#target);
    }
    async #destroy() {
        this.#context.removeResource('animationTarget');
        if (this.#outer) {
            if (this.#outer.parent)
                this.#outer.parent.removeChild(this.#outer);
            this.#outer.removeChildren();
            this.#outer.destroy({ children: false });
            if (this.#context.getResource('pixiRenderObject') === this.#outer) {
                this.#context.removeResource('pixiRenderObject');
            }
        }
        this.#content = undefined;
        this.#target = undefined;
        this.#outer = undefined;
    }
    async handle(type, context) {
        this.#context = context;
        const handler = this.#handlers[type];
        if (handler)
            await handler();
    }
}
