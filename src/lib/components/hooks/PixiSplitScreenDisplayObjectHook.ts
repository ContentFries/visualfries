import * as PIXI from 'pixi.js-legacy';

import type {
	IComponentContext,
	IComponentHook,
	HookType,
	HookHandlers
} from '$lib';
import { LayoutSplitEffectShape, VideoComponentShape } from '$lib';
import { z } from 'zod';
import type { StateManager } from '$lib/managers/StateManager.svelte.ts';

export class PixiSplitScreenDisplayObjectHook implements IComponentHook {
	types: HookType[] = ['update', 'destroy', 'refresh'];

	#handlers: HookHandlers = {
		update: this.#handleUpdate.bind(this),
		destroy: this.#handleDestroy.bind(this),
		refresh: this.#handleRefresh.bind(this),
		'refresh:config': this.#handleRefresh.bind(this),
		'refresh:metadata': this.#handleRefresh.bind(this)
	} as const;

	priority: number = 1;
	#context!: IComponentContext;
	#pixiTexture!: PIXI.Texture;
	#displayObject!: PIXI.Container;
	#bgCanvas: HTMLCanvasElement | undefined = undefined;
	componentElement!: z.infer<typeof VideoComponentShape>;
	private sceneState: StateManager;

	constructor(cradle: { stateManager: StateManager }) {
		this.sceneState = cradle.stateManager;
	}

	get sceneWidth() {
		return this.#context.sceneState.width;
	}

	get sceneHeight() {
		return this.#context.sceneState.height;
	}

	private initBlurBackground(strength = 50) {
		const sanitizedStrength = this.#sanitizeBlurStrength(strength);
		const backgroundSprite = new PIXI.Sprite(this.#pixiTexture);
		this.setupBackground(backgroundSprite, sanitizedStrength);
		this.#displayObject.addChild(backgroundSprite);
	}

	private setupBackground(backgroundSprite: PIXI.Sprite, strength = 50) {
		const sanitizedStrength = this.#sanitizeBlurStrength(strength);
		const sceneRatio = this.sceneWidth / this.sceneHeight;
		const videoRatio = this.#pixiTexture.width / this.#pixiTexture.height;

		let scale: number;
		if (sceneRatio > videoRatio) {
			// Scene is wider than video
			scale = this.sceneWidth / this.#pixiTexture.width;
		} else {
			// Scene is taller than video
			scale = this.sceneHeight / this.#pixiTexture.height;
		}

		backgroundSprite.width = this.#pixiTexture.width * scale;
		backgroundSprite.height = this.#pixiTexture.height * scale;
		// Center the background sprite
		backgroundSprite.x = (this.sceneWidth - backgroundSprite.width) / 2;
		backgroundSprite.y = (this.sceneHeight - backgroundSprite.height) / 2;

		if (this.sceneState.environment === 'server') {
			// Create a temporary canvas for blur effect
			const bgCanvas = document.createElement('canvas');
			bgCanvas.width = backgroundSprite.width;
			bgCanvas.height = backgroundSprite.height;

			this.#bgCanvas = bgCanvas;

			this.#drawBlurredBackground(sanitizedStrength);
			const blurredTexture = PIXI.Texture.from(bgCanvas);
			backgroundSprite.texture = blurredTexture;
		} else {
			// Create new PIXI texture from blurred canvas
			const blurFilter = new PIXI.BlurFilter(sanitizedStrength, 50, 1, 7);
			backgroundSprite.filters = [blurFilter];
		}
	}

	#drawBlurredBackground(strength = 50) {
		if (!this.#bgCanvas) {
			return;
		}

		// Validate and sanitize strength parameter
		const sanitizedStrength = this.#sanitizeBlurStrength(strength);

		const ctx = this.#bgCanvas.getContext('2d')!;
		// Use sanitized value to prevent XSS
		ctx.filter = `blur(${sanitizedStrength}px)`;

		// Get the source element (video/image)
		const sourceElement = this.#context.getResource('videoElement');
		if (!sourceElement) {
			throw new Error('videoElement not found in resources.');
		}
		// const sourceElement = this.#pixiTexture.baseTexture.resource.source as
		// 	| HTMLVideoElement
		// 	| HTMLImageElement;

		// Draw the original texture with blur
		ctx.drawImage(sourceElement, 0, 0, this.#bgCanvas.width, this.#bgCanvas.height);
	}

	/**
	 * Sanitizes blur strength parameter to prevent XSS and ensure valid numeric values
	 * @param strength - The blur strength value to sanitize
	 * @returns A safe numeric value between 0 and 100
	 */
	#sanitizeBlurStrength(strength: unknown): number {
		// Convert to number if it's a string
		let numericStrength: number;

		if (typeof strength === 'string') {
			// Remove any non-numeric characters except decimal point and minus sign
			const cleaned = strength.replace(/[^0-9.-]/g, '');
			numericStrength = parseInt(cleaned);
		} else if (typeof strength === 'number') {
			numericStrength = strength;
		} else {
			// Default to 50 for any other type
			numericStrength = 50;
		}

		// Check if the result is a valid number
		if (isNaN(numericStrength) || !isFinite(numericStrength)) {
			numericStrength = 50;
		}

		// Clamp the value to a reasonable range (0-100)
		return Math.max(0, Math.min(100, numericStrength));
	}

	private initSplitScreen(splitInfo: z.infer<typeof LayoutSplitEffectShape>) {
		const containers: PIXI.Container[] = [];
		splitInfo.chunks?.forEach((chunk) => {
			// toto nam urobi ohraniceny ramec v ktorom sa ukaze sprite
			const maskGraphics = new PIXI.Graphics();
			maskGraphics.beginFill(0xffffff, 0.5);
			maskGraphics.drawRect(0, 0, chunk.group.width, chunk.group.height);
			maskGraphics.endFill();

			// sprite teraz musime napozicovat do ohraniceneho rameca tak aby bolo cele prekryte a len to co chce user vidiet
			const splitSprite = new PIXI.Sprite(this.#pixiTexture);
			splitSprite.x = chunk.component.x;
			splitSprite.y = chunk.component.y;
			splitSprite.width = chunk.component.width;
			splitSprite.height = chunk.component.height;

			const container = new PIXI.Container();
			container.x = chunk.group.x;
			container.y = chunk.group.y;
			container.mask = maskGraphics;
			container.addChild(splitSprite);
			container.addChild(maskGraphics);
			containers.push(container);
		});
		this.#displayObject.addChild(...containers);
	}

	private initMainSprite() {
		const appearance = this.#context.data.appearance;
		const mainSprite = new PIXI.Sprite(this.#pixiTexture);
		mainSprite.width = appearance.width;
		mainSprite.height = appearance.height;
		mainSprite.x = appearance.x;
		mainSprite.y = appearance.y;
		this.#displayObject.addChild(mainSprite);
	}

	#initDisplayObject() {
		if (this.#context.data.effects && !this.#context.data.effects.enabled) {
			this.initMainSprite();
			return;
		}

		const hasBlur = Object.keys(this.#context.data.effects.map).includes('fillBackgroundBlur');
		if (hasBlur) {
			const blurEffect = this.#context.data.effects.map.fillBackgroundBlur as any;
			const strength = blurEffect?.blurAmount || 50;
			this.initBlurBackground(strength);
		}

		const splitScreen = Object.values(this.#context.data.effects.map).find(
			(key) => key.type === 'layoutSplit'
		);
		const splitScreenInfo = LayoutSplitEffectShape.safeParse(splitScreen);

		if (splitScreenInfo.success) {
			this.initSplitScreen(splitScreenInfo.data);
			return;
		}

		this.initMainSprite();
	}

	async #handleUpdate() {
		const isActive = this.#context.isActive;
		if (isActive) {
			this.#drawBlurredBackground();
		}

		if (this.#displayObject) {
			if (this.#displayObject.visible != isActive) {
				this.#displayObject.visible = isActive;
			}
			return;
		}

		const texture = this.#context.getResource('pixiTexture');
		if (!texture) {
			throw new Error('pixiTexture not found in resources.');
		}

		this.#pixiTexture = texture;
		this.#displayObject = new PIXI.Container();
		this.#initDisplayObject();
		this.#context.setResource('pixiRenderObject', this.#displayObject);
	}

	async #handleRefresh() {
		await this.#handleDestroy();
		this.#displayObject.removeChildren();
		this.#initDisplayObject();
		await this.#handleUpdate();
	}

	async #handleDestroy() {
		// remove event listeners from video
		this.#bgCanvas = undefined;
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		const data = this.#context.contextData;
		if (!data || data.type !== 'VIDEO') {
			return;
		}
		this.componentElement = data as z.infer<typeof VideoComponentShape>;

		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
