import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
	fromMock: vi.fn()
}));

vi.mock('pixi.js-legacy', () => ({
	Texture: {
		from: fromMock
	}
}));

import { PixiTextureHook } from '$lib/components/hooks/PixiTextureHook.ts';

const createContext = (componentType: 'IMAGE' | 'VIDEO' = 'IMAGE', pixiResource?: unknown) => {
	const resources = new Map<string, unknown>();
	if (pixiResource) {
		resources.set('pixiResource', pixiResource);
	}

	return {
		contextData: {
			id: crypto.randomUUID(),
			type: componentType
		},
		getResource: vi.fn((key: string) => resources.get(key)),
		setResource: vi.fn((key: string, value: unknown) => resources.set(key, value)),
		removeResource: vi.fn((key: string) => resources.delete(key))
	} as any;
};

describe('PixiTextureHook', () => {
	beforeEach(() => {
		fromMock.mockReset();
	});

	it('does not destroy a shared texture until all hook owners release it', async () => {
		const resource = { src: 'shared-resource' };
		const sharedTexture = { destroy: vi.fn() };
		fromMock.mockReturnValue(sharedTexture);

		const hookA = new PixiTextureHook();
		const hookB = new PixiTextureHook();
		const contextA = createContext('IMAGE', resource);
		const contextB = createContext('IMAGE', resource);

		await hookA.handle('update', contextA);
		await hookB.handle('update', contextB);

		await hookA.handle('destroy', contextA);
		expect(sharedTexture.destroy).not.toHaveBeenCalled();

		await hookB.handle('destroy', contextB);
		expect(sharedTexture.destroy).toHaveBeenCalledTimes(1);
		expect(sharedTexture.destroy).toHaveBeenCalledWith(true);
	});
});
