import type { IComponentContext, IComponentHook, HookType } from '../..';
import { ImageComponentShape } from '../..';
import { z } from 'zod';
export declare class ImageHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    componentElement: z.infer<typeof ImageComponentShape>;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
