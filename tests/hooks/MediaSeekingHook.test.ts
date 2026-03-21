import { describe, expect, it, vi } from 'vitest';

import { MediaSeekingHook } from '$lib/components/hooks/MediaSeekingHook.ts';

const createMediaElement = () =>
	({
		currentTime: 0,
		readyState: 4,
		paused: true,
		src: 'https://example.com/video.mp4',
		error: null,
		onseeking: null,
		onseeked: null,
		onwaiting: null,
		oncanplay: null,
		onerror: null
	}) as unknown as HTMLVideoElement;

const createContext = (media: HTMLVideoElement | undefined, isActive = true) =>
	({
		type: 'VIDEO',
		isActive,
		currentComponentTime: 0,
		contextData: {
			id: 'video-1',
			type: 'VIDEO'
		},
		getResource: vi.fn((name: string) => (name === 'videoElement' ? media : undefined))
	}) as any;

describe('MediaSeekingHook', () => {
	it('attaches media handlers only once per active element', async () => {
		const media = createMediaElement();
		const hook = new MediaSeekingHook({
			stateManager: {
				environment: 'client',
				data: { settings: { fps: 30 } },
				state: 'paused',
				addLoadingComponent: vi.fn(),
				removeLoadingComponent: vi.fn()
			} as any
		});

		const context = createContext(media, true);

		await hook.handle('update', context);
		const firstSeekingHandler = media.onseeking;
		const firstCanPlayHandler = media.oncanplay;

		await hook.handle('update', context);

		expect(media.onseeking).toBe(firstSeekingHandler);
		expect(media.oncanplay).toBe(firstCanPlayHandler);
	});

	it('clears old handlers when the active media element changes', async () => {
		const firstMedia = createMediaElement();
		const secondMedia = createMediaElement();
		const hook = new MediaSeekingHook({
			stateManager: {
				environment: 'client',
				data: { settings: { fps: 30 } },
				state: 'paused',
				addLoadingComponent: vi.fn(),
				removeLoadingComponent: vi.fn()
			} as any
		});

		await hook.handle('update', createContext(firstMedia, true));
		const firstSeekingHandler = firstMedia.onseeking;

		await hook.handle('update', createContext(secondMedia, true));

		expect(firstMedia.onseeking).toBeNull();
		expect(firstMedia.oncanplay).toBeNull();
		expect(secondMedia.onseeking).not.toBeNull();
		expect(secondMedia.onseeking).not.toBe(firstSeekingHandler);
	});
});
