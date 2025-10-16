import type { Animation } from '../..';
import type { ComponentData } from '../..';
import type { SplitTextCache } from '../SplitTextCache.js';
export declare class LineHighlighterAnimationBuilder {
    static build(data: ComponentData, target: HTMLElement, animationData: Record<string, any>, splitTextCache: SplitTextCache): Animation[];
    private static createLineHighlightAnimations;
    private static prepareHighlightStyles;
    private static createHighlightAnimation;
    private static createUnhighlightAnimation;
    private static createBackgroundHighlightAnimation;
    private static generateBackgroundElementId;
    private static createBackgroundElement;
    private static getBackgroundConfig;
    private static initializeBackgroundElement;
    private static buildBackgroundAnimation;
}
