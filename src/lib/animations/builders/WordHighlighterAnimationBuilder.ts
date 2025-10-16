import type { Animation, ColorType } from '$lib';
import type { ComponentData } from '$lib';
import { get } from 'lodash-es';
import { wordsHighlighter } from '../presets/words.js';
import { AnimationPresetFactory } from './AnimationPresetFactory.js';
import type { SplitTextCache } from '../SplitTextCache.js';
import { ColorTransformer } from '$lib/transformers/ColorTransformer.js';
import type { HtmlElementStyle } from '$lib/builders/html/HtmlBuilder.js';

interface WordHighlightConfig {
	activeWord: any;
	data: ComponentData;
	animationData: Record<string, any>;
	target: HTMLElement;
	splitTextCache: SplitTextCache;
}

interface HighlightStyles {
	highlight: Record<string, any>;
	original: Record<string, any>;
}

export class WordHighlighterAnimationBuilder {
	static build(
		data: ComponentData,
		target: HTMLElement,
		animationData: Record<string, any>,
		splitTextCache: SplitTextCache
	): Animation[] {
		if (data.type !== 'TEXT') {
			return [];
		}

		const activeWord = get(data, 'appearance.text.activeWord', null);
		if (!activeWord?.enabled) {
			return [];
		}

		const config: WordHighlightConfig = {
			activeWord,
			data,
			animationData,
			target,
			splitTextCache
		};

		return this.createWordHighlightAnimations(config);
	}

	private static createWordHighlightAnimations(config: WordHighlightConfig): Animation[] {
		const animations: Animation[] = [];
		const styles = this.prepareHighlightStyles(config);

		// Create main highlight animation
		const highlightAnimation = this.createHighlightAnimation(
			config.data.id,
			styles.highlight,
			config.animationData
		);
		animations.push(highlightAnimation);

		// Create unhighlight animation if needed
		const unhighlightAnimation = this.createUnhighlightAnimation(
			config.data.id,
			styles.original,
			config.animationData
		);
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

	private static prepareHighlightStyles(config: WordHighlightConfig): HighlightStyles {
		const { activeWord, data } = config;

		const highlightStyles = ColorTransformer.transform(activeWord.color as ColorType, 'text');
		const originalStyles = ColorTransformer.transform(
			data.appearance.text?.color as ColorType,
			'text'
		);

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

	private static createHighlightAnimation(
		componentId: string,
		styles: Record<string, any>,
		animationData: Record<string, any>
	): Animation {
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
		} as Animation;
	}

	private static createUnhighlightAnimation(
		componentId: string,
		originalStyles: Record<string, any>,
		animationData: Record<string, any>
	): Animation | null {
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
		} as Animation;
	}

	private static createBackgroundHighlightAnimation(config: WordHighlightConfig): Animation | null {
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
		const bgStyles = ColorTransformer.transform(
			activeWord.backgroundColor as ColorType,
			'background'
		);

		this.initializeBackgroundElement(bgHighlighter, words[0], backgroundConfig, bgStyles);

		const animation = this.buildBackgroundAnimation(
			data.id,
			words,
			animationData,
			backgroundConfig,
			bgStyles
		);

		return {
			id: `words-background-highlight-${data.id}`,
			name: 'Words Background Highlight',
			animation,
			startAt: 0
		} as Animation;
	}

	private static createBackgroundElement(target: HTMLElement): HTMLElement {
		const bgHighlighter = document.createElement('div');
		bgHighlighter.id = 'highlighter-bg';
		bgHighlighter.style.position = 'absolute';
		bgHighlighter.style.pointerEvents = 'none';
		target.prepend(bgHighlighter);
		return bgHighlighter;
	}

	private static getBackgroundConfig(activeWord: any) {
		return {
			paddingX: get(activeWord, 'backgroundPaddingX', 25),
			paddingY: get(activeWord, 'backgroundPaddingY', 10),
			borderRadius: get(activeWord, 'backgroundBorderRadius', 10)
		};
	}

	private static initializeBackgroundElement(
		bgHighlighter: HTMLElement,
		firstWord: HTMLElement,
		config: { paddingX: number; paddingY: number; borderRadius: number },
		bgStyles: HtmlElementStyle | null
	): void {
		const { paddingX, paddingY, borderRadius } = config;

		bgHighlighter.style.left = `${firstWord.offsetLeft - paddingX}px`;
		bgHighlighter.style.top = `${firstWord.offsetTop - paddingY}px`;
		bgHighlighter.style.width = `${firstWord.clientWidth + 2 * paddingX}px`;
		bgHighlighter.style.height = `${firstWord.clientHeight + 2 * paddingY}px`;
		bgHighlighter.style.borderRadius = `${borderRadius}px`;
		bgHighlighter.style.opacity = '1';

		if (bgStyles) {
			Object.entries(bgStyles).forEach(([key, value]) => {
				// Check if key is a valid writable style property
				if (key in bgHighlighter.style) {
					(bgHighlighter.style as any)[key] = String(value);
				} else {
					// For custom properties or CSS variables, use setProperty
					bgHighlighter.style.setProperty(key, String(value));
				}
			});
		}
		
	}

	private static buildBackgroundAnimation(
		componentId: string,
		words: HTMLElement[],
		animationData: Record<string, any>,
		backgroundConfig: { paddingX: number; paddingY: number; borderRadius: number },
		bgStyles: Record<string, any> | null
	) {
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
				.to(
					{
						borderRadius: `${borderRadius}px`,
						left: currentWord.offsetLeft - paddingX,
						top: currentWord.offsetTop - paddingY,
						width: currentWord.clientWidth + 2 * paddingX,
						height: currentWord.clientHeight + 2 * paddingY,
						duration: 0.15,
						ease: 'power1.out',
						// delay: startTime,
						...bgStyles
					},
					startTime
				)
				.position(0);
		}

		return timelineComposer.build();
	}
}
