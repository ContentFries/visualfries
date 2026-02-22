import * as PIXI from 'pixi.js-legacy';
import { PIXI_DEFAULTS } from '../constants.js';
import { registerGsapPlugins } from '$lib/registers.js';
import { DomManager } from './DomManager.js';
import { StateManager } from './StateManager.svelte.js';
import type { DeterministicMediaManager } from './DeterministicMediaManager.js';

type ServerRendererMode = 'canvas' | 'webgl';
type PowerPreference = 'default' | 'high-performance' | 'low-power';

type RendererSelection = {
	requestedMode: ServerRendererMode;
	selectedMode: 'canvas' | 'webgl';
	forceCanvas: boolean;
	fallbackOccurred: boolean;
	fallbackReason?: string;
};

export class AppManager {
	#app!: PIXI.Application;
	#destroyed = false;

	private state: StateManager;
	private dom: DomManager;
	private forceCanvas: boolean; // ForceCanvas
	private serverRendererMode: ServerRendererMode;
	private preferWebGL2: boolean;
	private powerPreference: PowerPreference;
	private deterministicMediaManager?: DeterministicMediaManager;

	constructor(cradle: {
		stateManager: StateManager;
		domManager: DomManager;
		forceCanvas: boolean;
		serverRendererMode?: ServerRendererMode;
		preferWebGL2?: boolean;
		powerPreference?: PowerPreference;
		deterministicMediaManager?: DeterministicMediaManager;
	}) {
		this.state = cradle.stateManager;
		this.dom = cradle.domManager;
		this.forceCanvas = cradle.forceCanvas;
		this.serverRendererMode = cradle.serverRendererMode ?? 'canvas';
		this.preferWebGL2 = cradle.preferWebGL2 ?? true;
		this.powerPreference = cradle.powerPreference ?? 'high-performance';
		this.deterministicMediaManager = cradle.deterministicMediaManager;
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
		let rendererSelection = this.#resolveRendererSelection(environment);
		if (environment === 'server' && rendererSelection.forceCanvas) {
			canvas.getContext('2d', { willReadFrequently: true });
		}

		const { PixiPlugin } = await registerGsapPlugins();
		// give the plugin a reference to the PIXI object
		PixiPlugin.registerPIXI(PIXI as any);

		const baseOptions = {
			...PIXI_DEFAULTS,
			preserveDrawingBuffer: environment === 'server',
			// clearBeforeRender: environment === 'server' ? false : true,
			width,
			height,
			view: canvas,
			backgroundColor: environment === 'server' ? 'transparent' : '#ffffff',
			backgroundAlpha: environment === 'server' ? 0 : 1
		};
		let options = this.#buildRendererOptions(baseOptions, environment, rendererSelection);

		try {
			this.#app = new PIXI.Application(options as any);
		} catch (error) {
			if (!rendererSelection.forceCanvas) {
				const fallbackReason = this.#buildInitFallbackReason(error);
				this.#warnRendererFallback(fallbackReason);
				rendererSelection = {
					requestedMode: rendererSelection.requestedMode,
					selectedMode: 'canvas',
					forceCanvas: true,
					fallbackOccurred: true,
					fallbackReason
				};
				canvas.getContext('2d', { willReadFrequently: true });
				options = this.#buildRendererOptions(baseOptions, environment, rendererSelection);
				this.#app = new PIXI.Application(options as any);
			} else {
				throw error;
			}
		}

		if (!rendererSelection.forceCanvas) {
			const actualRenderer = this.#detectRendererType();
			if (actualRenderer !== 'webgl') {
				const fallbackReason = 'Renderer initialized as canvas despite serverRendererMode="webgl"';
				this.#warnRendererFallback(fallbackReason);
				rendererSelection = {
					requestedMode: rendererSelection.requestedMode,
					selectedMode: 'canvas',
					forceCanvas: true,
					fallbackOccurred: true,
					fallbackReason
				};
			} else {
				rendererSelection = { ...rendererSelection, selectedMode: actualRenderer };
			}
		}
		if (scale !== 1) {
			this.scale(scale);
		}

		// Stop the default ticker as we'll use GSAP's ticker
		this.#app.ticker.stop();
		this.deterministicMediaManager?.recordRendererSelection({
			rendererType: rendererSelection.selectedMode,
			fallbackOccurred: rendererSelection.fallbackOccurred,
			fallbackReason: rendererSelection.fallbackReason
		});
	}

