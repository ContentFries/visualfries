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
export declare const footageName: z.ZodString;
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
    transcript: z.ZodOptional<z.ZodString>;
    provenance: z.ZodOptional<z.ZodLazy<z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodOptional<z.ZodString>;
        prompt: z.ZodOptional<z.ZodString>;
        seed: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$loose>>>;
    audio: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<false>]>>;
}, z.core.$strip>;
export type MotionFootage = z.infer<typeof MotionFootageShape>;
/**
 * A music item. Beat anchors read its beats file (made by `visualfries beats`); a program render
 * mixes it at one steady level under the speech (`mix.music`), with its own gain, fades and gain
 * keys on top. Corrections fix what the analyzer got wrong without touching the beats file, so
 * re-analysis keeps them.
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
    gain: z.ZodOptional<z.ZodNumber>;
    fade: z.ZodOptional<z.ZodObject<{
        in: z.ZodOptional<z.ZodNumber>;
        out: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    keys: z.ZodOptional<z.ZodArray<z.ZodObject<{
        at: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
        gain: z.ZodNumber;
    }, z.core.$strip>>>;
    provenance: z.ZodOptional<z.ZodLazy<z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodOptional<z.ZodString>;
        prompt: z.ZodOptional<z.ZodString>;
        seed: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    }, z.core.$loose>>>;
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
    slot: z.ZodOptional<z.ZodString>;
    layer: z.ZodOptional<z.ZodEnum<{
        behind: "behind";
        front: "front";
    }>>;
    transition: z.ZodOptional<z.ZodLazy<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
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
    }, z.core.$strip>]>>>;
    keys: z.ZodOptional<z.ZodLazy<z.ZodArray<z.ZodObject<{
        at: z.ZodUnion<readonly [z.ZodLazy<z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>, z.ZodObject<{
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
    }, z.core.$strip>>>>;
    native: z.ZodOptional<z.ZodBoolean>;
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
/**
 * The project file: clips (inserts mode), or a whole program described by a cut list or a shots
 * track. `styles` (the CSS list's old name) is still read and becomes `css`, so nothing after
 * parsing sees it; `style` is the video style.
 */
