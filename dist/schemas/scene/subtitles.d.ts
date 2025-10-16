import { z } from 'zod';
/**
 * Compact word metadata object with optional short keys
 */
declare const CompactWordMetadataShape: z.ZodOptional<z.ZodObject<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, z.core.$catchall<z.ZodAny>>>;
/**
 * Compact word tuple: [text, start_at, end_at, metadata?]
 */
declare const CompactWordTupleShape: z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<readonly [z.ZodOptional<z.ZodObject<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, z.core.$catchall<z.ZodAny>>>, z.ZodNull]>>;
/**
 * Regular word object with full property names
 */
declare const SubtitleWordShape: z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    position: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Subtitle with compact words format
 */
declare const SubtitleWithCompactWordsShape: z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<readonly [z.ZodOptional<z.ZodObject<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            type: z.ZodEnum<{
                linear: "linear";
                radial: "radial";
            }>;
            colors: z.ZodArray<z.ZodString>;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<{
                ellipse: "ellipse";
                circle: "circle";
            }>>;
        }, z.core.$strip>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.core.$catchall<z.ZodAny>>>, z.ZodNull]>>>>;
    enlarge: z.ZodOptional<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number | true, string>>]>>, z.ZodTransform<number | undefined, number | boolean | undefined>>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
    background: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
/**
 * Subtitle with regular words format (legacy)
 */
declare const SubtitleWithLegacyWordsShape: z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        start_at: z.ZodNumber;
        end_at: z.ZodNumber;
        text: z.ZodString;
        position: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    enlarge: z.ZodOptional<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number | true, string>>]>>, z.ZodTransform<number | undefined, number | boolean | undefined>>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Union type that accepts both formats
 */
declare const SubtitleShape: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<readonly [z.ZodOptional<z.ZodObject<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            type: z.ZodEnum<{
                linear: "linear";
                radial: "radial";
            }>;
            colors: z.ZodArray<z.ZodString>;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<{
                ellipse: "ellipse";
                circle: "circle";
            }>>;
        }, z.core.$strip>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.core.$catchall<z.ZodAny>>>, z.ZodNull]>>>>;
    enlarge: z.ZodOptional<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number | true, string>>]>>, z.ZodTransform<number | undefined, number | boolean | undefined>>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
    background: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        start_at: z.ZodNumber;
        end_at: z.ZodNumber;
        text: z.ZodString;
        position: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    enlarge: z.ZodOptional<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number | true, string>>]>>, z.ZodTransform<number | undefined, number | boolean | undefined>>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
/**
 * Subtitle collection (language mapping)
 */
declare const SubtitleCollectionShape: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<readonly [z.ZodOptional<z.ZodObject<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            type: z.ZodEnum<{
                linear: "linear";
                radial: "radial";
            }>;
            colors: z.ZodArray<z.ZodString>;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<{
                ellipse: "ellipse";
                circle: "circle";
            }>>;
        }, z.core.$strip>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.core.$catchall<z.ZodAny>>>, z.ZodNull]>>>>;
    enlarge: z.ZodOptional<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number | true, string>>]>>, z.ZodTransform<number | undefined, number | boolean | undefined>>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
    background: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            linear: "linear";
            radial: "radial";
        }>;
        colors: z.ZodArray<z.ZodString>;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<{
            ellipse: "ellipse";
            circle: "circle";
        }>>;
    }, z.core.$strip>]>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        start_at: z.ZodNumber;
        end_at: z.ZodNumber;
        text: z.ZodString;
        position: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    enlarge: z.ZodOptional<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number | true, string>>]>>, z.ZodTransform<number | undefined, number | boolean | undefined>>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>>>;
export type CompactWordMetadata = z.infer<typeof CompactWordMetadataShape>;
export type CompactWordTuple = z.infer<typeof CompactWordTupleShape>;
export type SubtitleWord = z.infer<typeof SubtitleWordShape>;
export type SubtitleWithCompactWords = z.infer<typeof SubtitleWithCompactWordsShape>;
export type SubtitleWithLegacyWords = z.infer<typeof SubtitleWithLegacyWordsShape>;
export type Subtitle = z.infer<typeof SubtitleShape>;
export type SubtitleCollection = z.infer<typeof SubtitleCollectionShape>;
export { CompactWordMetadataShape, CompactWordTupleShape, SubtitleWordShape, SubtitleWithCompactWordsShape, SubtitleWithLegacyWordsShape, SubtitleShape, SubtitleCollectionShape };
