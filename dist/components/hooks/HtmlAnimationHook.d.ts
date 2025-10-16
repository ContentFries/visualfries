import type { IComponentContext, IComponentHook, HookType } from '../..';
export declare class HtmlAnimationHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    private buildTimeline;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
