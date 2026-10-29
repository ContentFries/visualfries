import { z } from 'zod';
import { type MotionProject } from './project.js';
/**
 * A point in a source's own time (cut `in`/`out`, a shot's source `in`).
 * - number: seconds in the raw file
 * - "phrase": words of that source's transcript
 * - { say, edge?, occurrence?, offset? }: explicit phrase anchor
 * - { frame }: frame of the raw file at the project frame rate
 */
export declare const SourceTimeShape: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
    say: z.ZodString;
    edge: z.ZodOptional<z.ZodEnum<{
        start: "start";
        end: "end";
        last: "last";
    }>>;
    occurrence: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    frame: z.ZodNumber;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>]>;
export type SourceTime = z.infer<typeof SourceTimeShape>;
/**
 * A cut's `out` on the music, in program time: the cut ends (and the next one starts) on the
 * frame nearest that beat. `{ bar, beat? }` and `{ beat: n }` name a beat; `{ downbeat | beat:
 * "after" | "before", at }` take the nearest one to `at`, a point in the cut's own source.
 */
export declare const CutBeatShape: z.ZodUnion<readonly [z.ZodObject<{
    bar: z.ZodNumber;
    beat: z.ZodOptional<z.ZodNumber>;
    music: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strict>, z.ZodObject<{
    beat: z.ZodNumber;
    music: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strict>, z.ZodObject<{
    downbeat: z.ZodEnum<{
        after: "after";
        before: "before";
    }>;
    at: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
        say: z.ZodString;
        edge: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            last: "last";
        }>>;
        occurrence: z.ZodOptional<z.ZodNumber>;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        frame: z.ZodNumber;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>]>;
    music: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strict>, z.ZodObject<{
    beat: z.ZodEnum<{
        after: "after";
        before: "before";
    }>;
    at: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
        say: z.ZodString;
        edge: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            last: "last";
        }>>;
        occurrence: z.ZodOptional<z.ZodNumber>;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        frame: z.ZodNumber;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>]>;
    music: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strict>]>;
export type CutBeat = z.infer<typeof CutBeatShape>;
/** A cut point on the music rather than in the source. */
export declare const isCutBeat: (point: SourceTime | CutBeat | undefined) => point is CutBeat;
/** A moment of the item itself ("start", "end", "mid", "2.5s", "f12", a cue of a clip). */
export declare const MomentAnchorShape: z.ZodObject<{
    moment: z.ZodString;
}, z.core.$strip>;
/**
 * Anchor inside an item (keys): numbers are item-local seconds, `{ frame }` an item-local frame,
 * phrases are searched inside the item, `{ moment }` uses the moment grammar.
 */
export declare const ItemAnchorShape: z.ZodUnion<readonly [z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>, z.ZodObject<{
    moment: z.ZodString;
}, z.core.$strip>]>;
export type ItemAnchor = z.infer<typeof ItemAnchorShape>;
/** Built-in transitions; a path ("transitions/My.svelte") names a custom one. */
export declare const TRANSITIONS: readonly ["wipe", "push", "zoom-through", "shape-mask", "blinds", "card"];
/** Built-in shots; a path ("shots/My.ts") names a custom one. */
export declare const SHOTS: readonly ["full", "punch", "strip", "window", "behind", "whip"];
/**
 * The handoff into the item that carries it. A name ("push") or the full form. It never changes
 * program time and never touches audio.
 */
export declare const TransitionShape: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
    type: z.ZodString;
    duration: z.ZodOptional<z.ZodNumber>;
    align: z.ZodOptional<z.ZodEnum<{
        start: "start";
        end: "end";
        center: "center";
    }>>;
    direction: z.ZodOptional<z.ZodEnum<{
        left: "left";
        right: "right";
        up: "up";
        down: "down";
        back: "back";
        forward: "forward";
    }>>;
    ease: z.ZodOptional<z.ZodString>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    sound: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<false>, z.ZodString]>>;
    native: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>]>;
