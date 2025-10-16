import type { AnimationPreset } from "..";
export declare class AnimationPresetsRegister {
    #private;
    private presets;
    constructor();
    register(preset: AnimationPreset): void;
    getPresets(): Map<string, {
        id: string;
        timeline: {
            tweens: {
                method: "set" | "to" | "from" | "fromTo";
                vars: {
                    duration?: string | number | boolean | {
                        fromData: string;
                        mode: "cycle" | "useFallback" | "clamp";
                        fallbackValue?: any;
                    } | {
                        type: "byIndex";
                        expression: string;
                        fallbackValue?: any;
                    } | null | undefined;
                    from?: import("zod").objectOutputType<{
                        opacity: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        x: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        y: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        scale: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        scaleX: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        scaleY: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        rotation: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        width: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        height: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                        color: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                            fromData: import("zod").ZodString;
                            mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        }, {
                            fromData: string;
                            mode?: "cycle" | "useFallback" | "clamp" | undefined;
                            fallbackValue?: any;
                        }>, import("zod").ZodObject<{
                            type: import("zod").ZodLiteral<"byIndex">;
                            expression: import("zod").ZodString;
                            fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                        }, "strip", import("zod").ZodTypeAny, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }, {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        }>]>>;
                    }, import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull, import("zod").ZodObject<{
                        fromData: import("zod").ZodString;
                        mode: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<["cycle", "useFallback", "clamp"]>>>;
                        fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                    }, "strip", import("zod").ZodTypeAny, {
                        fromData: string;
                        mode: "cycle" | "useFallback" | "clamp";
                        fallbackValue?: any;
                    }, {
                        fromData: string;
                        mode?: "cycle" | "useFallback" | "clamp" | undefined;
                        fallbackValue?: any;
                    }>, import("zod").ZodObject<{
                        type: import("zod").ZodLiteral<"byIndex">;
                        expression: import("zod").ZodString;
                        fallbackValue: import("zod").ZodOptional<import("zod").ZodAny>;
                    }, "strip", import("zod").ZodTypeAny, {
                        type: "byIndex";
                        expression: string;
                        fallbackValue?: any;
                    }, {
                        type: "byIndex";
                        expression: string;
                        fallbackValue?: any;
                    }>]>, "strip"> | undefined;
                    ease?: string | undefined;
                    delay?: string | number | boolean | {
                        fromData: string;
                        mode: "cycle" | "useFallback" | "clamp";
                        fallbackValue?: any;
                    } | {
                        type: "byIndex";
                        expression: string;
                        fallbackValue?: any;
                    } | null | undefined;
                    stagger?: number | {
                        type?: "fromData" | undefined;
                        from?: string | number | undefined;
                        ease?: string | undefined;
                        dataKey?: string | undefined;
                        referencePoint?: "tweenStart" | undefined;
                        each?: number | undefined;
                        grid?: [number | "auto", number | "auto"] | undefined;
                        axis?: "x" | "y" | undefined;
                        amount?: number | undefined;
                    } | undefined;
                } & {
                    [k: string]: any;
                };
                position?: string | number | {
                    anchor: string;
                    alignTween: "center" | "start" | "end";
                    offset: string;
                    anchorPoint?: "start" | "end" | undefined;
                } | undefined;
            }[];
            id?: string | undefined;
            position?: string | number | {
                anchor: string;
                alignTween: "center" | "start" | "end";
                offset: string;
                anchorPoint?: "start" | "end" | undefined;
            } | undefined;
            target?: string | undefined;
        }[];
        presetId?: string | undefined;
        version?: string | undefined;
        description?: string | undefined;
        duration?: number | undefined;
        data?: Record<string, any> | undefined;
        setup?: ({
            type: "style";
            properties: {} & {
                [k: string]: string | number | boolean | {
                    fromData: string;
                    mode: "cycle" | "useFallback" | "clamp";
                    fallbackValue?: any;
                } | {
                    type: "byIndex";
                    expression: string;
                    fallbackValue?: any;
                } | null;
            };
        } | {
            type: "splitText";
            by: "words" | "lines" | "chars";
        })[] | undefined;
        revertAfterComplete?: boolean | undefined;
    }>;
}
