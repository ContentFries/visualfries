import { getContext, onMount } from 'svelte';
import { gsap } from 'gsap';
import { resolveMoment } from './moment.js';
import { subjectBox } from './footage.js';
const CONTEXT_KEY = Symbol.for('visualfries.motion.clip');
export class Clip {
    /** Clip-local time in seconds. Reactive: use it directly in markup. */
    t = $state(0);
    /** Clip-local frame. Reactive. */
    frame = $state(0);
    id;
    fps;
    frames;
    duration;
    width;
    height;
    cue;
    words;
    props;
    /** Program time of the clip start, for showing transcript timestamps. */
    programStart;
    /** Program frame of the clip start; `programStartFrame + frame` is the program frame. */
    programStartFrame;
    /** Frames of the project's footage (see `<Footage>`). */
    footage;
    constructor(data) {
        this.id = data.id;
        this.fps = data.fps;
        this.frames = data.frames;
        this.duration = data.duration;
        [this.width, this.height] = data.size;
        this.cue = data.cues;
        this.words = data.words;
        this.props = data.props;
        this.programStart = data.start;
        this.programStartFrame = data.startFrame;
        this.footage = data.footage ?? {};
    }
    /**
     * Where the subject of footage `name` is at clip frame `frame` (default: the current frame),
     * from its matte, in 0–1 fractions of the footage frame. Smoothed over `smooth` seconds on
     * each side. Null without a matte or with the subject out of frame.
     */
    subject(name, frame = this.frame, smooth = 0.15) {
        const footage = this.footage[name];
        if (!footage)
            throw new Error(`Unknown footage "${name}".`);
        return subjectBox(footage, this.programStartFrame + frame, Math.round(smooth * this.fps));
    }
    /**
     * Resolve an `At` to clip-local seconds. Besides project cues, `start` (0) and `end`
     * (clip length) always exist, so exits follow the clip when a new voiceover stretches it.
     */
    at(at) {
        return resolveMoment(at, {
            id: this.id,
            cues: this.cue,
            duration: this.duration,
            fps: this.fps
        });
    }
    /** Eased 0→1 progress starting at `at`, lasting `duration` seconds. */
    p(at, duration = 0.6, ease = 'power2.out') {
        if (!(duration > 0))
            return this.t >= this.at(at) ? 1 : 0;
        const x = clamp((this.t - this.at(at)) / duration);
        return easeFn(ease)(x);
    }
    /** Eased 1→0 (for exits). */
    out(at, duration = 0.4, ease = 'power2.in') {
        return 1 - this.p(at, duration, ease);
    }
    after(at) {
        return this.t >= this.at(at);
    }
    before(at) {
        return this.t < this.at(at);
    }
    between(a, b) {
        return this.t >= this.at(a) && this.t < this.at(b);
    }
    /** Index of the last passed moment, -1 before the first: `clip.step('a', 'b', 'c')`. */
    step(...moments) {
        let index = -1;
        moments.forEach((m, i) => {
            if (this.t >= this.at(m))
                index = i;
        });
        return index;
    }
    /**
     * Piecewise-linear map from clip time to a value; equal values create a hold.
     * `clip.map([[0, 0], ['small', 1.2], ['agent', 5.1]])`
     */
    map(points, ease = 'none') {
        if (!points.length)
            throw new Error(`Clip "${this.id}": map() needs at least one [moment, value] point.`);
        const pts = points.map(([a, v]) => [this.at(a), v]);
        for (let i = 1; i < pts.length; i++) {
            if (pts[i][0] < pts[i - 1][0]) {
                throw new Error(`Clip "${this.id}": map() moments must not go back in time; ${JSON.stringify(points[i][0])} (${pts[i][0].toFixed(2)}s) comes before ${JSON.stringify(points[i - 1][0])} (${pts[i - 1][0].toFixed(2)}s). The transcript probably changed.`);
            }
        }
        if (this.t <= pts[0][0])
            return pts[0][1];
        for (let i = 1; i < pts.length; i++) {
            const [ta, va] = pts[i - 1];
            const [tb, vb] = pts[i];
            if (this.t <= tb)
                return va + (vb - va) * easeFn(ease)(tb === ta ? 1 : (this.t - ta) / (tb - ta));
        }
        return pts[pts.length - 1][1];
    }
    /** The word is being spoken now. */
    speaking(word) {
        return this.t >= word.localStart && this.t < word.localEnd;
    }
    /** The word has started. */
    spoken(word) {
        return this.t >= word.localStart;
    }
    /** The word belongs to the word binding `name`, or else to the words of cue `name`. */
    has(name, word) {
        const list = this.words[name] ?? this.cue[name]?.words;
        if (!list) {
            const known = [...Object.keys(this.words), ...Object.keys(this.cue)].join(', ') || '(none)';
            throw new Error(`Clip "${this.id}": no word binding or cue "${name}". Known: ${known}.`);
        }
        return list.some((w) => w.id === word.id);
    }
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
const easeCache = new Map();
function easeFn(ease) {
    if (typeof ease === 'function')
        return ease;
    let fn = easeCache.get(ease);
    if (!fn) {
        const parsed = gsap.parseEase(ease);
        if (typeof parsed !== 'function') {
            throw new Error(`Unknown ease "${ease}". Use a GSAP name such as "power2.out", "back.out(1.7)", "expo.inOut", "none", or a function.`);
        }
        fn = parsed;
        easeCache.set(ease, fn);
    }
    return fn;
}
/**
 * Deterministic noise in [0, 1) for any combination of keys, e.g. `noise(i, clip.frame)`.
 * Safe anywhere, including per-frame code: the same keys always give the same value.
 */
export function noise(...keys) {
    let h = 2166136261;
    for (const k of keys) {
        h ^= Math.floor(k * 1000003) | 0;
        h = Math.imul(h, 16777619);
        h ^= h >>> 13;
        h = Math.imul(h, 0x5bd1e995);
        h ^= h >>> 15;
    }
    return (h >>> 0) / 4294967296;
}
/**
 * Seeded generator for building things once (at setup). Do not call it per frame:
 * its sequence depends on call order, so seeking would change the result. Use `noise`.
 */
export function random(seed = 1) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}
function controller() {
    const c = getContext(CONTEXT_KEY);
    if (!c)
        throw new Error('useClip/useTimeline/useFrame must be called inside a VisualFries motion block.');
    return c;
}
/** The current clip: time, cues, bound transcript words, helpers. */
export function useClip() {
    return controller().clip;
}
/**
 * Build a paused GSAP timeline in clip seconds. VisualFries seeks it to every frame,
 * so there is no wall-clock playback. Selectors via `q` are scoped to this clip.
 */
