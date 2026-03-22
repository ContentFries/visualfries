import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import type { ResourceManager, IComponent, ComponentData } from '..';
import type { AppearanceInput } from '..';
import { AppManager } from './AppManager.svelte.js';
import { LayersManager } from './LayersManager.svelte.js';
export declare class RenderManager {
    #private;
    private state;
    private componentsManager;
    private eventManager;
    private appManager;
    private layersManager;
    private lastActiveById;
    private lastRenderTime;
    private renderInFlight;
    private rerenderRequested;
    constructor(cradle: {
        stateManager: StateManager;
        componentsManager: ResourceManager<IComponent, ComponentData, AppearanceInput>;
        eventManager: EventManager;
        appManager: AppManager;
        layersManager: LayersManager;
    });
    private initializeEventListeners;
    private handleBeforeRender;
    render(): Promise<void>;
    destroy(): void;
}
