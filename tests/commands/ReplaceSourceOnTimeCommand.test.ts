import { describe, expect, it, vi } from 'vitest';

import { ReplaceSourceOnTimeCommand } from '$lib/commands/ReplaceSourceOnTimeCommand.ts';

describe('ReplaceSourceOnTimeCommand', () => {
	it('uses content-derived cache keys for equal-length payloads', async () => {
		const deterministicMediaManager = {
			isEnabled: vi.fn(() => true),
			setOneTimeOverride: vi.fn()
		};
		const stateManager = {
			data: { settings: { fps: 30 } },
			markDirty: vi.fn()
		};
		const command = new ReplaceSourceOnTimeCommand({
			stateManager: stateManager as any,
			deterministicMediaManager: deterministicMediaManager as any
		});

		await command.execute({
			componentId: 'component-1',
			time: 1,
			base64data: 'data:image/png;base64,AQ=='
		});
		await command.execute({
			componentId: 'component-1',
			time: 1,
			base64data: 'data:image/png;base64,Ag=='
		});

		expect(deterministicMediaManager.setOneTimeOverride).toHaveBeenCalledTimes(2);
		const firstCacheKey = deterministicMediaManager.setOneTimeOverride.mock.calls[0][2].cacheKey;
		const secondCacheKey = deterministicMediaManager.setOneTimeOverride.mock.calls[1][2].cacheKey;
		expect(firstCacheKey).not.toBe(secondCacheKey);
	});
});
