import type { IComponentContext, IComponentHook, HookType } from '../..';
import { StateManager } from '../../managers/StateManager.svelte.js';
export declare class PixiProgressShapeHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    private state;
    constructor(cradle: {
        stateManager: StateManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
