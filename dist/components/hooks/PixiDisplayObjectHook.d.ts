import type { IComponentContext, IComponentHook, HookType } from '../..';
import { StateManager } from '../../managers/StateManager.svelte.js';
export declare class PixiDisplayObjectHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    private state;
    constructor(cradle: {
        stateManager: StateManager;
    });
    get sceneWidth(): number;
    get sceneHeight(): number;
    private initMainSprite;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
