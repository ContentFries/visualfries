import type { IComponentContext, IComponentHook, HookType } from '../..';
import { GifComponentShape } from '../..';
import { z } from 'zod';
import type { StateManager } from '../../managers/StateManager.svelte.ts';
export declare class PixiGifHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    componentElement: z.infer<typeof GifComponentShape>;
    private state;
    constructor(cradle: {
        stateManager: StateManager;
    });
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
