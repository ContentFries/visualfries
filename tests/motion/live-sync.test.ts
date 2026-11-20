// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { FootageMap } from '../../src/lib/motion/footage-map.js';
import {
	audioCorrection,
	createLiveClock,
	DRIFT_GAP,
	drawnAlready,
	fitStage,
	followClock,
	frameAt,
	frameDrift,
	heldAt,
	nextSource,
	offsetMoved,
	plateDraw,
	presentedDrift,
	recentDrift,
	RESYNC,
	skippedFrames,
	smoothDrift,
	alignTo,
	createStarts,
	createWaits,
	proxySettled,
	soundStep,
	wantedTime
} from '../../src/lib/motion/live-sync.js';

const fps = 25;
// mont 0–49 from its frame 0; talk 50–99 from its frame 75; mont is 40 frames long.
const map: FootageMap = {
	frames: 100,
	totals: { mont: 40, talk: 500 },
	spans: [
		{ owner: 'c1', kind: 'cut', source: 'mont', startFrame: 0, frames: 50, srcIn: 0 },
		{ owner: 'c2', kind: 'cut', source: 'talk', startFrame: 50, frames: 50, srcIn: 75, last: 110 }
	],
	windows: []
};

describe('live clock', () => {
	it('runs on the performance timeline while playing and stands still paused', () => {
		const clock = createLiveClock();
		expect(clock.at(1000)).toBe(0);
		clock.play(1000);
		expect(clock.at(3000)).toBe(2);
		clock.pause(3500);
		expect(clock.playing).toBe(false);
		expect(clock.at(9000)).toBe(2.5);
		clock.set(10, 9000);
		clock.play(9000);
		clock.play(9500);
		expect(clock.at(10000)).toBe(11);
	});

	it('maps time to a program frame inside the program', () => {
		expect(frameAt(0, fps, 100)).toBe(0);
		expect(frameAt(0.04, fps, 100)).toBe(1);
		expect(frameAt(-1, fps, 100)).toBe(0);
		expect(frameAt(99, fps, 100)).toBe(99);
	});

	it('follows the sound once it wanders past the slack', () => {
		expect(audioCorrection(10, 10.03)).toBeNull();
		expect(audioCorrection(10, 10.05)).toBe(10.05);
		expect(audioCorrection(10, 9.9)).toBe(9.9);
	});
});

describe('followClock', () => {
	const want = { frame: 75, programFrame: 50, held: false };
	const at = (t: number, extra: object = {}) => ({
		paused: false,
		seeking: false,
		currentTime: t,
		drift: null,
		...extra
	});

	it('stands paused on the middle of the wanted frame', () => {
		expect(followClock(at(3.02, { paused: true }), want, 2, fps, false)).toEqual({ kind: 'none' });
		expect(followClock(at(1, { paused: true }), want, 2, fps, false)).toEqual({
			kind: 'seek',
			time: 3.02,
			play: false,
			resync: false
		});
		expect(followClock(at(1), want, 2, fps, false)).toEqual({ kind: 'pause', seek: 3.02 });
		expect(followClock(at(1, { seeking: true }), want, 2, fps, false)).toEqual({
			kind: 'pause',
			seek: null
		});
	});

	it('holds a held frame while playing', () => {
		expect(followClock(at(3.02), { ...want, held: true }, 2, fps, true)).toEqual({
			kind: 'pause',
			seek: null
		});
	});

	it('starts a paused video where the source should be', () => {
		expect(followClock(at(3, { paused: true }), want, 2, fps, true)).toEqual({ kind: 'play' });
		expect(followClock(at(5, { paused: true }), want, 2, fps, true)).toEqual({
			kind: 'seek',
			time: 3,
			play: true,
			resync: false
		});
	});

	it('steers the rate by the presented drift, and seeks when far off', () => {
		expect(followClock(at(3), want, 2, fps, true)).toEqual({ kind: 'rate', rate: 1 });
		expect(followClock(at(3, { drift: 0.04 }), want, 2, fps, true)).toEqual({
			kind: 'rate',
			rate: 0.92
		});
		expect(followClock(at(3, { drift: -0.5 }), want, 2, fps, true)).toEqual({
			kind: 'rate',
			rate: 1.1
		});
		expect(followClock(at(3 + RESYNC + 0.01), want, 2, fps, true)).toMatchObject({
			kind: 'seek',
			resync: true
		});
	});
});

