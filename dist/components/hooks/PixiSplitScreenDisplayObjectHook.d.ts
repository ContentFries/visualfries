import type { IComponentContext, IComponentHook, HookType } from '../..';
import { ImageComponentShape, VideoComponentShape } from '../..';
import { z } from 'zod';
import type { StateManager } from '../../managers/StateManager.svelte.ts';
import type { DeterministicMediaManager } from '../../managers/DeterministicMediaManager.ts';
import type { AppManager } from '../../managers/AppManager.svelte.ts';
export declare class PixiSplitScreenDisplayObjectHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    componentElement: z.infer<typeof VideoComponentShape> | z.infer<typeof ImageComponentShape>;
    private sceneState;
    private deterministicMediaManager?;
    private appManager?;
    constructor(cradle: {
        stateManager: StateManager;
        deterministicMediaManager?: DeterministicMediaManager;
        appManager?: AppManager;
    });
    get sceneWidth(): number;
    get sceneHeight(): number;
    private initBlurBackground;
    private setupBackground;
    private initSplitScreen;
    private initMainSprite;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
