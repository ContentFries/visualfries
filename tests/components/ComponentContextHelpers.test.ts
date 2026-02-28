import { describe, it, expect } from 'vitest';
import {
	isVideoComponent,
	isAudioComponent,
	isImageComponent,
	isGifComponent,
	isTextComponent,
	isSubtitleComponent,
	isShapeComponent,
	isColorComponent,
	isGradientComponent,
	hasSource,
	isMediaComponent,
	getSource,
	getSourceUrl,
	getSourceStartAt,
	getMuted,
	getVolume,
	getTextContent
} from '$lib/components/ComponentContextHelpers.ts';

import type {
	VideoComponent,
	AudioComponent,
	ImageComponent,
	GifComponent,
	TextComponent,
	SubtitleComponent,
	ShapeComponent,
	ColorComponent,
	GradientComponent,
	ComponentSource
} from '$lib';

describe('ComponentContextHelpers', () => {
	// Sample component data for testing
	const videoComponent: VideoComponent = {
		id: 'video-1',
		type: 'VIDEO',
		timeline: { startAt: 0, endAt: 10 },
		source: { url: 'https://example.com/video.mp4', startAt: 5 },
		appearance: { x: 0, y: 0, width: 1920, height: 1080 },
		animations: { enabled: true, list: [] },
		effects: { enabled: true, map: {} },
		visible: true,
		order: 0,
		volume: 0.8,
		muted: false
	};

	const audioComponent: AudioComponent = {
		id: 'audio-1',
		type: 'AUDIO',
		timeline: { startAt: 0, endAt: 10 },
		source: { url: 'https://example.com/audio.mp3' },
		appearance: { x: 0, y: 0, width: 0, height: 0 },
		animations: { enabled: true, list: [] },
		effects: { enabled: true, map: {} },
		visible: true,
		order: 0,
		volume: 1,
		muted: true
	};

	const textComponent: TextComponent = {
		id: 'text-1',
		type: 'TEXT',
		text: 'Hello World',
		timeline: { startAt: 0, endAt: 5 },
		appearance: {
			x: 100,
			y: 100,
			width: 500,
			height: 100,
			text: {
				fontFamily: 'Arial',
				fontSize: { value: 24, unit: 'px' },
				color: '#000000',
				textAlign: 'center'
			}
		},
		animations: { enabled: true, list: [] },
		effects: { enabled: true, map: {} },
		visible: true,
		order: 0
	};

	const imageComponent: ImageComponent = {
		id: 'image-1',
		type: 'IMAGE',
		timeline: { startAt: 0, endAt: 10 },
		source: { url: 'https://example.com/image.jpg' },
		appearance: { x: 0, y: 0, width: 800, height: 600 },
		animations: { enabled: true, list: [] },
		effects: { enabled: true, map: {} },
		visible: true,
		order: 0
	};

	describe('Type Guards', () => {
		describe('isVideoComponent', () => {
			it('should return true for VIDEO component', () => {
				expect(isVideoComponent(videoComponent)).toBe(true);
			});

			it('should return false for non-VIDEO component', () => {
				expect(isVideoComponent(textComponent)).toBe(false);
				expect(isVideoComponent(audioComponent)).toBe(false);
			});

			it('should return false for undefined', () => {
				expect(isVideoComponent(undefined)).toBe(false);
			});
		});

		describe('isAudioComponent', () => {
			it('should return true for AUDIO component', () => {
				expect(isAudioComponent(audioComponent)).toBe(true);
			});

			it('should return false for non-AUDIO component', () => {
				expect(isAudioComponent(videoComponent)).toBe(false);
			});
		});

		describe('isTextComponent', () => {
			it('should return true for TEXT component', () => {
				expect(isTextComponent(textComponent)).toBe(true);
			});

			it('should return false for non-TEXT component', () => {
				expect(isTextComponent(videoComponent)).toBe(false);
			});
		});

		describe('isImageComponent', () => {
			it('should return true for IMAGE component', () => {
				expect(isImageComponent(imageComponent)).toBe(true);
			});

			it('should return false for non-IMAGE component', () => {
				expect(isImageComponent(videoComponent)).toBe(false);
			});
		});

		describe('hasSource', () => {
			it('should return true for components with source', () => {
				expect(hasSource(videoComponent)).toBe(true);
				expect(hasSource(audioComponent)).toBe(true);
				expect(hasSource(imageComponent)).toBe(true);
			});

			it('should return false for components without source', () => {
				expect(hasSource(textComponent)).toBe(false);
			});
		});

		describe('isMediaComponent', () => {
			it('should return true for VIDEO and AUDIO', () => {
				expect(isMediaComponent(videoComponent)).toBe(true);
				expect(isMediaComponent(audioComponent)).toBe(true);
			});

			it('should return false for IMAGE', () => {
				expect(isMediaComponent(imageComponent)).toBe(false);
			});

			it('should return false for TEXT', () => {
				expect(isMediaComponent(textComponent)).toBe(false);
			});
		});
	});

	describe('Safe Accessors', () => {
		describe('getSource', () => {
			it('should return source for components with source', () => {
				const source = getSource(videoComponent);
				expect(source).toBeDefined();
				expect(source?.url).toBe('https://example.com/video.mp4');
			});

			it('should return undefined for components without source', () => {
				expect(getSource(textComponent)).toBeUndefined();
			});

			it('should return undefined for undefined input', () => {
				expect(getSource(undefined)).toBeUndefined();
			});
		});

		describe('getSourceUrl', () => {
			it('should return URL from source', () => {
				expect(getSourceUrl(videoComponent)).toBe('https://example.com/video.mp4');
				expect(getSourceUrl(imageComponent)).toBe('https://example.com/image.jpg');
			});

			it('should return undefined for components without source', () => {
				expect(getSourceUrl(textComponent)).toBeUndefined();
			});
		});

		describe('getSourceStartAt', () => {
			it('should return startAt from source when set', () => {
				expect(getSourceStartAt(videoComponent)).toBe(5);
			});

			it('should return undefined when startAt not set', () => {
				expect(getSourceStartAt(imageComponent)).toBeUndefined();
			});
		});

		describe('getMuted', () => {
			it('should return muted state for media components', () => {
				expect(getMuted(videoComponent)).toBe(false);
				expect(getMuted(audioComponent)).toBe(true);
			});

			it('should return false for non-media components', () => {
				expect(getMuted(textComponent)).toBe(false);
				expect(getMuted(imageComponent)).toBe(false);
			});
		});

		describe('getVolume', () => {
			it('should return volume for media components', () => {
				expect(getVolume(videoComponent)).toBe(0.8);
				expect(getVolume(audioComponent)).toBe(1);
			});

			it('should return 1 for non-media components', () => {
				expect(getVolume(textComponent)).toBe(1);
				expect(getVolume(imageComponent)).toBe(1);
			});
		});

		describe('getTextContent', () => {
			it('should return text for TEXT components', () => {
				expect(getTextContent(textComponent)).toBe('Hello World');
			});

			it('should return undefined for non-TEXT components', () => {
				expect(getTextContent(videoComponent)).toBeUndefined();
			});
		});
	});
});
