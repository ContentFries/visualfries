import type { IComponentContext, IComponentHook, HookType } from '../..';
import type { StateManager } from '../../managers/StateManager.svelte.js';
/**
 * Publishes one stable outer Pixi container as the visual animation owner.
 * Renderer hooks remain responsible for their inner geometry; animation x/y
 * are component-relative translation offsets around the fixed center pivot.
 */
export declare class PixiVisualTransformHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    constructor(cradle: {
        stateManager: StateManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