export declare const MotionProjectShape: z.ZodPipe<z.ZodObject<{
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
    css: z.ZodOptional<z.ZodArray<z.ZodString>>;
    styles: z.ZodOptional<z.ZodArray<z.ZodString>>;
    background: z.ZodOptional<z.ZodString>;
    footage: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        src: z.ZodString;
        matte: z.ZodOptional<z.ZodString>;
        start: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodLiteral<"all">]>>;
        transcript: z.ZodOptional<z.ZodString>;
        provenance: z.ZodOptional<z.ZodLazy<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            seed: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
        }, z.core.$loose>>>;
        audio: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<false>]>>;
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
        gain: z.ZodOptional<z.ZodNumber>;
        fade: z.ZodOptional<z.ZodObject<{
            in: z.ZodOptional<z.ZodNumber>;
            out: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        keys: z.ZodOptional<z.ZodArray<z.ZodObject<{
            at: z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>;
            gain: z.ZodNumber;
        }, z.core.$strip>>>;
        provenance: z.ZodOptional<z.ZodLazy<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            seed: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
        }, z.core.$loose>>>;
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
    clips: z.ZodDefault<z.ZodArray<z.ZodObject<{
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
        slot: z.ZodOptional<z.ZodString>;
        layer: z.ZodOptional<z.ZodEnum<{
            behind: "behind";
            front: "front";
        }>>;
        transition: z.ZodOptional<z.ZodLazy<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
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
        }, z.core.$strip>]>>>;
        keys: z.ZodOptional<z.ZodLazy<z.ZodArray<z.ZodObject<{
            at: z.ZodUnion<readonly [z.ZodLazy<z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>, z.ZodObject<{
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
        }, z.core.$strip>>>>;
        native: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    cuts: z.ZodOptional<z.ZodLazy<z.ZodArray<z.ZodObject<{
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
        }, z.core.$strip>]>>;
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
        }, z.core.$strip>]>>;
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
    }, z.core.$strip>>>>;
    shots: z.ZodOptional<z.ZodLazy<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        shot: z.ZodString;
        from: z.ZodLazy<z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>;
        until: z.ZodLazy<z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>;
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
            at: z.ZodUnion<readonly [z.ZodLazy<z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>, z.ZodObject<{
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
        native: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>>;
    sfx: z.ZodOptional<z.ZodLazy<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        at: z.ZodLazy<z.ZodType<MotionAnchor, unknown, z.core.$ZodTypeInternals<MotionAnchor, unknown>>>;
        sound: z.ZodString;
        gain: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>>;
    mix: z.ZodOptional<z.ZodLazy<z.ZodObject<{
        sfx: z.ZodOptional<z.ZodNumber>;
        music: z.ZodOptional<z.ZodNumber>;
        loudness: z.ZodOptional<z.ZodNumber>;
        truePeak: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    duration: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodTransform<{
    size: [number, number];
    fps: number;
    clips: {
        id: string;
        block: string;
        from: MotionAnchor;
        until: MotionAnchor;
        tail?: number | undefined;
        cues?: Record<string, MotionAnchor> | undefined;
        words?: Record<string, string | {
            from: MotionAnchor;
            until: MotionAnchor;
        }> | undefined;
        props?: Record<string, unknown> | undefined;
        alpha?: boolean | undefined;
        background?: string | undefined;
        audio?: string | undefined;
        music?: string | undefined;
        slot?: string | undefined;
        layer?: "behind" | "front" | undefined;
        transition?: string | {
            type: string;
            duration?: number | undefined;
            align?: "start" | "end" | "center" | undefined;
            direction?: "left" | "right" | "up" | "down" | "back" | "forward" | undefined;
            ease?: string | undefined;
            params?: Record<string, unknown> | undefined;
            sound?: string | false | undefined;
            native?: boolean | undefined;
        } | undefined;
        keys?: {
            at: MotionAnchor | {
                moment: string;
            };
            x?: string | number | undefined;
            y?: string | number | undefined;
            scale?: number | undefined;
            rotation?: number | undefined;
            opacity?: number | undefined;
            props?: Record<string, unknown> | undefined;
            ease?: string | undefined;
            mix?: "oklab" | "oklch" | undefined;
        }[] | undefined;
        native?: boolean | undefined;
    }[];
    transcript?: string | undefined;
    fonts?: {
        family: string;
        src: string;
        weight?: string | number | undefined;
        style?: "normal" | "italic" | undefined;
    }[] | undefined;
    css?: string[] | undefined;
    background?: string | undefined;
    footage?: Record<string, {
        src: string;
        matte?: string | undefined;
        start?: number | undefined;
        margin?: number | "all" | undefined;
        transcript?: string | undefined;
        provenance?: {
            [x: string]: unknown;
            provider: string;
            model?: string | undefined;
            prompt?: string | undefined;
            seed?: string | number | undefined;
        } | undefined;
        audio?: string | false | undefined;
    }> | undefined;
    music?: {
        src: string;
        id?: string | undefined;
        beats?: string | undefined;
        from?: number | undefined;
        until?: number | undefined;
        shift?: number | undefined;
        downbeat?: number | undefined;
        tempo?: "double" | "half" | undefined;
        gain?: number | undefined;
        fade?: {
            in?: number | undefined;
            out?: number | undefined;
        } | undefined;
        keys?: {
            at: MotionAnchor;
            gain: number;
        }[] | undefined;
        provenance?: {
            [x: string]: unknown;
            provider: string;
            model?: string | undefined;
            prompt?: string | undefined;
            seed?: string | number | undefined;
        } | undefined;
    }[] | undefined;
    brand?: string | {
        colors: {
            primary: string;
            accent: string;
            background: string;
            surface: string;
            text: string;
            muted: string;
            onPrimary?: string | undefined;
            onAccent?: string | undefined;
            extra?: Record<string, string> | undefined;
        };
        fonts: {
            heading: {
                family: string;
                src: string;
                weight?: string | number | undefined;
                style?: "normal" | "italic" | undefined;
            };
            body: {
                family: string;
                src: string;
                weight?: string | number | undefined;
                style?: "normal" | "italic" | undefined;
            };
            mono?: {
                family: string;
                src: string;
                weight?: string | number | undefined;
                style?: "normal" | "italic" | undefined;
            } | undefined;
        };
        name?: string | undefined;
        logo?: {
            full?: {
                light?: string | undefined;
                dark?: string | undefined;
            } | undefined;
            mark?: {
                light?: string | undefined;
                dark?: string | undefined;
            } | undefined;
        } | undefined;
        radius?: string | number | undefined;
    } | undefined;
    style?: string | {
        name?: string | undefined;
        extends?: string | undefined;
        energy?: "calm" | "balanced" | "punchy" | undefined;
        transitions?: unknown;
        shots?: unknown;
        captions?: unknown;
        sounds?: unknown;
        emphasis?: unknown;
        overlays?: unknown;
    } | undefined;
    safeZone?: "meta" | "all" | "tiktok" | "youtube" | undefined;
    cuts?: {
        source: string;
        id?: string | undefined;
        in?: string | number | {
            say: string;
            edge?: "start" | "end" | "last" | undefined;
            occurrence?: number | undefined;
            offset?: number | undefined;
        } | {
            frame: number;
            offset?: number | undefined;
        } | undefined;
        out?: string | number | {
            say: string;
            edge?: "start" | "end" | "last" | undefined;
            occurrence?: number | undefined;
            offset?: number | undefined;
        } | {
            frame: number;
            offset?: number | undefined;
        } | undefined;
        transition?: string | {
            type: string;
            duration?: number | undefined;
            align?: "start" | "end" | "center" | undefined;
            direction?: "left" | "right" | "up" | "down" | "back" | "forward" | undefined;
            ease?: string | undefined;
            params?: Record<string, unknown> | undefined;
            sound?: string | false | undefined;
            native?: boolean | undefined;
        } | undefined;
        audio?: {
            split?: number | undefined;
            crossfade?: number | undefined;
            gain?: number | undefined;
            mute?: boolean | undefined;
        } | undefined;
        native?: boolean | undefined;
    }[] | undefined;
    shots?: {
        shot: string;
        from: MotionAnchor;
        until: MotionAnchor;
        id?: string | undefined;
        source?: string | {
            name: string;
            in?: string | number | {
                say: string;
                edge?: "start" | "end" | "last" | undefined;
                occurrence?: number | undefined;
                offset?: number | undefined;
            } | {
                frame: number;
                offset?: number | undefined;
            } | undefined;
        } | undefined;
        params?: Record<string, unknown> | undefined;
        morph?: number | undefined;
        transition?: string | {
            type: string;
            duration?: number | undefined;
            align?: "start" | "end" | "center" | undefined;
            direction?: "left" | "right" | "up" | "down" | "back" | "forward" | undefined;
            ease?: string | undefined;
            params?: Record<string, unknown> | undefined;
            sound?: string | false | undefined;
            native?: boolean | undefined;
        } | undefined;
        keys?: {
            at: MotionAnchor | {
                moment: string;
            };
            x?: string | number | undefined;
            y?: string | number | undefined;
            scale?: number | undefined;
            rotation?: number | undefined;
            opacity?: number | undefined;
            props?: Record<string, unknown> | undefined;
            ease?: string | undefined;
            mix?: "oklab" | "oklch" | undefined;
        }[] | undefined;
        native?: boolean | undefined;
    }[] | undefined;
    sfx?: {
        at: MotionAnchor;
        sound: string;
        id?: string | undefined;
        gain?: number | undefined;
    }[] | undefined;
    mix?: {
        sfx?: number | undefined;
        music?: number | undefined;
        loudness?: number | undefined;
        truePeak?: number | undefined;
    } | undefined;
    duration?: number | undefined;
}, {
    size: [number, number];
    fps: number;
    clips: {
        id: string;
        block: string;
        from: MotionAnchor;
        until: MotionAnchor;
        tail?: number | undefined;
        cues?: Record<string, MotionAnchor> | undefined;
        words?: Record<string, string | {
            from: MotionAnchor;
            until: MotionAnchor;
        }> | undefined;
        props?: Record<string, unknown> | undefined;
        alpha?: boolean | undefined;
        background?: string | undefined;
        audio?: string | undefined;
        music?: string | undefined;
        slot?: string | undefined;
        layer?: "behind" | "front" | undefined;
        transition?: string | {
            type: string;
            duration?: number | undefined;
            align?: "start" | "end" | "center" | undefined;
            direction?: "left" | "right" | "up" | "down" | "back" | "forward" | undefined;
            ease?: string | undefined;
            params?: Record<string, unknown> | undefined;
            sound?: string | false | undefined;
            native?: boolean | undefined;
        } | undefined;
        keys?: {
            at: MotionAnchor | {
                moment: string;
            };
            x?: string | number | undefined;
            y?: string | number | undefined;
            scale?: number | undefined;
            rotation?: number | undefined;
            opacity?: number | undefined;
            props?: Record<string, unknown> | undefined;
            ease?: string | undefined;
            mix?: "oklab" | "oklch" | undefined;
        }[] | undefined;
        native?: boolean | undefined;
    }[];
    transcript?: string | undefined;
    fonts?: {
        family: string;
        src: string;
        weight?: string | number | undefined;
        style?: "normal" | "italic" | undefined;
    }[] | undefined;
    css?: string[] | undefined;
    styles?: string[] | undefined;
    background?: string | undefined;
    footage?: Record<string, {
        src: string;
        matte?: string | undefined;
        start?: number | undefined;
        margin?: number | "all" | undefined;
        transcript?: string | undefined;
        provenance?: {
            [x: string]: unknown;
            provider: string;
            model?: string | undefined;
            prompt?: string | undefined;
            seed?: string | number | undefined;
        } | undefined;
        audio?: string | false | undefined;
    }> | undefined;
    music?: {
        src: string;
        id?: string | undefined;
        beats?: string | undefined;
        from?: number | undefined;
        until?: number | undefined;
        shift?: number | undefined;
        downbeat?: number | undefined;
        tempo?: "double" | "half" | undefined;
        gain?: number | undefined;
        fade?: {
            in?: number | undefined;
            out?: number | undefined;
        } | undefined;
        keys?: {
            at: MotionAnchor;
            gain: number;
        }[] | undefined;
        provenance?: {
            [x: string]: unknown;
            provider: string;
            model?: string | undefined;
            prompt?: string | undefined;
            seed?: string | number | undefined;
        } | undefined;
    }[] | undefined;
    brand?: string | {
        colors: {
            primary: string;
            accent: string;
            background: string;
            surface: string;
            text: string;
            muted: string;
            onPrimary?: string | undefined;
            onAccent?: string | undefined;
            extra?: Record<string, string> | undefined;
        };
        fonts: {
            heading: {
                family: string;
                src: string;
                weight?: string | number | undefined;
                style?: "normal" | "italic" | undefined;
            };
            body: {
                family: string;
                src: string;
                weight?: string | number | undefined;
                style?: "normal" | "italic" | undefined;
            };
            mono?: {
                family: string;
                src: string;
                weight?: string | number | undefined;
                style?: "normal" | "italic" | undefined;
            } | undefined;
        };
        name?: string | undefined;
        logo?: {
            full?: {
                light?: string | undefined;
                dark?: string | undefined;
            } | undefined;
            mark?: {
                light?: string | undefined;
                dark?: string | undefined;
            } | undefined;
        } | undefined;
        radius?: string | number | undefined;
    } | undefined;
    style?: string | {
        name?: string | undefined;
        extends?: string | undefined;
        energy?: "calm" | "balanced" | "punchy" | undefined;
        transitions?: unknown;
        shots?: unknown;
        captions?: unknown;
        sounds?: unknown;
        emphasis?: unknown;
        overlays?: unknown;
    } | undefined;
    safeZone?: "meta" | "all" | "tiktok" | "youtube" | undefined;
    cuts?: {
        source: string;
        id?: string | undefined;
        in?: string | number | {
            say: string;
            edge?: "start" | "end" | "last" | undefined;
            occurrence?: number | undefined;
            offset?: number | undefined;
        } | {
            frame: number;
            offset?: number | undefined;
        } | undefined;
        out?: string | number | {
            say: string;
            edge?: "start" | "end" | "last" | undefined;
            occurrence?: number | undefined;
            offset?: number | undefined;
        } | {
            frame: number;
            offset?: number | undefined;
        } | undefined;
        transition?: string | {
            type: string;
            duration?: number | undefined;
            align?: "start" | "end" | "center" | undefined;
            direction?: "left" | "right" | "up" | "down" | "back" | "forward" | undefined;
            ease?: string | undefined;
            params?: Record<string, unknown> | undefined;
            sound?: string | false | undefined;
            native?: boolean | undefined;
        } | undefined;
        audio?: {
            split?: number | undefined;
            crossfade?: number | undefined;
            gain?: number | undefined;
            mute?: boolean | undefined;
        } | undefined;
        native?: boolean | undefined;
    }[] | undefined;
    shots?: {
        shot: string;
        from: MotionAnchor;
        until: MotionAnchor;
        id?: string | undefined;
        source?: string | {
            name: string;
            in?: string | number | {
                say: string;
                edge?: "start" | "end" | "last" | undefined;
                occurrence?: number | undefined;
                offset?: number | undefined;
            } | {
                frame: number;
                offset?: number | undefined;
            } | undefined;
        } | undefined;
        params?: Record<string, unknown> | undefined;
        morph?: number | undefined;
        transition?: string | {
            type: string;
            duration?: number | undefined;
            align?: "start" | "end" | "center" | undefined;
            direction?: "left" | "right" | "up" | "down" | "back" | "forward" | undefined;
            ease?: string | undefined;
            params?: Record<string, unknown> | undefined;
            sound?: string | false | undefined;
            native?: boolean | undefined;
        } | undefined;
        keys?: {
            at: MotionAnchor | {
                moment: string;
            };
            x?: string | number | undefined;
            y?: string | number | undefined;
            scale?: number | undefined;
            rotation?: number | undefined;
            opacity?: number | undefined;
            props?: Record<string, unknown> | undefined;
            ease?: string | undefined;
            mix?: "oklab" | "oklch" | undefined;
        }[] | undefined;
        native?: boolean | undefined;
    }[] | undefined;
    sfx?: {
        at: MotionAnchor;
        sound: string;
        id?: string | undefined;
        gain?: number | undefined;
    }[] | undefined;
    mix?: {
        sfx?: number | undefined;
        music?: number | undefined;
        loudness?: number | undefined;
        truePeak?: number | undefined;
    } | undefined;
    duration?: number | undefined;
}>>;
export type MotionProject = z.output<typeof MotionProjectShape>;
export declare function isMotionProject(value: unknown): boolean;
