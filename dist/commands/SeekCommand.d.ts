import type { Command } from './Command.js';
import { TimelineManager } from '../managers/TimelineManager.svelte.js';
import { StateManager } from '../managers/StateManager.svelte.js';
import { RenderManager } from '../managers/RenderManager.js';
export declare class SeekCommand implements Command {
    private timeline;
    private state;
    private renderManager;
    constructor(cradle: {
        timelineManager: TimelineManager;
        stateManager: StateManager;
        renderManager: RenderManager;
    });
    execute(args: unknown): Promise<void>;
}