describe('drift', () => {
	it('measures a presented frame against the clock from the middle of the frame', () => {
		expect(presentedDrift(3, 2.02, 25, fps)).toBeCloseTo(0);
		expect(presentedDrift(3.04, 2.02, 25, fps)).toBeCloseTo(0.04);
	});

	it('smooths samples', () => {
		expect(smoothDrift(null, 0.08)).toBe(0.08);
		expect(smoothDrift(0, 0.08)).toBeCloseTo(0.01);
	});
});

describe('holds and the next source', () => {
	it('holds a source that ran out, and the last frame of a cut with a hold', () => {
		expect(heldAt(map, 'mont', 10)).toBe(false);
		expect(heldAt(map, 'mont', 39)).toBe(true);
		expect(heldAt(map, 'mont', 45)).toBe(true);
		expect(heldAt(map, 'talk', 60)).toBe(false);
		expect(heldAt(map, 'talk', 85)).toBe(true);
		expect(heldAt(map, 'talk', 10)).toBe(false);
		expect(heldAt(null, 'talk', 10)).toBe(false);
	});

	it('finds the source the picture cuts to within the look-ahead', () => {
		expect(nextSource(map, 10)).toBeNull();
		expect(nextSource(map, 30)).toEqual({ source: 'talk', frame: 75 });
		expect(nextSource(map, 30, 10)).toBeNull();
		expect(nextSource(map, 80)).toBeNull();
		expect(nextSource(null, 30)).toBeNull();
	});
});

describe('fitStage', () => {
	it('fits the stage whole and centres it', () => {
		expect(fitStage(960, 960, 1920, 1080)).toEqual({ scale: 0.5, x: 0, y: 210, height: 960 });
		expect(fitStage(1000, 270, 1920, 1080)).toEqual({ scale: 0.25, x: 260, y: 0, height: 270 });
	});

	it('gives a host with no height the stage’s aspect', () => {
		expect(fitStage(960, 0, 1920, 1080)).toEqual({ scale: 0.5, x: 0, y: 0, height: 540 });
	});
});

describe('drift samples', () => {
	const want = { frame: 75, programFrame: 50, held: false };

	it('measures a presented frame while playing', () => {
		expect(frameDrift(want, true, false, 3, 2.02, fps)).toBeCloseTo(0);
		expect(frameDrift(want, true, false, 3.04, 2.02, fps)).toBeCloseTo(0.04);
	});

	it('measures nothing paused, held, seeking, or half a second off', () => {
		expect(frameDrift(want, false, false, 3, 2.02, fps)).toBeNull();
		expect(frameDrift(null, true, false, 3, 2.02, fps)).toBeNull();
		expect(frameDrift({ ...want, held: true }, true, false, 3, 2.02, fps)).toBeNull();
		expect(frameDrift(want, true, true, 3, 2.02, fps)).toBeNull();
		expect(frameDrift(want, true, false, 3.6, 2.02, fps)).toBeNull();
	});

	it('keeps a drift only while its samples are recent', () => {
		expect(recentDrift(0.02, 1000, 1000 + DRIFT_GAP - 1)).toBe(0.02);
		expect(recentDrift(0.02, 1000, 1000 + DRIFT_GAP)).toBeNull();
		expect(recentDrift(null, 1000, 1000)).toBeNull();
	});

	it('sees a video move to another stretch of its source', () => {
		const next = { frame: 76, programFrame: 51, held: false };
		expect(offsetMoved(want, next)).toBe(false);
		expect(offsetMoved(want, { ...next, frame: 200 })).toBe(true);
		expect(offsetMoved(null, next)).toBe(false);
		expect(offsetMoved(want, null)).toBe(false);
	});
});

