import { get } from 'lodash-es';
import { wordsHighlighter } from '../presets/words.js';
import { AnimationPresetFactory } from './AnimationPresetFactory.js';
import { ColorTransformer } from '../../transformers/ColorTransformer.js';
export class WordHighlighterAnimationBuilder {
    static build(data, target, animationData, splitTextCache) {
        if (data.type !== 'TEXT') {
            return [];
        }
        const activeWord = get(data, 'appearance.text.activeWord', null);
        if (!activeWord?.enabled) {
            return [];
        }
        const config = {
            activeWord,
            data,
            animationData,
            target,
            splitTextCache
        };
        return this.createWordHighlightAnimations(config);
    }
    static createWordHighlightAnimations(config) {
        const animations = [];
        const styles = this.prepareHighlightStyles(config);
        // Create main highlight animation
        const highlightAnimation = this.createHighlightAnimation(config.data.id, styles.highlight, config.animationData);
        animations.push(highlightAnimation);
        // Create unhighlight animation if needed
        const unhighlightAnimation = this.createUnhighlightAnimation(config.data.id, styles.original, config.animationData);
        if (unhighlightAnimation) {
            animations.push(unhighlightAnimation);
        }
        // Create background highlight animation if needed
        const backgroundAnimation = this.createBackgroundHighlightAnimation(config);
        if (backgroundAnimation) {
            animations.push(backgroundAnimation);
        }
        return animations;
    }
    static prepareHighlightStyles(config) {
        const { activeWord, data } = config;
        const highlightStyles = ColorTransformer.transform(activeWord.color, 'text');
        const originalStyles = ColorTransformer.transform(data.appearance.text?.color, 'text');
        // Handle font weight if specified
        if (get(activeWord, 'fontWeight', undefined)) {
            highlightStyles.fontWeight = activeWord.fontWeight;
            originalStyles.fontWeight = data.appearance.text?.fontWeight ?? 'normal';
        }
        return {
            highlight: highlightStyles,
            original: originalStyles
        };
    }
    static createHighlightAnimation(componentId, styles, animationData) {
        const animation = AnimationPresetFactory.from(wordsHighlighter)
            .resetTimeline()
            .timeline()
            .target('words')
            .to({
            ...styles,
            stagger: { type: 'fromData', dataKey: 'wordStartTimes' }
        })
            .build();
        return {
            id: `words-highlight-${componentId}`,
            name: 'Words Highlight',
            animation,
            startAt: 0
        };
    }
    static createUnhighlightAnimation(componentId, originalStyles, animationData) {
        if (!animationData.wordUnhighlightTimes) {
            return null;
        }
        const animation = AnimationPresetFactory.from(wordsHighlighter)
            .resetTimeline()
            .timeline()
            .target('words')
            .to({
            ...originalStyles,
            stagger: { type: 'fromData', dataKey: 'wordUnhighlightTimes' }
        })
            .build();
        return {
            id: `words-highlight-${componentId}-unhighlight`,
            name: 'Words Unhighlight',
            animation
        };
    }
    static createBackgroundHighlightAnimation(config) {
        const { activeWord, target, splitTextCache, data, animationData } = config;
        if (!activeWord.backgroundColor) {
            return null;
        }
        const words = splitTextCache.getSplitText(target, 'words');
        if (!words?.length) {
            return null;
        }
        const bgHighlighter = this.createBackgroundElement(target);
        const backgroundConfig = this.getBackgroundConfig(activeWord);
        const bgStyles = ColorTransformer.transform(activeWord.backgroundColor, 'background');
        this.initializeBackgroundElement(bgHighlighter, words[0], backgroundConfig, bgStyles);
        const animation = this.buildBackgroundAnimation(data.id, words, animationData, backgroundConfig, bgStyles);
        return {
            id: `words-background-highlight-${data.id}`,
            name: 'Words Background Highlight',
            animation,
            startAt: 0
        };
    }
    static createBackgroundElement(target) {
        const bgHighlighter = document.createElement('div');
        bgHighlighter.id = 'highlighter-bg';
        bgHighlighter.style.position = 'absolute';
        bgHighlighter.style.pointerEvents = 'none';
        target.prepend(bgHighlighter);
        return bgHighlighter;
    }
    static getBackgroundConfig(activeWord) {
        return {
            paddingX: get(activeWord, 'backgroundPaddingX', 25),
            paddingY: get(activeWord, 'backgroundPaddingY', 10),
            borderRadius: get(activeWord, 'backgroundBorderRadius', 10)
        };
    }
    static initializeBackgroundElement(bgHighlighter, firstWord, config, bgStyles) {
        const { paddingX, paddingY, borderRadius } = config;
        bgHighlighter.style.left = `${firstWord.offsetLeft - paddingX}px`;
        bgHighlighter.style.top = `${firstWord.offsetTop - paddingY}px`;
        bgHighlighter.style.width = `${firstWord.clientWidth + 2 * paddingX}px`;
        bgHighlighter.style.height = `${firstWord.clientHeight + 2 * paddingY}px`;
        bgHighlighter.style.borderRadius = `${borderRadius}px`;
        bgHighlighter.style.opacity = '1';
        if (bgStyles) {
            Object.entries(bgStyles).forEach(([key, value]) => {
                bgHighlighter.style[key] = value;
            });
        }
    }
    static buildBackgroundAnimation(componentId, words, animationData, backgroundConfig, bgStyles) {
        const presetComposer = AnimationPresetFactory.create(`words-bg-highlight-anim-${componentId}`);
        const timelineComposer = presetComposer.timeline();
        const targetComposer = timelineComposer.target('#highlighter-bg');
        const wordStartTimes = animationData.wordStartTimes ?? [];
        if (wordStartTimes.length <= 1) {
            return timelineComposer.build();
        }
        const { paddingX, paddingY, borderRadius } = backgroundConfig;
        for (let i = 0; i < wordStartTimes.length; i++) {
            const currentWord = words[i];
            if (!currentWord) {
                console.warn(`WordHighlighter: Word element at index ${i} is missing.`);
                continue;
            }
            const startTime = parseFloat(wordStartTimes[i].toFixed(3));
            targetComposer
                .to({
                borderRadius: `${borderRadius}px`,
                left: currentWord.offsetLeft - paddingX,
                top: currentWord.offsetTop - paddingY,
                width: currentWord.clientWidth + 2 * paddingX,
                height: currentWord.clientHeight + 2 * paddingY,
                duration: 0.15,
                ease: 'power1.out',
                // delay: startTime,
                ...bgStyles
            }, startTime)
                .position(0);
        }
        return timelineComposer.build();
    }
}
