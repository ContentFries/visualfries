import { describe, it, expect, vi } from 'vitest';
import { SubtitlesManager, type SubtitlesSettings } from '../src/lib/managers/SubtitlesManager.svelte.js';
import type { SubtitleCollection } from '$lib';
import type { TimeManager } from '../src/lib/managers/TimeManager.svelte.js';
import type { EventManager } from '../src/lib/managers/EventManager.js';
import type { Scene } from '../src/lib/index.js';

// Mock dependencies
const createMockTimeManager = (): TimeManager =>
	({
		transformTime: vi.fn((time: number) => time),
		duration: 100
	}) as unknown as TimeManager;

const createMockEventManager = (): EventManager =>
	({
		emit: vi.fn()
	}) as unknown as EventManager;

const createMockScene = (): Scene =>
	({
		assets: [
			{
				id: 'video-1',
				type: 'VIDEO',
				url: 'https://example.com/video.mp4'
			}
		]
	}) as Scene;

describe('SubtitlesManager - Usage Examples', () => {
	it('should demonstrate typical video editor usage pattern', () => {
		const cleanup = $effect.root(() => {
			// Example: Video editor with subtitle editing and scene rendering
			const subtitles: Record<string, SubtitleCollection> = {
				'main-video': {
					en: [
						{
							id: 'intro',
							start_at: 0,
							end_at: 3,
							text: 'Welcome to our channel!',
							words: []
						},
						{
							id: 'content',
							start_at: 3,
							end_at: 8,
							text: "Today, we'll explore amazing features.",
							words: []
						}
					]
				}
			};

			const manager = new SubtitlesManager({
				timeManager: createMockTimeManager(),
				eventManager: createMockEventManager(),
				sceneData: createMockScene(),
				subtitles
			});

			// === SUBTITLE EDITOR CONTEXT ===
			// In subtitle editor, punctuation is always shown for editing
			expect(manager.settings.punctuation).toBe(true);
			
			// Editor gets full text with punctuation
			const editorSubtitles = manager.data['main-video']?.en;
			expect(editorSubtitles![0].text).toBe('Welcome to our channel!');
			expect(editorSubtitles![1].text).toBe("Today, we'll explore amazing features.");

			// === VIDEO SCENE RENDERING CONTEXT ===
			// For video rendering, user might want to hide punctuation for cleaner look
			manager.updateSettings({ punctuation: false });

			// The subtitle data itself doesn't change (source of truth preserved)
			const sceneSubtitles = manager.data['main-video']?.en;
			expect(sceneSubtitles![0].text).toBe('Welcome to our channel!');
			expect(sceneSubtitles![1].text).toBe("Today, we'll explore amazing features.");

			// But the setting is available for the rendering system to use
			expect(manager.settings.punctuation).toBe(false);

			// === PRACTICAL USAGE ===
			// In a real video editor, the rendering system would check this setting:
			function renderSubtitleText(text: string, settings: SubtitlesSettings): string {
				if (!settings.punctuation) {
					// Remove punctuation for video rendering
					return text.replace(/[.,!?;:'"]/g, '');
				}
				return text;
			}

			// Editor always shows original text
			const editorText = sceneSubtitles![0].text;
			expect(editorText).toBe('Welcome to our channel!');

			// Video scene shows processed text based on settings
			const videoText = renderSubtitleText(editorText, manager.settings);
			expect(videoText).toBe('Welcome to our channel');

			// === SETTINGS PERSISTENCE ===
			// Settings persist through subtitle operations
			manager.setAssetId('main-video');
			manager.setLanguage('en');
			manager.updateSubtitleText('intro', 'Hello, world!!!');

			expect(manager.settings.punctuation).toBe(false);
			expect(manager.data['main-video']?.en[0].text).toBe('Hello, world!!!');
			
			// Rendered version would still respect the setting
			const newVideoText = renderSubtitleText('Hello, world!!!', manager.settings);
			expect(newVideoText).toBe('Hello world');
		});

		cleanup();
	});

	it('should show how settings enable different rendering contexts', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: createMockTimeManager(),
				eventManager: createMockEventManager(),
				sceneData: createMockScene(),
				subtitles: {
					'video-1': {
						default: [
							{
								id: 'sub1',
								start_at: 0,
								end_at: 3,
								text: 'Hello, world! How are you?',
								words: []
							}
						]
					}
				}
			});

			const originalText = manager.data['video-1']?.default[0].text!;

			// Context 1: Subtitle Editor (always show punctuation)
			const editorContext = {
				showPunctuation: true, // Always true in editor
				text: originalText
			};
			expect(editorContext.text).toBe('Hello, world! How are you?');

			// Context 2: Video Scene Rendering (respects user setting)
			manager.updateSettings({ punctuation: false });
			const videoContext = {
				showPunctuation: manager.settings.punctuation,
				text: originalText
			};
			expect(videoContext.showPunctuation).toBe(false);
			expect(videoContext.text).toBe('Hello, world! How are you?'); // Original preserved

			// Context 3: Export/Preview (might have different settings)
			manager.updateSettings({ punctuation: true });
			const exportContext = {
				showPunctuation: manager.settings.punctuation,
				text: originalText
			};
			expect(exportContext.showPunctuation).toBe(true);
			expect(exportContext.text).toBe('Hello, world! How are you?');

			// The key insight: Same subtitle data, different rendering based on context
			expect(originalText).toBe('Hello, world! How are you?'); // Source never changes
		});

		cleanup();
	});
});