describe('drawing', () => {
	it('draws a picture again only for another frame, video or look', () => {
		const video = {};
		const drawn = { seq: 4, video, look: 'a' };
		expect(drawnAlready(drawn, 4, video, 'a')).toBe(true);
		expect(drawnAlready(drawn, 5, video, 'a')).toBe(false);
		expect(drawnAlready(drawn, 4, {}, 'a')).toBe(false);
		expect(drawnAlready(drawn, 4, video, 'b')).toBe(false);
		expect(drawnAlready({ seq: 4, video: null, look: 'a' }, 4, video, 'a')).toBe(false);
	});

	it('draws a plain plate at its size, a packed one from its left half', () => {
		expect(plateDraw([960, 540], '540px', { dim: 0, blur: 0 }, 960, false)).toEqual({
			width: 960,
			height: 540,
			filter: 'none',
			sourceWidth: 960
		});
		expect(plateDraw([960, 540], '540px', { dim: 0, blur: 0 }, 1920, true).sourceWidth).toBe(960);
	});

	it('dims with CSS filters and blurs by drawing small', () => {
		const dimmed = plateDraw([960, 540], '540px', { dim: 0.5, blur: 0 }, 960, false);
		expect(dimmed.filter).toBe('saturate(0.55) brightness(0.5)');
		const blurred = plateDraw([960, 540], '540px', { dim: 0, blur: 6 }, 960, false);
		expect(blurred).toMatchObject({ width: 240, height: 135, filter: 'blur(1px)' });
		// Shown at twice the proxy's height, the same blur is half as many proxy pixels.
		expect(plateDraw([960, 540], '1080px', { dim: 0, blur: 6 }, 960, false).width).toBe(480);
		expect(plateDraw([960, 540], '540px', { dim: 0, blur: 1000 }, 960, false).width).toBe(120);
		expect(plateDraw([960, 540], '', { dim: 0, blur: 1 }, 960, false).width).toBe(960);
	});
});

describe('the player clock', () => {
	it('follows the sound while it plays, waits for it while it buffers, runs free without it', () => {
		const sound = (over = {}) => ({ paused: false, readyState: 4, currentTime: 2, ...over });
		expect(soundStep(true, sound(), 2.01)).toEqual({ kind: 'follow', jump: null, sound: 2 });
		expect(soundStep(true, sound(), 2.3)).toEqual({ kind: 'follow', jump: 2, sound: 2 });
		// Buffering: the clock holds at the sound, so it cannot run on to the end without it.
		expect(soundStep(true, sound({ readyState: 2 }), 2.3)).toEqual({ kind: 'hold', time: 2 });
		expect(soundStep(false, sound(), 2.3)).toEqual({ kind: 'free' });
		expect(soundStep(true, null, 2.3)).toEqual({ kind: 'free' });
		expect(soundStep(true, sound({ paused: true }), 2.3)).toEqual({ kind: 'free' });
	});

	it('makes a start that comes back after a pause stale', () => {
		const starts = createStarts();
		const first = starts.begin();
		expect(starts.current(first)).toBe(true);
		starts.cancel();
		expect(starts.current(first)).toBe(false);
		const second = starts.begin();
		expect(starts.current(second)).toBe(true);
		// A second play while the first waits: only the newest start counts.
		expect(starts.current(first)).toBe(false);
		expect(starts.current(starts.begin())).toBe(true);
		expect(starts.current(second)).toBe(false);
	});

	it('counts the frames passed over while playing', () => {
		expect(skippedFrames(true, 10, 13)).toBe(2);
		expect(skippedFrames(true, 10, 11)).toBe(0);
		expect(skippedFrames(true, -1, 13)).toBe(0);
		expect(skippedFrames(false, 10, 13)).toBe(0);
		expect(skippedFrames(true, 13, 10)).toBe(0);
	});
});

