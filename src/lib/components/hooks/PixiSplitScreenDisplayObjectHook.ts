import * as PIXI from 'pixi.js-legacy';

import type { IComponentContext, IComponentHook, HookType, HookHandlers } from '$lib';
import { ImageComponentShape, LayoutSplitEffectShape, VideoComponentShape } from '$lib';
import { z } from 'zod';
import type { StateManager } from '$lib/managers/StateManager.svelte.ts';
import type { DeterministicMediaManager } from '$lib/managers/DeterministicMediaManager.ts';
import type { AppManager } from '$lib/managers/AppManager.svelte.ts';

export class PixiSplitScreenDisplayObjectHook implements IComponentHook {
	types: HookType[] = ['update', 'destroy', 'refresh', 'refresh:content'];

	#handlers: HookHandlers = {
		update: this.#handleUpdate.bind(this),
		destroy: this.#handleDestroy.bind(this),
		refresh: this.#handleRefresh.bind(this),
		'refresh:config': this.#handleRefresh.bind(this),
		'refresh:metadata': this.#handleRefresh.bind(this),
		'refresh:content': this.#handleRefresh.bind(this)
	} as const;

	priority: number = 1;
	#context!: IComponentContext;
	#pixiTexture!: PIXI.Texture;
	#displayObject!: PIXI.Container;
	#mainSprite: PIXI.Sprite | undefined = undefined;
	#bgCanvas: HTMLCanvasElement | undefined = undefined;
	#bgSprite: PIXI.Sprite | undefined = undefined;
	#blurStrength = 50;
	#blurDownscale = 0.33;
	#lastBlurFrameKey = '';
	#resourceIds = new WeakMap<object, number>();
	#nextResourceId = 1;
	componentElement!: z.infer<typeof VideoComponentShape> | z.infer<typeof ImageComponentShape>;
	private sceneState: StateManager;
	private deterministicMediaManager?: DeterministicMediaManager;
	private appManager?: AppManager;

	constructor(cradle: {
		stateManager: StateManager;
		deterministicMediaManager?: DeterministicMediaManager;
		appManager?: AppManager;
	}) {
		this.sceneState = cradle.stateManager;
		this.deterministicMediaManager = cradle.deterministicMediaManager;
		this.appManager = cradle.appManager;
	}

	get sceneWidth() {
		return this.#context.sceneState.width;
	}

	get sceneHeight() {
		return this.#context.sceneState.height;
	}

	private initBlurBackground(strength = 50) {
		const sanitizedStrength = this.#sanitizeBlurStrength(strength);
		this.#blurDownscale = this.#getBlurDownscale();
		this.#blurStrength = sanitizedStrength;
		this.#lastBlurFrameKey = '';
		const backgroundSprite = new PIXI.Sprite(this.#pixiTexture);
		this.#bgSprite = backgroundSprite;
		this.setupBackground(backgroundSprite, sanitizedStrength);
		this.#displayObject.addChild(backgroundSprite);
	}

	#getBlurDownscale(): number {
		const configured = this.deterministicMediaManager?.config.blurDownscale ?? 0.33;
		if (!Number.isFinite(configured)) {
			return 0.33;
		}
		return Math.max(0.05, Math.min(1, configured));
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

		if (this.sceneState.environment === 'server' && !this.#isWebGLRendererActive()) {
			// Create a temporary canvas for blur effect
			const bgCanvas = document.createElement('canvas');
			bgCanvas.width = Math.max(1, Math.round(backgroundSprite.width * this.#blurDownscale));
			bgCanvas.height = Math.max(1, Math.round(backgroundSprite.height * this.#blurDownscale));

			this.#bgCanvas = bgCanvas;

			this.#drawBlurredBackground(sanitizedStrength, true);
			const blurredTexture = PIXI.Texture.from(bgCanvas);
			backgroundSprite.texture = blurredTexture;
		} else {
			// Client mode and server webgl mode both use PIXI blur filter.
			this.#bgCanvas = undefined;
			const blurFilter = new PIXI.BlurFilter(sanitizedStrength, 50, 1, 7);
			backgroundSprite.filters = [blurFilter];
		}
	}

	#isWebGLRendererActive(): boolean {
		const renderer = this.appManager?.app?.renderer as
			| { gl?: unknown; context?: { gl?: unknown; webGLVersion?: unknown } }
			| undefined;
		if (renderer?.gl || renderer?.context?.gl || renderer?.context?.webGLVersion) {
			return true;
		}
		return this.deterministicMediaManager?.getSelectedRendererType?.() === 'webgl';
	}

	#drawBlurredBackground(strength = 50, force = false) {
		if (!this.#bgCanvas) {
			return false;
		}

		// Validate and sanitize strength parameter
		const sanitizedStrength = this.#sanitizeBlurStrength(strength);

		const ctx = this.#bgCanvas.getContext('2d')!;
		// Get the source element (video/image)
		const sourceElement =
			this.#context.getResource('videoElement') || this.#context.getResource('imageElement');
		if (!sourceElement) {
			// Video or Image element not ready yet - will be called again on next update
			return false;
		}

		const fps = this.sceneState.data.settings.fps || 30;
		const componentFrameIndex = Math.max(0, Math.round(this.#context.currentComponentTime * fps));
		const textureToken = this.#context.getResource('pixiTexture') ?? sourceElement;
		const frameKey = `${componentFrameIndex}:${this.#resourceToken(textureToken)}`;
		if (!force && frameKey === this.#lastBlurFrameKey) {
			return false;
		}
		this.#lastBlurFrameKey = frameKey;

		// Use sanitized value to prevent XSS
		const effectiveBlurStrength = sanitizedStrength * this.#blurDownscale;
		ctx.filter = `blur(${effectiveBlurStrength}px)`;
		ctx.clearRect(0, 0, this.#bgCanvas.width, this.#bgCanvas.height);

		// Draw the original texture with blur
		try {
			ctx.drawImage(sourceElement, 0, 0, this.#bgCanvas.width, this.#bgCanvas.height);
		} catch {
			return false;
		}
		const texture = this.#bgSprite?.texture as { baseTexture?: { update?: () => void }; update?: () => void };
		texture.baseTexture?.update?.();
		texture.update?.();
		this.deterministicMediaManager?.recordBlurRedraw(this.#currentSceneFrameIndex());
		return true;
	}

	#resourceToken(value: unknown): string {
		if (typeof value === 'object' && value !== null) {
			let id = this.#resourceIds.get(value);
			if (!id) {
				id = this.#nextResourceId;
				this.#nextResourceId += 1;
				this.#resourceIds.set(value, id);
			}
			return `obj-${id}`;
		}
		return String(value);
	}

	#currentSceneFrameIndex(): number {
		const fps = this.sceneState.data.settings.fps || 30;
		return Math.max(0, Math.round(this.sceneState.currentTime * fps));
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
		this.#mainSprite = mainSprite;
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

	#swapDisplayTexture(nextTexture: PIXI.Texture) {
		if (!this.#displayObject) {
			return;
		}

		const previousTexture = this.#pixiTexture;
		const walk = (node: { children?: unknown[] }) => {
			const children = node.children;
			if (!Array.isArray(children)) {
				return;
			}

			for (const child of children) {
				const spriteLike = child as { texture?: PIXI.Texture };
				if (spriteLike.texture && spriteLike.texture === previousTexture) {
					spriteLike.texture = nextTexture;
				}
				walk(child as { children?: unknown[] });
			}
		};

		walk(this.#displayObject as unknown as { children?: unknown[] });
		this.#pixiTexture = nextTexture;
	}

	#isTextureValid(texture: PIXI.Texture | undefined): boolean {
		if (!texture) return false;
		// PIXI textures expose valid/baseTexture after destroy
		const tex = texture as { valid?: boolean; baseTexture?: { valid?: boolean; destroyed?: boolean } };
		if (tex.valid === false) return false;
		if (tex.baseTexture?.valid === false || tex.baseTexture?.destroyed === true) return false;
		return true;
	}

	#needsRebuild(): boolean {
		// No display object yet — needs initial build (handled by creation path)
		if (!this.#displayObject) return false;
		// Tracked texture was destroyed or became invalid
		if (!this.#isTextureValid(this.#pixiTexture)) return true;
		// Display object lost its children (shouldn't happen, but defensive)
		if (this.#displayObject.children.length === 0) return true;
		return false;
	}

	#destroyChildren() {
		const removed = this.#displayObject.removeChildren();
		if (Array.isArray(removed)) {
			for (const child of removed) {
				if (typeof child.destroy === 'function') {
					child.destroy({ children: true });
				}
			}
		}
	}

	#rebuild(texture: PIXI.Texture) {
		this.#mainSprite = undefined;
		this.#bgCanvas = undefined;
		this.#bgSprite = undefined;
		this.#lastBlurFrameKey = '';
		this.#pixiTexture = texture;
		this.#destroyChildren();
		this.#initDisplayObject();
	}

	async #handleUpdate() {
		const isActive = this.#context.isActive;
		if (this.#displayObject) {
			const currentTexture = this.#context.getResource('pixiTexture');

			// Auto-heal: if the tracked texture is destroyed or children are missing,
			// rebuild the display object from the current valid texture.
			if (this.#needsRebuild()) {
				if (currentTexture && this.#isTextureValid(currentTexture)) {
					this.#rebuild(currentTexture);
				} else {
					// No valid texture available — hide and wait for next tick
					this.#displayObject.visible = false;
					this.#context.setResource('pixiRenderObject', this.#displayObject);
					return;
				}
			} else if (currentTexture && currentTexture !== this.#pixiTexture && this.#isTextureValid(currentTexture)) {
				// Texture swaps are frequent in deterministic mode; update sprite textures
				// in-place instead of rebuilding split/blur geometry each frame.
				this.#swapDisplayTexture(currentTexture);
			}

			if (isActive && this.#bgCanvas) {
				this.#drawBlurredBackground(this.#blurStrength);
			}

			// Update main sprite position/size from appearance data
			if (this.#mainSprite) {
				const appearance = this.#context.data.appearance;
				this.#mainSprite.x = appearance.x;
				this.#mainSprite.y = appearance.y;
				this.#mainSprite.width = appearance.width;
				this.#mainSprite.height = appearance.height;
			}

			// Always re-assert the resource in case the context was cleared or updated
			this.#context.setResource('pixiRenderObject', this.#displayObject);

			if (this.#displayObject.visible != isActive) {
				this.#displayObject.visible = isActive;
			}
			return;
		}

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

	async #handleRefresh() {
		const currentTexture = this.#context.getResource('pixiTexture');

		// Check if texture has changed (e.g., video source change)
		if (currentTexture && currentTexture !== this.#pixiTexture) {
			// Texture changed - need to recreate everything
			await this.#handleDestroy();
			this.#pixiTexture = currentTexture;
			if (this.#displayObject) {
				this.#destroyChildren();
				this.#initDisplayObject();
			}
		} else if (this.#displayObject?.children?.length > 0) {
			// Same texture - just update sprite properties (position, size, etc.)
			// For split screen, we may need to rebuild if effects changed
			// For now, trigger a full rebuild on refresh
			this.#destroyChildren();
			if (currentTexture) {
				this.#pixiTexture = currentTexture;
				this.#initDisplayObject();
			}
		}
		// If no texture yet, #handleUpdate will handle initial creation
	}

	async #handleDestroy() {
		this.#mainSprite = undefined;
		this.#bgCanvas = undefined;
		this.#bgSprite = undefined;
		this.#lastBlurFrameKey = '';
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		const data = this.#context.contextData;
		if (!data || (data.type !== 'VIDEO' && data.type !== 'IMAGE')) {
			return;
		}
		this.componentElement = data as any;

		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
