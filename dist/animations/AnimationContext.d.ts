import type { AnimationPreset } from './animationPreset.js';
import { SplitTextCache } from './SplitTextCache.js';
export declare class AnimationContext {
    rootElement: any;
    preset: AnimationPreset;
    splitTextCache: SplitTextCache;
    data: Record<string, any>;
    private animationTargetDuration;
    constructor(rootElement: any, preset: AnimationPreset, splitTextCache: SplitTextCache, data?: Record<string, any>);
    get endAnchor(): number;
    setAnimationTargetDuration(duration: number): void;
    getData(key: string): any;
    getElement(targetQuery: string): any;
    getDuration(): number;
    getAnimationTargetDuration(): number;
    getAllData(): Record<string, any>;
}
