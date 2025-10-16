import type { Animation } from '../..';
import type { ComponentData } from '../..';
import type { SplitTextCache } from '../SplitTextCache.js';
export declare class WordHighlighterAnimationBuilder {
    static build(data: ComponentData, target: HTMLElement, animationData: Record<string, any>, splitTextCache: SplitTextCache): Animation[];
    private static createWordHighlightAnimations;
    private static prepareHighlightStyles;
    private static createHighlightAnimation;
    private static createUnhighlightAnimation;
    private static createBackgroundHighlightAnimation;
    private static createBackgroundElement;
    private static getBackgroundConfig;
    private static initializeBackgroundElement;
    private static buildBackgroundAnimation;
}
