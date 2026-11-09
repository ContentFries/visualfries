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

	it('cancels pending paused seek listeners when media is released', async () => {
		mediaElement.addEventListener = vi.fn();
		mediaElement.removeEventListener = vi.fn();
		mediaManager.getMediaController.mockReturnValue(undefined);

		const warmContext = createContext(10.5);
		delete (mediaElement as any).requestVideoFrameCallback;
		let resolved = false;
		const updatePromise = hook.handle('update', warmContext);
		void updatePromise.then(() => {
			resolved = true;
		});

		await Promise.resolve();
		expect(resolved).toBe(false);

		const coldContext = createContext(25);
		await hook.handle('update', coldContext);
		await updatePromise;

		expect(resolved).toBe(true);
		expect(mediaManager.releaseMediaElement).toHaveBeenCalledWith(
			'https://example.com/video.mp4',
			'video'
		);
	});
	describe('handleUpdate branches', () => {
		beforeEach(() => {
			(mediaElement as any).requestVideoFrameCallback = vi.fn((callback: Function) => {
				callback(0, { mediaTime: mediaElement.currentTime });
				return 1;
			});
		});

		it('pauses and hands the controller back when the clip is inactive but warm', async () => {
			(mediaElement as any).paused = false;
			mediaManager.getMediaController.mockReturnValue('video-1');

			await hook.handle('update', createContext(9.5));

			expect(mediaElement.pause).toHaveBeenCalledTimes(1);
			expect(mediaManager.setMediaController).toHaveBeenCalledWith(
				'https://example.com/video.mp4',
				undefined,
				'video'
			);
		});

		it('leaves seeking to another hook on the server', async () => {
			stateManager.environment = 'server';
			const context = createContext(10.5);
			context.sceneState.state = 'playing';

			await hook.handle('update', context);

			expect(mediaManager.setMediaController).not.toHaveBeenCalled();
			expect(mediaElement.play).not.toHaveBeenCalled();
		});

		it('does not take over media that another component controls', async () => {
			mediaManager.getMediaController.mockReturnValue('someone-else');
			const context = createContext(10.5);
			context.sceneState.state = 'playing';

			await hook.handle('update', context);

			expect(mediaManager.setMediaController).not.toHaveBeenCalled();
		});

		it('lets the controlling clip set the sound of a shared element when clips update together', async () => {
			// Two clips play one shared element; the controller (b) is not muted and loud, the
			// other (a) is muted and quiet. Updates run concurrently: the controller's sound stays.
			const other = new MediaHook({ mediaManager, stateManager });
			mediaManager.getMediaController.mockReturnValue('b');
			const at = (id: string, muted: boolean, volume: number) => {
				const context = createContext(10.5);
				context.contextData.id = id;
				context.contextData.muted = muted;
				context.contextData.volume = volume;
				context.sceneState.state = 'playing';
				return context;
			};
			const a = at('a', true, 0.2);
			const b = at('b', false, 0.8);
			await hook.handle('setup', a);
			await other.handle('setup', b);
			await Promise.all([hook.handle('update', a), other.handle('update', b)]);
			expect(mediaElement.muted).toBe(false);
			expect(mediaElement.volume).toBe(0.8);
		});

		it('keeps the sound of the clip that updates last when one clip takes over released media', async () => {
			// Clip a (muted, quiet) waits under another controller, then the media is released and
			// both clips update one turn apart: b (audible, loud) updates last and its sound stays.
			let owner: string | undefined = 'someone-else';
			mediaManager.getMediaController.mockImplementation(() => owner);
			mediaManager.setMediaController.mockImplementation((_u: string, id: string | undefined) => {
				owner = id;
			});
			const other = new MediaHook({ mediaManager, stateManager });
			const at = (id: string, muted: boolean, volume: number, state: string) => {
				const context = createContext(10.5);
				context.contextData.id = id;
				context.contextData.muted = muted;
				context.contextData.volume = volume;
				context.sceneState.state = state;
				return context;
			};
			await hook.handle('setup', at('a', true, 0.2, 'paused'));
			await other.handle('setup', at('b', false, 0.8, 'paused'));
			await hook.handle('update', at('a', true, 0.2, 'paused'));
			owner = undefined;
			const first = hook.handle('update', at('a', true, 0.2, 'playing'));
			await Promise.resolve();
			const second = other.handle('update', at('b', false, 0.8, 'playing'));
			await Promise.all([first, second]);
			expect(mediaElement.muted).toBe(false);
			expect(mediaElement.volume).toBe(0.8);
		});

		it('restores audio state when taking over an unowned element', async () => {
			mediaManager.getMediaController.mockReturnValue(undefined);
			mediaElement.muted = true;
			mediaElement.volume = 0.2;
			const context = createContext(10.5);
			context.contextData.volume = 0.6;

			await hook.handle('update', context);

			expect(mediaElement.muted).toBe(false);
			expect(mediaElement.volume).toBe(0.6);
		});

		it('keeps the element paused while a loading component has no data yet', async () => {
			mediaManager.getMediaController.mockReturnValue('video-1');
			stateManager.isLoadingComponent.mockReturnValue(true);
			(mediaElement as any).readyState = 1;
			(mediaElement as any).paused = false;
			const context = createContext(10.5);
			context.sceneState.state = 'playing';

			await hook.handle('update', context);

			expect(mediaElement.pause).toHaveBeenCalledTimes(1);
			expect(stateManager.removeLoadingComponent).not.toHaveBeenCalled();
		});

		it('clears the loading flag once the element has data', async () => {
			mediaManager.getMediaController.mockReturnValue('video-1');
			stateManager.isLoadingComponent.mockReturnValue(true);
			const context = createContext(10.5);
			context.sceneState.state = 'playing';

			await hook.handle('update', context);

			expect(stateManager.removeLoadingComponent).toHaveBeenCalledWith('video-1');
			expect(mediaElement.play).toHaveBeenCalledTimes(1);
		});

		it('mirrors the component mute and volume onto the element', async () => {
			mediaManager.getMediaController.mockReturnValue('video-1');
			mediaElement.muted = false;
			mediaElement.volume = 1;
			const context = createContext(10.5);
			context.contextData.muted = true;
			context.contextData.volume = 0.4;

			await hook.handle('update', context);

			expect(mediaElement.muted).toBe(true);
			expect(mediaElement.volume).toBe(0.4);
		});

		it('pauses and seeks instead of playing when the scene is paused', async () => {
			mediaManager.getMediaController.mockReturnValue('video-1');
			(mediaElement as any).paused = false;
			mediaElement.currentTime = 50;
			const context = createContext(10.5);

			await hook.handle('update', context);

			expect(mediaElement.pause).toHaveBeenCalledTimes(1);
			expect(mediaElement.play).not.toHaveBeenCalled();
			expect(mediaElement.currentTime).not.toBe(50);
		});

		it('does not restart an element that is already playing', async () => {
			mediaManager.getMediaController.mockReturnValue('video-1');
			(mediaElement as any).paused = false;
			mediaElement.currentTime = 0.5;
			const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
			const context = createContext(10.5);
			context.sceneState.state = 'playing';

			await hook.handle('update', context);
			nowSpy.mockRestore();

			expect(mediaElement.play).not.toHaveBeenCalled();
		});

		it('seeks when playback drifts away from the timeline', async () => {
			mediaManager.getMediaController.mockReturnValue('video-1');
			(mediaElement as any).paused = false;
			mediaElement.currentTime = 80;
			const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1_000_000);
			const context = createContext(10.5);
			context.sceneState.state = 'playing';

			await hook.handle('update', context);
			nowSpy.mockRestore();

			expect(mediaElement.currentTime).not.toBe(80);
		});

		it('retries the update after a failure', async () => {
			vi.useFakeTimers();
			try {
				mediaManager.getMediaController.mockReturnValue('video-1');
				(mediaElement as any).paused = false;
				(mediaElement.pause as any).mockImplementationOnce(() => {
					throw new Error('boom');
				});
				const context = createContext(10.5);

				const update = hook.handle('update', context);
				await vi.advanceTimersByTimeAsync(150);
				await update;

				expect(mediaElement.pause).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
