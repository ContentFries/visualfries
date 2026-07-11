import { z } from 'zod';
import { type Scene } from '../schemas/scene/index.js';
export declare const ProductionPlanShape: z.ZodObject<{
    version: z.ZodLiteral<1>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    settings: z.ZodObject<{
        width: z.ZodDefault<z.ZodNumber>;
        height: z.ZodDefault<z.ZodNumber>;
        duration: z.ZodNumber;
        fps: z.ZodDefault<z.ZodNumber>;
        backgroundColor: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    beats: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        start: z.ZodNumber;
        end: z.ZodNumber;
        media: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
            type: z.ZodOptional<z.ZodEnum<{
                VIDEO: "VIDEO";
                GIF: "GIF";
                IMAGE: "IMAGE";
            }>>;
            start: z.ZodNumber;
            end: z.ZodNumber;
            sourceStart: z.ZodOptional<z.ZodNumber>;
            sourceEnd: z.ZodOptional<z.ZodNumber>;
            freezeAt: z.ZodOptional<z.ZodNumber>;
            motion: z.ZodOptional<z.ZodEnum<{
                none: "none";
                "slow-zoom-in": "slow-zoom-in";
                "slow-zoom-out": "slow-zoom-out";
                "drift-up": "drift-up";
            }>>;
            fade: z.ZodOptional<z.ZodNumber>;
            muted: z.ZodOptional<z.ZodBoolean>;
            volume: z.ZodOptional<z.ZodNumber>;
            x: z.ZodOptional<z.ZodNumber>;
            y: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            order: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
        overlays: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            text: z.ZodString;
            start: z.ZodNumber;
            end: z.ZodNumber;
            style: z.ZodOptional<z.ZodEnum<{
                "pop-label": "pop-label";
                "shock-word": "shock-word";
                "soft-card": "soft-card";
                "hook-punch": "hook-punch";
                "proof-pill": "proof-pill";
                "danger-crossout": "danger-crossout";
                "metric-badge": "metric-badge";
                "cta-card": "cta-card";
                "verdict-slam": "verdict-slam";
                "receipt-metric": "receipt-metric";
                "micro-proof": "micro-proof";
            }>>;
            x: z.ZodOptional<z.ZodNumber>;
            y: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            color: z.ZodOptional<z.ZodString>;
            backgroundColor: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            fontWeight: z.ZodOptional<z.ZodEnum<{
                700: "700";
                800: "800";
                900: "900";
            }>>;
            textTransform: z.ZodOptional<z.ZodEnum<{
                none: "none";
                uppercase: "uppercase";
            }>>;
            rotation: z.ZodOptional<z.ZodNumber>;
            outlineColor: z.ZodOptional<z.ZodString>;
            outlineSize: z.ZodOptional<z.ZodNumber>;
            animated: z.ZodOptional<z.ZodBoolean>;
            renderAs: z.ZodDefault<z.ZodEnum<{
                TEXT: "TEXT";
                SVG: "SVG";
            }>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    audio: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        url: z.ZodString;
        startAt: z.ZodNumber;
        endAt: z.ZodOptional<z.ZodNumber>;
        volume: z.ZodDefault<z.ZodNumber>;
        muted: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    transitions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        time: z.ZodNumber;
        duration: z.ZodOptional<z.ZodNumber>;
        style: z.ZodDefault<z.ZodEnum<{
            "dip-to-black": "dip-to-black";
            flash: "flash";
            "swipe-left": "swipe-left";
            "swipe-up": "swipe-up";
            "focus-pull": "focus-pull";
        }>>;
        color: z.ZodOptional<z.ZodString>;
        animated: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    qa: z.ZodDefault<z.ZodObject<{
        framesAt: z.ZodDefault<z.ZodArray<z.ZodNumber>>;
        maxLeadingSilence: z.ZodOptional<z.ZodNumber>;
        requiredText: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ProductionPlan = z.infer<typeof ProductionPlanShape>;
export declare function compileProductionPlan(input: {
    plan: unknown;
    planPath?: string;
    generatedAssetsDir?: string;
}): Promise<{
    scene: Scene;
    plan: ProductionPlan;
    generatedAssets: string[];
    qaFrameIndices: number[];
}>;
