import * as PIXI from 'pixi.js-legacy';

import type {
	IComponentContext,
	IComponentHook,
	HookType,
	HookHandlers
} from '$lib';
import { setPlacementAndOpacity } from '$lib/utils/utils.js';
import type { Appearance } from '$lib';
import { StateManager } from '$lib/managers/StateManager.svelte.js';

export class PixiDisplayObjectHook implements IComponentHook {
	types: HookType[] = ['update', 'destroy', 'refresh'];

	#handlers: HookHandlers = {
		update: this.#handleUpdate.bind(this),
		destroy: this.#handleDestroy.bind(this),
		refresh: this.#handleRefresh.bind(this),
		'refresh:config': this.#handleRefresh.bind(this)
	} as const;

	priority: number = 1;
	#context!: IComponentContext;
	#pixiTexture!: PIXI.Texture;
	#displayObject!: PIXI.Container;
	private state: StateManager;

	constructor(cradle: { stateManager: StateManager }) {
		this.state = cradle.stateManager;
	}

	get sceneWidth() {
		return this.#context.sceneState.width;
	}

	get sceneHeight() {
		return this.#context.sceneState.height;
	}

	private initMainSprite() {
		const sprite = new PIXI.Sprite(this.#pixiTexture);
		setPlacementAndOpacity(sprite, this.#context.data.appearance as Appearance);
		this.#displayObject.addChild(sprite);
	}

	#initDisplayObject() {
		this.initMainSprite();
	}

	async #handleRefresh() {
		await this.#handleDestroy();
		this.#initDisplayObject();
		await this.#handleUpdate();
	}

	async #handleUpdate() {
		const isActive = this.#context.isActive;
		if (this.#displayObject) {
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
			this.#displayObject = existingRenderObject as PIXI.Container;
			return;
		}

		// Regular shapes need texture to create sprite
		const texture = this.#context.getResource('pixiTexture');
		if (!texture) {
			throw new Error('pixiTexture not found in resources.');
		}

		this.#pixiTexture = texture;
		this.#displayObject = new PIXI.Container();
		this.#initDisplayObject();
		this.#context.setResource('pixiRenderObject', this.#displayObject);
	}

	async #handleDestroy() {
		this.#displayObject.removeChildren();
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
