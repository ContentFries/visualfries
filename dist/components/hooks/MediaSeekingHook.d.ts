import type { HookType, IComponentContext, IComponentHook } from '../../index.js';
import { StateManager } from '../../managers/StateManager.svelte.js';
export declare class MediaSeekingHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    state: StateManager;
    constructor(cradle: {
        stateManager: StateManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
