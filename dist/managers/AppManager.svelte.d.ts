import * as PIXI from 'pixi.js-legacy';
import { DomManager } from './DomManager.js';
import { StateManager } from './StateManager.svelte.js';
import type { DeterministicMediaManager } from './DeterministicMediaManager.js';
type ServerRendererMode = 'canvas' | 'webgl';
type PowerPreference = 'default' | 'high-performance' | 'low-power';
export declare class AppManager {
    #private;
    private state;
    private dom;
    private forceCanvas;
    private serverRendererMode;
    private preferWebGL2;
    private powerPreference;
    private deterministicMediaManager?;
    constructor(cradle: {
        stateManager: StateManager;
        domManager: DomManager;
        forceCanvas: boolean;
        serverRendererMode?: ServerRendererMode;
        preferWebGL2?: boolean;
        powerPreference?: PowerPreference;
        deterministicMediaManager?: DeterministicMediaManager;
    });
    get app(): PIXI.Application;
    get stage(): PIXI.Container;
    get screen(): PIXI.Rectangle;
    initialize(): Promise<void>;
    extractBase64(target?: PIXI.DisplayObject | PIXI.RenderTexture, format?: string, quality?: number): Promise<string>;
    resize(width: number, height: number): void;
    render(): void;
    scale(scale: number): void;
    destroy(): void;
}
export {};
