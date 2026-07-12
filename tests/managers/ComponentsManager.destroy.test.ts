import { describe, expect, it, vi } from 'vitest';
import { ComponentsManager } from '../../src/lib/managers/ComponentsManager.svelte.js';

const deferred = () => {
	let resolve!: () => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<void>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
};

const createManager = () => {
	const removeEventListener = vi.fn();
	const layersManager = { getAll: vi.fn(() => []), delete: vi.fn() };
	const manager = new ComponentsManager({
		stateManager: {} as any,
		eventManager: { on: vi.fn(), removeEventListener } as any,
		layersManager: layersManager as any,
		container: {} as any
	});
	return { manager, layersManager, removeEventListener };
};

describe('ComponentsManager async cleanup', () => {
	it('awaits registered component teardown before clearing resources', async () => {
		const { manager, removeEventListener } = createManager();
		const destroy = vi.fn().mockResolvedValue(undefined);
		(manager as any).components = new Map([['animated-image', { destroy }]]);

		await manager.destroy();

		expect(destroy).toHaveBeenCalledTimes(1);
		expect(manager.getAll()).toEqual([]);
		expect(removeEventListener).toHaveBeenCalledWith('subtitleschange', expect.any(Function));
	});

	it('detaches a deleted component before awaiting teardown', async () => {
		const { manager, layersManager } = createManager();
		const gate = deferred();
		const component = { id: 'image-1', destroy: vi.fn(() => gate.promise) } as any;
		const sibling = { id: 'image-2' } as any;
		const layer = {
			id: 'layer-1',
			components: [component, sibling],
			removeComponent: vi.fn(() => {
				layer.components = layer.components.filter((item) => item !== component);
			})
		};
		layersManager.getAll.mockReturnValue([layer]);
		(manager as any).components = new Map([[component.id, component]]);

		const deletion = manager.delete(component.id);

		expect(manager.get(component.id)).toBeUndefined();
		expect(layer.removeComponent).toHaveBeenCalledWith(component);
		expect(layersManager.delete).not.toHaveBeenCalled();
		let settled = false;
		void deletion.then(
			() => {
				settled = true;
			},
			() => {
				settled = true;
			}
		);
		await Promise.resolve();
		expect(settled).toBe(false);

		gate.resolve();
		await deletion;
		expect(settled).toBe(true);
	});

	it('waits for all bulk deletions before aggregating failures', async () => {
		const { manager } = createManager();
		const gate = deferred();
		const first = { id: 'first', destroy: vi.fn().mockRejectedValue(new Error('first failed')) };
		const second = { id: 'second', destroy: vi.fn(() => gate.promise) };
		(manager as any).components = new Map([
			[first.id, first],
			[second.id, second]
		]);

		const deletion = manager.bulkDelete([first.id, second.id]);
		let settled = false;
		void deletion.then(
			() => {
				settled = true;
			},
			() => {
				settled = true;
			}
		);
		await Promise.resolve();
		expect(settled).toBe(false);

		gate.resolve();
		await expect(deletion).rejects.toThrow('Component deletion failed');
		expect(manager.getAll()).toEqual([]);
	});

	it('clears manager state and attempts every destroy before reporting failures', async () => {
		const { manager } = createManager();
		const first = { destroy: vi.fn().mockRejectedValue(new Error('first failed')) };
		const second = { destroy: vi.fn().mockResolvedValue(undefined) };
		(manager as any).components = new Map([
			['first', first],
			['second', second]
		]);

		await expect(manager.destroy()).rejects.toThrow('Component teardown failed');

		expect(first.destroy).toHaveBeenCalledTimes(1);
		expect(second.destroy).toHaveBeenCalledTimes(1);
		expect(manager.getAll()).toEqual([]);
	});
});
