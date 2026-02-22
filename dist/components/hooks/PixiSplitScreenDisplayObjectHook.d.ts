import type { IComponentContext, IComponentHook, HookType } from '../..';
import { ImageComponentShape, VideoComponentShape } from '../..';
import { z } from 'zod';
import type { StateManager } from '../../managers/StateManager.svelte.ts';
import type { DeterministicMediaManager } from '../../managers/DeterministicMediaManager.ts';
export declare class PixiSplitScreenDisplayObjectHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    componentElement: z.infer<typeof VideoComponentShape> | z.infer<typeof ImageComponentShape>;
    private sceneState;
    private deterministicMediaManager?;
    constructor(cradle: {
        stateManager: StateManager;
        deterministicMediaManager?: DeterministicMediaManager;
    });
    get sceneWidth(): number;
    get sceneHeight(): number;
    private initBlurBackground;
    private setupBackground;
    private initSplitScreen;
    private initMainSprite;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