	#buildRendererOptions(
		baseOptions: Record<string, unknown>,
		environment: string,
		selection: RendererSelection
	): Record<string, unknown> {
		const options: Record<string, unknown> = {
			...baseOptions,
			forceCanvas: selection.forceCanvas
		};
		if (environment === 'server' && selection.selectedMode === 'webgl' && !selection.forceCanvas) {
			this.#configureWebGLEnvironmentPreference();
			options.preference = 'webgl';
			options.powerPreference = this.powerPreference;
		}
		return options;
	}

	#resolveRendererSelection(environment: string): RendererSelection {
		if (environment !== 'server') {
			return {
				requestedMode: 'canvas',
				selectedMode: this.forceCanvas ? 'canvas' : 'webgl',
				forceCanvas: this.forceCanvas,
				fallbackOccurred: false
			};
		}

		const requestedMode = this.serverRendererMode;
		if (this.forceCanvas) {
			if (requestedMode === 'webgl') {
				const fallbackReason =
					'serverRendererMode="webgl" requested but forceCanvas=true override is enabled';
				this.#warnRendererFallback(fallbackReason);
				return {
					requestedMode,
					selectedMode: 'canvas',
					forceCanvas: true,
					fallbackOccurred: true,
					fallbackReason
				};
			}
			return {
				requestedMode,
				selectedMode: 'canvas',
				forceCanvas: true,
				fallbackOccurred: false
			};
		}

		if (requestedMode === 'canvas') {
			return {
				requestedMode,
				selectedMode: 'canvas',
				forceCanvas: true,
				fallbackOccurred: false
			};
		}

		const support = this.#checkWebGLSupport();
		if (!support.supported) {
			this.#warnRendererFallback(support.reason);
			return {
				requestedMode,
				selectedMode: 'canvas',
				forceCanvas: true,
				fallbackOccurred: true,
				fallbackReason: support.reason
			};
		}

		return {
			requestedMode,
			selectedMode: 'webgl',
			forceCanvas: false,
			fallbackOccurred: false
		};
	}

	#checkWebGLSupport(): { supported: boolean; reason: string } {
		try {
			if (typeof document === 'undefined') {
				return { supported: false, reason: 'WebGL unavailable: no document in server environment' };
			}
			const probe = document.createElement('canvas');
			if (this.preferWebGL2 && probe.getContext('webgl2')) {
				return { supported: true, reason: '' };
			}
			if (probe.getContext('webgl') || probe.getContext('experimental-webgl')) {
				return { supported: true, reason: '' };
			}
			return { supported: false, reason: 'WebGL unavailable: context creation failed' };
		} catch {
			return { supported: false, reason: 'WebGL unavailable: context probe failed' };
		}
	}

	#configureWebGLEnvironmentPreference(): void {
		const pixiAny = PIXI as unknown as {
			settings?: { PREFER_ENV?: unknown };
			ENV?: { WEBGL?: unknown; WEBGL2?: unknown };
		};
		if (!pixiAny.settings || !pixiAny.ENV) {
			return;
		}
		if (this.preferWebGL2 && pixiAny.ENV.WEBGL2 !== undefined) {
			pixiAny.settings.PREFER_ENV = pixiAny.ENV.WEBGL2;
			return;
		}
		if (pixiAny.ENV.WEBGL !== undefined) {
			pixiAny.settings.PREFER_ENV = pixiAny.ENV.WEBGL;
		}
	}

	#detectRendererType(): 'canvas' | 'webgl' {
		if (!this.#app) {
			return 'canvas';
		}
		const renderer = this.#app.renderer as unknown as {
			gl?: unknown;
			context?: { gl?: unknown; webGLVersion?: unknown };
			type?: number;
		};
		if (renderer?.gl || renderer?.context?.gl || renderer?.context?.webGLVersion) {
			return 'webgl';
		}
		return 'canvas';
	}

	#buildInitFallbackReason(error: unknown): string {
		if (error instanceof Error && error.message) {
			return `WebGL initialization failed: ${error.message}`;
		}
		return 'WebGL initialization failed with unknown error';
	}

	#warnRendererFallback(reason: string): void {
		console.warn(`[AppManager] Falling back to canvas renderer. ${reason}`);
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
