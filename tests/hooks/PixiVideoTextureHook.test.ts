import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import type { IComponentContext, HookType } from '$lib';

// We need to mock pixi.js-legacy before importing the hook
vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();
	return {
		...actual,
		VideoResource: vi.fn().mockImplementation(() => ({})),
		BaseTexture: vi.fn().mockImplementation(() => ({})),
		Texture: vi.fn().mockImplementation(() => ({
			destroy: vi.fn()
		}))
	};
});

// Import after mock
import { PixiVideoTextureHook } from '$lib/components/hooks/PixiVideoTextureHook.ts';

describe('PixiVideoTextureHook', () => {
	let hook: PixiVideoTextureHook;
	let mockContext: MockedObject<IComponentContext>;

	beforeEach(() => {
		hook = new PixiVideoTextureHook();

		mockContext = {
			contextData: {
				id: 'test-video',
				type: 'VIDEO',
				source: { url: 'https://example.com/video.mp4' },
				timeline: { startAt: 0, endAt: 10 },
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				animations: {},
				effects: {},
				visible: true,
				order: 0
			},
			getResource: vi.fn(),
			setResource: vi.fn(),
			removeResource: vi.fn()
		} as unknown as MockedObject<IComponentContext>;
	});

	describe('Hook configuration', () => {
		it('should have correct types array including update, destroy, and refresh:content', () => {
			expect(hook.types).toContain('update');
			expect(hook.types).toContain('destroy');
			expect(hook.types).toContain('refresh:content');
			// Note: 'refresh' is NOT included - timeline changes don't need texture recreation
			expect(hook.types).not.toContain('refresh');
		});

		it('should have priority 1', () => {
			expect(hook.priority).toBe(1);
		});
	});

	describe('Graceful handling of missing videoElement', () => {
		it('should return early when videoElement is not in resources', async () => {
			// Mock getResource to return undefined
			mockContext.getResource.mockReturnValue(undefined);

			// Should not throw
			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();

			// Should not try to set pixiTexture
			expect(mockContext.setResource).not.toHaveBeenCalled();
		});

		it('should not throw error when videoElement is undefined during update', async () => {
			mockContext.getResource.mockReturnValue(undefined);

			// Previously this would throw "videoElement not found in resources"
			await expect(hook.handle('update', mockContext)).resolves.toBeUndefined();
		});

		it('should create texture when videoElement is available', async () => {
			const mockVideoElement = document.createElement('video');
			mockContext.getResource.mockReturnValue(mockVideoElement);

			await hook.handle('update', mockContext);

			// Should set the texture in resources
			expect(mockContext.setResource).toHaveBeenCalledWith('pixiTexture', expect.any(Object));
		});

		it('should not recreate texture if already exists but re-assert it', async () => {
			const mockVideoElement = document.createElement('video');
			mockContext.getResource.mockReturnValue(mockVideoElement);

			// First call creates texture
			await hook.handle('update', mockContext);
			expect(mockContext.setResource).toHaveBeenCalledTimes(1);

			// Second call should not recreate but should re-assert the same texture
			await hook.handle('update', mockContext);
			expect(mockContext.setResource).toHaveBeenCalledTimes(2);
			
			// Verify it's the same texture being set
			const firstCallTexture = mockContext.setResource.mock.calls[0][1];
			const secondCallTexture = mockContext.setResource.mock.calls[1][1];
			expect(firstCallTexture).toBe(secondCallTexture);
		});
	});

	describe('Destroy handler', () => {
		it('should clean up texture on destroy', async () => {
			const mockVideoElement = document.createElement('video');
			mockContext.getResource.mockReturnValue(mockVideoElement);

			// First create texture
			await hook.handle('update', mockContext);

			// Then destroy
			await hook.handle('destroy', mockContext);

			// Should remove resource
			expect(mockContext.removeResource).toHaveBeenCalledWith('pixiTexture');
		});

		it('should handle destroy when no texture exists', async () => {
			mockContext.getResource.mockReturnValue(undefined);

			// Should not throw when destroying without a texture
			await expect(hook.handle('destroy', mockContext)).resolves.not.toThrow();
		});
	});

	describe('Refresh:content handler (source change)', () => {
		it('should clean up and allow new texture creation on refresh:content', async () => {
			const mockVideoElement = document.createElement('video');
			mockContext.getResource.mockReturnValue(mockVideoElement);

			// Create initial texture
			await hook.handle('update', mockContext);
			expect(mockContext.setResource).toHaveBeenCalledTimes(1);

			// refresh:content should destroy old texture (for source changes)
			await hook.handle('refresh:content', mockContext);
			expect(mockContext.removeResource).toHaveBeenCalledWith('pixiTexture');

			// After refresh:content, next update should be able to create new texture
			mockContext.setResource.mockClear();
			await hook.handle('update', mockContext);
			expect(mockContext.setResource).toHaveBeenCalledWith('pixiTexture', expect.any(Object));
		});

		it('should handle refresh:content when no texture exists', async () => {
			mockContext.getResource.mockReturnValue(undefined);

			// Should not throw when refreshing without a texture
			await expect(hook.handle('refresh:content', mockContext)).resolves.not.toThrow();
		});

		it('should NOT destroy texture on plain refresh (timeline position change)', async () => {
			const mockVideoElement = document.createElement('video');
			mockContext.getResource.mockReturnValue(mockVideoElement);

			// Create initial texture
			await hook.handle('update', mockContext);
			expect(mockContext.setResource).toHaveBeenCalledTimes(1);

			// Plain 'refresh' should NOT destroy texture (not in types array)
			await hook.handle('refresh', mockContext);
			// removeResource should NOT have been called
			expect(mockContext.removeResource).not.toHaveBeenCalled();
		});
	});

	describe('Non-VIDEO components', () => {
		it('should not process non-VIDEO components', async () => {
			mockContext.contextData = {
				id: 'test-text',
				type: 'TEXT',
				text: 'Hello',
				timeline: { startAt: 0, endAt: 10 },
				appearance: { x: 0, y: 0, width: 100, height: 50 },
				animations: {},
				effects: {},
				visible: true,
				order: 0
			} as any;

			await hook.handle('update', mockContext);

			expect(mockContext.getResource).not.toHaveBeenCalled();
			expect(mockContext.setResource).not.toHaveBeenCalled();
		});

		it('should skip if contextData is undefined', async () => {
			mockContext.contextData = undefined as any;

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
		});
	});
});
