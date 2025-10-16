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
                    [x: string]: any;
                    from?: {
                        [x: string]: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null;
                        opacity?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        x?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        y?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        scale?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        scaleX?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        scaleY?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        rotation?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        width?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        height?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                        color?: string | number | boolean | {
                            fromData: string;
                            mode: "cycle" | "useFallback" | "clamp";
                            fallbackValue?: any;
                        } | {
                            type: "byIndex";
                            expression: string;
                            fallbackValue?: any;
                        } | null | undefined;
                    } | undefined;
                    duration?: string | number | boolean | {
                        fromData: string;
                        mode: "cycle" | "useFallback" | "clamp";
                        fallbackValue?: any;
                    } | {
                        type: "byIndex";
                        expression: string;
                        fallbackValue?: any;
                    } | null | undefined;
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
                        dataKey?: string | undefined;
                        referencePoint?: "tweenStart" | undefined;
                        each?: number | undefined;
                        from?: string | number | undefined;
                        grid?: [number | "auto", number | "auto"] | undefined;
                        axis?: "x" | "y" | undefined;
                        ease?: string | undefined;
                        amount?: number | undefined;
                    } | undefined;
                };
                position?: string | number | {
                    anchor: string;
                    alignTween: "start" | "end" | "center";
                    offset: string;
                    anchorPoint?: "start" | "end" | undefined;
                } | undefined;
            }[];
            id?: string | undefined;
            target?: string | undefined;
            position?: string | number | {
                anchor: string;
                alignTween: "start" | "end" | "center";
                offset: string;
                anchorPoint?: "start" | "end" | undefined;
            } | undefined;
        }[];
        presetId?: string | undefined;
        version?: string | undefined;
        description?: string | undefined;
        duration?: number | undefined;
        data?: Record<string, any> | undefined;
        setup?: ({
            type: "style";
            properties: {
                [x: string]: string | number | boolean | {
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
