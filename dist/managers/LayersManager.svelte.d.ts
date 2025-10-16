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
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "TEXT";
            text: string;
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                text: {
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                backgroundAlwaysVisible?: boolean | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "center" | "left" | "right" | undefined;
            };
            name?: string | undefined;
            checksum?: string | undefined;
            isAIEmoji?: boolean | undefined;
        } | {
            id: string;
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "IMAGE";
            source: {
                startAt: number | null | undefined;
                endAt: number | null | undefined;
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
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                horizontalAlign?: "center" | "left" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
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
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "GIF";
            source: {
                startAt: number | null | undefined;
                endAt: number | null | undefined;
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
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                horizontalAlign?: "center" | "left" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            name?: string | undefined;
            checksum?: string | undefined;
            playback?: {
                loop: boolean;
                speed: number;
            } | undefined;
        } | {
            id: string;
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "VIDEO";
            source: {
                startAt: number | null | undefined;
                endAt: number | null | undefined;
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
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                horizontalAlign?: "center" | "left" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            volume: number;
            muted: boolean;
            name?: string | undefined;
            checksum?: string | undefined;
            playback?: {
                autoplay: boolean;
                loop: boolean;
                playbackRate: number;
                startAt: number;
                endAt?: number | undefined;
            } | undefined;
            crop?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        } | {
            id: string;
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "SHAPE";
            shape: {
                type: "progress";
                progressConfig: {
                    type: "linear";
                    direction: "horizontal" | "vertical";
                    reverse?: boolean | undefined;
                    anchor?: "start" | "end" | "center" | undefined;
                } | {
                    type: "perimeter";
                    startCorner: "top-left" | "top-right" | "bottom-right" | "bottom-left";
                    clockwise?: boolean | undefined;
                    strokeWidth?: number | undefined;
                } | {
                    type: "radial";
                    startAngle?: number | undefined;
                    clockwise?: boolean | undefined;
                    innerRadius?: number | undefined;
                    strokeWidth?: number | undefined;
                    capStyle?: "butt" | "round" | "square" | undefined;
                } | {
                    type: "double";
                    paths: {
                        direction: "horizontal" | "vertical";
                        position: "left" | "right" | "top" | "bottom";
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
                points?: {
                    x: number;
                    y: number;
                }[] | undefined;
                pathData?: string | undefined;
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
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                horizontalAlign?: "center" | "left" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
                color?: string | {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                } | undefined;
            };
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "AUDIO";
            source: {
                startAt: number | null | undefined;
                endAt: number | null | undefined;
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
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                horizontalAlign?: "center" | "left" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            volume: number;
            muted: boolean;
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "COLOR";
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
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                horizontalAlign?: "center" | "left" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "GRADIENT";
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
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                horizontalAlign?: "center" | "left" | "right" | undefined;
                backgroundAlwaysVisible?: boolean | undefined;
            };
            name?: string | undefined;
            checksum?: string | undefined;
        } | {
            id: string;
            timeline: {
                startAt: number;
                endAt: number;
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
            effects: {
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
            visible: boolean;
            order: number;
            type: "SUBTITLES";
            timingAnchor: {
                mode: "ASSET_USAGE" | "COMPONENT";
                offset: number;
                assetId?: string | undefined;
                layerId?: string | undefined;
                componentId?: string | undefined;
            };
            appearance: {
                x: number;
                y: number;
                width: number;
                height: number;
                text: {
                    fontFamily: string;
                    fontSize: {
                        value: number;
                        unit: "px";
                    } | {
                        value: number;
                        unit: "px" | "em" | "rem" | "%";
                    };
                    color: string | {
                        type: "linear" | "radial";
                        colors: string[];
                        stops?: number[] | undefined;
                        angle?: number | undefined;
                        position?: string | undefined;
                        shape?: "ellipse" | "circle" | undefined;
                    };
                    textAlign: "center" | "left" | "right" | "justify";
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
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        color?: string | undefined;
                        blur?: number | undefined;
                        size?: number | undefined;
                        offsetX?: number | undefined;
                        offsetY?: number | undefined;
                        opacity?: number | undefined;
                    } | null | undefined;
                    outline?: {
                        color: string;
                        enabled?: boolean | undefined;
                        preset?: string | undefined;
                        size?: number | undefined;
                        opacity?: number | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                        backgroundColor?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | null | undefined;
                        fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
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
                backgroundAlwaysVisible?: boolean | undefined;
                verticalAlign?: "center" | "top" | "bottom" | undefined;
                horizontalAlign?: "center" | "left" | "right" | undefined;
                hasAIEmojis?: boolean | undefined;
                aiEmojisPlacement?: "top" | "bottom" | undefined;
                aiEmojisPlacementOffset?: number | undefined;
                aiEmojis?: {
                    text: string;
                    emoji: string;
                    startAt: number;
                    endAt: number;
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
            name?: string | undefined;
            checksum?: string | undefined;
            source?: {
                startAt: number | null | undefined;
                endAt: number | null | undefined;
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
                url?: string | undefined;
            } | undefined;
            text?: string | undefined;
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
