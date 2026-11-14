import { describe, expect, it } from 'vitest';
import {
	pauseTracker,
	settleForReducedMotion,
	startVideo,
	videoAction
} from '../../src/site/lazy-video';

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
	const named = (name: string) => Object.assign(new Error(name), { name });

	it('shows the controls and reports "refused" when the browser refuses autoplay', async () => {
		const video = { controls: false, play: () => Promise.reject(named('NotAllowedError')) };
		expect(await startVideo(video)).toBe('refused');
		expect(video.controls).toBe(true);
	});

	it('reports "aborted" and changes nothing when our own pause interrupted the start', async () => {
		const video = { controls: false, play: () => Promise.reject(named('AbortError')) };
		expect(await startVideo(video)).toBe('aborted');
		expect(video.controls).toBe(false);
	});

	it('reports "started" and leaves the controls as they are when playback starts', async () => {
		const video = { controls: false, play: () => Promise.resolve() };
		expect(await startVideo(video)).toBe('started');
		expect(video.controls).toBe(false);
	});
});

describe('pauseTracker', () => {
	const video = (paused: boolean) => ({
		paused,
		pause() {
			this.paused = true;
		}
	});

	it('does not hold a video that was paused because it left the viewport', () => {
		const track = pauseTracker();
		const v = video(false);
		track.leave(v);
		expect(v.paused).toBe(true);
		track.paused(v);
		expect(track.held(v)).toBe(false);
	});

	it('does not hold a video whose start we interrupted by scrolling away', () => {
		// play() is pending: the video already counts as playing, our pause rejects the promise.
		const track = pauseTracker();
		const v = video(false);
		track.leave(v);
		track.paused(v);
		expect(track.held(v)).toBe(false);
	});

	it('holds a video the visitor paused, until it plays again', () => {
		const track = pauseTracker();
		const v = video(false);
		v.pause();
		track.paused(v);
		expect(track.held(v)).toBe(true);
		track.played(v);
		expect(track.held(v)).toBe(false);
	});

	it("counts the next pause as the visitor's when leaving found the video already paused", () => {
		const track = pauseTracker();
		const v = video(true);
		track.leave(v);
		v.paused = false;
		v.pause();
		track.paused(v);
		expect(track.held(v)).toBe(true);
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
