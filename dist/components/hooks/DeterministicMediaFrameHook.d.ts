import type { HookType, IComponentContext, IComponentHook } from '../..';
import { DeterministicMediaManager } from '../../managers/DeterministicMediaManager.js';
import { StateManager } from '../../managers/StateManager.svelte.js';
export declare class DeterministicMediaFrameHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    constructor(cradle: {
        stateManager: StateManager;
        deterministicMediaManager: DeterministicMediaManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
