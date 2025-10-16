import type { IComponentContext, IComponentHook, HookType } from '../..';
import { TimelineManager } from '../../managers/TimelineManager.svelte.js';
import type { ComponentAnimationTransformer } from '../../animations/transformers/AnimationReferenceTransformer.js';
import { SplitTextCache } from '../../animations/SplitTextCache.js';
/**
 * Animation hook for managing component animations
 * This hook can be applied to any component type and handles animation lifecycle
 */
export declare class AnimationHook implements IComponentHook {
    #private;
    private timeline;
    private splitTextCache;
    types: HookType[];
    priority: number;
    animTransformer: ComponentAnimationTransformer;
    constructor(cradle: {
        timelineManager: TimelineManager;
        componentAnimationTransformer: ComponentAnimationTransformer;
        splitTextCache: SplitTextCache;
    });
    /**
     * Hook handle method
     */
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
