import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubtitlesManager } from '../src/lib/managers/SubtitlesManager.svelte.js';
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

describe('SubtitlesManager - Settings Integration', () => {
	let mockTimeManager: TimeManager;
	let mockEventManager: EventManager;
	let mockScene: Scene;

	beforeEach(() => {
		mockTimeManager = createMockTimeManager();
		mockEventManager = createMockEventManager();
		mockScene = createMockScene();
		vi.clearAllMocks();
	});

	it('should demonstrate complete settings workflow for video editor', () => {
		const cleanup = $effect.root(() => {
			// Scenario: Video editor with subtitles that contain punctuation
			const collection: Record<string, SubtitleCollection> = {
				'video-1': {
					en: [
						{
							id: 'sub-1',
							start_at: 0,
							end_at: 3,
							text: 'Hello, world!',
							words: []
						},
						{
							id: 'sub-2',
							start_at: 3,
							end_at: 6,
							text: 'How are you?',
							words: []
						},
						{
							id: 'sub-3',
							start_at: 6,
							end_at: 9,
							text: "I'm fine, thanks!",
							words: []
						}
					]
				}
			};

			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			// 1. Initial state - punctuation enabled by default
			expect(manager.settings.punctuation).toBe(true);

			// 2. Get subtitle data - should contain original text with punctuation
			const subtitles = manager.data['video-1']?.en;
			expect(subtitles).toBeDefined();
			expect(subtitles![0].text).toBe('Hello, world!');
			expect(subtitles![1].text).toBe('How are you?');
			expect(subtitles![2].text).toBe("I'm fine, thanks!");

			// 3. Disable punctuation for video scene rendering
			manager.updateSettings({ punctuation: false });
			expect(manager.settings.punctuation).toBe(false);

			// 5. Subtitle data should remain unchanged (punctuation handling is external)
			const updatedSubtitles = manager.data['video-1']?.en;
			expect(updatedSubtitles![0].text).toBe('Hello, world!');
			expect(updatedSubtitles![1].text).toBe('How are you?');
			expect(updatedSubtitles![2].text).toBe("I'm fine, thanks!");

			// 6. Settings should persist through subtitle operations
			manager.setAssetId('video-1');
			manager.setLanguage('en');
			manager.updateSubtitleText('sub-1', 'New text, with more punctuation!');

			expect(manager.settings.punctuation).toBe(false);
			expect(manager.data['video-1']?.en[0].text).toBe('New text, with more punctuation!');

			// 7. Re-enable punctuation
			manager.updateSettings({ punctuation: true });
			expect(manager.settings.punctuation).toBe(true);
		});

		cleanup();
	});

	it('should maintain settings independence from subtitle data', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			// Settings should work even with no subtitle data
			expect(manager.settings.punctuation).toBe(true);
			
			manager.updateSettings({ punctuation: false });
			expect(manager.settings.punctuation).toBe(false);

			// Adding subtitle data shouldn't affect settings
			manager.setAssetSubtitles('test-asset', [
				{
					id: 'test-sub',
					start_at: 0,
					end_at: 3,
					text: 'Test subtitle.',
					words: []
				}
			]);

			expect(manager.settings.punctuation).toBe(false);
			expect(manager.data['test-asset']?.default[0].text).toBe('Test subtitle.');
		});

		cleanup();
	});

	it('should support future settings expansion', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			// Current settings
			const currentSettings = manager.settings;
			expect(currentSettings).toEqual({ punctuation: true, mergeGap: 0.3 });

			// Settings structure should be extensible for future fields like:
			// - fontSize: number
			// - fontFamily: string  
			// - showTimestamps: boolean
			// - wordHighlighting: boolean
			// etc.

			// Partial updates should work (important for future expansion)
			manager.updateSettings({ punctuation: false });
			expect(manager.settings.punctuation).toBe(false);

			// Settings object should be a clean, extensible structure
			const settings = manager.settings;
			expect(Object.keys(settings)).toEqual(['punctuation', 'mergeGap']);
			expect(typeof settings).toBe('object');
		});

		cleanup();
	});
});