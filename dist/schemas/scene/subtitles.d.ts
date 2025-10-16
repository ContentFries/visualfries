import { z } from 'zod';
/**
 * Compact word metadata object with optional short keys
 */
declare const CompactWordMetadataShape: z.ZodOptional<z.ZodObject<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodAny, z.objectOutputType<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, z.ZodAny, "strip">, z.objectInputType<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, z.ZodAny, "strip">>>;
/**
 * Compact word tuple: [text, start_at, end_at, metadata?]
 */
declare const CompactWordTupleShape: z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<[z.ZodOptional<z.ZodObject<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodAny, z.objectOutputType<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, z.ZodAny, "strip">, z.objectInputType<{
    s: z.ZodOptional<z.ZodNumber>;
    si: z.ZodOptional<z.ZodNumber>;
    c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    e: z.ZodOptional<z.ZodString>;
    w: z.ZodOptional<z.ZodString>;
    f: z.ZodOptional<z.ZodString>;
}, z.ZodAny, "strip">>>, z.ZodNull]>>;
/**
 * Regular word object with full property names
 */
declare const SubtitleWordShape: z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    position?: number | undefined;
}, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    position?: number | undefined;
}>;
/**
 * Subtitle with compact words format
 */
declare const SubtitleWithCompactWordsShape: z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<[z.ZodOptional<z.ZodObject<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip">>>, z.ZodNull]>>, "many">>;
    enlarge: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodEffects<z.ZodString, number | true, string>]>>, number | undefined, string | number | boolean | undefined>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    background: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    background?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    words?: [string, number, number, ...(z.objectOutputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip"> | null | undefined)[]][] | undefined;
    emoji?: string | undefined;
    enlarge?: number | undefined;
}, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    background?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    words?: [string, number, number, ...(z.objectInputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip"> | null | undefined)[]][] | undefined;
    emoji?: string | undefined;
    enlarge?: string | number | boolean | undefined;
}>;
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }, {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }>, "many">>;
    enlarge: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodEffects<z.ZodString, number | true, string>]>>, number | undefined, string | number | boolean | undefined>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | undefined;
    background?: string | undefined;
    words?: {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }[] | undefined;
    emoji?: string | undefined;
    enlarge?: number | undefined;
}, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | undefined;
    background?: string | undefined;
    words?: {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }[] | undefined;
    emoji?: string | undefined;
    enlarge?: string | number | boolean | undefined;
}>;
/**
 * Union type that accepts both formats
 */
declare const SubtitleShape: z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<[z.ZodOptional<z.ZodObject<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip">>>, z.ZodNull]>>, "many">>;
    enlarge: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodEffects<z.ZodString, number | true, string>]>>, number | undefined, string | number | boolean | undefined>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    background: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    background?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    words?: [string, number, number, ...(z.objectOutputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip"> | null | undefined)[]][] | undefined;
    emoji?: string | undefined;
    enlarge?: number | undefined;
}, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    background?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    words?: [string, number, number, ...(z.objectInputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip"> | null | undefined)[]][] | undefined;
    emoji?: string | undefined;
    enlarge?: string | number | boolean | undefined;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }, {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }>, "many">>;
    enlarge: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodEffects<z.ZodString, number | true, string>]>>, number | undefined, string | number | boolean | undefined>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | undefined;
    background?: string | undefined;
    words?: {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }[] | undefined;
    emoji?: string | undefined;
    enlarge?: number | undefined;
}, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | undefined;
    background?: string | undefined;
    words?: {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }[] | undefined;
    emoji?: string | undefined;
    enlarge?: string | number | boolean | undefined;
}>]>;
/**
 * Subtitle collection (language mapping)
 */
declare const SubtitleCollectionShape: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    start_at: z.ZodNumber;
    end_at: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodNumber, z.ZodNumber], z.ZodUnion<[z.ZodOptional<z.ZodObject<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip">>>, z.ZodNull]>>, "many">>;
    enlarge: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodEffects<z.ZodString, number | true, string>]>>, number | undefined, string | number | boolean | undefined>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
    background: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        angle: z.ZodOptional<z.ZodNumber>;
        position: z.ZodOptional<z.ZodString>;
        shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }, {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    }>]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    background?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    words?: [string, number, number, ...(z.objectOutputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip"> | null | undefined)[]][] | undefined;
    emoji?: string | undefined;
    enlarge?: number | undefined;
}, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    background?: string | {
        type: "linear" | "radial";
        colors: string[];
        stops?: number[] | undefined;
        angle?: number | undefined;
        position?: string | undefined;
        shape?: "ellipse" | "circle" | undefined;
    } | undefined;
    words?: [string, number, number, ...(z.objectInputType<{
        s: z.ZodOptional<z.ZodNumber>;
        si: z.ZodOptional<z.ZodNumber>;
        c: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            angle: z.ZodOptional<z.ZodNumber>;
            position: z.ZodOptional<z.ZodString>;
            shape: z.ZodOptional<z.ZodEnum<["ellipse", "circle"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }, {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        }>]>>;
        e: z.ZodOptional<z.ZodString>;
        w: z.ZodOptional<z.ZodString>;
        f: z.ZodOptional<z.ZodString>;
    }, z.ZodAny, "strip"> | null | undefined)[]][] | undefined;
    emoji?: string | undefined;
    enlarge?: string | number | boolean | undefined;
}>, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }, {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }>, "many">>;
    enlarge: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodEffects<z.ZodString, number | true, string>]>>, number | undefined, string | number | boolean | undefined>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | undefined;
    background?: string | undefined;
    words?: {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }[] | undefined;
    emoji?: string | undefined;
    enlarge?: number | undefined;
}, {
    id: string;
    text: string;
    start_at: number;
    end_at: number;
    visible?: boolean | undefined;
    color?: string | undefined;
    background?: string | undefined;
    words?: {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        position?: number | undefined;
    }[] | undefined;
    emoji?: string | undefined;
    enlarge?: string | number | boolean | undefined;
}>]>, "many">>;
export type CompactWordMetadata = z.infer<typeof CompactWordMetadataShape>;
export type CompactWordTuple = z.infer<typeof CompactWordTupleShape>;
export type SubtitleWord = z.infer<typeof SubtitleWordShape>;
export type SubtitleWithCompactWords = z.infer<typeof SubtitleWithCompactWordsShape>;
export type SubtitleWithLegacyWords = z.infer<typeof SubtitleWithLegacyWordsShape>;
export type Subtitle = z.infer<typeof SubtitleShape>;
export type SubtitleCollection = z.infer<typeof SubtitleCollectionShape>;
export { CompactWordMetadataShape, CompactWordTupleShape, SubtitleWordShape, SubtitleWithCompactWordsShape, SubtitleWithLegacyWordsShape, SubtitleShape, SubtitleCollectionShape };
