import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaHook } from '$lib/components/hooks/MediaHook.ts';

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

const createContext = (currentTime: number) =>
	({
		type: 'VIDEO',
		isActive: currentTime >= 10 && currentTime <= 20,
		contextData: {
			id: 'video-1',
			type: 'VIDEO',
			visible: true,
			muted: false,
			volume: 1,
			timeline: { startAt: 10, endAt: 20 },
			source: { url: 'https://example.com/video.mp4', startAt: 10 }
		},
		currentComponentTime: Math.max(0, currentTime - 10) + 10,
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

describe('MediaHook', () => {
	let mediaElement: HTMLVideoElement;
	let mediaManager: any;
	let stateManager: any;
	let hook: MediaHook;

	beforeEach(() => {
		mediaElement = createMediaElement();
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
		hook = new MediaHook({
			mediaManager,
			stateManager
		});
	});

	it('does not eagerly attach media when the clip is cold', async () => {
		const context = createContext(0);

		await hook.handle('setup', context);
		await hook.handle('update', context);

		expect(mediaManager.getMediaElement).not.toHaveBeenCalled();
		expect(context.setResource).not.toHaveBeenCalled();
	});

	it('attaches shared media during preroll even before activation', async () => {
		const context = createContext(9.5);

		await hook.handle('update', context);

		expect(mediaManager.getMediaElement).toHaveBeenCalledTimes(1);
		expect(context.setResource).toHaveBeenCalledWith('videoElement', mediaElement);
	});

	it('releases media after the warm window has passed', async () => {
		const warmContext = createContext(9.5);
		await hook.handle('update', warmContext);

		const coldContext = createContext(21);
		await hook.handle('update', coldContext);

		expect(mediaManager.releaseMediaElement).toHaveBeenCalledWith(
			'https://example.com/video.mp4',
			'video'
		);
		expect(coldContext.removeResource).toHaveBeenCalledWith('videoElement');
	});

	it('claims the controller immediately when active media has no owner', async () => {
		const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
		mediaElement.paused = true;
		(mediaElement as any).requestVideoFrameCallback = vi.fn((callback: Function) => {
			callback(0, { mediaTime: mediaElement.currentTime });
			return 1;
		});
		mediaManager.getMediaController.mockReturnValue(undefined);

		const context = createContext(10.5);
		context.sceneState.state = 'playing';

		await hook.handle('update', context);
		nowSpy.mockRestore();

		expect(mediaManager.setMediaController).toHaveBeenCalledWith(
			'https://example.com/video.mp4',
			'video-1',
			'video'
		);
		expect(mediaElement.play).toHaveBeenCalledTimes(1);
	});

	it('refreshes the pixi texture after a paused seek', async () => {
		const baseTextureUpdate = vi.fn();
		(mediaElement as any).requestVideoFrameCallback = vi.fn((callback: Function) => {
			callback(0, { mediaTime: mediaElement.currentTime });
			return 1;
		});
		mediaManager.getMediaController.mockReturnValue(undefined);

		const context = createContext(10.5);
		context.getResource.mockImplementation((name: string) =>
			name === 'pixiTexture' ? { baseTexture: { update: baseTextureUpdate } } : undefined
		);

		await hook.handle('update', context);

		expect(baseTextureUpdate).toHaveBeenCalledTimes(1);
	});

	it('re-renders when a paused seek completes after the optimistic timeout', async () => {
		vi.useFakeTimers();
		try {
			const baseTextureUpdate = vi.fn();
			(mediaElement as any).requestVideoFrameCallback = vi.fn();
			let seekedHandler: (() => void) | undefined;
			mediaElement.addEventListener = vi.fn((event: string, handler: () => void) => {
				if (event === 'seeked') {
					seekedHandler = handler;
				}
			});
			mediaElement.removeEventListener = vi.fn();
			mediaManager.getMediaController.mockReturnValue(undefined);

			const context = createContext(10.5);
			context.getResource.mockImplementation((name: string) =>
				name === 'pixiTexture' ? { baseTexture: { update: baseTextureUpdate } } : undefined
			);

			const updatePromise = hook.handle('update', context);
			await vi.advanceTimersByTimeAsync(121);
			await updatePromise;

			expect(context.eventManager.emit).not.toHaveBeenCalledWith('rerender');

			seekedHandler?.();

			expect(baseTextureUpdate).toHaveBeenCalledTimes(2);
			expect(context.eventManager.emit).toHaveBeenCalledWith('rerender');
		} finally {
			vi.useRealTimers();
		}
	});
});
