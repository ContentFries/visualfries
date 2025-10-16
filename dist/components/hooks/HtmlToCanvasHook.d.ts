import type { IComponentContext, IComponentHook, HookType } from '../..';
import { StateManager } from '../../managers/StateManager.svelte.js';
export declare class HtmlToCanvasHook implements IComponentHook {
    #private;
    shouldCreateObjectURL: boolean;
    private svgBase;
    private svgEnd;
    private svg;
    types: HookType[];
    priority: number;
    private state;
    constructor(cradle: {
        stateManager: StateManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
