import { get } from 'lodash-es';
import { linesHighlighter } from '../presets/lines.js'; // Assuming this exists
import { AnimationPresetFactory } from './AnimationPresetFactory.js';
import { ColorTransformer } from '../../transformers/ColorTransformer.js';
export class LineHighlighterAnimationBuilder {
    static build(data, target, animationData, splitTextCache) {
        if (data.type !== 'TEXT') {
            return [];
        }
        const activeLine = get(data, 'appearance.text.activeLine', null);
        if (!activeLine || !activeLine.enabled) {
            return [];
        }
        const config = {
            activeLine,
            data,
            animationData,
            target,
            splitTextCache
        };
        return this.createLineHighlightAnimations(config);
    }
    static createLineHighlightAnimations(config) {
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
        const { activeLine, data } = config;
        const highlightStyles = ColorTransformer.transform(activeLine.color, 'background');
        const originalStyles = ColorTransformer.transform(data.appearance.text?.color, 'background');
        // Handle font weight if specified
        if (get(activeLine, 'fontWeight', undefined)) {
            highlightStyles.fontWeight = activeLine.fontWeight;
            originalStyles.fontWeight = data.appearance.text?.fontWeight ?? 'normal';
        }
        return {
            highlight: highlightStyles,
            original: originalStyles
        };
    }
    static createHighlightAnimation(componentId, styles, animationData) {
        const animation = AnimationPresetFactory.from(linesHighlighter)
            .resetTimeline()
            .timeline()
            .target('lines')
            .to({
            ...styles,
            stagger: { type: 'fromData', dataKey: 'lineStartTimes' } // Use line timing data
        })
            .build();
        return {
            id: `lines-highlight-${componentId}`,
            name: 'Lines Highlight',
            animation,
            startAt: 0
        };
    }
    static createUnhighlightAnimation(componentId, originalStyles, animationData) {
        if (!animationData.lineUnhighlightTimes) {
            return null;
        }
        const animation = AnimationPresetFactory.from(linesHighlighter)
            .resetTimeline()
            .timeline()
            .target('lines')
            .to({
            ...originalStyles,
            stagger: { type: 'fromData', dataKey: 'lineUnhighlightTimes' }
        })
            .build();
        return {
            id: `lines-highlight-${componentId}-unhighlight`,
            name: 'Lines Unhighlight',
            animation,
            startAt: 0
        };
    }
    static createBackgroundHighlightAnimation(config) {
        const { activeLine, target, splitTextCache, data, animationData } = config;
        if (!activeLine.backgroundColor) {
            return null;
        }
        const lines = splitTextCache.getSplitText(target, 'lines');
        if (!lines?.length) {
            return null;
        }
        const bgHighlighter = this.createBackgroundElement(target, data.id);
        const backgroundConfig = this.getBackgroundConfig(activeLine);
        const bgStyles = ColorTransformer.transform(activeLine.backgroundColor, 'background');
        this.initializeBackgroundElement(bgHighlighter, lines[0], backgroundConfig, bgStyles);
        const animation = this.buildBackgroundAnimation(data.id, bgHighlighter.id, lines, animationData, backgroundConfig, bgStyles);
        return {
            id: `lines-background-highlight-${data.id}`,
            name: 'Lines Background Highlight',
            animation,
            startAt: 0
        };
    }
    static generateBackgroundElementId(componentId) {
        return `highlighter-bg-lines-${componentId}`;
    }
    static createBackgroundElement(target, componentId) {
        const bgHighlighter = document.createElement('div');
        bgHighlighter.id = this.generateBackgroundElementId(componentId);
        bgHighlighter.style.position = 'absolute';
        bgHighlighter.style.pointerEvents = 'none';
        target.prepend(bgHighlighter);
        return bgHighlighter;
    }
    static getBackgroundConfig(activeLine) {
        return {
            paddingX: get(activeLine, 'backgroundPaddingX', 25),
            paddingY: get(activeLine, 'backgroundPaddingY', 10),
            borderRadius: get(activeLine, 'backgroundBorderRadius', 10)
        };
    }
    static initializeBackgroundElement(bgHighlighter, firstLine, config, bgStyles) {
        const { paddingX, paddingY, borderRadius } = config;
        bgHighlighter.style.left = `${firstLine.offsetLeft - paddingX}px`;
        bgHighlighter.style.top = `${firstLine.offsetTop - paddingY}px`;
        bgHighlighter.style.width = `${firstLine.clientWidth + 2 * paddingX}px`;
        bgHighlighter.style.height = `${firstLine.clientHeight + 2 * paddingY}px`;
        bgHighlighter.style.borderRadius = `${borderRadius}px`;
        bgHighlighter.style.opacity = '1';
        if (bgStyles) {
            Object.entries(bgStyles).forEach(([key, value]) => {
                // Check if key is a valid writable style property
                if (key in bgHighlighter.style) {
                    bgHighlighter.style[key] = String(value);
                }
                else {
                    // For custom properties or CSS variables, use setProperty
                    bgHighlighter.style.setProperty(key, String(value));
                }
            });
        }
    }
    static buildBackgroundAnimation(componentId, backgroundElementId, lines, animationData, backgroundConfig, bgStyles) {
        const presetComposer = AnimationPresetFactory.create(`lines-bg-highlight-anim-${componentId}`);
        const timelineComposer = presetComposer.timeline();
        const targetComposer = timelineComposer.target(`#${backgroundElementId}`);
        const lineStartTimes = animationData.lineStartTimes ?? []; // Use line timing data
        if (lineStartTimes.length <= 1) {
            return timelineComposer.build();
        }
        const { paddingX, paddingY, borderRadius } = backgroundConfig;
        for (let i = 0; i < lineStartTimes.length; i++) {
            const currentLine = lines[i];
            if (!currentLine) {
                console.warn(`LineHighlighter: Line element at index ${i} is missing.`);
                continue;
            }
            const startTime = parseFloat(lineStartTimes[i].toFixed(3));
            targetComposer
                .to({
                borderRadius: `${borderRadius}px`,
                left: currentLine.offsetLeft - paddingX,
                top: currentLine.offsetTop - paddingY,
                width: currentLine.clientWidth + 2 * paddingX,
                height: currentLine.clientHeight + 2 * paddingY,
                duration: 0.15,
                ease: 'power1.out',
                ...bgStyles
            }, startTime)
                .position(0);
        }
        return timelineComposer.build();
    }
}
