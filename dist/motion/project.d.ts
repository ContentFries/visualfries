import { z } from 'zod';
/**
 * A point in the program timeline.
 * - number: absolute program seconds
 * - "phrase": transcript phrase, start of its first word
 * - { say, edge?, occurrence?, offset? }: explicit phrase anchor
 * - { frame }: absolute program frame
 * - { beat: 17 }: the 17th beat of the music; { bar: 5 } its downbeat, { bar: 5, beat: 3 }
 * - { downbeat: "after", at }, { beat: "before", at }: nearest (down)beat to another anchor
 * `offset` is seconds or beats ("-1b").
 */
export type MotionAnchor = number | string | {
    say: string;
    edge?: 'start' | 'last' | 'end';
    occurrence?: number;
    offset?: number | string;
} | {
    frame: number;
    offset?: number | string;
} | {
    bar: number;
    beat?: number;
    music?: string;
    offset?: number | string;
} | {
    beat: number;
    music?: string;
    offset?: number | string;
} | {
    downbeat: 'after' | 'before';
    at: MotionAnchor;
    music?: string;
    offset?: number | string;
} | {
    beat: 'after' | 'before';
    at: MotionAnchor;
    music?: string;
    offset?: number | string;
};
/** `{ bar, beat: "after", at }` would silently lose `bar`; such anchors are refused. */
export declare const AMBIGUOUS_BAR_ANCHOR = "An anchor with \"bar\" cannot also have \"at\", \"downbeat\" or \"beat\": \"after\"/\"before\". Use { \"bar\": 5, \"beat\": 3 } for a beat in a bar, or { \"beat\": \"after\", \"at\": \u2026 } for the beat after a moment.";
export declare const MotionAnchorShape: z.ZodType<MotionAnchor>;
/** Words pulled from the transcript: a phrase, a range, or every word in the clip. */
export declare const MotionWordsShape: z.ZodUnion<readonly [z.ZodLiteral<"clip">, z.ZodString, z.ZodObject<{
    from: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
    until: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
}, z.core.$strip>]>;
export type MotionWords = z.infer<typeof MotionWordsShape>;
export declare const MotionFontShape: z.ZodObject<{
    family: z.ZodString;
    src: z.ZodString;
    weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    style: z.ZodOptional<z.ZodEnum<{
        normal: "normal";
        italic: "italic";
    }>>;
}, z.core.$strip>;
export type MotionFont = z.infer<typeof MotionFontShape>;
/**
 * A video the blocks draw frame by frame, e.g. the talking head the transcript belongs to.
 * `matte` is a greyscale video of the same footage (white = subject); with it, blocks can draw
 * the subject alone in front of anything (`visualfries matte` makes one).
 */
export declare const MotionFootageShape: z.ZodObject<{
    src: z.ZodString;
    matte: z.ZodOptional<z.ZodString>;
    start: z.ZodOptional<z.ZodNumber>;
    margin: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodLiteral<"all">]>>;
}, z.core.$strip>;
export type MotionFootage = z.infer<typeof MotionFootageShape>;
/**
 * A music item. For now it only times things: beat anchors read its beats file (made by
 * `visualfries beats`); render does not mix it yet. Corrections fix what the analyzer got wrong
 * without touching the beats file, so re-analysis keeps them.
 */
export declare const MotionMusicShape: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    src: z.ZodString;
    beats: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodNumber>;
    until: z.ZodOptional<z.ZodNumber>;
    shift: z.ZodOptional<z.ZodNumber>;
    downbeat: z.ZodOptional<z.ZodNumber>;
    tempo: z.ZodOptional<z.ZodEnum<{
        double: "double";
        half: "half";
    }>>;
}, z.core.$strip>;
export type MotionMusic = z.infer<typeof MotionMusicShape>;
export declare const MotionClipShape: z.ZodObject<{
    id: z.ZodString;
    block: z.ZodString;
    from: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
    until: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
    tail: z.ZodOptional<z.ZodNumber>;
    cues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>>;
    words: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodLiteral<"clip">, z.ZodString, z.ZodObject<{
        from: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
        until: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
    }, z.core.$strip>]>>>;
    props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    alpha: z.ZodOptional<z.ZodBoolean>;
    background: z.ZodOptional<z.ZodString>;
    audio: z.ZodOptional<z.ZodString>;
    music: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type MotionClip = z.infer<typeof MotionClipShape>;
/**
 * A creator's identity: colours in fixed roles, fonts, logo, corner radius. Blocks read it as
 * `--brand-*` CSS custom properties and as `clip.brand`. Any colour may be a CSS gradient. File
 * paths are relative to the brand file (or to the project for an inline brand).
 */
