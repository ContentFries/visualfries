import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubtitlesManager } from '../src/lib/managers/SubtitlesManager.svelte.js';
import type { TimeManager } from '../src/lib/managers/TimeManager.svelte.js';
import type { EventManager } from '../src/lib/managers/EventManager.js';
import type { Scene, Subtitle } from '../src/lib/index.js';

const timeManager = {
	transformTime: vi.fn((t: number) => t),
	duration: 100
} as unknown as TimeManager;
const scene = { assets: [{ id: 'asset1', type: 'VIDEO', url: 'https://example.com/v.mp4' }] } as Scene;

const withManager = (
	subs: Subtitle[],
	run: (manager: SubtitlesManager, result: () => Subtitle[], emit: ReturnType<typeof vi.fn>) => void
) => {
	const emit = vi.fn();
	const cleanup = $effect.root(() => {
		const manager = new SubtitlesManager({
			timeManager,
			eventManager: { emit } as unknown as EventManager,
			sceneData: scene,
			subtitles: {}
		});
		manager.setAssetSubtitles('asset1', subs);
		manager.setAssetId('asset1');
		manager.setLanguage('default');
		run(manager, () => manager.data.asset1?.default ?? [], emit);
	});
	cleanup();
};

describe('SubtitlesManager.splitSubtitle characterization', () => {
	let warn: ReturnType<typeof vi.spyOn>;
	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => warn.mockRestore());

	const base = (words: any[], text = 'Hello world test'): Subtitle[] => [
		{ id: 's', start_at: 0, end_at: 10, text, words } as Subtitle
	];

	it('warns and keeps the subtitle when it does not exist', () => {
		withManager(base([]), (m, result) => {
			m.splitSubtitle('missing', 3);
			expect(result()).toHaveLength(1);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('not found'));
		});
	});

	it('warns on an out of range split position', () => {
		withManager(base([]), (m, result) => {
			m.splitSubtitle('s', 0);
			m.splitSubtitle('s', 99);
			expect(result()).toHaveLength(1);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid split position'));
		});
	});

	it('refuses a split that leaves one side empty after trimming', () => {
		withManager(base([], '   x'), (m, result) => {
			m.splitSubtitle('s', 2);
			expect(result()).toHaveLength(1);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty text segments'));
		});
	});

	it('splits at a word boundary, distributing whole words and timing proportionally', () => {
		withManager(base([['Hello', 0, 3], ['world', 3, 6], ['test', 6, 10]]), (m, result) => {
			m.splitSubtitle('s', 6);
			const [a, b] = result();
			expect(a.text).toBe('Hello');
			expect(a.words).toEqual([['Hello', 0, 3.75]]);
			expect(a.end_at).toBeCloseTo(3.75);
			expect(b.text).toBe('world test');
			expect(b.words?.map((w) => w[0])).toEqual(['world', 'test']);
			expect(b.start_at).toBeCloseTo(3.75);
			expect(b.end_at).toBe(10);
		});
	});

	it('splits inside a word, dividing its timing and copying its metadata', () => {
		withManager(base([['Hello', 0, 4, { k: 1 }], ['world', 4, 6], ['test', 6, 10]]), (m, result) => {
			m.splitSubtitle('s', 2);
			const [a, b] = result();
			expect(a.words).toEqual([['He', 0, 1.25, { k: 1 }]]);
			expect(b.words).toEqual([
				['llo', 1.6, 4, { k: 1 }],
				['world', 4, 6],
				['test', 6, 10]
			]);
		});
	});

	it('ignores malformed word tuples when finding the split word', () => {
		withManager(
			base([['bad'], [5, 0, 1], ['Hello', 0, 3], ['world', 3, 6], ['test', 6, 10]]),
			(m, result) => {
				m.splitSubtitle('s', 3);
				const [a, b] = result();
				expect(a.words).toEqual([['Hel', 0, 1.875]]);
				expect(b.words?.[0]).toEqual(['lo', 1.875, 3.064024]);
			}
		);
	});

	it('warns when the word to split has non-numeric timings', () => {
		withManager(base([['Hello', 'a', 'b'], ['world', 3, 6], ['test', 6, 10]]), (m, result) => {
			m.splitSubtitle('s', 3);
			expect(result()).toHaveLength(1);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid word tuple data types'));
		});
	});

	it('emits subtitlesplit with both parts', () => {
		withManager(base([['Hello', 0, 3], ['world', 3, 6], ['test', 6, 10]]), (m, _r, emit) => {
			m.splitSubtitle('s', 6);
			expect(emit).toHaveBeenCalledWith('subtitleschange');
			expect(emit).toHaveBeenCalledWith(
				'subtitlesplit',
				expect.objectContaining({
					subtitleId: 's',
					newSubtitle: expect.objectContaining({ text: 'world test' })
				})
			);
		});
	});
});

describe('SubtitlesManager.splitByChars characterization', () => {
	const sub = (id: string, start: number, end: number, text: string): Subtitle =>
		({ id, start_at: start, end_at: end, text, words: [] }) as Subtitle;

	it('does nothing for a non-positive limit', () => {
		withManager([sub('a', 0, 5, 'A fairly long line of text here')], (m, result) => {
			m.splitByChars(0);
			expect(result()).toHaveLength(1);
		});
	});

	it('does nothing when no subtitles exist for the asset', () => {
		withManager([], (m, result) => {
			m.splitByChars(10);
			expect(result()).toHaveLength(0);
		});
	});

	it('leaves a long text alone when there is no valid natural split point', () => {
		withManager([sub('a', 0, 5, 'Supercalifragilisticexpialidocious')], (m, result) => {
			m.splitByChars(10);
			expect(result()).toHaveLength(1);
		});
	});

	it('does not merge short neighbours separated by a long pause', () => {
		withManager([sub('a', 0, 1, 'One'), sub('b', 3, 4, 'Two')], (m, result) => {
			m.splitByChars(20);
			expect(result().map((s) => s.text)).toEqual(['One', 'Two']);
		});
	});

	it('does not merge when the combined text would exceed the allowed overflow', () => {
		withManager([sub('a', 0, 1, 'abcde'), sub('b', 1, 2, 'fghijklmnop')], (m, result) => {
			m.splitByChars(12);
			expect(result()).toHaveLength(2);
		});
	});

	it('does not merge a subtitle that is already long enough', () => {
		withManager([sub('a', 0, 1, 'long enough'), sub('b', 1, 2, 'x')], (m, result) => {
			m.splitByChars(12);
			expect(result()).toHaveLength(2);
		});
	});

	it('does not merge the last short subtitle with anything', () => {
		withManager([sub('a', 0, 1, 'Only')], (m, result) => {
			m.splitByChars(20);
			expect(result().map((s) => s.text)).toEqual(['Only']);
		});
	});

	it('skips blank subtitles when merging', () => {
		withManager([sub('a', 0, 1, '   '), sub('b', 1, 2, 'Two')], (m, result) => {
			m.splitByChars(20);
			expect(result()).toHaveLength(2);
		});
	});

	it('splits a long sentence at punctuation into several parts', () => {
		withManager(
			[sub('a', 0, 10, 'First part here, second part here, third part here and then more')],
			(m, result) => {
				m.splitByChars(20);
				const texts = result().map((s) => s.text.trim());
				expect(texts.length).toBeGreaterThan(2);
				expect(texts.join(' ').replace(/\s+/g, ' ')).toBe(
					'First part here, second part here, third part here and then more'
				);
			}
		);
	});
});
