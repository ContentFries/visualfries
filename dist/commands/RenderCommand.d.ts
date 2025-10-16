import type { EventManager } from '../managers/EventManager.js';
import type { RenderManager } from '../managers/RenderManager.js';
import type { StateManager } from '../managers/StateManager.svelte.js';
import type { SyncCommand } from './Command.js';
export declare class RenderCommand implements SyncCommand<boolean | number> {
    private eventManager;
    private state;
    private renderManager;
    constructor(cradle: {
        eventManager: EventManager;
        stateManager: StateManager;
        renderManager: RenderManager;
    });
    execute(): boolean | number;
}
