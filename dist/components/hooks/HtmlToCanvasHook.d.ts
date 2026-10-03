import type { IComponentContext, IComponentHook, HookType } from '../../index.js';
import { StateManager } from '../../managers/StateManager.svelte.js';
import type { FontType } from '../../index.js';
export declare class HtmlToCanvasHook implements IComponentHook {
    #private;
    shouldCreateObjectURL: boolean;
    private svgBase;
    private svgEnd;
    private svg;
    types: HookType[];
    priority: number;
    private state;
    /** This scene's configured fonts, so SVG inlining matches what the scene loaded. */
    private fonts;
    constructor(cradle: {
        stateManager: StateManager;
        fonts?: FontType[];
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
