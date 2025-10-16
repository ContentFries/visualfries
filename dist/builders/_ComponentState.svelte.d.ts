import type { ComponentData, ComponentProps } from '..';
import type { Appearance, AppearanceInput } from '..';
import { EventManager } from '../managers/EventManager.js';
import { StateManager } from '../managers/StateManager.svelte.js';
export declare class ComponentState implements ComponentProps {
    #private;
    private eventManager;
    private sceneState;
    private refreshCallback?;
    constructor(cradle: {
        componentData: ComponentData;
        eventManager: EventManager;
        stateManager: StateManager;
    });
    setRefreshCallback(callback: () => Promise<void>): void;
    private maybeAutoRefresh;
    get id(): string;
    get type(): "IMAGE" | "GIF" | "VIDEO" | "TEXT" | "SHAPE" | "AUDIO" | "COLOR" | "GRADIENT" | "SUBTITLES";
    get name(): string;
    get start_at(): number;
    get end_at(): number;
    set start_at(time: number);
    set end_at(time: number);
    set name(name: string);
    get order(): number;
    get visible(): true;
    get duration(): number;
    get asset_id(): string;
    get timeline(): {
        startAt: number;
        endAt: number;
    };
    get appearance(): Appearance;
    get animations(): {
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
            } | {
                tween: {
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
                };
                id?: string | undefined;
                target?: string | undefined;
            };
            startAt?: number | undefined;
            enabled?: boolean | undefined;
        }[];
        subtitlesSeed?: number | undefined;
    };
    get effects(): {
        enabled: boolean;
        map: Record<string, {
            intensity: number;
            blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
            type: "blur";
            radius: number;
            enabled?: boolean | undefined;
        } | {
            intensity: number;
            blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
            type: "colorAdjustment";
            brightness: number;
            contrast: number;
            saturation: number;
            hue: number;
            enabled?: boolean | undefined;
        } | {
            intensity: number;
            blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
            type: "layoutSplit";
            enabled?: boolean | undefined;
            pieces?: number | undefined;
            sceneWidth?: number | undefined;
            sceneHeight?: number | undefined;
            chunks?: Record<string, any>[] | undefined;
        } | {
            intensity: number;
            blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
            type: "rotationRandomizer";
            maxRotation: number;
            animate: boolean;
            enabled?: boolean | undefined;
            seed?: number | undefined;
        } | {
            type: "fillBackgroundBlur";
            enabled: boolean;
            blurAmount: number;
        } | {
            intensity: number;
            blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
            type: "textShadow";
            enabled?: boolean | undefined;
            preset?: string | undefined;
            color?: string | undefined;
            blur?: number | undefined;
            size?: number | undefined;
            offsetX?: number | undefined;
            offsetY?: number | undefined;
            opacity?: number | undefined;
        } | {
            intensity: number;
            blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
            color: string;
            type: "textOutline";
            enabled?: boolean | undefined;
            preset?: string | undefined;
            size?: number | undefined;
            opacity?: number | undefined;
            style?: "solid" | "dashed" | "dotted" | undefined;
            dashArray?: number[] | undefined;
        }>;
    };
    get checksum(): string;
    getData(): ComponentData;
    setData(data: ComponentData): void;
    setStart(start: number): void;
    setEnd(end: number): void;
    setStreamPath(path: string): void;
    updateText(text: string): Promise<void>;
    update(data: Partial<AppearanceInput>): void;
    updateAppearance(appearance: Partial<AppearanceInput>): Promise<void>;
    setVisible(visible: boolean): Promise<void>;
    setOrder(order: number): Promise<void>;
}