export type Transition = z.infer<typeof TransitionShape>;
/** A keyframe of an item's placement or of the props its block marks animatable. */
export declare const KeyShape: z.ZodObject<{
    at: z.ZodUnion<readonly [z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>, z.ZodObject<{
        moment: z.ZodString;
    }, z.core.$strip>]>;
    x: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    y: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    scale: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    ease: z.ZodOptional<z.ZodString>;
    mix: z.ZodOptional<z.ZodEnum<{
        oklab: "oklab";
        oklch: "oklch";
    }>>;
}, z.core.$strip>;
export type Key = z.infer<typeof KeyShape>;
/** One range of a raw source in the cut list. `in`/`out` are source time. */
export declare const CutShape: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    source: z.ZodLazy<z.ZodString>;
    in: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
        say: z.ZodString;
        edge: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            last: "last";
        }>>;
        occurrence: z.ZodOptional<z.ZodNumber>;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        frame: z.ZodNumber;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        bar: z.ZodNumber;
        beat: z.ZodOptional<z.ZodNumber>;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>, z.ZodObject<{
        beat: z.ZodNumber;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>, z.ZodObject<{
        downbeat: z.ZodEnum<{
            after: "after";
            before: "before";
        }>;
        at: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
            say: z.ZodString;
            edge: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                last: "last";
            }>>;
            occurrence: z.ZodOptional<z.ZodNumber>;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            frame: z.ZodNumber;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>]>;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>, z.ZodObject<{
        beat: z.ZodEnum<{
            after: "after";
            before: "before";
        }>;
        at: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
            say: z.ZodString;
            edge: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                last: "last";
            }>>;
            occurrence: z.ZodOptional<z.ZodNumber>;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            frame: z.ZodNumber;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>]>;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>]>>;
    out: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
        say: z.ZodString;
        edge: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            last: "last";
        }>>;
        occurrence: z.ZodOptional<z.ZodNumber>;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        frame: z.ZodNumber;
        offset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        bar: z.ZodNumber;
        beat: z.ZodOptional<z.ZodNumber>;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>, z.ZodObject<{
        beat: z.ZodNumber;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>, z.ZodObject<{
        downbeat: z.ZodEnum<{
            after: "after";
            before: "before";
        }>;
        at: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
            say: z.ZodString;
            edge: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                last: "last";
            }>>;
            occurrence: z.ZodOptional<z.ZodNumber>;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            frame: z.ZodNumber;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>]>;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>, z.ZodObject<{
        beat: z.ZodEnum<{
            after: "after";
            before: "before";
        }>;
        at: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
            say: z.ZodString;
            edge: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                last: "last";
            }>>;
            occurrence: z.ZodOptional<z.ZodNumber>;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            frame: z.ZodNumber;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>]>;
        music: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>]>>;
    hold: z.ZodOptional<z.ZodNumber>;
    transition: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodString;
        duration: z.ZodOptional<z.ZodNumber>;
        align: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            center: "center";
        }>>;
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            up: "up";
            down: "down";
            back: "back";
            forward: "forward";
        }>>;
        ease: z.ZodOptional<z.ZodString>;
        params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        sound: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<false>, z.ZodString]>>;
        native: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    audio: z.ZodOptional<z.ZodObject<{
        split: z.ZodOptional<z.ZodNumber>;
        crossfade: z.ZodOptional<z.ZodNumber>;
        gain: z.ZodOptional<z.ZodNumber>;
        mute: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    native: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type Cut = z.infer<typeof CutShape>;
/**
 * A stretch of a shot with the speaker off the frame: wholly gone from `from` (the exit ends
 * there) until `until` (the way back in starts there). Program time, like the shot's own range.
 */
declare const AwayShape: z.ZodObject<{
    from: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
    until: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
    side: z.ZodOptional<z.ZodEnum<{
        left: "left";
        right: "right";
        bottom: "bottom";
    }>>;
    exit: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        seconds: z.ZodNumber;
        ease: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>]>>;
    enter: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        seconds: z.ZodNumber;
        ease: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
export type Away = z.infer<typeof AwayShape>;
/** How footage is framed from `from` until `until` (program time). */
export declare const ShotShape: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    shot: z.ZodString;
    from: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
    until: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
    source: z.ZodOptional<z.ZodUnion<readonly [z.ZodLazy<z.ZodString>, z.ZodObject<{
        name: z.ZodLazy<z.ZodString>;
        in: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
            say: z.ZodString;
            edge: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                last: "last";
            }>>;
            occurrence: z.ZodOptional<z.ZodNumber>;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            frame: z.ZodNumber;
            offset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>]>>;
    }, z.core.$strip>]>>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    morph: z.ZodOptional<z.ZodNumber>;
    transition: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodString;
        duration: z.ZodOptional<z.ZodNumber>;
        align: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            center: "center";
        }>>;
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            up: "up";
            down: "down";
            back: "back";
            forward: "forward";
        }>>;
        ease: z.ZodOptional<z.ZodString>;
        params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        sound: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<false>, z.ZodString]>>;
        native: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    keys: z.ZodOptional<z.ZodArray<z.ZodObject<{
        at: z.ZodUnion<readonly [z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>, z.ZodObject<{
            moment: z.ZodString;
        }, z.core.$strip>]>;
        x: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
        y: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
        scale: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        ease: z.ZodOptional<z.ZodString>;
        mix: z.ZodOptional<z.ZodEnum<{
            oklab: "oklab";
            oklch: "oklch";
        }>>;
    }, z.core.$strip>>>;
    away: z.ZodOptional<z.ZodArray<z.ZodObject<{
        from: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
        until: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
        side: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            bottom: "bottom";
        }>>;
        exit: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            seconds: z.ZodNumber;
            ease: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>]>>;
        enter: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            seconds: z.ZodNumber;
            ease: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>]>>;
    }, z.core.$strict>>>;
    native: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type Shot = z.infer<typeof ShotShape>;
