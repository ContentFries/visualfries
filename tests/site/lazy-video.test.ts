import { describe, expect, it } from 'vitest';
import { startVideo, videoAction } from '../../src/site/lazy-video';

describe('videoAction', () => {
	it('plays a video that is near the viewport', () => {
		expect(videoAction({ near: true, reduce: false, paused: true })).toBe('play');
	});

	it('leaves a playing video alone while it stays near', () => {
		expect(videoAction({ near: true, reduce: false, paused: false })).toBe('none');
	});

	it('pauses a playing video that left the viewport', () => {
		expect(videoAction({ near: false, reduce: false, paused: false })).toBe('pause');
	});

	it('does nothing for a paused video far away, so it is never fetched', () => {
		expect(videoAction({ near: false, reduce: false, paused: true })).toBe('none');
	});

	it('never starts playback with reduced motion', () => {
		expect(videoAction({ near: true, reduce: true, paused: true })).toBe('none');
		expect(videoAction({ near: false, reduce: true, paused: false })).toBe('pause');
	});
});

describe('startVideo', () => {
	it('shows the controls when the browser refuses to start playback', async () => {
		const video = { controls: false, play: () => Promise.reject(new Error('NotAllowedError')) };
		await startVideo(video);
		expect(video.controls).toBe(true);
	});

	it('leaves the controls off when playback starts', async () => {
		const video = { controls: false, play: () => Promise.resolve() };
		await startVideo(video);
		expect(video.controls).toBe(false);
	});
});
