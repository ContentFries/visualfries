import { z } from 'zod';
/**
 * A point in the program timeline.
 * - number: absolute program seconds
 * - "phrase": transcript phrase, start of its first word
 * - { say, edge?, occurrence?, offset? }: explicit phrase anchor
 * - { frame }: absolute program frame
 */
export declare const MotionAnchorShape: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
export type MotionAnchor = z.infer<typeof MotionAnchorShape>;
/** Words pulled from the transcript: a phrase, a range, or every word in the clip. */
export declare const MotionWordsShape: z.ZodUnion<readonly [z.ZodLiteral<"clip">, z.ZodString, z.ZodObject<{
    from: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
    until: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
export declare const MotionClipShape: z.ZodObject<{
    id: z.ZodString;
    block: z.ZodString;
    from: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
    until: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
    tail: z.ZodOptional<z.ZodNumber>;
    cues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
    }, z.core.$strip>]>>>;
    words: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodLiteral<"clip">, z.ZodString, z.ZodObject<{
        from: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
        until: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
    }, z.core.$strip>]>>>;
    props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    alpha: z.ZodOptional<z.ZodBoolean>;
    background: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type MotionClip = z.infer<typeof MotionClipShape>;
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
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        block: z.ZodString;
        from: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
        until: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
        tail: z.ZodOptional<z.ZodNumber>;
        cues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
        }, z.core.$strip>]>>>;
        words: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodLiteral<"clip">, z.ZodString, z.ZodObject<{
            from: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
            until: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodObject<{
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
        }, z.core.$strip>]>>>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        alpha: z.ZodOptional<z.ZodBoolean>;
        background: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type MotionProject = z.infer<typeof MotionProjectShape>;
export declare function isMotionProject(value: unknown): boolean;