export function useTimeline(build) {
    const c = controller();
    onMount(() => {
        const tl = gsap.timeline({ paused: true });
        const q = (selector) => Array.from(c.root.querySelectorAll(selector));
        build({ tl, at: (a) => c.clip.at(a), q, clip: c.clip });
        // Pad to the clip end, then record every tween's start values once so any seek order is equal.
        if (tl.duration() < c.clip.duration)
            tl.to({}, { duration: c.clip.duration - tl.duration() });
        tl.progress(1, true).progress(0, true);
        c.timelines.push(tl);
        return () => {
            tl.kill();
            const i = c.timelines.indexOf(tl);
            if (i >= 0)
                c.timelines.splice(i, 1);
        };
    });
}
/**
 * Imperative per-frame drawing (canvas, procedural SVG, third-party engines). Return a promise
 * when the frame needs something loaded first; VisualFries waits for it before capturing.
 */
export function useFrame(fn) {
    const c = controller();
    onMount(() => {
        c.frameFns.push(fn);
        return () => {
            const i = c.frameFns.indexOf(fn);
            if (i >= 0)
                c.frameFns.splice(i, 1);
        };
    });
}
/** Delay the first frame until `promise` settles (asset decoding, engine setup). */
export function useReady(promise) {
    controller().ready.push(promise);
}
export { CONTEXT_KEY as MOTION_CONTEXT_KEY };
