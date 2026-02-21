import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeterministicRenderError } from '$lib/schemas/runtime/deterministic.ts';
import { DeterministicMediaFrameHook } from '$lib/components/hooks/DeterministicMediaFrameHook.ts';

const createContext = () => {
	const resources = new Map<string, unknown>();
	return {
		contextData: {
			id: 'video-1',
			type: 'VIDEO',
			source: { url: 'https://example.com/video.mp4' },
			timeline: { startAt: 0, endAt: 10 },
			appearance: { x: 0, y: 0, width: 1920, height: 1080 },
			animations: {},
			effects: {},
			visible: true,
			order: 0
		},
		isActive: true,
		currentComponentTime: 0,
		getResource: vi.fn((key: string) => resources.get(key)),
		setResource: vi.fn((key: string, value: unknown) => resources.set(key, value)),
		removeResource: vi.fn((key: string) => resources.delete(key))
	} as any;
};

describe('DeterministicMediaFrameHook', () => {
	let stateManager: any;
	let manager: any;
	let hook: DeterministicMediaFrameHook;
	let context: any;

	beforeEach(() => {
		stateManager = {
			environment: 'server',
			data: { settings: { fps: 30 } },
			currentTime: 0,
			width: 1920,
			height: 1080,
			markDirty: vi.fn()
		};

		manager = {
			config: { enabled: true, strict: false, diagnostics: false },
			isEnabled: vi.fn(() => true),
			resolveOverride: vi.fn(),
			commitCacheKey: vi.fn(() => false),
			clearCacheKey: vi.fn(() => false),
			releaseComponent: vi.fn(() => Promise.resolve()),
			getProvider: vi.fn(() => null)
		};

		hook = new DeterministicMediaFrameHook({
			stateManager,
			deterministicMediaManager: manager
		} as any);
		context = createContext();
	});

	it('marks scene dirty and sets pixiResource when cache key changes', async () => {
		const pixiResource = {};
		manager.resolveOverride.mockResolvedValue({ cacheKey: 'v1', pixiResource });
		manager.commitCacheKey.mockReturnValue(true);

		await hook.handle('update', context);

		expect(context.setResource).toHaveBeenCalledWith('pixiResource', pixiResource);
		expect(stateManager.markDirty).toHaveBeenCalledTimes(1);
		expect(manager.resolveOverride).toHaveBeenCalledWith({
			componentId: 'video-1',
			componentType: 'VIDEO',
			frameIndex: 0,
			fps: 30,
			width: 1920,
			height: 1080
		});
	});

	it('does not mark scene dirty when cache key is unchanged', async () => {
		manager.resolveOverride.mockResolvedValue({ cacheKey: 'v1', pixiResource: {} });
		manager.commitCacheKey.mockReturnValue(false);

		await hook.handle('update', context);

		expect(stateManager.markDirty).not.toHaveBeenCalled();
	});

	it('falls back without throwing when provider returns null and strict mode is disabled', async () => {
		manager.resolveOverride.mockResolvedValue(null);
		manager.clearCacheKey.mockReturnValue(false);
		manager.config.strict = false;

		await expect(hook.handle('update', context)).resolves.toBeUndefined();
		expect(context.removeResource).toHaveBeenCalledWith('pixiResource');
	});

	it('does not throw in strict mode when component is inactive and override is missing', async () => {
		context.isActive = false;
		manager.resolveOverride.mockResolvedValue(null);
		manager.clearCacheKey.mockReturnValue(true);
		manager.config.strict = true;
		manager.getProvider.mockReturnValue({ getFrame: vi.fn() });

		await expect(hook.handle('update', context)).resolves.toBeUndefined();
		expect(manager.resolveOverride).not.toHaveBeenCalled();
		expect(stateManager.markDirty).toHaveBeenCalledTimes(1);
	});

	it('throws DeterministicRenderError in strict mode when override is missing', async () => {
		manager.resolveOverride.mockResolvedValue(null);
		manager.clearCacheKey.mockReturnValue(false);
		manager.config.strict = true;
		manager.getProvider.mockReturnValue({ getFrame: vi.fn() });
		context.isActive = true;

		await expect(hook.handle('update', context)).rejects.toBeInstanceOf(DeterministicRenderError);
	});

	it('releases deterministic component resources on destroy', async () => {
		await expect(hook.handle('destroy', context)).resolves.toBeUndefined();
		expect(manager.releaseComponent).toHaveBeenCalledWith('video-1');
		expect(manager.releaseComponent).toHaveBeenCalledTimes(1);
		expect(context.removeResource).toHaveBeenCalledWith('pixiResource');
		expect(context.removeResource).toHaveBeenCalledWith('imageElement');
	});
});
