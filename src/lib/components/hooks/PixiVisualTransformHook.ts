import * as PIXI from 'pixi.js-legacy';

import type { IComponentContext, IComponentHook, HookHandlers, HookType } from '$lib';
import {
	createPixiAnimationTarget,
	type PixiAnimationTarget
} from '$lib/animations/PixiAnimationTarget.js';
import type { StateManager } from '$lib/managers/StateManager.svelte.js';

/**
 * Publishes one stable outer Pixi container as the visual animation owner.
 * Renderer hooks remain responsible for their inner geometry; animation x/y
 * are component-relative translation offsets around the fixed center pivot.
 */
export class PixiVisualTransformHook implements IComponentHook {
	types: HookType[] = ['setup', 'update', 'refresh', 'refresh:content', 'destroy'];
	priority = 1;

	#context!: IComponentContext;
	#outer: PIXI.Container | undefined;
	#content: PIXI.Container | undefined;
	#target: PixiAnimationTarget | undefined;
	#origin: { x: number; y: number } | undefined;
	#state: StateManager;

	#handlers: HookHandlers = {
		setup: this.#publish.bind(this),
		update: this.#publish.bind(this),
		refresh: this.#publish.bind(this),
		'refresh:content': this.#publish.bind(this),
		destroy: this.#destroy.bind(this)
	};

	constructor(cradle: { stateManager: StateManager }) {
		this.#state = cradle.stateManager;
	}

	#ensureOuter() {
		if (this.#outer) return;
		const appearance = this.#context.data.appearance;
		const centerX = appearance.x + appearance.width / 2;
		const centerY = appearance.y + appearance.height / 2;
		this.#outer = new PIXI.Container();
		this.#outer.pivot.set(centerX, centerY);
		this.#outer.position.set(centerX, centerY);
		this.#origin = { x: centerX, y: centerY };
		this.#target = createPixiAnimationTarget(
			this.#outer,
			() => this.#state.markDirty(),
			this.#origin
		);
	}

	#syncPlacement() {
		if (!this.#outer || !this.#target || !this.#origin) return;
		const appearance = this.#context.data.appearance;
		const centerX = appearance.x + appearance.width / 2;
		const centerY = appearance.y + appearance.height / 2;
		if (centerX === this.#origin.x && centerY === this.#origin.y) return;
		const offsetX = this.#target.x;
		const offsetY = this.#target.y;
		this.#origin.x = centerX;
		this.#origin.y = centerY;
		this.#outer.pivot.set(centerX, centerY);
		this.#outer.position.set(centerX + offsetX, centerY + offsetY);
		this.#state.markDirty();
	}

	async #publish() {
		const renderObject = this.#context.getResource('pixiRenderObject');
		if (!renderObject && !this.#outer) return;
		this.#ensureOuter();
		if (!this.#outer || !this.#target) return;
		this.#syncPlacement();

		if (renderObject && renderObject !== this.#outer && renderObject !== this.#content) {
			if (this.#content?.parent === this.#outer) this.#outer.removeChild(this.#content);
			if (renderObject.parent) renderObject.parent.removeChild(renderObject);
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
			if (this.#outer.parent) this.#outer.parent.removeChild(this.#outer);
			this.#outer.removeChildren();
			this.#outer.destroy({ children: false });
			if (this.#context.getResource('pixiRenderObject') === this.#outer) {
				this.#context.removeResource('pixiRenderObject');
			}
		}
		this.#content = undefined;
		this.#target = undefined;
		this.#origin = undefined;
		this.#outer = undefined;
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		const handler = this.#handlers[type];
		if (handler) await handler();
	}
}
