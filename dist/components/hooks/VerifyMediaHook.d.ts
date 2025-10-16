import type { IComponentContext, IComponentHook, HookType } from '../..';
export declare class VerifyMediaHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
