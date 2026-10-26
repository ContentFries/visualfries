import { getContext, onMount } from 'svelte';
import { gsap } from 'gsap';
import { resolveMoment } from './moment.js';
import { footageFrameAt, sourceSubjectBox, subjectBox } from './footage.js';
import { programFootageAt, sourceFrameAt } from './footage-map.js';
import { loadPicture } from './subject-canvas.js';
import { NO_MUSIC_BEATS, beatPhase } from './beat-grid.js';
import { clipEnergy } from './energy.js';
import { NEUTRAL_BRAND } from './brand.js';
import { NEUTRAL_STYLE } from './style.js';
import { resolveFormat } from './format.js';
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
    /** The clip's props. Reactive: what changes them during the clip (keys) redraws the block. */
    props = $state({});
    /** Program mode: the area of the frame this clip fills (`slot` in the project); else null. */
    slot;
    /** Program time of the clip start, for showing transcript timestamps. */
    programStart;
    /** Program frame of the clip start; `programStartFrame + frame` is the program frame. */
    programStartFrame;
    /**
     * Program frame now: `programStartFrame + frame`. Reactive, like `frame`. Without a program
     * (clip mode, inserts) it is the frame on the project's timeline, where `from` and `until`
     * place the clip; in an excerpt, the excerpt's own frame.
     */
    get programFrame() {
        return this.programStartFrame + this.frame;
    }
    /** Program seconds now (`programFrame / fps`). Reactive, like `t`. */
    get programTime() {
        return this.programFrame / this.fps;
    }
    /** Frames of the project's footage (see `<Footage>`). */
    footage;
    /**
     * Every beat of the clip's music, also outside the clip: `index` (1-based), program `time`,
     * clip-local `local`, `bar` and `beat` (1 = downbeat). Empty without music.
     */
    beats;
    #noBeats;
    /** The beats in clip-local seconds, for moments and `pulse`. */
    #grid;
    /**
     * Motion energy for `use:motion` defaults: the clip's `props.energy` when it is `calm`,
     * `balanced` or `punchy` (other values belong to the block), else the project style's
     * energy, else `balanced`.
     */
    energy;
    #events = [];
    /**
     * The project's brand: colours by role, fonts, logo URLs, radius. Also on the clip's root
     * element as `--brand-*` CSS custom properties. `neutral` when the project names no brand.
     */
    brand;
    /** The project's style after layering; `energy` is `calm`, `balanced` or `punchy`. */
    style;
    /**
     * `class` (`landscape`, `square`, `portrait`) and safe insets in px for the project size, also
     * as `--safe-top|right|bottom|left` and a `data-format` attribute on the clip's root.
     */
    format;
    /** With a cut list: which source frame the program shows when; null in inserts mode. */
    footageMap;
    /**
     * Program mode: where the stage shows the footage at the current frame, in this clip's pixels
     * (set on every seek; it moves with shot keys and morphs). Null in inserts mode and while no
     * footage is on screen. `<Subject>` uses it to sit exactly on the picture.
     */
    camera = $state.raw(null);
    /**
     * Program mode, a clip in a slot: where the slot is at the current frame (stage pixels) and
     * its insets that lie outside the format's safe area, in the slot's own pixels (set on every
     * seek, it follows the slot through morphs). Also on the clip's root as `--slot-safe-top|right|
     * bottom|left`. Null for a clip without a slot.
     */
    slotArea = $state.raw(null);
    /**
     * Program mode: the point (clip pixels) the clip's placement keys scale and turn about, or a
     * function giving it at the current frame; null: the clip's centre. `@visualfries/subject`
     * sets it to the middle of its region, so `rotation` keys spin the region in place.
     */
    pivot = null;
    constructor(data) {
        this.id = data.id;
        this.fps = data.fps;
        this.frames = data.frames;
        this.duration = data.duration;
        [this.width, this.height] = data.size;
        this.cue = data.cues;
        this.words = data.words;
        this.props = data.props;
        this.slot = data.slot ?? null;
        this.programStart = data.start;
        this.programStartFrame = data.startFrame;
        this.footage = data.footage ?? {};
        this.beats = data.beats ?? [];
        this.#noBeats = data.noBeats;
        this.#grid = this.beats.map((b) => ({
            index: b.index,
            time: b.local,
            bar: b.bar,
            beat: b.beat
        }));
        this.energy = clipEnergy(data);
        this.brand = data.brand ?? NEUTRAL_BRAND;
        this.style = data.style ?? NEUTRAL_STYLE;
        this.format = data.format ?? resolveFormat(data.size);
        this.footageMap = data.footageMap ?? null;
    }
    /**
     * Record an event at moment `at`, e.g. one per stagger item: `clip.event('pop', 'list+0.2')`.
     * Register events at setup, not per frame. Returns a function that removes the event again.
     */
    event(name, at, detail = {}) {
        const t = this.at(at);
        const event = { name, t, frame: Math.round(t * this.fps), ...detail };
        this.#events.push(event);
        return () => {
            const i = this.#events.indexOf(event);
            if (i >= 0)
                this.#events.splice(i, 1);
        };
    }
    /** Every recorded event in time order (ties keep their recording order). */
    events() {
        return this.#events.map((e) => ({ ...e })).sort((a, b) => a.t - b.t);
    }
    /**
     * Where the subject of footage `name` is at clip frame `frame` (default: the current frame),
     * from its matte, in 0–1 fractions of the footage frame. Smoothed over `smooth` seconds on
     * each side. Null without a matte or with the subject out of frame; with a cut list also
     * while the program does not show that footage.
     */
    subject(name, frame = this.frame, smooth = 0.15) {
        const footage = this.footage[name];
        if (!footage)
            throw new Error(`Unknown footage "${name}".`);
        const around = Math.round(smooth * this.fps);
        if (!this.footageMap)
            return subjectBox(footage, this.programStartFrame + frame, around);
        const shown = sourceFrameAt(this.footageMap, name, this.programStartFrame + frame);
        return shown ? sourceSubjectBox(footage, shown.frame, around) : null;
    }
    /**
     * Which footage frame is on screen at clip frame `frame` (default: the current frame): the
     * source and its frame through the cut list, holds and transition handles included. With
     * `name`, that footage's frame (null while the program does not show it). In inserts mode the
     * footage plays from its `start`.
     */
    shown(name, frame = this.frame) {
        const at = this.programStartFrame + frame;
        if (!this.footageMap) {
            const source = name ?? Object.keys(this.footage)[0];
            const footage = source ? this.footage[source] : undefined;
            if (!footage)
                return null;
            return {
                source,
                frame: Math.min(footage.total - 1, Math.max(0, at - footage.startFrame))
            };
        }
        const view = name
            ? sourceFrameAt(this.footageMap, name, at)
            : programFootageAt(this.footageMap, at);
        return view ? { source: view.source, frame: view.frame } : null;
    }
    /**
     * A footage frame as a decoded picture for canvas drawing, so a block never builds footage
     * URLs: `layer` `plate` (the picture), `subject` (cut out by the matte: its alpha is the
     * matte) or `clean` (the subject removed, `footage.<name>.clean`). `frame` is a clip frame
     * (default: the current one) and `offset` shifts inside the source in seconds; `name` picks a
     * footage (default: whatever the program shows). Await it inside `useFrame`.
     */
    async picture(layer = 'plate', opts = {}) {
        const shown = footageFrameAt(this.footage, this.footageMap, opts.name ?? null, this.programStartFrame + (opts.frame ?? this.frame), layer, Math.round((opts.offset ?? 0) * this.fps));
        return {
            image: await loadPicture(shown.url),
            source: shown.source,
            frame: shown.frame,
            width: shown.footage.width,
            height: shown.footage.height,
            layer
        };
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
            fps: this.fps,
            beats: this.#grid,
            noBeats: this.#noBeats
        });
    }
    /**
     * Phase within the current beat: 0 on the beat, rising to 1 just before the next one
     * (`'bar'`: within the current bar). The frame nearest a beat is 0 even when the beat falls
     * up to half a frame after it. Depends only on time, so it is seek-safe:
     * `scale: 1 + 0.1 * (1 - clip.pulse())` bumps on every beat.
     */
    pulse(on = 'beat') {
        if (!this.#grid.length)
            throw new Error(`Clip "${this.id}": pulse() needs music beats. ${this.#noBeats ?? NO_MUSIC_BEATS}`);
        return beatPhase(this.#grid, this.t, on, `the music of clip "${this.id}"`, 0.5 / this.fps);
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
/** A GSAP ease name or function as a function; an unknown name is an error. */
export function easeFn(ease) {
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
// Actions (`use:motion`) cannot read context, so they find their clip through the block's root.
const roots = new WeakMap();
/** Called by the stage for every mounted clip. */
export function registerClipRoot(c) {
    roots.set(c.root, c);
}
/** The clip an element of a mounted block belongs to. */
export function controllerOf(node) {
    for (let el = node; el; el = el.parentElement) {
        const c = roots.get(el);
        if (c)
            return c;
    }
    throw new Error('use:motion must be used on an element inside a VisualFries motion block.');
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
/** The clip's controller, for components that talk to the stage (`<Subject>`). */
export function useController() {
    return controller();
}
/** Delay the first frame until `promise` settles (asset decoding, engine setup). */
export function useReady(promise) {
    controller().ready.push(promise);
}
export { CONTEXT_KEY as MOTION_CONTEXT_KEY };
