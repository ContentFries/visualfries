import { footageAt, programFootageAt, type FootageMap } from './footage-map.js';

/**
 * The decisions of the live player (`live-player.ts`, `live-footage.ts`), apart from the page:
 * the program clock, how a proxy video follows it, holds and the next source before a cut.
 */

/** Program seconds on a `performance.now()` timeline; the sound pulls it back when it wanders. */
export type LiveClock = {
	readonly playing: boolean;
	/** Program seconds at `perf`. */
	at(perf: number): number;
	play(perf: number): void;
	pause(perf: number): void;
	/** Sets the program time (paused or playing on from it). */
	set(t: number, perf: number): void;
};

export function createLiveClock(): LiveClock {
	let base = 0;
	let t0 = 0;
	let playing = false;
	const at = (perf: number) => (playing ? base + (perf - t0) / 1000 : base);
	return {
		get playing() {
			return playing;
		},
		at,
		play(perf) {
			if (playing) return;
			t0 = perf;
			playing = true;
		},
		pause(perf) {
			if (!playing) return;
			base = at(perf);
			playing = false;
		},
		set(t, perf) {
			base = t;
			t0 = perf;
		}
	};
}

/** The program frame shown at `t` seconds, inside the program. */
export const frameAt = (t: number, fps: number, frames: number) =>
	Math.max(0, Math.min(frames - 1, Math.floor(t * fps + 1e-6)));

/** How far the clock may wander from the sound before it is set back to it (seconds). */
export const AUDIO_SLACK = 0.04;

/**
 * Where the clock should jump to follow the sound, or null while they agree: the sound is the
 * master once it plays.
 */
export function audioCorrection(clock: number, sound: number, slack = AUDIO_SLACK): number | null {
	return Math.abs(clock - sound) > slack ? sound : null;
}

/** What a proxy video should do now to show what the clock wants. */
export type VideoStep =
	| { kind: 'none' }
	/** Jump to `time`; `play` too when it is paused and should run. */
	| { kind: 'seek'; time: number; play: boolean; resync: boolean }
	| { kind: 'play' }
	| { kind: 'rate'; rate: number }
	| { kind: 'pause'; seek: number | null };

export type VideoNow = {
	paused: boolean;
	seeking: boolean;
	currentTime: number;
	/**
	 * How far the presented frames run ahead of the clock (seconds, smoothed; see `presentedDrift`),
	 * or null without recent frames. Steers the rate better than `currentTime`, which runs ahead
	 * of what is on screen.
	 */
	drift: number | null;
};

/** What the scene wants from one video: `frame` of its source at program frame `programFrame`. */
export type VideoWant = { frame: number; programFrame: number; held: boolean };

/** Drift past which a playing video is seeked instead of sped up or slowed down (seconds). */
export const RESYNC = 0.25;
const RATE_SPAN = 0.1;

/**
 * Where a video should stand for `want` at clock `t`: on the middle of the frame paused or on a
 * held frame, between frames while it plays.
 */
export function wantedTime(want: VideoWant, t: number, fps: number, playing: boolean): number {
	if (!playing || want.held) return (want.frame + 0.5) / fps;
	return (want.frame + (t * fps - want.programFrame)) / fps;
}

/** What `settled` and `alignTo` read of a proxy video. */
export type VideoState = {
	seeking: boolean;
	readyState: number;
	currentTime: number;
	/** The video failed to load or decode. */
	failed: boolean;
};

/** Frames a video may be off the time wanted and still count as showing it, paused / playing. */
const SHOWN_SLACK = { paused: 0.6, playing: 1 };

/**
 * Whether a video shows what the clock wants at `t` (`want` null: nothing on screen wants it):
 * its frame decoded, not seeking, within a frame of the time wanted. `failed` once it cannot.
 */
export function proxySettled(
	video: VideoState,
	want: VideoWant | null,
	t: number,
	fps: number,
	playing: boolean
): 'ready' | 'wait' | 'failed' {
	if (video.failed) return 'failed';
	if (!want) return 'ready';
	if (video.seeking || video.readyState < 2) return 'wait';
	const target = wantedTime(want, t, fps, playing);
	const slack = playing && !want.held ? SHOWN_SLACK.playing : SHOWN_SLACK.paused;
	return Math.abs(video.currentTime - target) * fps <= slack ? 'ready' : 'wait';
}

/**
 * Where an explicit seek puts a video at once, or null when it is already there: playing too,
 * so the picture does not have to catch up by playing faster (see `followClock`).
 */
export function alignTo(
	video: Pick<VideoState, 'currentTime'>,
	want: VideoWant,
	t: number,
	fps: number,
	playing: boolean
): number | null {
	const target = wantedTime(want, t, fps, playing);
	return Math.abs(video.currentTime - target) * fps <= 0.5 ? null : target;
}

