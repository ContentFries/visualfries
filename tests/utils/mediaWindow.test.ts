import { describe, expect, it } from 'vitest';

import {
	DEFAULT_MEDIA_PREROLL_SECONDS,
	STREAMING_MEDIA_PREROLL_SECONDS,
	getMediaPrerollSeconds,
	shouldPrepareMediaAtTime
} from '$lib/utils/mediaWindow.ts';

describe('mediaWindow', () => {
	it('uses a short default preroll for regular media files', () => {
		expect(
			getMediaPrerollSeconds({
				type: 'VIDEO',
				visible: true,
				timeline: { startAt: 10, endAt: 20 },
				source: { url: 'https://example.com/video.mp4' }
			} as any)
		).toBe(DEFAULT_MEDIA_PREROLL_SECONDS);
	});

	it('uses a larger preroll for HLS streams', () => {
		expect(
			getMediaPrerollSeconds({
				type: 'VIDEO',
				visible: true,
				timeline: { startAt: 10, endAt: 20 },
				source: { url: 'https://example.com/playlist.m3u8?token=1' }
			} as any)
		).toBe(STREAMING_MEDIA_PREROLL_SECONDS);
	});

	it('only prepares media when within the warm window', () => {
		const component = {
			type: 'VIDEO',
			visible: true,
			timeline: { startAt: 10, endAt: 20 },
			source: { url: 'https://example.com/video.mp4' }
		} as any;

		expect(shouldPrepareMediaAtTime(component, 8)).toBe(false);
		expect(shouldPrepareMediaAtTime(component, 9.5)).toBe(true);
		expect(shouldPrepareMediaAtTime(component, 20.1)).toBe(true);
		expect(shouldPrepareMediaAtTime(component, 20.5)).toBe(false);
	});
});
