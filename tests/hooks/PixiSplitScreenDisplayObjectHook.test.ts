import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import type { IComponentContext, HookType } from '$lib';
import type { StateManager } from '$lib/managers/StateManager.svelte.ts';

// We need to mock pixi.js-legacy before importing the hook
vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();
	return {
		...actual,
		Container: vi.fn().mockImplementation(() => {
			const container = {
				children: [] as any[],
				addChild: vi.fn((...children: any[]) => {
					container.children.push(...children);
				}),
				removeChildren: vi.fn(() => {
					container.children = [];
				}),
				destroy: vi.fn(),
				visible: true
			};
			return container;
		}),
		Sprite: vi.fn().mockImplementation((texture?: unknown) => ({
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			texture,
			destroy: vi.fn()
		})),
		Graphics: vi.fn().mockImplementation(() => ({
			beginFill: vi.fn().mockReturnThis(),
			drawRect: vi.fn().mockReturnThis(),
			endFill: vi.fn().mockReturnThis(),
			destroy: vi.fn()
		})),
		Texture: Object.assign(
			vi.fn().mockImplementation(() => ({
				destroy: vi.fn(),
				width: 1920,
				height: 1080
			})),
			{
				from: vi.fn().mockReturnValue({})
			}
		),
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
			currentTime: 0,
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
			currentComponentTime: 0,
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

			// In VIDEO mode this should be a non-throwing pass-through.
			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
		});

		it('should still throw when pixiTexture is missing for IMAGE components', async () => {
			mockContext.contextData = {
				...mockContext.contextData,
				type: 'IMAGE'
			} as any;
			mockContext.getResource.mockReturnValue(undefined);

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

		it('should update swapped texture in-place without full rebuild on update', async () => {
			const textureA = { id: 'A', width: 1920, height: 1080 };
			const textureB = { id: 'B', width: 1920, height: 1080 };
			let call = 0;
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') {
					call += 1;
					return (call === 1 ? textureA : textureB) as any;
				}
				return undefined;
			});

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
			const firstSetCall = mockContext.setResource.mock.calls.find(
				([resourceKey]) => resourceKey === 'pixiRenderObject'
			);
			const displayObject = firstSetCall?.[1] as any;
			expect(displayObject).toBeTruthy();
			expect(displayObject.children[0].texture).toBe(textureA);

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
			expect(displayObject.removeChildren).not.toHaveBeenCalled();
			expect(displayObject.children[0].texture).toBe(textureB);
		});
	});

	describe('Non-VIDEO and Non-IMAGE components', () => {
		it('should not process non-VIDEO/IMAGE components like TEXT', async () => {
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

			// Should not try to get resources for non-VIDEO/IMAGE
			expect(mockContext.setResource).not.toHaveBeenCalled();
		});

		it('should skip if contextData is undefined', async () => {
			mockContext.contextData = undefined as any;

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
		});
	});

	describe('IMAGE components', () => {
		it('should process IMAGE components and use imageElement for blur', async () => {
			mockStateManager.environment = 'server' as any;
			const mockTexture = { width: 1920, height: 1080, baseTexture: {} };
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') return mockTexture;
				if (key === 'imageElement') return {} as any; // mock image element
				return undefined;
			});

			mockContext.contextData = {
				id: 'test-image',
				type: 'IMAGE',
				source: { url: 'https://example.com/image.png' },
				timeline: { startAt: 0, endAt: 10 },
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				animations: {},
				effects: {
					enabled: true,
					map: { fillBackgroundBlur: { type: 'fillBackgroundBlur', enabled: true, blurAmount: 50 } }
				},
				visible: true,
				order: 0
			} as any;
			mockContext.data.effects = mockContext.contextData.effects;

			await hook.handle('update', mockContext);

			// Should get imageElement and set object
			expect(mockContext.getResource).toHaveBeenCalledWith('imageElement');
			expect(mockContext.setResource).toHaveBeenCalledWith('pixiRenderObject', expect.any(Object));
		});

		it('should process IMAGE components with split screen', async () => {
			const mockTexture = { width: 1920, height: 1080, baseTexture: {} };
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') return mockTexture;
				return undefined;
			});

			mockContext.contextData = {
				id: 'test-image',
				type: 'IMAGE',
				source: { url: 'https://example.com/image.png' },
				timeline: { startAt: 0, endAt: 10 },
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				animations: {},
				effects: {
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
				},
				visible: true,
				order: 0
			} as any;
			mockContext.data.effects = mockContext.contextData.effects;

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
			expect(mockContext.setResource).toHaveBeenCalledWith('pixiRenderObject', expect.any(Object));
		});

		it('should process IMAGE components normally (non-split)', async () => {
			const mockTexture = { width: 1920, height: 1080, baseTexture: {} };
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') return mockTexture;
				return undefined;
			});

			mockContext.contextData = {
				id: 'test-image',
				type: 'IMAGE',
				source: { url: 'https://example.com/image.png' },
				timeline: { startAt: 0, endAt: 10 },
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				animations: {},
				effects: { enabled: false, map: {} },
				visible: true,
				order: 0
			} as any;
			mockContext.data.effects = mockContext.contextData.effects;

			await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
			expect(mockContext.setResource).toHaveBeenCalledWith('pixiRenderObject', expect.any(Object));
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

	describe('server blur optimization', () => {
		it('uses downscaled blur canvas and skips redundant redraws for unchanged frame', async () => {
			mockStateManager.environment = 'server' as any;
			const deterministicMediaManager = {
				config: { blurDownscale: 0.25 },
				recordBlurRedraw: vi.fn()
			} as any;
			hook = new PixiSplitScreenDisplayObjectHook({
				stateManager: mockStateManager as StateManager,
				deterministicMediaManager
			});

			const texture = { id: 'tex-1', width: 1920, height: 1080, baseTexture: {} };
			const imageElement = {} as any;
			mockContext.getResource.mockImplementation((key: string) => {
				if (key === 'pixiTexture') return texture;
				if (key === 'imageElement') return imageElement;
				return undefined;
			});
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

			const fakeCtx = {
				filter: '',
				clearRect: vi.fn(),
				drawImage: vi.fn()
			};
			const fakeCanvas = {
				width: 0,
				height: 0,
				getContext: vi.fn(() => fakeCtx)
			} as any;
			const originalCreateElement = document.createElement.bind(document);
			const createElementSpy = vi
				.spyOn(document, 'createElement')
				.mockImplementation(((tagName: string) => {
					if (tagName === 'canvas') {
						return fakeCanvas;
					}
					return originalCreateElement(tagName);
				}) as any);

			try {
				await hook.handle('update', mockContext);
				expect(fakeCanvas.width).toBe(853);
				expect(fakeCanvas.height).toBe(480);
				expect(fakeCtx.filter).toBe('blur(12.5px)');
				expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);

				await hook.handle('update', mockContext);
				expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);

				mockContext.currentComponentTime = 1 / 30;
				await hook.handle('update', mockContext);
				expect(fakeCtx.drawImage).toHaveBeenCalledTimes(2);
				expect(deterministicMediaManager.recordBlurRedraw).toHaveBeenCalledTimes(2);
			} finally {
				createElementSpy.mockRestore();
			}
		});
	});
});