/**
 * Keeps a video on the program clock. Playing, it plays at a rate that pulls it towards where
 * it should be (0.9–1.1) and is seeked only when far off; paused, or on a held frame, it stands
 * on the middle of the frame wanted.
 */
export function followClock(
	video: VideoNow,
	want: VideoWant,
	t: number,
	fps: number,
	playing: boolean
): VideoStep {
	if (!playing || want.held) {
		const target = wantedTime(want, t, fps, false);
		const off = Math.abs(video.currentTime - target) > 0.4 / fps && !video.seeking;
		if (!video.paused) return { kind: 'pause', seek: off ? target : null };
		return off ? { kind: 'seek', time: target, play: false, resync: false } : { kind: 'none' };
	}
	// Where the source should be now, between frames too.
	const expected = wantedTime(want, t, fps, true);
	if (video.paused) {
		if (Math.abs(video.currentTime - expected) > 0.5 / fps)
			return { kind: 'seek', time: expected, play: true, resync: false };
		return { kind: 'play' };
	}
	const behind = video.currentTime - expected;
	if (Math.abs(behind) > RESYNC) return { kind: 'seek', time: expected, play: false, resync: true };
	const drift = video.drift ?? behind;
	if (Math.abs(drift) <= 0.5 / fps) return { kind: 'rate', rate: 1 };
	return { kind: 'rate', rate: Math.min(1 + RATE_SPAN, Math.max(1 - RATE_SPAN, 1 - drift * 2)) };
}

/**
 * How far one presented video frame runs ahead of the clock, in seconds: its media time against
 * where the source should be when it is on screen, from the middle of the frame (a frame on time
 * starts up to one frame before the clock reaches its end).
 */
export function presentedDrift(
	mediaTime: number,
	clockAtDisplay: number,
	sourceOffset: number,
	fps: number
): number {
	return mediaTime + 0.5 / fps - (clockAtDisplay + sourceOffset / fps);
}

/** Smooths drift samples: about the last eight frames count. */
export function smoothDrift(previous: number | null, sample: number, weight = 0.125): number {
	return previous === null ? sample : previous + (sample - previous) * weight;
}

/**
 * True when `source` holds its frame at program frame `f`: the next program frame shows the same
 * source frame (a cut with a hold, a source that ran out), so its video stands still.
 */
export function heldAt(map: FootageMap | null, source: string, f: number): boolean {
	if (!map) return false;
	const now = footageAt(map, f).find((v) => v.source === source);
	if (!now) return false;
	if (now.held) return true;
	const next = footageAt(map, f + 1).find((v) => v.source === source && v.owner === now.owner);
	return f + 1 < map.frames && !!next && next.frame === now.frame;
}

/** Frames ahead the player looks for the next source, to seek its video before the cut. */
export const LOOKAHEAD = 25;

/** The next other source the picture cuts to within `ahead` frames of `f`, and its first frame. */
export function nextSource(
	map: FootageMap | null,
	f: number,
	ahead = LOOKAHEAD
): { source: string; frame: number } | null {
	const now = map ? programFootageAt(map, f) : null;
	if (!map || !now) return null;
	for (let k = 1; k <= ahead && f + k < map.frames; k++) {
		const next = programFootageAt(map, f + k);
		if (next && next.source !== now.source) return { source: next.source, frame: next.frame };
	}
	return null;
}

/**
 * How the stage (`w`×`h`) sits in a host box: scaled to fit it whole, centred. A host without a
 * height takes the stage's aspect (`height` is then what the host should be).
 */
export function fitStage(hostW: number, hostH: number, w: number, h: number) {
	const scale = Math.max(0, hostH > 0 ? Math.min(hostW / w, hostH / h) : hostW / w);
	const height = hostH > 0 ? hostH : h * scale;
	return { scale, x: (hostW - w * scale) / 2, y: (height - h * scale) / 2, height };
}

/** Drift samples further apart than this (ms) start the smoothing over. */
export const DRIFT_GAP = 500;

/** A video's smoothed drift while its samples are recent (`sampled`, `now` in ms), else null. */
export const recentDrift = (drift: number | null, sampled: number, now: number) =>
	now - sampled < DRIFT_GAP ? drift : null;

/**
 * The drift one presented frame measures (see `presentedDrift`), or null when it measures
 * nothing: paused, a held frame, mid-seek, or half a second off or more (a frame from before a
 * cut or a seek).
 */
export function frameDrift(
	want: VideoWant | null,
	playing: boolean,
	seeking: boolean,
	mediaTime: number,
	clockAtDisplay: number,
	fps: number
): number | null {
	if (!playing || !want || want.held || seeking) return null;
	const sample = presentedDrift(mediaTime, clockAtDisplay, want.frame - want.programFrame, fps);
	return Math.abs(sample) < 0.5 ? sample : null;
}

/** True when a video now plays another stretch of its source: its drift so far says nothing. */
export const offsetMoved = (before: VideoWant | null, now: VideoWant | null) =>
	!!before && !!now && now.frame - now.programFrame !== before.frame - before.programFrame;