/** Where generated material came from (provider, model, prompt, seed …). */
export declare const ProvenanceShape: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    prompt: z.ZodOptional<z.ZodString>;
    seed: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$loose>;
export type Provenance = z.infer<typeof ProvenanceShape>;
/**
 * A sound effect at a program moment. `sound` is a sound file relative to the project; when a
 * sound library's `sounds.json` lists it, its hit (not its first sample) lands on `at`.
 */
export declare const SfxShape: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    at: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
    sound: z.ZodString;
    gain: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type Sfx = z.infer<typeof SfxShape>;
/**
 * A range of the program rendered as a video of its own (a teaser), in its own format, with an
 * optional end card after it. `from` and `until` are program anchors, resolved in the whole
 * program; the excerpt is that program sliced (see `excerpt.ts`).
 */
export declare const ExcerptShape: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
    until: z.ZodLazy<z.ZodType<import("./project.js").MotionAnchor, unknown, z.core.$ZodTypeInternals<import("./project.js").MotionAnchor, unknown>>>;
    format: z.ZodOptional<z.ZodString>;
    end: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        block: z.ZodOptional<z.ZodString>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        sound: z.ZodOptional<z.ZodString>;
        gain: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type Excerpt = z.infer<typeof ExcerptShape>;
/**
 * Levels of the program mix. Effects and music sit at a steady level relative to the speech
 * (its integrated loudness as cut); the finished video is then brought to `loudness` with its
 * true peak at or under `truePeak`.
 */
export declare const MixShape: z.ZodObject<{
    sfx: z.ZodOptional<z.ZodNumber>;
    music: z.ZodOptional<z.ZodNumber>;
    loudness: z.ZodOptional<z.ZodNumber>;
    truePeak: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export type Mix = z.infer<typeof MixShape>;
/** Program mode: the project describes the whole program (a cut list or a shots track). */
export declare function isProgramProject(project: Pick<MotionProject, 'cuts' | 'shots'>): boolean;
/** Parses a project file's JSON, with one readable line per problem instead of zod's dump. */
export declare function parseMotionProject(value: unknown, file?: string): MotionProject;
export {};
