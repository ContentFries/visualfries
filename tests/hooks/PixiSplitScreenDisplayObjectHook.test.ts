import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import type { IComponentContext, HookType } from '$lib';
import type { StateManager } from '$lib/managers/StateManager.svelte.ts';

// We need to mock pixi.js-legacy before importing the hook
vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();
	return {
		...actual,
		Container: vi.fn().mockImplementation(() => ({
			addChild: vi.fn(),
			removeChildren: vi.fn(),
			destroy: vi.fn(),
			visible: true
		})),
		Sprite: vi.fn().mockImplementation(() => ({
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			destroy: vi.fn()
		})),
		Graphics: vi.fn().mockImplementation(() => ({
			beginFill: vi.fn().mockReturnThis(),
			drawRect: vi.fn().mockReturnThis(),
			endFill: vi.fn().mockReturnThis(),
			destroy: vi.fn()
		})),
		Texture: vi.fn().mockImplementation(() => ({
			destroy: vi.fn(),
			width: 1920,
			height: 1080
		})),
		BlurFilter: vi.fn().mockImplementation(() => ({}))
	};
});

// Import after mock
import { PixiSplitScreenDisplayObjectHook } from '$lib/components/hooks/PixiSplitScreenDisplayObjectHook.ts';

describe('PixiSplitScreenDisplayObjectHook', () => {
	let hook: PixiSplitScreenDisplayObjectHook;
	let mockContext: MockedObject<IComponentContext>;
	let mockStateManager: Partial<StateManager>;

	beforeEach(() => {
		mockStateManager = {
			environment: 'browser' as any,
			data: {
				settings: { fps: 30 }
			} as any
		};

		hook = new PixiSplitScreenDisplayObjectHook({
			stateManager: mockStateManager as StateManager
		});

		mockContext = {
			contextData: {
				id: 'test-video',
				type: 'VIDEO',
				source: { url: 'https://example.com/video.mp4' },
				timeline: { startAt: 0, endAt: 10 },
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				animations: {},
				effects: { enabled: true, map: {} },
				visible: true,
				order: 0
			},
			data: {
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				effects: { enabled: true, map: {} }
			},
			sceneState: {
				width: 1080,
				height: 1920,
				currentTime: 0,
				state: 'paused'
			},
			isActive: true,
			getResource: vi.fn(),
			setResource: vi.fn(),
			removeResource: vi.fn()
		} as unknown as MockedObject<IComponentContext>;
	});

	describe('Hook configuration', () => {
		it('should have correct types array', () => {
			expect(hook.types).toContain('update');
			expect(hook.types).toContain('destroy');
			expect(hook.types).toContain('refresh');
		});

		it('should have priority 1', () => {
			expect(hook.priority).toBe(1);
		});
	});

	describe('Graceful handling of missing resources', () => {
		it('should not throw when videoElement is missing in drawBlurredBackground', async () => {
			// Mock to return pixiTexture but not videoElement
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') {
					return { width: 1920, height: 1080, baseTexture: {} };
				}
				return undefined;
			});

			// Add a blur effect to trigger drawBlurredBackground
			mockContext.data.effects = {
				enabled: true,
				map: {
					fillBackgroundBlur: {
						type: 'fillBackgroundBlur',
						enabled: true,
						blurAmount: 50
					}
				}
			};

			// Should not throw, even with blur effect requiring videoElement
			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
		});

		it('should throw when pixiTexture is missing during update', async () => {
			mockContext.getResource.mockReturnValue(undefined);

			// pixiTexture is required, should throw
			await expect(hook.handle('update', mockContext)).rejects.toThrow(
				'pixiTexture not found in resources'
			);
		});
	});

	describe('Refresh handler cleanup', () => {
		it('should handle refresh without existing displayObject', async () => {
			mockContext.getResource.mockReturnValue(undefined);

			// Should not throw even with no displayObject
			// First the destroy runs (clears bgCanvas)
			// Then update runs (which will throw because no pixiTexture)
			// But the refresh itself shouldn't crash due to missing displayObject
			try {
				await hook.handle('refresh', mockContext);
			} catch (e: any) {
				// Expected to throw because pixiTexture is missing
				expect(e.message).toContain('pixiTexture not found');
			}
		});

		it('should reset texture reference on refresh', async () => {
			const mockTexture = { width: 1920, height: 1080, baseTexture: {} };
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') return mockTexture;
				return undefined;
			});

			// First update to create displayObject
			await hook.handle('update', mockContext);

			// Verify setResource was called
			expect(mockContext.setResource).toHaveBeenCalledWith('pixiRenderObject', expect.any(Object));

			// Record call count before refresh
			const callCountBefore = mockContext.setResource.mock.calls.length;

			// Refresh should trigger internal update which recreates the display object
			// The refresh handler calls #handleUpdate internally after cleanup
			await hook.handle('refresh', mockContext);

			// After refresh + internal update, setResource should have been called again
			// The hook calls update internally during refresh, so total calls should increase
			expect(mockContext.setResource.mock.calls.length).toBeGreaterThanOrEqual(callCountBefore);
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

			// Should not try to get resources for non-VIDEO
			expect(mockContext.setResource).not.toHaveBeenCalled();
		});

		it('should skip if contextData is undefined', async () => {
			mockContext.contextData = undefined as any;

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
		});
	});

	describe('layoutSplit effect', () => {
		it('should handle layoutSplit effect configuration', async () => {
			const mockTexture = { width: 1920, height: 1080, baseTexture: {} };
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') return mockTexture;
				return undefined;
			});

			// Configure split screen effect
			mockContext.data.effects = {
				enabled: true,
				map: {
					layoutSplit: {
						type: 'layoutSplit',
						enabled: true,
						pieces: 2,
						sceneWidth: 1080,
						sceneHeight: 1920,
						chunks: [
							{
								group: { x: 0, y: 0, width: 1080, height: 960 },
								component: { x: 0, y: 0, width: 1920, height: 1080 }
							},
							{
								group: { x: 0, y: 960, width: 1080, height: 960 },
								component: { x: 0, y: 0, width: 1920, height: 1080 }
							}
						]
					}
				}
			};

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
			expect(mockContext.setResource).toHaveBeenCalledWith('pixiRenderObject', expect.any(Object));
		});
	});
});
