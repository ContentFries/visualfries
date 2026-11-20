import { type FootageMap } from './footage-map.js';
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
export declare function createLiveClock(): LiveClock;
/** The program frame shown at `t` seconds, inside the program. */
export declare const frameAt: (t: number, fps: number, frames: number) => number;
/** How far the clock may wander from the sound before it is set back to it (seconds). */
export declare const AUDIO_SLACK = 0.04;
/**
 * Where the clock should jump to follow the sound, or null while they agree: the sound is the
 * master once it plays.
 */
export declare function audioCorrection(clock: number, sound: number, slack?: number): number | null;
/** What a proxy video should do now to show what the clock wants. */
export type VideoStep = {
    kind: 'none';
}
/** Jump to `time`; `play` too when it is paused and should run. */
 | {
    kind: 'seek';
    time: number;
    play: boolean;
    resync: boolean;
} | {
    kind: 'play';
} | {
    kind: 'rate';
    rate: number;
} | {
    kind: 'pause';
    seek: number | null;
};
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
export type VideoWant = {
    frame: number;
    programFrame: number;
    held: boolean;
};
/** Drift past which a playing video is seeked instead of sped up or slowed down (seconds). */
export declare const RESYNC = 0.25;
/**
 * Where a video should stand for `want` at clock `t`: on the middle of the frame paused or on a
 * held frame, between frames while it plays.
 */
export declare function wantedTime(want: VideoWant, t: number, fps: number, playing: boolean): number;
/** What `settled` and `alignTo` read of a proxy video. */
export type VideoState = {
    seeking: boolean;
    readyState: number;
    currentTime: number;
    /** The video failed to load or decode. */
    failed: boolean;
};
/**
 * Whether a video shows what the clock wants at `t` (`want` null: nothing on screen wants it):
 * its frame decoded, not seeking, within a frame of the time wanted. `failed` once it cannot.
 */
export declare function proxySettled(video: VideoState, want: VideoWant | null, t: number, fps: number, playing: boolean): 'ready' | 'wait' | 'failed';
/**
 * Where an explicit seek puts a video at once, or null when it is already there: playing too,
 * so the picture does not have to catch up by playing faster (see `followClock`).
 */
export declare function alignTo(video: Pick<VideoState, 'currentTime'>, want: VideoWant, t: number, fps: number, playing: boolean): number | null;
/**
 * Keeps a video on the program clock. Playing, it plays at a rate that pulls it towards where
 * it should be (0.9–1.1) and is seeked only when far off; paused, or on a held frame, it stands
 * on the middle of the frame wanted.
 */
export declare function followClock(video: VideoNow, want: VideoWant, t: number, fps: number, playing: boolean): VideoStep;
/**
 * How far one presented video frame runs ahead of the clock, in seconds: its media time against
 * where the source should be when it is on screen, from the middle of the frame (a frame on time
 * starts up to one frame before the clock reaches its end).
 */
export declare function presentedDrift(mediaTime: number, clockAtDisplay: number, sourceOffset: number, fps: number): number;
/** Smooths drift samples: about the last eight frames count. */
export declare function smoothDrift(previous: number | null, sample: number, weight?: number): number;
/**
 * True when `source` holds its frame at program frame `f`: the next program frame shows the same
 * source frame (a cut with a hold, a source that ran out), so its video stands still.
 */
export declare function heldAt(map: FootageMap | null, source: string, f: number): boolean;
/** Frames ahead the player looks for the next source, to seek its video before the cut. */
export declare const LOOKAHEAD = 25;
/** The next other source the picture cuts to within `ahead` frames of `f`, and its first frame. */
export declare function nextSource(map: FootageMap | null, f: number, ahead?: number): {
    source: string;
    frame: number;
} | null;
/**
 * How the stage (`w`×`h`) sits in a host box: scaled to fit it whole, centred. A host without a
 * height takes the stage's aspect (`height` is then what the host should be).
 */
