import type { IComponentContext, IComponentHook, HookType } from '../..';
import { VideoComponentShape } from '../..';
import { z } from 'zod';
import type { StateManager } from '../../managers/StateManager.svelte.ts';
export declare class PixiSplitScreenDisplayObjectHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    componentElement: z.infer<typeof VideoComponentShape>;
    private sceneState;
    constructor(cradle: {
        stateManager: StateManager;
    });
    get sceneWidth(): number;
    get sceneHeight(): number;
    private initBlurBackground;
    private setupBackground;
    private initSplitScreen;
    private initMainSprite;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
