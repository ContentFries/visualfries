import { AppManager } from './AppManager.svelte.js';
import type { ResourceManager, ILayer } from '..';
import type { SceneLayer, SceneLayerInput } from '..';
import type { AwilixContainer } from 'awilix/browser';
export declare class LayersManager implements ResourceManager<ILayer, SceneLayer, SceneLayerInput> {
    #private;
    layers: Map<string, ILayer>;
    private isBuilding;
    private appManager;
    private container;
    constructor(cradle: {
        container: AwilixContainer;
    });
    setAppManager(appManager: AppManager): void;
    getAll(): ILayer[];
    update(layerId: string, data: Partial<SceneLayerInput>): void;
    get(layerId: string): ILayer | undefined;
    getData(): {
        id: string;
        order: number;
        visible: boolean;
        muted: boolean;
        components: ({
            id: string;
            order: number;
            visible: boolean;
            type: "TEXT";
            timeline: {
                startAt: number;
                endAt: number;
            };
            text: string;
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                text: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                };
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                background?: {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target?: "wrapper" | "element" | undefined;
                    radius?: number | undefined;
                } | {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target: string;
                    radius: number;
                } | null | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            name?: string | undefined;
            checksum?: string | undefined;
            isAIEmoji?: boolean | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            type: "IMAGE";
            timeline: {
                startAt: number;
                endAt: number;
            };
            source: {
                startAt?: number | null | undefined;
                endAt?: number | null | undefined;
                url?: string | undefined;
                streamUrl?: string | undefined;
                assetId?: string | undefined;
                languageCode?: string | undefined;
                metadata?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    duration?: number | undefined;
                    format?: string | undefined;
                    codec?: string | undefined;
                    bitrate?: number | undefined;
                    fps?: number | undefined;
                    hasAudio?: boolean | undefined;
                } | undefined;
                transcriptFormat?: string | undefined;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                background?: {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target?: "wrapper" | "element" | undefined;
                    radius?: number | undefined;
                } | {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target: string;
                    radius: number;
                } | null | undefined;
                text?: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                } | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            name?: string | undefined;
            checksum?: string | undefined;
            crop?: {
                xPercent: number;
                yPercent: number;
                widthPercent: number;
                heightPercent: number;
            } | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            type: "GIF";
            timeline: {
                startAt: number;
                endAt: number;
            };
            source: {
                startAt?: number | null | undefined;
                endAt?: number | null | undefined;
                url?: string | undefined;
                streamUrl?: string | undefined;
                assetId?: string | undefined;
                languageCode?: string | undefined;
                metadata?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    duration?: number | undefined;
                    format?: string | undefined;
                    codec?: string | undefined;
                    bitrate?: number | undefined;
                    fps?: number | undefined;
                    hasAudio?: boolean | undefined;
                } | undefined;
                transcriptFormat?: string | undefined;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                background?: {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target?: "wrapper" | "element" | undefined;
                    radius?: number | undefined;
                } | {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target: string;
                    radius: number;
                } | null | undefined;
                text?: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                } | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            name?: string | undefined;
            checksum?: string | undefined;
            playback?: {
                loop: boolean;
                speed: number;
            } | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            muted: boolean;
            type: "VIDEO";
            timeline: {
                startAt: number;
                endAt: number;
            };
            source: {
                startAt?: number | null | undefined;
                endAt?: number | null | undefined;
                url?: string | undefined;
                streamUrl?: string | undefined;
                assetId?: string | undefined;
                languageCode?: string | undefined;
                metadata?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    duration?: number | undefined;
                    format?: string | undefined;
                    codec?: string | undefined;
                    bitrate?: number | undefined;
                    fps?: number | undefined;
                    hasAudio?: boolean | undefined;
                } | undefined;
                transcriptFormat?: string | undefined;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                background?: {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target?: "wrapper" | "element" | undefined;
                    radius?: number | undefined;
                } | {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target: string;
                    radius: number;
                } | null | undefined;
                text?: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                } | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            volume: number;
            name?: string | undefined;
            checksum?: string | undefined;
            crop?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            playback?: {
                startAt: number;
                loop: boolean;
                autoplay: boolean;
                playbackRate: number;
                endAt?: number | undefined;
            } | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            type: "SHAPE";
            timeline: {
                startAt: number;
                endAt: number;
            };
            shape: {
                type: "progress";
                progressConfig: {
                    type: "linear";
                    direction: "horizontal" | "vertical";
                    reverse?: boolean | undefined;
                    anchor?: "center" | "start" | "end" | undefined;
                } | {
                    type: "perimeter";
                    startCorner: "top-left" | "top-right" | "bottom-right" | "bottom-left";
                    clockwise?: boolean | undefined;
                    strokeWidth?: number | undefined;
                } | {
                    type: "radial";
                    clockwise?: boolean | undefined;
                    strokeWidth?: number | undefined;
                    startAngle?: number | undefined;
                    innerRadius?: number | undefined;
                    capStyle?: "butt" | "round" | "square" | undefined;
                } | {
                    type: "double";
                    paths: {
                        position: "left" | "right" | "top" | "bottom";
                        direction: "horizontal" | "vertical";
                        reverse?: boolean | undefined;
                        offset?: number | undefined;
                    }[];
                } | {
                    type: "custom";
                    pathData: string;
                    strokeWidth?: number | undefined;
                    capStyle?: "butt" | "round" | "square" | undefined;
                };
            } | {
                type: "path" | "ellipse" | "circle" | "rectangle" | "triangle" | "polygon" | "star";
                pathData?: string | undefined;
                points?: {
                    x: number;
                    y: number;
                }[] | undefined;
                cornerRadius?: number | undefined;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                color?: string | {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                } | undefined;
                background?: {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target?: "wrapper" | "element" | undefined;
                    radius?: number | undefined;
                } | {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target: string;
                    radius: number;
                } | null | undefined;
                text?: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                } | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            muted: boolean;
            type: "AUDIO";
            timeline: {
                startAt: number;
                endAt: number;
            };
            source: {
                startAt?: number | null | undefined;
                endAt?: number | null | undefined;
                url?: string | undefined;
                streamUrl?: string | undefined;
                assetId?: string | undefined;
                languageCode?: string | undefined;
                metadata?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    duration?: number | undefined;
                    format?: string | undefined;
                    codec?: string | undefined;
                    bitrate?: number | undefined;
                    fps?: number | undefined;
                    hasAudio?: boolean | undefined;
                } | undefined;
                transcriptFormat?: string | undefined;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                background?: {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target?: "wrapper" | "element" | undefined;
                    radius?: number | undefined;
                } | {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target: string;
                    radius: number;
                } | null | undefined;
                text?: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                } | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            volume: number;
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            type: "COLOR";
            timeline: {
                startAt: number;
                endAt: number;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                background: string;
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                text?: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                } | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            type: "GRADIENT";
            timeline: {
                startAt: number;
                endAt: number;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                background: {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                };
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                text?: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                } | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            order: number;
            visible: boolean;
            type: "SUBTITLES";
            timeline: {
                startAt: number;
                endAt: number;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                text: {
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    textAlign: "left" | "center" | "right" | "justify";
                    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | null | undefined;
                    fontSource?: {
                        source: "custom" | "google";
                        id?: string | undefined;
                        family?: string | undefined;
                        category?: string | null | undefined;
                        subsets?: string[] | null | undefined;
                        variants?: string[] | null | undefined;
                        fileUrl?: string | null | undefined;
                    } | null | undefined;
                    lineHeight?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    letterSpacing?: {
                        value: number;
                        unit: "em";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    } | null | undefined;
                    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
                    shadow?: {
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        color?: string | undefined;
                        preset?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        opacity?: number | undefined;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        style?: "solid" | "dashed" | "dotted" | undefined;
                        dashArray?: number[] | undefined;
                    } | null | undefined;
                    activeLine?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    activeWord?: {
                        enabled: boolean;
                        color?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        scale?: number | undefined;
                        backgroundPaddingX?: number | undefined;
                        backgroundPaddingY?: number | undefined;
                        backgroundBorderRadius?: number | undefined;
                    } | null | undefined;
                    highlightColors?: (string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    })[] | null | undefined;
                };
                offsetX?: number | undefined;
                offsetY?: number | undefined;
                opacity?: number | undefined;
                rotation?: number | undefined;
                scaleX?: number | undefined;
                scaleY?: number | undefined;
                background?: {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target?: "wrapper" | "element" | undefined;
                    radius?: number | undefined;
                } | {
                    enabled: boolean;
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    target: string;
                    radius: number;
                } | null | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "left" | "center" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
                hasAIEmojis?: boolean | undefined;
                aiEmojisPlacement?: "top" | "bottom" | undefined;
                aiEmojisPlacementOffset?: number | undefined;
                aiEmojis?: {
                    startAt: number;
                    endAt: number;
                    text: string;
                    emoji: string;
                    componentId?: string | undefined;
                }[] | undefined;
                highlighterColor1?: string | {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                } | undefined;
                highlighterColor2?: string | {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                } | undefined;
                highlighterColor3?: string | {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                } | undefined;
            };
            animations: {
                enabled: boolean;
                list: {
                    id: string;
                    name: string;
                    animation: string | {
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
                    } | {
                        tween: {
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
                        };
                        id?: string | undefined;
                        target?: string | undefined;
                    };
                    startAt?: number | undefined;
                    enabled?: boolean | undefined;
                }[];
                subtitlesSeed?: number | undefined;
            };
            effects: {
                map: Record<string, {
                    type: "blur";
                    radius: number;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                } | {
                    type: "colorAdjustment";
                    intensity: number;
                    hue: number;
                    saturation: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    brightness: number;
                    contrast: number;
                    enabled?: boolean | undefined;
                } | {
                    type: "layoutSplit";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    enabled?: boolean | undefined;
                    pieces?: number | undefined;
                    sceneWidth?: number | undefined;
                    sceneHeight?: number | undefined;
                    chunks?: Record<string, any>[] | undefined;
                } | {
                    type: "rotationRandomizer";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    maxRotation: number;
                    animate: boolean;
                    enabled?: boolean | undefined;
                    seed?: number | undefined;
                } | {
                    type: "fillBackgroundBlur";
                    enabled: boolean;
                    blurAmount: number;
                } | {
                    type: "textShadow";
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    offsetX?: number | undefined;
                    offsetY?: number | undefined;
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    color?: string | undefined;
                    preset?: string | undefined;
                    blur?: number | undefined;
                    size?: number | undefined;
                } | {
                    type: "textOutline";
                    color: string;
                    intensity: number;
                    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
                    opacity?: number | undefined;
                    enabled?: boolean | undefined;
                    preset?: string | undefined;
                    size?: number | undefined;
                    style?: "solid" | "dashed" | "dotted" | undefined;
                    dashArray?: number[] | undefined;
                }>;
                enabled: boolean;
            };
            timingAnchor: {
                mode: "ASSET_USAGE" | "COMPONENT";
                offset: number;
                assetId?: string | undefined;
                layerId?: string | undefined;
                componentId?: string | undefined;
            };
            name?: string | undefined;
            source?: {
                startAt?: number | null | undefined;
                endAt?: number | null | undefined;
                url?: string | undefined;
                streamUrl?: string | undefined;
                assetId?: string | undefined;
                languageCode?: string | undefined;
                metadata?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    duration?: number | undefined;
                    format?: string | undefined;
                    codec?: string | undefined;
                    bitrate?: number | undefined;
                    fps?: number | undefined;
                    hasAudio?: boolean | undefined;
                } | undefined;
                transcriptFormat?: string | undefined;
            } | undefined;
            text?: string | undefined;
            checksum?: string | undefined;
        })[];
        name?: string | undefined;
    }[];
    delete(layerId: string): void;
    create(layerData: SceneLayer): Promise<ILayer | null>;
    setOrder(id: string, order: number): void;
    moveUp(id: string): void;
    moveDown(id: string): void;
    moveToTop(id: string): void;
    moveToBottom(id: string): void;
    moveAfter(id: string, targetId: string): void;
    moveBefore(id: string, targetId: string): void;
    bulkUpdate(updates: {
        id: string;
        data: Partial<SceneLayerInput>;
    }[]): void;
    bulkDelete(ids: string[]): void;
    hide(id: string): void;
    show(id: string): void;
    toggle(id: string): void;
    filter(predicate: (layer: ILayer) => boolean): ILayer[];
}