export declare function fitStage(hostW: number, hostH: number, w: number, h: number): {
    scale: number;
    x: number;
    y: number;
    height: number;
};
/** Drift samples further apart than this (ms) start the smoothing over. */
export declare const DRIFT_GAP = 500;
/** A video's smoothed drift while its samples are recent (`sampled`, `now` in ms), else null. */
export declare const recentDrift: (drift: number | null, sampled: number, now: number) => number | null;
/**
 * The drift one presented frame measures (see `presentedDrift`), or null when it measures
 * nothing: paused, a held frame, mid-seek, or half a second off or more (a frame from before a
 * cut or a seek).
 */
export declare function frameDrift(want: VideoWant | null, playing: boolean, seeking: boolean, mediaTime: number, clockAtDisplay: number, fps: number): number | null;
/** True when a video now plays another stretch of its source: its drift so far says nothing. */
export declare const offsetMoved: (before: VideoWant | null, now: VideoWant | null) => boolean;
/** True when a picture already shows this video frame (`seq`) of `video` with this look. */
export declare const drawnAlready: <V>(drawn: {
    seq: number;
    video: V | null;
    look: string;
}, seq: number, video: V, look: string) => boolean;
/**
 * How a plate canvas draws a proxy frame (`size` the picture, `packed` beside its matte) shown
 * `shownHeight` CSS px high: the room's dim as CSS filters (the saturate and slope of the scene's
 * SVG filter), its blur by drawing small and letting the page scale it up, with a 1 px blur at
 * that size against the blocks. `sourceWidth` is the part of the video frame to draw.
 */
export declare function plateDraw(size: [number, number], shownHeight: string, look: {
    dim: number;
    blur: number;
}, videoWidth: number, packed: boolean): {
    width: number;
    height: number;
    filter: string;
    sourceWidth: number;
};
/**
 * How a block's footage frame comes out of a proxy (`source` the footage, `packed` with its
 * matte): the picture, or the subject drawn through the matte. The proxies have no clean plates.
 */
export declare function pictureCut(source: string, layer: 'plate' | 'subject' | 'clean', packed: boolean): 'plate' | 'subject';
/**
 * What the clock does about the sound: runs `free` without it (none, paused, ended, refused),
 * `hold`s at the sound's time while it buffers (so the picture cannot run on to the end without
 * it), and `follow`s it while it plays (`jump`: where to set the clock, see `audioCorrection`).
 */
export type SoundStep = {
    kind: 'free';
} | {
    kind: 'hold';
    time: number;
} | {
    kind: 'follow';
    jump: number | null;
    sound: number;
};
export declare function soundStep(playing: boolean, sound: {
    paused: boolean;
    readyState: number;
    currentTime: number;
} | null, clock: number): SoundStep;
/**
 * Tokens for starting playback, which waits for the sound: `begin` takes one, `cancel` (pause,
 * destroy) makes every token taken so far stale, so a start that comes back late does nothing.
 */
export declare function createStarts(): {
    begin: () => number;
    cancel(): void;
    current: (token: number) => boolean;
};
/**
 * Runs jobs one after another (one video seeked and drawn per job, so a later job cannot move
 * the video under an earlier one). A job that fails does not stop the ones after it.
 */
export declare function createQueue(): {
    run<T>(job: () => Promise<T>): Promise<T>;
};
/**
 * The newest-ask-wins order of a picture that draws frames which arrive late (`<Footage>` in
 * the live player): `ask` takes a token for the frame `key` (null: it shows that frame
 * already) and makes every earlier token stale, also when it returns null; `paint` says
 * whether a frame that arrived with `token` may be drawn, and remembers it as shown.
 */
export declare function createPaintOrder(): {
    ask(key: string): number | null;
    paint(token: number, key: string): boolean;
};
/**
 * Waits polled once per animation frame (`schedule`, `cancel`), that `end` settles at once:
 * after it nothing polls any more and every wait, pending or new, resolves. A check returns
 * true when done, an Error to reject the wait with, or false to look again. A wait still
 * pending after `timeout` ms rejects (`what` names what it waited for): it never reports done
 * for what is not.
 */
export declare function createWaits(schedule: (fn: () => void) => number, cancel: (id: number) => void, now: () => number, timeout?: number): {
    readonly pending: number;
    until(check: () => boolean | Error, what?: string): Promise<void>;
    end(): void;
};
/** Program frames passed over between the frame shown before (`shown`, -1: none) and `f`. */
export declare const skippedFrames: (playing: boolean, shown: number, f: number) => number;
