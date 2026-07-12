import type { IComponentContext, IComponentHook, HookType } from '../..';
import type { StateManager } from '../../managers/StateManager.svelte.js';
/** Renders COLOR and GRADIENT schema components into a Pixi texture source. */
export declare class CanvasFillHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    constructor(cradle: {
        stateManager: StateManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
