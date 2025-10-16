import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubtitlesManager } from '../src/lib/managers/SubtitlesManager.svelte.js';
import type {
	SubtitleCollection,
	CompactWordTuple,
	SubtitleWord
} from '../src/lib';
import type { TimeManager } from '../src/lib/managers/TimeManager.svelte.js';
import type { EventManager } from '../src/lib/managers/EventManager.js';
import type { Scene } from '../src/lib';

// Helper functions for safe CompactWordTuple access
function isCompactWordTuple(word: SubtitleWord | CompactWordTuple): word is CompactWordTuple {
	return Array.isArray(word);
}

function safeGetWordText(word: SubtitleWord | CompactWordTuple): string {
	return isCompactWordTuple(word) ? word[0] || '' : word.text;
}

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
				id: 'test-asset-1',
				type: 'VIDEO',
				url: 'https://example.com/video.mp4'
			}
		]
	}) as Scene;

describe('SubtitlesManager', () => {
	let mockTimeManager: TimeManager;
	let mockEventManager: EventManager;
	let mockScene: Scene;

	beforeEach(() => {
		mockTimeManager = createMockTimeManager();
		mockEventManager = createMockEventManager();
		mockScene = createMockScene();
		vi.clearAllMocks();
	});

	describe('Initialization and Data Management', () => {
		it('initializes with empty subtitles', () => {
			const manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});

			expect(manager.data).toEqual({});
		});

		it('initializes with subtitle collection format', async () => {
			const cleanup = $effect.root(() => {
				const collection: Record<string, SubtitleCollection> = {
					asset1: {
						default: [
							{
								id: 'sub1',
								start_at: 0,
								end_at: 2,
								text: 'Hello world',
								words: [
									['Hello', 0, 1],
									['world', 1, 2]
								] as CompactWordTuple[]
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

				// Wait for async initialization and check structure
				console.log('manager.data', manager.data);
				expect(Object.keys(manager.data)).toContain('asset1');
				expect(manager.data.asset1?.default).toBeDefined();
				expect(manager.data.asset1.default[0].id).toBe('sub1');
			});

			cleanup();
		});

		it('initializes with legacy format and converts to collection format', () => {
			const cleanup = $effect.root(() => {
				const legacySubtitles = {
					asset1: [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 2,
							text: 'Hello world',
							words: [
								['Hello', 0, 1],
								['world', 1, 2]
							] as CompactWordTuple[]
						}
					]
				};

				const manager = new SubtitlesManager({
					timeManager: mockTimeManager,
					eventManager: mockEventManager,
					sceneData: mockScene,
					subtitles: legacySubtitles
				});

				// Check that legacy format is converted properly
				expect(Object.keys(manager.data)).toContain('asset1');
				expect(manager.data.asset1?.default).toBeDefined();
				expect(manager.data.asset1.default[0].id).toBe('sub1');
			});

			cleanup();
		});

		it('handles asset-language key format in legacy subtitles', () => {
			const cleanup = $effect.root(() => {
				const legacySubtitles = {
					'asset1-en': [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 1,
							text: 'Hello'
						}
					],
					'asset1-fr': [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 1,
							text: 'Bonjour'
						}
					]
				};

				const manager = new SubtitlesManager({
					timeManager: mockTimeManager,
					eventManager: mockEventManager,
					sceneData: mockScene,
					subtitles: legacySubtitles
				});

				// Check that asset-language keys are parsed correctly
				expect(Object.keys(manager.data)).toContain('asset1');
				expect(manager.data.asset1?.en).toBeDefined();
				expect(manager.data.asset1?.fr).toBeDefined();
				expect(manager.data.asset1.en[0].text).toBe('Hello');
				expect(manager.data.asset1.fr[0].text).toBe('Bonjour');
			});

			cleanup();
		});
	});

	describe('Text Updates and Word Redistribution', () => {
		let manager: SubtitlesManager;

		beforeEach(() => {
			const collection: Record<string, SubtitleCollection> = {
				asset1: {
					default: [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 4,
							text: 'Hello world test',
							words: [
								['Hello', 0, 1],
								['world', 1, 2],
								['test', 2, 4]
							] as CompactWordTuple[]
						}
					]
				}
			};

			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			manager.setAssetId('asset1');
			manager.setLanguage('default');
		});

		it('preserves word timings when word count matches', () => {
			manager.updateSubtitleText('sub1', 'Hi there again');

			const updated = manager.getSubtitle('sub1');
			expect(updated?.text).toBe('Hi there again');
			expect(updated?.words).toEqual([
				['Hi', 0, 1],
				['there', 1, 2],
				['again', 2, 4]
			]);
		});

		it('redistributes timings proportionally when word count changes', () => {
			manager.updateSubtitleText('sub1', 'Hello');

			const updated = manager.getSubtitle('sub1');
			expect(updated?.text).toBe('Hello');
			expect(updated?.words).toEqual([['Hello', 0, 4]]);
		});

		it('redistributes timings for more words', () => {
			manager.updateSubtitleText('sub1', 'One two three four five');

			const updated = manager.getSubtitle('sub1');
			expect(updated?.text).toBe('One two three four five');
			expect(updated?.words).toEqual([
				['One', 0, 0.8],
				['two', 0.8, 1.6],
				['three', 1.6, 2.4],
				['four', 2.4, 3.2],
				['five', 3.2, 4]
			]);
		});

		it('filters out empty words during redistribution', () => {
			manager.updateSubtitleText('sub1', 'Hello  world');

			const updated = manager.getSubtitle('sub1');
			expect(updated?.text).toBe('Hello  world');
			expect(updated?.words).toHaveLength(2);
			expect(updated?.words?.map((w) => safeGetWordText(w))).toEqual(['Hello', 'world']);
		});

		it('emits change events on text update', () => {
			manager.updateSubtitleText('sub1', 'New text');

			expect(mockEventManager.emit).toHaveBeenCalledWith('subtitleschange');
			expect(mockEventManager.emit).toHaveBeenCalledWith('subtitlechange', {
				assetId: 'asset1',
				language: 'default',
				subtitleId: 'sub1',
				subtitle: expect.objectContaining({
					text: 'New text'
				})
			});
		});
	});

	describe('Subtitle Splitting', () => {
		let manager: SubtitlesManager;

		beforeEach(() => {
			const collection: Record<string, SubtitleCollection> = {
				asset1: {
					default: [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 10,
							text: 'Hello world test',
							words: [
								['Hello', 0, 3],
								['world', 3, 6],
								['test', 6, 10]
							] as CompactWordTuple[]
						}
					]
				}
			};

			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			manager.setAssetId('asset1');
			manager.setLanguage('default');
		});

		it('splits at word boundary', () => {
			const cleanup = $effect.root(() => {
				manager.splitSubtitle('sub1', 6); // Split after "Hello "

				const subtitles = manager.getAssetSubtitles('asset1').default;
				expect(subtitles).toHaveLength(2);

				const firstSub = subtitles.find((s) => s.id === 'sub1');
				const secondSub = subtitles.find((s) => s.id !== 'sub1');

				expect(firstSub?.text).toBe('Hello');
				expect(secondSub?.text).toBe('world test');
			});

			cleanup();
		});

		it('splits within a word', () => {
			const cleanup = $effect.root(() => {
				manager.splitSubtitle('sub1', 3); // Split within "Hello"

				const subtitles = manager.getAssetSubtitles('asset1').default;
				expect(subtitles).toHaveLength(2);

				const firstSub = subtitles.find((s) => s.id === 'sub1');
				const secondSub = subtitles.find((s) => s.id !== 'sub1');

				expect(firstSub?.text).toBe('Hel');
				expect(secondSub?.text).toBe('lo world test');
			});

			cleanup();
		});

		it('ignores invalid split positions', () => {
			const cleanup = $effect.root(() => {
				manager.splitSubtitle('sub1', 0); // At start
				expect(manager.getAssetSubtitles('asset1').default).toHaveLength(1);

				manager.splitSubtitle('sub1', 16); // Beyond text length
				expect(manager.getAssetSubtitles('asset1').default).toHaveLength(1);
			});

			cleanup();
		});

		it('emits split event', () => {
			manager.splitSubtitle('sub1', 6);

			expect(mockEventManager.emit).toHaveBeenCalledWith('subtitleschange');
			expect(mockEventManager.emit).toHaveBeenCalledWith('subtitlesplit', expect.any(Object));
		});
	});

	describe('Subtitle Merging', () => {
		let manager: SubtitlesManager;

		beforeEach(() => {
			const collection: Record<string, SubtitleCollection> = {
				asset1: {
					default: [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 5,
							text: 'Hello',
							words: [['Hello', 0, 5]] as CompactWordTuple[]
						},
						{
							id: 'sub2',
							start_at: 5,
							end_at: 10,
							text: 'world',
							words: [['world', 5, 10]] as CompactWordTuple[]
						},
						{
							id: 'sub3',
							start_at: 10,
							end_at: 15,
							text: 'test',
							words: [['test', 10, 15]] as CompactWordTuple[]
						}
					]
				},
				asset2: {
					default: [
						{
							id: '9b75959e-bb6c-4a44-ac97-90fa64fa00ad',
							start_at: 0,
							end_at: 0.5810526315789474,
							text: "Here's your ",
							words: [
								["Here's", 0, 0.348632],
								['your', 0.348632, 0.581053]
							],
							visible: true
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
							id: '4428b634-4b88-4197-9cdc-a3e45c10557d',
							start_at: 3.2594555353901997,
							end_at: 4.029420709275518,
							text: 'Use this sample ',
							words: [
								['Use', 3.259456, 3.43714],
								['this', 3.43714, 3.674052],
								['sample', 3.674052, 4.029421]
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
						},
						{
							id: 'd7da4fad-9087-42cf-b125-809360b13b53',
							start_at: 5.669855285303995,
							end_at: 6.365797226649409,
							text: 'play with the ',
							words: [
								['play', 5.669855, 5.922925],
								['with', 5.922925, 6.175995],
								['the', 6.175995, 6.365797]
							]
						},
						{
							id: '04471482-71f1-494a-bb8b-d278a20ccfc3',
							start_at: 6.365797226649409,
							end_at: 7.36,
							text: 'ContentFries editor,',
							words: [
								['ContentFries', 6.365797, 6.919366],
								['editor,', 6.98972, 7.36]
							]
						},
						{
							id: '9b75959e-bb7a-4e70-9774-e14632b031ae',
							start_at: 7.36,
							end_at: 8.129655172413793,
							text: 'or easily learn ',
							words: [
								['or', 7.36, 7.478408],
								['easily', 7.478408, 7.833634],
								['learn', 7.833634, 8.129655172413793]
							],
							visible: true
						},
						{
							id: '212c740b-e246-4d03-9ff7-4540f9d5a46c',
							start_at: 8.129655172413793,
							end_at: 8.755,
							text: 'how it works.',
							words: [
								['how', 8.24, 8.4],
								['it', 8.4, 8.48],
								['works.', 8.48, 8.755]
							]
						},
						{
							id: '9b75959e-bb7d-4a0b-ab31-2c828f4f2b7b',
							start_at: 9.315,
							end_at: 10.384756097560976,
							text: 'New around here? ',
							words: [
								['New', 9.315, 9.544233],
								['around', 9.544233, 10.0027],
								['here?', 10.0027, 10.384756097560976]
							],
							visible: true
						},
						{
							id: 'fe83c47a-10a9-4373-890c-f14e0ff57972',
							start_at: 10.384756097560976,
							end_at: 11.955,
							text: 'Experiment with animated',
							words: [
								['Experiment', 10.755, 11.155],
								['with', 11.155, 11.395],
								['animated', 11.395, 11.955]
							]
						},
						{
							id: '9b75959e-bb80-4d5b-8f1f-5d73a71fe80b',
							start_at: 11.955,
							end_at: 14.761153846153846,
							text: 'subtitles, emojis, or GIF overlays. ',
							words: [
								['subtitles,', 11.955, 12.860211],
								['emojis,', 12.860211, 13.493859],
								['or', 13.493859, 13.674901],
								['GIF', 13.674901, 13.946464],
								['overlays.', 13.946464, 14.761154]
							],
							visible: true
						},
						{
							id: '64b37be9-ab01-4caa-868a-274adf49e034',
							start_at: 14.761153846153846,
							end_at: 16.42180473372781,
							text: 'Try the AI headline generator ',
							words: [
								['Try', 14.761154, 14.960432],
								['the', 14.960432, 15.15971],
								['AI', 15.15971, 15.292562],
								['headline', 15.292562, 15.82397],
								['generator', 15.82397, 16.421805]
							]
						},
						{
							id: '013cf1ac-4c8d-4546-b988-2ddf92fb5b01',
							start_at: 16.42180473372781,
							end_at: 18.099833904287344,
							text: 'and other exciting features. ',
							words: [
								['and', 16.421805, 16.623168],
								['other', 16.623168, 16.958774],
								['exciting', 16.958774, 17.495743],
								['features.', 17.495743, 18.099834]
							]
						},
						{
							id: 'f94bfc89-55f4-4f90-a08b-f85e47f96298',
							start_at: 18.099833904287344,
							end_at: 19.72,
							text: 'Customize anything you want,',
							words: [
								['Customize', 18.2, 18.7],
								['anything', 18.84, 19.16],
								['you', 19.16, 19.32],
								['want,', 19.32, 19.72]
							]
						},
						{
							id: '9b75959e-bb89-4225-866b-b16e1b4437b9',
							start_at: 19.72,
							end_at: 21.4,
							text: 'then export your video or save',
							words: [
								['then', 19.72, 20.04],
								['export', 20.04, 20.36],
								['your', 20.36, 20.52],
								['video', 20.52, 20.84],
								['or', 20.84, 21.16],
								['save', 21.16, 21.4]
							],
							visible: true
						},
						{
							id: '9b75959e-bb8d-4055-89f1-2b0baec61b6b',
							start_at: 21.4,
							end_at: 22.78,
							text: 'your edits as a new template.',
							words: [
								['your', 21.4, 21.56],
								['edits', 21.56, 21.88],
								['as', 21.88, 22.04],
								['a', 22.04, 22.12],
								['new', 22.12, 22.28],
								['template.', 22.28, 22.78]
							],
							visible: true
						},
						{
							id: '9b75959e-bb90-4683-adad-9d19ea50b39e',
							start_at: 23.24,
							end_at: 24.06,
							text: 'Have fun exploring.',
							words: [
								['Have', 23.24, 23.42566],
								['fun', 23.42566, 23.673208],
								['exploring.', 23.673208, 24.06]
							],
							visible: true
						}
					]
				}
			};

			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			manager.setAssetId('asset1');
			manager.setLanguage('default');
		});

		it('merges subtitle with next (mergeTo: start)', () => {
			const cleanup = $effect.root(() => {
				const subtitles = manager.getAssetSubtitles('asset1').default;
				expect(subtitles).toHaveLength(3);

				manager.mergeSubtitles('sub1', 'start');

				const mergedSubtitles = manager.getAssetSubtitles('asset1').default;
				expect(mergedSubtitles).toHaveLength(2);

				console.log('mergedSubtitles', mergedSubtitles);

				const beforeSub = mergedSubtitles.find((s) => s.id === 'sub1');
				expect(beforeSub).not.toBeDefined();

				const mergedSub = mergedSubtitles.find((s) => s.id === 'sub2');
				expect(mergedSub?.text).toBe('Hello world');
			});

			cleanup();
		});

		it('should correctly merge the first subtitle with the second', () => {
			const cleanup = $effect.root(() => {
				manager.setAssetId('asset2');
				const subtitles = manager.getAssetSubtitles('asset2').default;

				// VERIFY INITIAL STATE
				expect(subtitles).toBeDefined();
				expect(subtitles).toHaveLength(19);

				// --- EXECUTE THE MERGE ---
				manager.mergeSubtitles('9b75959e-bb6c-4a44-ac97-90fa64fa00ad', 'start');

				// --- ASSERT THE FINAL STATE ---
				const finalSubs = manager.getAssetSubtitles('asset2').default;

				// 1. The total number of subtitles should be reduced by one
				expect(finalSubs).toHaveLength(18);

				// 2. The original source subtitle should no longer exist
				// const findSource = finalSubs.find((sub) => sub.id === sourceSub.id);
				// expect(findSource).toBeUndefined();

				// // 3. The target subtitle should be updated with the merged content
				// const mergedSub = finalSubs.find((sub) => sub.id === targetSub.id);
				// expect(mergedSub).toBeDefined();

				const mergedSub = finalSubs[0];
				// // 4. Verify the properties of the merged subtitle
				expect(mergedSub.text.endsWith('portrait video sample, ')).toBe(true);

				console.log('-- mergedSub DEBUG', mergedSub);
				// expect(mergedSub.start_at).toBe(sourceSub.start_at); // Should take start time of the first sub
				// expect(mergedSub.end_at).toBe(targetSub.end_at); // Should keep end time of the second sub
				// expect(mergedSub.words).toHaveLength(sourceSub.words.length + targetSub.words.length); // 5 words total
				// expect(mergedSub.words[0][0]).toBe("Here's"); // First word from first sub
				// expect(mergedSub.words[4][0]).toBe('sample,'); // Last word from second sub
			});
			cleanup();
		});

		it('merges subtitle with previous (mergeTo: end)', () => {
			const cleanup = $effect.root(() => {
				const subtitles = manager.getAssetSubtitles('asset1').default;
				expect(subtitles).toHaveLength(3);

				manager.mergeSubtitles('sub2', 'end');

				const mergedSubtitles = manager.getAssetSubtitles('asset1').default;
				expect(mergedSubtitles).toHaveLength(2);

				const beforeSub = mergedSubtitles.find((s) => s.id === 'sub2');
				expect(beforeSub).not.toBeDefined();

				const mergedSub = mergedSubtitles.find((s) => s.id === 'sub1');
				expect(mergedSub?.text).toBe('Hello world');
			});

			cleanup();
		});

		it('handles merge at boundaries gracefully', () => {
			const cleanup = $effect.root(() => {
				const originalCount = manager.getAssetSubtitles('asset1').default.length;
				manager.mergeSubtitles('sub1', 'end');
				expect(manager.getAssetSubtitles('asset1').default).toHaveLength(originalCount);
			});

			cleanup();
		});

		it('emits merge event', () => {
			const cleanup = $effect.root(() => {
				manager.mergeSubtitles('sub1', 'start');

				expect(mockEventManager.emit).toHaveBeenCalledWith('subtitleschange');
				expect(mockEventManager.emit).toHaveBeenCalledWith('subtitlemerge', expect.any(Object));
			});

			cleanup();
		});
	});

	describe('Time-based Lookups', () => {
		let manager: SubtitlesManager;

		beforeEach(() => {
			const collection: Record<string, SubtitleCollection> = {
				asset1: {
					default: [
						{ id: 'sub1', start_at: 0, end_at: 5, text: 'First' },
						{ id: 'sub2', start_at: 5, end_at: 10, text: 'Second' },
						{ id: 'sub3', start_at: 15, end_at: 20, text: 'Third' }
					]
				}
			};

			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			manager.setAssetId('asset1');
			manager.setLanguage('default');
		});

		it('finds subtitle by exact time', () => {
			const cleanup = $effect.root(() => {
				const sub = manager.getSubtitle(7);
				expect(sub?.id).toBe('sub2');
			});

			cleanup();
		});

		it('finds subtitle by time at boundaries', () => {
			const cleanup = $effect.root(() => {
				const subAtStart = manager.getSubtitle(5);
				expect(subAtStart?.id).toBe('sub2');

				const subAtEnd = manager.getSubtitle(10);
				expect(subAtEnd?.id).toBe('sub2');
			});

			cleanup();
		});

		it('returns undefined for time gaps', () => {
			const sub = manager.getSubtitle(12);
			expect(sub).toBeUndefined();
		});

		it('finds subtitle by ID', () => {
			const sub = manager.getSubtitle('sub2');
			expect(sub?.text).toBe('Second');
		});

		it('returns undefined for non-existent ID', () => {
			const sub = manager.getSubtitle('nonexistent');
			expect(sub).toBeUndefined();
		});
	});

	describe('Timing Updates', () => {
		let manager: SubtitlesManager;

		beforeEach(() => {
			const collection: Record<string, SubtitleCollection> = {
				asset1: {
					default: [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 5,
							text: 'Hello'
						}
					]
				}
			};

			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			manager.setAssetId('asset1');
			manager.setLanguage('default');
		});

		it('updates start time', () => {
			manager.setStart('sub1', 2);

			const updated = manager.getSubtitle('sub1');
			expect(updated?.start_at).toBe(2);
			expect(mockTimeManager.transformTime).toHaveBeenCalledWith(2);
		});

		it('updates end time', () => {
			manager.setEnd('sub1', 8);

			const updated = manager.getSubtitle('sub1');
			expect(updated?.end_at).toBe(8);
			expect(mockTimeManager.transformTime).toHaveBeenCalledWith(8);
		});

		it('emits change events on timing updates', () => {
			manager.setStart('sub1', 2);

			expect(mockEventManager.emit).toHaveBeenCalledWith('subtitleschange');
			expect(mockEventManager.emit).toHaveBeenCalledWith('subtitlechange', expect.any(Object));
		});
	});

	describe('Edge Cases and Error Handling', () => {
		let manager: SubtitlesManager;

		beforeEach(() => {
			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: {}
			});
		});

		it('handles operations without setting asset ID', () => {
			expect(() => manager.updateSubtitleText('sub1', 'text')).not.toThrow();
			expect(() => manager.splitSubtitle('sub1', 5)).not.toThrow();
			expect(() => manager.mergeSubtitles('sub1', 'start')).not.toThrow();
		});

		it('handles operations on non-existent subtitles', () => {
			manager.setAssetId('asset1');
			manager.setLanguage('default');

			expect(() => manager.updateSubtitleText('nonexistent', 'text')).not.toThrow();
			expect(() => manager.splitSubtitle('nonexistent', 5)).not.toThrow();
			expect(() => manager.mergeSubtitles('nonexistent', 'start')).not.toThrow();
		});

		it('handles empty text updates', () => {
			const collection: Record<string, SubtitleCollection> = {
				asset1: {
					default: [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 5,
							text: 'Hello',
							words: [['Hello', 0, 5]] as CompactWordTuple[]
						}
					]
				}
			};

			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			manager.setAssetId('asset1');
			manager.setLanguage('default');

			manager.updateSubtitleText('sub1', '');
			const updated = manager.getSubtitle('sub1');
			expect(updated?.text).toBe('');
			expect(updated?.words).toEqual([]);
		});

		it('ensures no empty words in arrays after any operation', () => {
			const collection: Record<string, SubtitleCollection> = {
				asset1: {
					default: [
						{
							id: 'sub1',
							start_at: 0,
							end_at: 4,
							text: 'Hello world',
							words: [
								['Hello', 0, 2],
								['world', 2, 4]
							] as CompactWordTuple[]
						}
					]
				}
			};

			manager = new SubtitlesManager({
				timeManager: mockTimeManager,
				eventManager: mockEventManager,
				sceneData: mockScene,
				subtitles: collection
			});

			manager.setAssetId('asset1');
			manager.setLanguage('default');

			// Test various operations that might create empty words
			const testCases = [
				'Hello  world',
				'  Hello world  ',
				'Hello    world',
				'Hello\t\tworld',
				'Hello\n\nworld'
			];

			testCases.forEach((testText) => {
				manager.updateSubtitleText('sub1', testText);
				const updated = manager.getSubtitle('sub1');

				// Ensure no empty words
				expect(updated?.words?.every((w) => safeGetWordText(w) !== '')).toBe(true);
				expect(updated?.words?.every((w) => safeGetWordText(w).trim() !== '')).toBe(true);
			});
		});

		it('handles subtitle splitting that would create empty segments', () => {
			const cleanup = $effect.root(() => {
				const collection: Record<string, SubtitleCollection> = {
					asset1: {
						default: [
							{
								id: 'edge-sub',
								start_at: 0,
								end_at: 5,
								text: 'A',
								words: [['A', 0, 5]] as CompactWordTuple[]
							}
						]
					}
				};

				manager = new SubtitlesManager({
					timeManager: mockTimeManager,
					eventManager: mockEventManager,
					sceneData: mockScene,
					subtitles: collection
				});

				manager.setAssetId('asset1');
				manager.setLanguage('default');

				// Try to split at position 0 (should be ignored)
				manager.splitSubtitle('edge-sub', 0);
				expect(manager.getAssetSubtitles('asset1').default).toHaveLength(1);

				// Try to split at end (should be ignored)
				manager.splitSubtitle('edge-sub', 1);
				expect(manager.getAssetSubtitles('asset1').default).toHaveLength(1);
			});

			cleanup();
		});
	});
});
