import { MediaManager } from '../../managers/MediaManager.js';
import type { IComponentContext, IComponentHook, HookType } from '../..';
import { StateManager } from '../../managers/StateManager.svelte.js';
export declare class MediaHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    private mediaManager;
    private state;
    constructor(cradle: {
        mediaManager: MediaManager;
        stateManager: StateManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
