import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import { SubtitlesManager } from '../src/lib/managers/SubtitlesManager.svelte.js';
import type { TimeManager } from '../src/lib/managers/TimeManager.svelte.js';
import type { EventManager } from '../src/lib/managers/EventManager.js';
import type { Scene } from '../src/lib/index.js';
import type { Subtitle } from '../src/lib/index.js';
import { testData } from './subtitles-text-chunk-timing-data.js';
import type { SubtitleCollection } from '$lib/index.js';

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
		],
		settings: {
			subtitles: {}
		}
	}) as Scene;

describe('SubtitlesManager - findTextChunkTiming', () => {
	let mockTimeManager: TimeManager;
	let mockEventManager: EventManager;
	let mockScene: Scene;

	beforeEach(() => {
		mockTimeManager = createMockTimeManager();
		mockEventManager = createMockEventManager();
		mockScene = createMockScene();
		vi.clearAllMocks();
	});

	it('should find text chunk timing within a single subtitle', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			// Use a very simple test case
			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 5,
					text: 'this is',
					words: [] // Will be auto-generated
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('this is');

			expect(results).toHaveLength(1);
			expect(results[0].startTime).toBeCloseTo(0, 3);
			expect(results[0].endTime).toBeCloseTo(5, 3);
			expect(results[0].startSubtitleId).toBe('s1');
			expect(results[0].endSubtitleId).toBe('s1');
			expect(results[0].matchedText).toBe('this is');
		});

		cleanup();
	});

	it('should find text chunk timing across multiple subtitles', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 3,
					text: 'Hello world this is',
					words: [
						['Hello', 0, 0.5],
						['world', 0.5, 1],
						['this', 1, 1.5],
						['is', 1.5, 2]
					]
				},
				{
					id: 's2',
					start_at: 3,
					end_at: 6,
					text: 'a test sentence',
					words: [
						['a', 3, 3.5],
						['test', 3.5, 4],
						['sentence', 4, 4.5]
					]
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('this is a test');

			expect(results).toHaveLength(1);
			expect(results[0].startTime).toBeCloseTo(1, 3); // "this" starts at 1.875
			expect(results[0].endTime).toBeCloseTo(4, 3); // "test" ends at 4.153846
			expect(results[0].startSubtitleId).toBe('s1');
			expect(results[0].endSubtitleId).toBe('s2');
			expect(results[0].matchedText).toBe('this is a test');
		});

		cleanup();
	});

	it('should be case insensitive by default', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 3,
					text: 'Hello World This Is',
					words: [
						['Hello', 0, 0.5],
						['World', 0.5, 1],
						['This', 1, 1.5],
						['Is', 1.5, 2]
					]
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('hello world');

			expect(results).toHaveLength(1);
			expect(results[0].matchedText).toBe('Hello World');
		});

		cleanup();
	});

	it('should support case sensitive search when specified', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 3,
					text: 'Hello World This Is',
					words: [
						['Hello', 0, 0.5],
						['World', 0.5, 1],
						['This', 1, 1.5],
						['Is', 1.5, 2]
					]
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('hello world', { caseSensitive: true });

			expect(results).toHaveLength(0);
		});

		cleanup();
	});

	it('should return empty array when no matches found', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 3,
					text: 'Hello world this is',
					words: [
						['Hello', 0, 0.5],
						['world', 0.5, 1],
						['this', 1, 1.5],
						['is', 1.5, 2]
					]
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('not found');

			expect(results).toHaveLength(0);
		});

		cleanup();
	});

	it('should find multiple matches in the same subtitle', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 6,
					text: 'test this test this test',
					words: [] // Will be auto-generated
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('test this');

			expect(results).toHaveLength(2);
			expect(results[0].startTime).toBeCloseTo(0, 3); // "test" starts at 0
			expect(results[0].endTime).toBeCloseTo(2.4, 3); // "this" ends at 2.4 (0 + 1.2 + 1.2)
			expect(results[0].startSubtitleId).toBe('s1');
			expect(results[0].endSubtitleId).toBe('s1');
			expect(results[0].matchedText).toBe('test this');

			expect(results[1].startTime).toBeCloseTo(2.4, 3); // "test" starts at 2.4
			expect(results[1].endTime).toBeCloseTo(4.8, 3); // "this" ends at 4.8 (2.4 + 1.2 + 1.2)
			expect(results[1].startSubtitleId).toBe('s1');
			expect(results[1].endSubtitleId).toBe('s1');
			expect(results[1].matchedText).toBe('test this');
		});

		cleanup();
	});

	it('should handle subtitles without word-level timing', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 3,
					text: 'Hello world this is a test',
					words: [] // No word-level timing
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('this is');

			expect(results).toHaveLength(1);
			expect(results[0].startTime).toBeCloseTo(1.428571, 3); // "this" starts at 1.428571
			expect(results[0].endTime).toBeCloseTo(2.285714, 3); // "is" ends at 2.285714
			expect(results[0].startSubtitleId).toBe('s1');
			expect(results[0].endSubtitleId).toBe('s1');
			expect(results[0].matchedText).toBe('this is');
		});

		cleanup();
	});

	it('should handle empty search text', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 3,
					text: 'Hello world this is a test',
					words: [
						['Hello', 0, 0.5],
						['world', 0.5, 1]
					]
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('');

			expect(results).toHaveLength(0);
		});

		cleanup();
	});

	it('should handle no asset or language set', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('test');

			expect(results).toHaveLength(0);
		});

		cleanup();
	});

	it('should handle whitespace in search text', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			const subs: Subtitle[] = [
				{
					id: 's1',
					start_at: 0,
					end_at: 3,
					text: 'Hello world this is a test',
					words: [
						['Hello', 0, 0.5],
						['world', 0.5, 1],
						['this', 1, 1.5],
						['is', 1.5, 2]
					]
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			const results = manager.findTextChunkTiming('  this is  ');

			expect(results).toHaveLength(1);
			expect(results[0].matchedText).toBe('this is');
		});

		cleanup();
	});

	it('should find real-world text chunks from actual subtitle data', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			// Real subtitle data from the user
			const subs: Subtitle[] = [
				{
					id: '9b75959e-bb6c-4a44-ac97-90fa64fa00ad',
					start_at: 0,
					end_at: 0.5810526315789474,
					text: "Here's your ",
					words: [
						["Here's", 0, 0.348632],
						['your', 0.348632, 0.581053]
					]
				},
				{
					id: 'dc81cbaf-e365-4dac-90fb-63c317874c5d',
					start_at: 0.5810526315789474,
					end_at: 1.694736842105263,
					text: 'portrait video sample, ',
					words: [
						['portrait', 0.581053, 1.026526],
						['video', 1.026526, 1.304947],
						['sample,', 1.304947, 1.694737]
					]
				},
				{
					id: '8eb75afe-299a-4f86-b8df-b430d160a9a3',
					start_at: 1.694736842105263,
					end_at: 3.2594555353901997,
					text: 'all set for a test drive. ',
					words: [
						['all', 1.694737, 1.929445],
						['set', 1.929445, 2.164152],
						['for', 2.164152, 2.39886],
						['a', 2.39886, 2.477096],
						['test', 2.477096, 2.79004],
						['drive.', 2.79004, 3.259456]
					]
				},
				{
					id: '4a6d741e-ca2b-46a6-900b-ef0b33b3df57',
					start_at: 4.029420709275518,
					end_at: 4.924203205291051,
					text: 'to quickly create ',
					words: [
						['to', 4.029421, 4.148725],
						['quickly', 4.148725, 4.56629],
						['create', 4.56629, 4.924203205291051]
					]
				},
				{
					id: 'ffd90ffe-7043-457e-8748-3b343e4087e8',
					start_at: 4.924203205291051,
					end_at: 5.669855285303995,
					text: 'new templates, ',
					words: [
						['new', 4.924203, 5.096277],
						['templates,', 5.096277, 5.669855]
					]
				}
			];

			manager.setAssetSubtitles('asset1', subs);
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			// Test "portrait video sample"
			const results1 = manager.findTextChunkTiming('portrait video sample');
			expect(results1).toHaveLength(1);
			expect(results1[0].startTime).toBe(0.581053);
			expect(results1[0].endTime).toBe(1.694737);
			expect(results1[0].startSubtitleId).toBe('dc81cbaf-e365-4dac-90fb-63c317874c5d');
			expect(results1[0].endSubtitleId).toBe('dc81cbaf-e365-4dac-90fb-63c317874c5d');
			expect(results1[0].matchedText).toBe('portrait video sample');

			// Test "test drive"
			const results2 = manager.findTextChunkTiming('test drive');
			expect(results2).toHaveLength(1);
			expect(results2[0].startTime).toBe(2.477096);
			expect(results2[0].endTime).toBe(3.259456);
			expect(results2[0].startSubtitleId).toBe('8eb75afe-299a-4f86-b8df-b430d160a9a3');
			expect(results2[0].endSubtitleId).toBe('8eb75afe-299a-4f86-b8df-b430d160a9a3');
			expect(results2[0].matchedText).toBe('test drive');

			// Test "quickly create new templates"
			const results3 = manager.findTextChunkTiming('quickly create new templates');
			expect(results3).toHaveLength(1);
			expect(results3[0].startTime).toBe(4.148725);
			expect(results3[0].endTime).toBe(5.669855);
			expect(results3[0].startSubtitleId).toBe('4a6d741e-ca2b-46a6-900b-ef0b33b3df57');
			expect(results3[0].endSubtitleId).toBe('ffd90ffe-7043-457e-8748-3b343e4087e8');
			expect(results3[0].matchedText).toBe('quickly create new templates');
		});

		cleanup();
	});

	it('should find text chunks using comprehensive test data', () => {
		const cleanup = $effect.root(() => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: testData
			});

			// Set the asset ID and language to match the test data structure
			manager.setAssetId('65e1be78016eab83060b4fc2');
			manager.setLanguage('default');

			// Flush effects to ensure all reactive updates are processed
			flushSync();

			// Test "portrait video sample" - should work
			const results1 = manager.findTextChunkTiming('portrait video sample');
			expect(results1).toHaveLength(1);
			expect(results1[0].startTime).toBe(0.581053);
			expect(results1[0].endTime).toBe(1.694737);
			expect(results1[0].startSubtitleId).toBe('dc81cbaf-e365-4dac-90fb-63c317874c5d');
			expect(results1[0].endSubtitleId).toBe('dc81cbaf-e365-4dac-90fb-63c317874c5d');
			expect(results1[0].matchedText).toBe('portrait video sample');

			// Test with completely wrong text - should NOT work
			const resultsWithWrongText = manager.findTextChunkTiming(
				'completely wrong text that should not match anything'
			);
			expect(resultsWithWrongText).toHaveLength(0);

			// Test with typos - should NOT work
			const resultsWithTypos = manager.findTextChunkTiming('pofefertrait video sameple');
			expect(resultsWithTypos).toHaveLength(0);

			// Test "test drive"
			const results2 = manager.findTextChunkTiming('test drive');
			expect(results2).toHaveLength(1);
			expect(results2[0].startTime).toBe(2.477096);
			expect(results2[0].endTime).toBe(3.259456);
			expect(results2[0].startSubtitleId).toBe('8eb75afe-299a-4f86-b8df-b430d160a9a3');
			expect(results2[0].endSubtitleId).toBe('8eb75afe-299a-4f86-b8df-b430d160a9a3');
			expect(results2[0].matchedText).toBe('test drive');

			const results3 = manager.findTextChunkTiming('animated subtitles');
			expect(results3).toHaveLength(1);
			expect(results3[0].startTime).toBe(11.395);
			expect(results3[0].endTime).toBe(12.860211);
			expect(results3[0].startSubtitleId).toBe('fe83c47a-10a9-4373-890c-f14e0ff57972');
			expect(results3[0].endSubtitleId).toBe('9b75959e-bb80-4d5b-8f1f-5d73a71fe80b');
			expect(results3[0].matchedText).toBe('animated subtitles');
		});

		cleanup();
	});
});
