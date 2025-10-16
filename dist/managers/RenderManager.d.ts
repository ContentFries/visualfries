import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import type { ResourceManager, IComponent, ComponentData } from '..';
import type { AppearanceInput } from '..';
import { AppManager } from './AppManager.svelte.js';
export declare class RenderManager {
    private state;
    private componentsManager;
    private eventManager;
    private appManager;
    private lastActiveById;
    private lastRenderTime;
    constructor(cradle: {
        stateManager: StateManager;
        componentsManager: ResourceManager<IComponent, ComponentData, AppearanceInput>;
        eventManager: EventManager;
        appManager: AppManager;
    });
    private initializeEventListeners;
    private handleBeforeRender;
    render(): Promise<void>;
    destroy(): void;
}
