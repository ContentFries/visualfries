import { describe, expect, it, vi } from 'vitest';
import { ComponentsManager } from '../../src/lib/managers/ComponentsManager.svelte.js';

describe('ComponentsManager.destroy', () => {
	it('awaits registered component teardown before clearing resources', async () => {
		const removeEventListener = vi.fn();
		const manager = new ComponentsManager({
			stateManager: {} as any,
			eventManager: { on: vi.fn(), removeEventListener } as any,
			layersManager: {} as any,
			container: {} as any
		});
		const destroy = vi.fn().mockResolvedValue(undefined);
		(manager as any).components = new Map([['animated-image', { destroy }]]);

		await manager.destroy();

		expect(destroy).toHaveBeenCalledTimes(1);
		expect(manager.getAll()).toEqual([]);
		expect(removeEventListener).toHaveBeenCalledWith('subtitleschange', expect.any(Function));
	});
});
