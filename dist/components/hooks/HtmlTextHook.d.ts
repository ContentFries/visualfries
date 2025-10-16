import type { IComponentContext, IComponentHook, HookType } from '../..';
import type { DomManager } from '../../managers/DomManager.js';
import type { ComponentsManager } from '../../managers/ComponentsManager.svelte.js';
export declare class HtmlTextHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    private domManager;
    private componentsManager;
    constructor(cradle: {
        domManager: DomManager;
        componentsManager: ComponentsManager;
    });
    private buildHtmlElements;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
