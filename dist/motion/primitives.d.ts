/**
 * Motion primitives: named entrances, exits and emphasis moves as pure functions of clip time.
 * Nothing here touches the DOM; `motion.ts` splits text, applies poses and records events.
 */
import { type At, type Ease, type Energy } from './runtime.svelte.js';
export type Entrance = 'fade' | 'pop' | 'slide' | 'scale' | 'rise' | 'drop' | 'reveal' | 'blur-in' | 'spring' | 'typewriter' | 'draw';
export type Emphasis = 'pulse' | 'shake' | 'wiggle' | 'punch' | 'highlight' | 'underline' | 'strike' | 'glow';
/** The side a move comes from. */
export type Direction = 'left' | 'right' | 'up' | 'down';
export type Split = 'words' | 'chars' | 'lines';
export type EmphasisSpec = {
    move: Emphasis;
    /** Default: when the entrance has landed, or `at` without an entrance. */
    at?: At;
    duration?: number;
    /** Colour of highlight, underline, strike and glow. */
    color?: string;
};
export type CountSpec = {
    from?: number;
    to: number;
    /** Digits after the decimal point; default: as many as `to` has. */
    decimals?: number;
    /** Turns the value into text; default: en-US grouping ("12,400"). */
    format?: (value: number) => string;
};
export type MotionOptions = {
    enter?: Entrance;
    /** When the entrance (or, without one, the emphasis or count) starts. Default "start". */
    at?: At;
    /** Exits mirror the entrances; `draw` erases. */
    exit?: Entrance;
    /** When the element is gone. Default "end". */
    until?: At;
    emphasis?: Emphasis | EmphasisSpec | (Emphasis | EmphasisSpec)[];
    /** Seconds of the entrance and exit; default from the energy. */
    duration?: number;
    direction?: Direction;
    /** Seconds between split items (or drawn strokes); default from the energy. */
    stagger?: number;
    split?: Split;
    /** Multiplies distances, scales and shakes. Default 1. */
    intensity?: number;
    ease?: Ease;
    /** Overrides the clip's energy. */
    energy?: Energy;
    /** Count the element's text up to a number. */
    count?: number | CountSpec;
    /** Default colour of highlight, underline, strike and glow. */
    color?: string;
};
type EnergyRow = {
    /** Entrance seconds; exits take 0.8 of it and emphasis moves scale with it. */
    duration: number;
    /** Seconds between split items. */
    stagger: Record<Split, number>;
    /** Seconds per typed character. */
    type: number;
    /** Distance, scale and shake amplitude. */
    amount: number;
    ease: string;
    /** Strength of the overshoot in `pop`. */
    overshoot: number;
};
/** The one place where style energy changes motion. */
export declare const ENERGY: Record<Energy, EnergyRow>;
/** Room a mask leaves around its box for italic overhang and descenders. */
export declare const MASK_OVERHANG = "0.35em";
/** What a moment of motion looks like; poses combine (offsets add, scales multiply). */
export type Pose = {
    x: number;
    y: number;
    scale: number;
    rotate: number;
    opacity: number;
    /** px */
    blur: number;
    /** Glow radius in px. */
    glow: number;
    /** Hidden fraction of each side (top, right, bottom, left), drawn as a clip-path. */
    hide: [number, number, number, number];
    /** Visible stretch of a stroke, as fractions of its length; null leaves the stroke alone. */
    draw: [number, number] | null;
    /** Not shown at all (typewriter). */
    hidden: boolean;
    /** Highlight, underline and strike sweeps: drawn fraction and where they start. */
    marks: {
        kind: 'highlight' | 'underline' | 'strike';
        f: number;
        from: 'left' | 'right';
    }[];
    glowColor?: string;
    markColor?: Partial<Record<'highlight' | 'underline' | 'strike', string>>;
};
export declare const REST: Pose;
export declare function combine(a: Pose, b: Partial<Pose>): Pose;
type Ctx = {
    dir: Direction;
    amount: number;
    unit: number;
    flip: boolean;
};
type MoveSpec = {
    ease: (r: EnergyRow) => string;
    /** Fraction of the move where its sound lands. */
    hit: number;
    /** Event names when entering and when leaving. */
    sound: [string, string];
    /** Duration relative to the energy's. */
    time?: number;
    /** Side it comes from; `direction` changes it only for slide and reveal. */
    from?: Direction;
    directional?: boolean;
    /** Exits keep travelling the same way (slide out the far side) instead of reversing. */
    through?: boolean;
    /** Pose at linear progress `p` and eased progress `e`: 0 = not yet in, 1 = at rest. */
    pose: (p: number, e: number, k: Ctx) => Partial<Pose>;
};
export declare const ENTRANCES: Record<Entrance, MoveSpec>;
type EmphasisMove = {
    time: number;
    hit: number;
    sound: string;
    /** Stays after it is drawn (a highlight), instead of settling back. */
    lasting?: boolean;
    ease?: string;
    pose: (p: number, u: number, e: number, k: Ctx, color?: string) => Partial<Pose>;
};
export declare const EMPHASES: Record<Emphasis, EmphasisMove>;
/** One phase of a plan: the same move on every item, item `i` starting at `starts[i]`. */
type Phase = {
    move: Entrance;
    spec: MoveSpec;
    starts: number[];
    duration: number;
    ease: (x: number) => number;
    ctx: Ctx;
};
type PlannedEmphasis = {
    move: Emphasis;
    start: number;
    duration: number;
    ease: (x: number) => number;
    color?: string;
};
export type MotionPlan = {
    items: number;
    enter: Phase | null;
    exit: Phase | null;
    emphasis: PlannedEmphasis[];
    count: {
        start: number;
        duration: number;
        from: number;
        to: number;
        ease: (x: number) => number;
        format: (v: number) => string;
    } | null;
    ctx: Ctx;
    energy: Energy;
    amount: number;
    /** Whether the entrance or exit transforms items (so they cannot stay `display: inline`). */
    transforms: boolean;
};
export type PlanClip = {
    id: string;
    at: (at: At) => number;
    width: number;
    height: number;
    energy: Energy;
};
/** Every default the options leave open, resolved once at setup. */
export declare function planMotion(clip: PlanClip, o: MotionOptions, items: number): MotionPlan;
/** Pose of split item `item` at clip time `t`: entrance and exit. */
export declare function itemPose(plan: MotionPlan, item: number, t: number): Pose;
/** Pose of the element itself at clip time `t`: emphasis moves. */
export declare function emphasisPose(plan: MotionPlan, t: number): Pose;
/** Text of a counter at clip time `t`. */
export declare function countText(plan: MotionPlan, t: number): string | null;
export type PlannedEvent = {
    name: string;
    t: number;
    move: string;
    phase: 'enter' | 'exit' | 'emphasis' | 'count';
    item?: number;
    items?: number;
    intensity: number;
};
/** The events a plan emits: one per item and phase, one per emphasis, a tick per counter change. */
export declare function planEvents(plan: MotionPlan, fps: number): PlannedEvent[];
export {};
