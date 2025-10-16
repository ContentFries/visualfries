import type { RenderEnvironment } from '..';
import { StateManager } from './StateManager.svelte.js';
export declare class DomManager {
    #private;
    private state;
    private env;
    private sceneContainer;
    constructor(cradle: {
        stateManager: StateManager;
        environment: RenderEnvironment;
        containerElement: HTMLDivElement;
    });
    get canvas(): HTMLCanvasElement;
    get htmlContainer(): HTMLDivElement;
    scale(scale: number): void;
    destroy(): void;
    removeLoader(): void;
}
