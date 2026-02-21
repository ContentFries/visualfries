import type { Command } from './Command.js';
import { StateManager } from '../managers/StateManager.svelte.js';
import { DeterministicMediaManager } from '../managers/DeterministicMediaManager.js';
export declare class ReplaceSourceOnTimeCommand implements Command<void> {
    #private;
    private stateManager;
    private deterministicMediaManager;
    constructor(cradle: {
        stateManager: StateManager;
        deterministicMediaManager: DeterministicMediaManager;
    });
    execute(args: unknown): Promise<void>;
}
