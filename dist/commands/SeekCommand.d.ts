import type { Command } from './Command.js';
import { TimelineManager } from '../managers/TimelineManager.svelte.js';
import { StateManager } from '../managers/StateManager.svelte.js';
import { RenderManager } from '../managers/RenderManager.js';
import { ComponentsManager } from '../managers/ComponentsManager.svelte.js';
import { DeterministicMediaManager } from '../managers/DeterministicMediaManager.js';
export declare class SeekCommand implements Command {
    #private;
    private timeline;
    private state;
    private renderManager;
    private componentsManager;
    private deterministicMediaManager;
    constructor(cradle: {
        timelineManager: TimelineManager;
        stateManager: StateManager;
        renderManager: RenderManager;
        componentsManager: ComponentsManager;
        deterministicMediaManager: DeterministicMediaManager;
    });
    execute(args: unknown): Promise<void>;
}