export declare const BrandShape: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    colors: z.ZodObject<{
        primary: z.ZodString;
        accent: z.ZodString;
        background: z.ZodString;
        surface: z.ZodString;
        text: z.ZodString;
        muted: z.ZodString;
        onPrimary: z.ZodOptional<z.ZodString>;
        onAccent: z.ZodOptional<z.ZodString>;
        extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strict>;
    fonts: z.ZodObject<{
        heading: z.ZodObject<{
            family: z.ZodString;
            src: z.ZodString;
            weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
            style: z.ZodOptional<z.ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
        }, z.core.$strip>;
        body: z.ZodObject<{
            family: z.ZodString;
            src: z.ZodString;
            weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
            style: z.ZodOptional<z.ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
        }, z.core.$strip>;
        mono: z.ZodOptional<z.ZodObject<{
            family: z.ZodString;
            src: z.ZodString;
            weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
            style: z.ZodOptional<z.ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strict>;
    logo: z.ZodOptional<z.ZodObject<{
        full: z.ZodOptional<z.ZodObject<{
            light: z.ZodOptional<z.ZodString>;
            dark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        mark: z.ZodOptional<z.ZodObject<{
            light: z.ZodOptional<z.ZodString>;
            dark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    radius: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strict>;
export type Brand = z.infer<typeof BrandShape>;
export declare const ENERGIES: readonly ["calm", "balanced", "punchy"];
export type Energy = (typeof ENERGIES)[number];
/**
 * A creator's editing grammar. `extends` names a built-in style or a style file (relative to
 * the file that names it); this layer then changes only what differs. Later layers win; arrays
 * replace whole, objects merge key by key. Only `energy` is read today; the other sections are
 * reserved so style files can already carry them.
 */
export declare const StyleShape: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    extends: z.ZodOptional<z.ZodString>;
    energy: z.ZodOptional<z.ZodEnum<{
        calm: "calm";
        balanced: "balanced";
        punchy: "punchy";
    }>>;
    transitions: z.ZodOptional<z.ZodUnknown>;
    shots: z.ZodOptional<z.ZodUnknown>;
    captions: z.ZodOptional<z.ZodUnknown>;
    sounds: z.ZodOptional<z.ZodUnknown>;
    emphasis: z.ZodOptional<z.ZodUnknown>;
    overlays: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strict>;
export type Style = z.infer<typeof StyleShape>;
/** Where the project's safe insets come from: every platform at once, or one platform. */
export declare const SafeZoneShape: z.ZodEnum<{
    meta: "meta";
    all: "all";
    tiktok: "tiktok";
    youtube: "youtube";
}>;
export declare const MotionProjectShape: z.ZodObject<{
    size: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    fps: z.ZodNumber;
    transcript: z.ZodOptional<z.ZodString>;
    fonts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        family: z.ZodString;
        src: z.ZodString;
        weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
        style: z.ZodOptional<z.ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
    }, z.core.$strip>>>;
    styles: z.ZodOptional<z.ZodArray<z.ZodString>>;
    background: z.ZodOptional<z.ZodString>;
    footage: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        src: z.ZodString;
        matte: z.ZodOptional<z.ZodString>;
        start: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodLiteral<"all">]>>;
    }, z.core.$strip>>>;
    music: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        src: z.ZodString;
        beats: z.ZodOptional<z.ZodString>;
        from: z.ZodOptional<z.ZodNumber>;
        until: z.ZodOptional<z.ZodNumber>;
        shift: z.ZodOptional<z.ZodNumber>;
        downbeat: z.ZodOptional<z.ZodNumber>;
        tempo: z.ZodOptional<z.ZodEnum<{
            double: "double";
            half: "half";
        }>>;
    }, z.core.$strip>>>;
    brand: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        colors: z.ZodObject<{
            primary: z.ZodString;
            accent: z.ZodString;
            background: z.ZodString;
            surface: z.ZodString;
            text: z.ZodString;
            muted: z.ZodString;
            onPrimary: z.ZodOptional<z.ZodString>;
            onAccent: z.ZodOptional<z.ZodString>;
            extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strict>;
        fonts: z.ZodObject<{
            heading: z.ZodObject<{
                family: z.ZodString;
                src: z.ZodString;
                weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
                style: z.ZodOptional<z.ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
            }, z.core.$strip>;
            body: z.ZodObject<{
                family: z.ZodString;
                src: z.ZodString;
                weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
                style: z.ZodOptional<z.ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
            }, z.core.$strip>;
            mono: z.ZodOptional<z.ZodObject<{
                family: z.ZodString;
                src: z.ZodString;
                weight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
                style: z.ZodOptional<z.ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
            }, z.core.$strip>>;
        }, z.core.$strict>;
        logo: z.ZodOptional<z.ZodObject<{
            full: z.ZodOptional<z.ZodObject<{
                light: z.ZodOptional<z.ZodString>;
                dark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            mark: z.ZodOptional<z.ZodObject<{
                light: z.ZodOptional<z.ZodString>;
                dark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        radius: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$strict>]>>;
    style: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        extends: z.ZodOptional<z.ZodString>;
        energy: z.ZodOptional<z.ZodEnum<{
            calm: "calm";
            balanced: "balanced";
            punchy: "punchy";
        }>>;
        transitions: z.ZodOptional<z.ZodUnknown>;
        shots: z.ZodOptional<z.ZodUnknown>;
        captions: z.ZodOptional<z.ZodUnknown>;
        sounds: z.ZodOptional<z.ZodUnknown>;
        emphasis: z.ZodOptional<z.ZodUnknown>;
        overlays: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strict>]>>;
    safeZone: z.ZodOptional<z.ZodEnum<{
        meta: "meta";
        all: "all";
        tiktok: "tiktok";
        youtube: "youtube";
    }>>;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        block: z.ZodString;
        from: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
        until: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
        tail: z.ZodOptional<z.ZodNumber>;
        cues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>>;
        words: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodLiteral<"clip">, z.ZodString, z.ZodObject<{
            from: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
            until: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
        }, z.core.$strip>]>>>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        alpha: z.ZodOptional<z.ZodBoolean>;
        background: z.ZodOptional<z.ZodString>;
        audio: z.ZodOptional<z.ZodString>;
        music: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type MotionProject = z.infer<typeof MotionProjectShape>;
export declare function isMotionProject(value: unknown): boolean;
