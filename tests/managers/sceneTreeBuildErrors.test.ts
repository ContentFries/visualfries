import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComponentsManager } from '../../src/lib/managers/ComponentsManager.svelte.js';
import { LayersManager } from '../../src/lib/managers/LayersManager.svelte.js';
import { DeterministicRenderError } from '../../src/lib/schemas/runtime/deterministic.js';

// The scene tree is built layer by layer, component by component. A component that fails to
// build is logged and left out, except in a strict deterministic render, which must fail.
const missingFrame = () =>
	new DeterministicRenderError('Deterministic frame provider returned null', {
		componentId: 'clip',
		frameIndex: 0,
		sceneTime: 0
	});

const componentsManagerFailingWith = (error: unknown) => {
	const director = {
		setBuilder: vi.fn(),
		setComponentData: vi.fn(),
		constructAuto: () => ({
			setup: async () => {},
			update: async () => {
				throw error;
			}
		})
	};
	return new ComponentsManager({
		stateManager: {} as any,
		eventManager: { on: vi.fn(), removeEventListener: vi.fn() } as any,
		layersManager: {} as any,
		container: {
			createScope: () => ({
				register: vi.fn(),
				resolve: (name: string) => (name === 'componentDirector' ? director : {})
			})
		} as any
	});
};

const layersManagerFailingWith = (error: unknown) =>
	new LayersManager({
		container: {
			register: vi.fn(),
			resolve: () => ({
				id: 'layer',
				build: async () => {
					throw error;
				}
			})
		} as any
	});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('scene tree build errors', () => {
	it('fails the component build when a strict deterministic frame is missing', async () => {
		const manager = componentsManagerFailingWith(missingFrame());

		await expect(manager.create({ id: 'clip' } as any)).rejects.toBeInstanceOf(
			DeterministicRenderError
		);
		expect(manager.get('clip')).toBeUndefined();
		// The manager is free again: the next build starts instead of "multiple components".
		await expect(manager.create({ id: 'clip' } as any)).rejects.toThrow(
			'Deterministic frame provider returned null'
		);
	});

	it('fails the layer build when a strict deterministic frame is missing', async () => {
		const manager = layersManagerFailingWith(missingFrame());

		await expect(manager.create({ id: 'layer' } as any)).rejects.toBeInstanceOf(
			DeterministicRenderError
		);
		expect(manager.getAll()).toEqual([]);
		await expect(manager.create({ id: 'layer' } as any)).rejects.toThrow(
			'Deterministic frame provider returned null'
		);
	});

	it('logs any other build error and leaves the component or layer out', async () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		const error = new Error('broken component');

		await expect(
			componentsManagerFailingWith(error).create({ id: 'clip' } as any)
		).resolves.toBeNull();
		// The layer that could not build is returned, but it is not part of the scene.
		const layers = layersManagerFailingWith(error);
		await layers.create({ id: 'layer' } as any);
		expect(layers.getAll()).toEqual([]);
		expect(logged).toHaveBeenCalledTimes(2);
		expect(logged).toHaveBeenCalledWith(error);
	});
});
