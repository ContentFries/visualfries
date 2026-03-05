import * as PIXI from 'pixi.js-legacy';
import { PIXI_DEFAULTS } from '../constants.js';
import { registerGsapPlugins } from '../registers.js';
import { DomManager } from './DomManager.js';
import { StateManager } from './StateManager.svelte.js';
export class AppManager {
    #app;
    #destroyed = false;
    state;
    dom;
    forceCanvas; // ForceCanvas
    serverRendererMode;
    preferWebGL2;
    powerPreference;
    deterministicMediaManager;
    constructor(cradle) {
        this.state = cradle.stateManager;
        this.dom = cradle.domManager;
        this.forceCanvas = cradle.forceCanvas;
        this.serverRendererMode = cradle.serverRendererMode ?? 'canvas';
        this.preferWebGL2 = cradle.preferWebGL2 ?? true;
        this.powerPreference = cradle.powerPreference ?? 'high-performance';
        this.deterministicMediaManager = cradle.deterministicMediaManager;
    }
    get app() {
        return this.#app;
    }
    get stage() {
        return this.#app.stage;
    }
    get screen() {
        return this.#app.screen;
    }
    async initialize() {
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
        PixiPlugin.registerPIXI(PIXI);
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
            this.#app = new PIXI.Application(options);
        }
        catch (error) {
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
                this.#app = new PIXI.Application(options);
            }
            else {
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
            }
            else {
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
    #buildRendererOptions(baseOptions, environment, selection) {
        const options = {
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
    #resolveRendererSelection(environment) {
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
                const fallbackReason = 'serverRendererMode="webgl" requested but forceCanvas=true override is enabled';
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
    #checkWebGLSupport() {
        try {
            const probe = this.dom?.canvas ??
                (typeof document !== 'undefined' ? document.createElement('canvas') : null);
            if (!probe || typeof probe.getContext !== 'function') {
                return { supported: false, reason: 'WebGL unavailable: no canvas available for probing' };
            }
            if (this.preferWebGL2 && probe.getContext('webgl2')) {
                return { supported: true, reason: '' };
            }
            if (probe.getContext('webgl') || probe.getContext('experimental-webgl')) {
                return { supported: true, reason: '' };
            }
            return { supported: false, reason: 'WebGL unavailable: context creation failed' };
        }
        catch {
            return { supported: false, reason: 'WebGL unavailable: context probe failed' };
        }
    }
    #configureWebGLEnvironmentPreference() {
        const pixiAny = PIXI;
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
    #detectRendererType() {
        if (!this.#app) {
            return 'canvas';
        }
        const renderer = this.#app.renderer;
        if (renderer?.gl || renderer?.context?.gl || renderer?.context?.webGLVersion) {
            return 'webgl';
        }
        return 'canvas';
    }
    #buildInitFallbackReason(error) {
        if (error instanceof Error && error.message) {
            return `WebGL initialization failed: ${error.message}`;
        }
        return 'WebGL initialization failed with unknown error';
    }
    #warnRendererFallback(reason) {
        console.warn(`[AppManager] Falling back to canvas renderer. ${reason}`);
    }
    async extractBase64(target, format = 'png', quality = 1) {
        if (!this.#app)
            throw new Error('App not initialized');
        if ('extract' in this.#app.renderer) {
            return this.#app.renderer.extract.base64(target, format, quality);
        }
        throw new Error('Extract not supported in current renderer');
    }
    resize(width, height) {
        this.#app.renderer.resize(width, height);
    }
    render() {
        if (!this.#app)
            return;
        this.#app.render();
    }
    scale(scale) {
        if (!this.#app)
            throw new Error('App not initialized');
        this.#app.stage.scale.set(scale);
        this.#app.render();
    }
    destroy() {
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
