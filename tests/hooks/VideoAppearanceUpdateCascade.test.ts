import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaHook } from '$lib/components/hooks/MediaHook.ts';
import type { IComponentHook, HookType, IComponentContext, ComponentProps } from '$lib';

// ---- helpers ----
const createMediaElement = () =>
	({
		paused: true,
		muted: true,
		volume: 1,
		currentTime: 0,
		readyState: 4,
		play: vi.fn().mockResolvedValue(undefined),
		pause: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}) as unknown as HTMLVideoElement;

const createContext = (currentTime: number, isActive: boolean) =>
	({
		type: 'VIDEO',
		isActive,
		contextData: {
			id: 'video-1',
			type: 'VIDEO',
			visible: true,
			muted: false,
			volume: 1,
			timeline: { startAt: 10, endAt: 20 },
			source: { url: 'https://example.com/video.mp4', startAt: 0 }
		},
		currentComponentTime: Math.max(0, currentTime - 10),
		sceneState: {
			currentTime,
			state: 'paused'
		},
		eventManager: {
			emit: vi.fn()
		},
		getResource: vi.fn(),
		setResource: vi.fn(),
		removeResource: vi.fn()
	}) as any;

describe('Video appearance update cascade', () => {
	describe('MediaHook hook type configuration', () => {
		let hook: MediaHook;

		beforeEach(() => {
			hook = new MediaHook({
				mediaManager: {} as any,
				stateManager: {} as any
			});
		});

		it('handles refresh:content but NOT generic refresh', () => {
			expect(hook.types).toContain('refresh:content');
			expect(hook.types).not.toContain('refresh');
		});

		it('handles update explicitly', () => {
			expect(hook.types).toContain('update');
		});

		it('does not fall through to update logic for unknown hook types', async () => {
			const mediaManager = {
				getMediaElement: vi.fn().mockResolvedValue(createMediaElement()),
				releaseMediaElement: vi.fn(),
				getMediaController: vi.fn().mockReturnValue(undefined),
				setMediaController: vi.fn()
			};
			const stateManager = {
				environment: 'client',
				data: { settings: { fps: 30 } },
				isLoadingComponent: vi.fn().mockReturnValue(false),
				removeLoadingComponent: vi.fn()
			};
			const safeHook = new MediaHook({ mediaManager, stateManager });

			// Set up media (setup doesn't seek, so no timeout risk)
			const warmCtx = createContext(15, true);
			await safeHook.handle('setup', warmCtx);

			// Call with 'refresh' type on a cold context — if there's a fallthrough
			// to #handleUpdate, it would try to release media (shouldPrepareMedia=false)
			const coldCtx = createContext(0, false);
			await safeHook.handle('refresh' as HookType, coldCtx);

			// No fallthrough means no release attempt
			expect(mediaManager.releaseMediaElement).not.toHaveBeenCalled();
		});
	});

	describe('Component.refresh() does not run update hooks', () => {
		it('calls only refresh-type hooks, not update hooks', async () => {
			const handleCalls: string[] = [];

			const refreshHook: IComponentHook = {
				types: ['refresh'] as HookType[],
				priority: 1,
				async handle(type: HookType) {
					handleCalls.push(`refresh-hook:${type}`);
				}
			};

			const updateHook: IComponentHook = {
				types: ['update'] as HookType[],
				priority: 2,
				async handle(type: HookType) {
					handleCalls.push(`update-hook:${type}`);
				}
			};

			vi.mock('$lib/components/ComponentContext.svelte.ts', () => ({
				ComponentContext: vi.fn().mockImplementation(() => ({
					setComponentProps: vi.fn(),
					getResource: vi.fn(),
					runHooks: vi.fn(async (hooks: IComponentHook[], type: HookType) => {
						for (const hook of hooks) {
							await hook.handle(type, {} as IComponentContext);
						}
					})
				}))
			}));

			const { Component } = await import('$lib/components/Component.svelte.ts');
			const { ComponentContext } = await import('$lib/components/ComponentContext.svelte.ts');

			const mockProps = {
				id: 'test',
				type: 'VIDEO',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0,
				checksum: 'test',
				duration: 10,
				setStart: vi.fn(),
				setEnd: vi.fn(),
				getData: vi.fn(),
				update: vi.fn(),
				updateText: vi.fn(),
				updateAppearance: vi.fn(),
				setVisible: vi.fn(),
				setOrder: vi.fn(),
				setRefreshCallback: vi.fn()
			} as unknown as ComponentProps;

			const context = new ComponentContext({} as any);
			const component = new Component({
				componentState: mockProps,
				componentContext: context
			});

			component.addHook(refreshHook);
			component.addHook(updateHook);

			await component.refresh();

			// Only the refresh hook should have been called
			expect(handleCalls).toEqual(['refresh-hook:refresh']);
			expect(handleCalls).not.toContain('update-hook:update');
		});
	});

	describe('Full cascade: media lifecycle with warm window guards', () => {
		let mediaElement: HTMLVideoElement;
		let mediaManager: any;
		let stateManager: any;
		let mediaHook: MediaHook;
		let resources: Map<string, any>;

		beforeEach(() => {
			mediaElement = createMediaElement();
			(mediaElement as any).requestVideoFrameCallback = vi.fn((cb: Function) => {
				cb(0, { mediaTime: 0 });
				return 1;
			});

			mediaManager = {
				getMediaElement: vi.fn().mockResolvedValue(mediaElement),
				releaseMediaElement: vi.fn(),
				getMediaController: vi.fn().mockReturnValue(undefined),
				setMediaController: vi.fn()
			};
			stateManager = {
				environment: 'client',
				data: { settings: { fps: 30 } },
				isLoadingComponent: vi.fn().mockReturnValue(false),
				removeLoadingComponent: vi.fn()
			};
			mediaHook = new MediaHook({ mediaManager, stateManager });
			resources = new Map();
		});

		const makeContext = (currentTime: number, isActive: boolean) => {
			const ctx = createContext(currentTime, isActive);
			ctx.getResource = vi.fn((key: string) => resources.get(key));
			ctx.setResource = vi.fn((key: string, value: any) => resources.set(key, value));
			ctx.removeResource = vi.fn((key: string) => resources.delete(key));
			return ctx;
		};

		it('update outside warm window releases media (correct render-cycle behavior)', async () => {
			// Set up in warm window
			const warmCtx = makeContext(15, true);
			await mediaHook.handle('setup', warmCtx);
			await mediaHook.handle('update', warmCtx);
			expect(resources.has('videoElement')).toBe(true);

			// Render cycle calls update outside warm window — should release
			const coldCtx = makeContext(0, false);
			await mediaHook.handle('update', coldCtx);

			expect(mediaManager.releaseMediaElement).toHaveBeenCalled();
			expect(resources.has('videoElement')).toBe(false);
		});

		it('media is re-acquired when seeking back into warm window', async () => {
			// Set up and go cold
			const warmCtx = makeContext(15, true);
			await mediaHook.handle('setup', warmCtx);
			await mediaHook.handle('update', warmCtx);

			const coldCtx = makeContext(0, false);
			await mediaHook.handle('update', coldCtx);
			expect(resources.has('videoElement')).toBe(false);

			// Come back into warm window
			const freshMedia = createMediaElement();
			(freshMedia as any).requestVideoFrameCallback = vi.fn((cb: Function) => {
				cb(0, { mediaTime: 0 });
				return 1;
			});
			mediaManager.getMediaElement.mockResolvedValue(freshMedia);

			const warmAgainCtx = makeContext(15, true);
			await mediaHook.handle('update', warmAgainCtx);

			expect(mediaManager.getMediaElement).toHaveBeenCalledTimes(2);
			expect(resources.has('videoElement')).toBe(true);
		});

		it('generic refresh does NOT trigger media release (no fallthrough)', async () => {
			// Set up in warm window
			const warmCtx = makeContext(15, true);
			await mediaHook.handle('setup', warmCtx);
			await mediaHook.handle('update', warmCtx);
			expect(resources.has('videoElement')).toBe(true);

			// Call with generic 'refresh' — should be no-op
			const coldCtx = makeContext(0, false);
			await mediaHook.handle('refresh' as HookType, coldCtx);

			expect(mediaManager.releaseMediaElement).not.toHaveBeenCalled();
			expect(resources.has('videoElement')).toBe(true);
		});
	});
});
