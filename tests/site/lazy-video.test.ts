import { describe, expect, it } from 'vitest';
import { settleForReducedMotion, startVideo, videoAction } from '../../src/site/lazy-video';

const state = (s: Partial<Parameters<typeof videoAction>[0]>) =>
	videoAction({ near: true, reduce: false, paused: true, held: false, ...s });

describe('videoAction', () => {
	it('plays a video that is near the viewport', () => {
		expect(state({})).toBe('play');
	});

	it('leaves a playing video alone while it stays near', () => {
		expect(state({ paused: false })).toBe('none');
	});

	it('pauses a playing video that left the viewport', () => {
		expect(state({ near: false, paused: false })).toBe('pause');
	});

	it('does nothing for a paused video far away, so it is never fetched', () => {
		expect(state({ near: false })).toBe('none');
	});

	it('never starts playback with reduced motion', () => {
		expect(state({ reduce: true })).toBe('none');
		expect(state({ near: false, reduce: true, paused: false })).toBe('pause');
	});

	it('leaves a video the visitor paused alone when it comes back into view', () => {
		expect(state({ held: true })).toBe('none');
	});
});

describe('startVideo', () => {
	it('shows the controls and reports false when the browser refuses to start playback', async () => {
		const video = { controls: false, play: () => Promise.reject(new Error('NotAllowedError')) };
		expect(await startVideo(video)).toBe(false);
		expect(video.controls).toBe(true);
	});

	it('reports true and leaves the controls as they are when playback starts', async () => {
		const video = { controls: false, play: () => Promise.resolve() };
		expect(await startVideo(video)).toBe(true);
		expect(video.controls).toBe(false);
	});
});

describe('settleForReducedMotion', () => {
	const video = (paused: boolean) => ({
		paused,
		controls: false,
		pause() {
			this.paused = true;
		}
	});

	it('pauses every playing video and gives all of them controls when motion is reduced', () => {
		const videos = [video(false), video(true)];
		settleForReducedMotion(videos, true);
		expect(videos.map((v) => v.paused)).toEqual([true, true]);
		expect(videos.map((v) => v.controls)).toEqual([true, true]);
	});

	it('touches nothing when motion is allowed again', () => {
		const videos = [video(false)];
		settleForReducedMotion(videos, false);
		expect(videos[0].paused).toBe(false);
		expect(videos[0].controls).toBe(false);
	});
});
