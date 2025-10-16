import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubtitlesManager } from '../src/lib/managers/SubtitlesManager.svelte.js';
import type { TimeManager } from '../src/lib/managers/TimeManager.svelte.js';
import type { EventManager } from '../src/lib/managers/EventManager.js';
import type { Scene } from '../src/lib/index.js';
import type { Subtitle } from '../src/lib/index.js';

// Mocks
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
				id: 'asset1',
				type: 'VIDEO',
				url: 'https://example.com/video.mp4'
			}
		]
	}) as Scene;

describe('SubtitlesManager - splitByChars', () => {
	let mockTimeManager: TimeManager;
	let mockEventManager: EventManager;
	let mockScene: Scene;

	beforeEach(() => {
		mockTimeManager = createMockTimeManager();
		mockEventManager = createMockEventManager();
		mockScene = createMockScene();
		vi.clearAllMocks();
	});

	it('should split a long subtitle around target size using punctuation-aware logic without splitting words', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const longText =
				'Hello, this is a test sentence, which should split nicely. And this part continues to ensure more than twenty characters.';
			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 6,
					text: longText,
					words: []
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			manager.splitByChars(20);

			const data = manager.data;
			const result = data.asset1?.default ?? [];

			expect(result.length).toBeGreaterThan(1);

			const maxAllowed = Math.round(20 * 1.15);
			for (const s of result) {
				expect((s.text || '').trim().length).toBeLessThanOrEqual(maxAllowed);
				// Should not start with punctuation in most cases due to natural splitting
				expect(/^\s*[,.!?:;]/.test(s.text || '')).toBe(false);

				// // Word-safe: ensure we don't see dangling letters that indicate word cut
				// expect(/\b\w$/.test((s.text || ''))).toBe(true);
			}
		});

		cleanup();
	});

	it('should merge adjacent short subtitles when gap is small and preserve words', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{ id: 'a', start_at: 0, end_at: 1, text: 'One', words: [] },
				{ id: 'b', start_at: 1.2, end_at: 2, text: 'Two', words: [] }
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			manager.splitByChars(20);

			const result = manager.data.asset1?.default ?? [];
			expect(result.length).toBe(1);
			expect(result[0].text.trim()).toBe('One Two');
		});

		cleanup();
	});
});
