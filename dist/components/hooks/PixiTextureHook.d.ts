import type { IComponentContext, IComponentHook, HookType } from '../../index.js';
export declare class PixiTextureHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
