import * as PIXI from 'pixi.js-legacy';
import { PIXI_DEFAULTS } from '../constants.js';
import { registerGsapPlugins } from '$lib/registers.js';
import { DomManager } from './DomManager.js';
import { StateManager } from './StateManager.svelte.js';

export class AppManager {
	#app!: PIXI.Application;
	#destroyed = false;

	private state: StateManager;
	private dom: DomManager;
	private forceCanvas: boolean; // ForceCanvas

	constructor(cradle: {
		stateManager: StateManager;
		domManager: DomManager;
		forceCanvas: boolean;
	}) {
		this.state = cradle.stateManager;
		this.dom = cradle.domManager;
		this.forceCanvas = cradle.forceCanvas;
	}

	public get app(): PIXI.Application {
		return this.#app;
	}

	public get stage(): PIXI.Container {
		return this.#app.stage;
	}

	public get screen(): PIXI.Rectangle {
		return this.#app.screen;
	}

	async initialize(): Promise<void> {
		if (this.#app && !this.#destroyed) {
			return;
		}

		const { width, height, environment, scale } = this.state;
		this.#destroyed = false;
		const canvas = this.dom.canvas;
		if (environment === 'server') {
			const ctx = canvas.getContext('2d', { willReadFrequently: true });
		}

		const { PixiPlugin } = await registerGsapPlugins();
		// give the plugin a reference to the PIXI object
		PixiPlugin.registerPIXI(this.app);

		const options = {
			...PIXI_DEFAULTS,
			preserveDrawingBuffer: environment === 'server',
			// clearBeforeRender: environment === 'server' ? false : true,
			width,
			height,
			view: canvas,
			forceCanvas: environment === 'server' || this.forceCanvas,
			backgroundColor: environment === 'server' ? 'transparent' : '#ffffff',
			backgroundAlpha: environment === 'server' ? 0 : 1
		};

		this.#app = new PIXI.Application(options);
		if (scale !== 1) {
			this.scale(scale);
		}

		// Stop the default ticker as we'll use GSAP's ticker
		this.#app.ticker.stop();
	}

	async extractBase64(
		target?: PIXI.DisplayObject | PIXI.RenderTexture,
		format = 'png',
		quality = 1
	): Promise<string> {
		if (!this.#app) throw new Error('App not initialized');

		if ('extract' in this.#app.renderer) {
			return (this.#app.renderer as PIXI.Renderer).extract.base64(target, format, quality);
		}
		throw new Error('Extract not supported in current renderer');
	}

	resize(width: number, height: number): void {
		this.#app.renderer.resize(width, height);
	}

	render() {
		if (!this.#app) return;
		this.#app.render();
	}

	scale(scale: number): void {
		if (!this.#app) throw new Error('App not initialized');
		this.#app.stage.scale.set(scale);
		this.#app.render();
	}

	destroy(): void {
		if (this.#app) {
			this.#app.destroy(true, {
				children: true,
				texture: true,
				baseTexture: true
			});
			this.#destroyed = true;
		}
	}
}