/** True when a picture already shows this video frame (`seq`) of `video` with this look. */
export const drawnAlready = <V>(
	drawn: { seq: number; video: V | null; look: string },
	seq: number,
	video: V,
	look: string
) => drawn.video === video && drawn.seq === seq && drawn.look === look;

/**
 * How a plate canvas draws a proxy frame (`size` the picture, `packed` beside its matte) shown
 * `shownHeight` CSS px high: the room's dim as CSS filters (the saturate and slope of the scene's
 * SVG filter), its blur by drawing small and letting the page scale it up, with a 1 px blur at
 * that size against the blocks. `sourceWidth` is the part of the video frame to draw.
 */
export function plateDraw(
	size: [number, number],
	shownHeight: string,
	look: { dim: number; blur: number },
	videoWidth: number,
	packed: boolean
) {
	const [sw, sh] = size;
	const sigma = (look.blur * sh) / (parseFloat(shownHeight) || sh);
	const scale = sigma > 1 ? Math.max(1 / 8, Math.min(1, 1.5 / sigma)) : 1;
	const filter = [
		...(look.dim > 0 ? [`saturate(${1 - 0.9 * look.dim})`, `brightness(${1 - look.dim})`] : []),
		...(scale < 1 ? ['blur(1px)'] : [])
	];
	return {
		width: Math.max(1, Math.round(sw * scale)),
		height: Math.max(1, Math.round(sh * scale)),
		filter: filter.join(' ') || 'none',
		sourceWidth: packed ? videoWidth / 2 : videoWidth
	};
}

/**
 * How a block's footage frame comes out of a proxy (`source` the footage, `packed` with its
 * matte): the picture, or the subject drawn through the matte. The proxies have no clean plates.
 */
export function pictureCut(
	source: string,
	layer: 'plate' | 'subject' | 'clean',
	packed: boolean
): 'plate' | 'subject' {
	if (layer === 'clean') throw new Error('The live preview has no clean plates.');
	if (layer === 'subject' && !packed)
		throw new Error(`Footage "${source}" has no matte in the live preview.`);
	return layer;
}

/**
 * What the clock does about the sound: runs `free` without it (none, paused, ended, refused),
 * `hold`s at the sound's time while it buffers (so the picture cannot run on to the end without
 * it), and `follow`s it while it plays (`jump`: where to set the clock, see `audioCorrection`).
 */
export type SoundStep =
	| { kind: 'free' }
	| { kind: 'hold'; time: number }
	| { kind: 'follow'; jump: number | null; sound: number };

export function soundStep(
	playing: boolean,
	sound: { paused: boolean; readyState: number; currentTime: number } | null,
	clock: number
): SoundStep {
	if (!playing || !sound || sound.paused) return { kind: 'free' };
	if (sound.readyState < 3) return { kind: 'hold', time: sound.currentTime };
	return {
		kind: 'follow',
		jump: audioCorrection(clock, sound.currentTime),
		sound: sound.currentTime
	};
}

/**
 * Tokens for starting playback, which waits for the sound: `begin` takes one, `cancel` (pause,
 * destroy) makes every token taken so far stale, so a start that comes back late does nothing.
 */
export function createStarts() {
	let n = 0;
	return {
		begin: () => ++n,
		cancel() {
			n++;
		},
		current: (token: number) => token === n
	};
}

/**
 * Waits polled once per animation frame (`schedule`, `cancel`), that `end` settles at once:
 * after it nothing polls any more and every wait, pending or new, resolves. A check returns
 * true when done, an Error to reject the wait with, or false to look again; a wait still
 * pending after `timeout` ms resolves anyway (a seek reports, it does not hang).
 */
export function createWaits(
	schedule: (fn: () => void) => number,
	cancel: (id: number) => void,
	now: () => number,
	timeout = 5000
) {
	const pending = new Map<number, () => void>();
	let ended = false;
	let next = 0;
	return {
		get pending() {
			return pending.size;
		},
		until(check: () => boolean | Error): Promise<void> {
			const key = next++;
			const start = now();
			return new Promise<void>((resolve, reject) => {
				let id = 0;
				const done = () => {
					pending.delete(key);
					resolve();
				};
				const step = () => {
					if (ended) return done();
					const r = check();
					if (r instanceof Error) {
						pending.delete(key);
						return reject(r);
					}
					if (r || now() - start >= timeout) return done();
					id = schedule(step);
					pending.set(key, () => {
						cancel(id);
						done();
					});
				};
				step();
			});
		},
		end() {
			ended = true;
			for (const settle of [...pending.values()]) settle();
		}
	};
}

/** Program frames passed over between the frame shown before (`shown`, -1: none) and `f`. */
export const skippedFrames = (playing: boolean, shown: number, f: number) =>
	playing && shown >= 0 && f > shown ? f - shown - 1 : 0;
