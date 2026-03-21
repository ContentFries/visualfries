import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubtitlesHook } from '$lib/components/hooks/SubtitlesHook.ts';

describe('SubtitlesHook', () => {
	let subtitlesManager: any;
	let eventManager: any;
	let hook: SubtitlesHook;

	beforeEach(() => {
		subtitlesManager = {
			settings: { punctuation: true },
			data: {
				'asset-1': {
					default: [
						{
							id: 'sub-1',
							start_at: 0,
							end_at: 2,
							text: 'Hello'
						}
					]
				}
			},
			getAssetSubtitles: vi.fn().mockReturnValue({
				default: [
					{
						id: 'sub-1',
						start_at: 0,
						end_at: 2,
						text: 'Hello'
					}
				]
			})
		};
		eventManager = {
			addEventListener: vi.fn()
		};
		hook = new SubtitlesHook({
			subtitlesManager,
			stateManager: { currentTime: 1 },
			eventManager
		} as any);
	});

	it('treats omitted visible as visible in the cached subtitle path', async () => {
		const context = {
			data: {
				id: 'subs-1',
				type: 'SUBTITLES',
				source: { assetId: 'asset-1' },
				appearance: {}
			},
			contextData: {
				id: 'subs-1',
				type: 'SUBTITLES',
				source: { assetId: 'asset-1' }
			},
			updateContextData: vi.fn(),
			resetContextData: vi.fn(),
			setResource: vi.fn()
		} as any;

		await hook.handle('setup', context);
		await hook.handle('update', context);

		expect(hook.activeSubtitle?.id).toBe('sub-1');
		expect(hook.activeSubtitle?.id).toBe('sub-1');
	});
});
