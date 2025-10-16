import type { IComponentContext, IComponentHook, HookType } from '../..';
import { VideoComponentShape } from '../..';
import { z } from 'zod';
export declare class PixiVideoTextureHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    componentElement: z.infer<typeof VideoComponentShape>;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