describe('explicit seeks', () => {
	const want = { frame: 100, programFrame: 50, held: false };

	it('knows where a video should stand, paused and playing', () => {
		expect(wantedTime(want, 2, fps, false)).toBeCloseTo(100.5 / fps);
		expect(wantedTime({ ...want, held: true }, 2.2, fps, true)).toBeCloseTo(100.5 / fps);
		// Playing 0.2 s past the cut: 5 frames on.
		expect(wantedTime(want, 2.2, fps, true)).toBeCloseTo(105 / fps);
	});

	it('jumps a playing video instead of letting it catch up', () => {
		// The clock jumped 0.2 s on; the video is where it was (under RESYNC: tick would only speed up).
		expect(alignTo({ currentTime: 100 / fps }, want, 2.2, fps, true)).toBeCloseTo(105 / fps);
		expect(alignTo({ currentTime: 105.2 / fps }, want, 2.2, fps, true)).toBeNull();
		expect(alignTo({ currentTime: 100.5 / fps }, want, 2, fps, false)).toBeNull();
		expect(alignTo({ currentTime: 90 / fps }, want, 2, fps, false)).toBeCloseTo(100.5 / fps);
	});

	it('settles only once the video shows the frame wanted', () => {
		const video = (over = {}) => ({
			seeking: false,
			readyState: 4,
			currentTime: 105 / fps,
			failed: false,
			...over
		});
		expect(proxySettled(video(), want, 2.2, fps, true)).toBe('ready');
		// Still behind after the seek, though not seeking and decoded: not there yet.
		expect(proxySettled(video({ currentTime: 100 / fps }), want, 2.2, fps, true)).toBe('wait');
		expect(proxySettled(video({ seeking: true }), want, 2.2, fps, true)).toBe('wait');
		expect(proxySettled(video({ readyState: 1 }), want, 2.2, fps, true)).toBe('wait');
		expect(proxySettled(video({ currentTime: 100.5 / fps }), want, 2, fps, false)).toBe('ready');
		expect(proxySettled(video({ currentTime: 102 / fps }), want, 2, fps, false)).toBe('wait');
		expect(proxySettled(video({ failed: true }), want, 2, fps, false)).toBe('failed');
		expect(proxySettled(video({ readyState: 0 }), null, 2, fps, false)).toBe('ready');
	});
});

describe('waits', () => {
	function frames() {
		let queue = new Map<number, () => void>();
		let id = 0;
		let now = 0;
		return {
			schedule: (fn: () => void) => (queue.set(++id, fn), id),
			cancel: (n: number) => void queue.delete(n),
			now: () => now,
			run(ms = 16) {
				now += ms;
				const due = queue;
				queue = new Map();
				for (const fn of due.values()) fn();
			},
			get queued() {
				return queue.size;
			}
		};
	}

	it('polls once per frame until the check is done', async () => {
		const f = frames();
		const waits = createWaits(f.schedule, f.cancel, f.now);
		let ready = false;
		let done = false;
		void waits.until(() => ready).then(() => (done = true));
		f.run();
		await Promise.resolve();
		expect(done).toBe(false);
		expect(waits.pending).toBe(1);
		ready = true;
		f.run();
		await Promise.resolve();
		expect(done).toBe(true);
		expect(waits.pending).toBe(0);
		expect(f.queued).toBe(0);
	});

	it('rejects with the error a check gives (a proxy that failed to load)', async () => {
		const f = frames();
		const waits = createWaits(f.schedule, f.cancel, f.now);
		await expect(waits.until(() => new Error('broken'))).rejects.toThrow('broken');
		expect(waits.pending).toBe(0);
	});

	it('settles every wait and stops polling once ended (destroy)', async () => {
		const f = frames();
		const waits = createWaits(f.schedule, f.cancel, f.now);
		const pending = Promise.all([waits.until(() => false), waits.until(() => false)]);
		f.run();
		waits.end();
		await pending;
		expect(f.queued).toBe(0);
		expect(waits.pending).toBe(0);
		await waits.until(() => false);
		expect(f.queued).toBe(0);
	});

	it('gives up after the timeout instead of hanging', async () => {
		const f = frames();
		const waits = createWaits(f.schedule, f.cancel, f.now, 100);
		let done = false;
		void waits.until(() => false).then(() => (done = true));
		for (let i = 0; i < 5; i++) f.run(16);
		await Promise.resolve();
		expect(done).toBe(false);
		f.run(50);
		await Promise.resolve();
		expect(done).toBe(true);
	});
});
