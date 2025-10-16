import { EventManager } from './EventManager.js';
import type { BuilderState, IStateManager } from '..';
import type { RenderEnvironment, Scene as SceneData } from '..';
import { TimeManager } from './TimeManager.svelte.js';
import type { LayersManager } from './LayersManager.svelte.js';
type Zone = {
    start: number;
    end: number;
};
export declare class StateManager implements IStateManager {
    state: BuilderState;
    isPlaying: boolean;
    renderAfterLoadingFinished: boolean;
    private currentTimeRune;
    scale: number;
    private loadingComponents;
    private currentSceneData;
    private charactersList;
    private isDirtyFlag;
    private eventManager;
    private env;
    private loop;
    private timeManager;
    private layersManager;
    constructor(cradle: {
        sceneData: SceneData;
        environment: RenderEnvironment;
        scale: number;
        eventManager: EventManager;
        loop: boolean;
        timeManager: TimeManager;
        layersManager: LayersManager;
    });
    updateSceneData(sceneData: Partial<SceneData>): void;
    updateSceneSubtitlesSettings(subtitlesSettings: SceneData['settings']['subtitles']): void;
    get currentTime(): number;
    get data(): {
        id: string;
        settings: {
            width: number;
            height: number;
            duration: number;
            fps: number;
            backgroundColor: string | {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            };
            language_code?: string | undefined;
            startAt?: number | undefined;
            endAt?: number | undefined;
            trimZones?: {
                start: number;
                end: number;
            }[] | undefined;
            audio?: {
                volume: number;
                muted: boolean;
                src?: string | undefined;
            } | undefined;
            subtitles?: {
                punctuation: boolean;
                mergeGap?: number | undefined;
                data?: Record<string, Record<string, ({
                    id: string;
                    start_at: number;
                    end_at: number;
                    text: string;
                    words?: [string, number, number, ...({
                        [x: string]: any;
                        s?: number | undefined;
                        si?: number | undefined;
                        c?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | undefined;
                        e?: string | undefined;
                        w?: string | undefined;
                        f?: string | undefined;
                    } | null | undefined)[]][] | undefined;
                    enlarge?: number | undefined;
                    visible?: boolean | undefined;
                    emoji?: string | undefined;
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
                } | {
                    id: string;
                    start_at: number;
                    end_at: number;
                    text: string;
                    words?: {
                        id: string;
                        start_at: number;
                        end_at: number;
                        text: string;
                        position?: number | undefined;
                    }[] | undefined;
                    enlarge?: number | undefined;
                    visible?: boolean | undefined;
                    emoji?: string | undefined;
                    color?: string | undefined;
                    background?: string | undefined;
                })[]>> | undefined;
            } | undefined;
        };
        assets: {
            id: string;
            type: "IMAGE" | "GIF" | "VIDEO" | "AUDIO" | "FONT";
            url: string;
            path?: string | undefined;
            language_code?: string | undefined;
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
            subtitles?: {
                url?: string | undefined;
                language_code?: string | undefined;
                subtitles?: {
                    id: string;
                    start_at: number;
                    end_at: number;
                    text: string;
                    words?: [string, number, number, ...({
                        [x: string]: any;
                        s?: number | undefined;
                        si?: number | undefined;
                        c?: string | {
                            type: "linear" | "radial";
                            colors: string[];
                            stops?: number[] | undefined;
                            angle?: number | undefined;
                            position?: string | undefined;
                            shape?: "ellipse" | "circle" | undefined;
                        } | undefined;
                        e?: string | undefined;
                        w?: string | undefined;
                        f?: string | undefined;
                    } | null | undefined)[]][] | undefined;
                    enlarge?: number | undefined;
                    visible?: boolean | undefined;
                    emoji?: string | undefined;
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
                }[] | undefined;
            }[] | undefined;
        }[];
        layers: {
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
                    url?: string | undefined;
                    streamUrl?: string | undefined;
                    assetId?: string | undefined;
                    languageCode?: string | undefined;
                    startAt?: number | null | undefined;
                    endAt?: number | null | undefined;
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
                    url?: string | undefined;
                    streamUrl?: string | undefined;
                    assetId?: string | undefined;
                    languageCode?: string | undefined;
                    startAt?: number | null | undefined;
                    endAt?: number | null | undefined;
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
                    url?: string | undefined;
                    streamUrl?: string | undefined;
                    assetId?: string | undefined;
                    languageCode?: string | undefined;
                    startAt?: number | null | undefined;
                    endAt?: number | null | undefined;
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
                    url?: string | undefined;
                    streamUrl?: string | undefined;
                    assetId?: string | undefined;
                    languageCode?: string | undefined;
                    startAt?: number | null | undefined;
                    endAt?: number | null | undefined;
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
                    streamUrl?: string | undefined;
                    assetId?: string | undefined;
                    languageCode?: string | undefined;
                    startAt?: number | null | undefined;
                    endAt?: number | null | undefined;
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
        transitions: {
            id: string;
            fromComponentId: string;
            toComponentId: string;
            type: string;
            duration: number;
            name?: string | undefined;
            presetId?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
        }[];
        audioTracks: {
            id: string;
            url: string;
            volume: number;
            startAt: number;
            endAt: number | undefined;
            muted: boolean;
            name?: string | undefined;
        }[];
        version?: string | undefined;
        name?: string | undefined;
        checksum?: string | undefined;
    };
    updateLayers(): void;
    get environment(): RenderEnvironment;
    getCharactersList(): string[];
    setCharactersList(chars: string[]): void;
    setScale(scale: number): void;
    get startTime(): number;
    get endTime(): number;
    setCurrentTime(time: number): void;
    setStartAt(start: number | undefined): void;
    setEndAt(end: number | undefined): void;
    get currentFrame(): number;
    get disabledTimeZones(): Zone[];
    changeState(updateState: 'playing' | 'paused'): void;
    private determineNewState;
    transformTime(time: number, skipDurationCheck?: boolean): number;
    private updatePlayingState;
    private emitStateChange;
    private emit;
    private refreshState;
    get duration(): number;
    get width(): number;
    get height(): number;
    setDuration(dur: number): void;
    setWidth(width: number): void;
    setHeight(height: number): void;
    setRenderAfterLoadingFinished(newVal: boolean): void;
    addLoadingComponent(componentId: string, type?: string): void;
    removeLoadingComponent(componentId: string): void;
    isLoadingComponent(componentId: string): boolean;
    /**
     * Mark scene as dirty (visual changes occurred)
     * Should be called by hooks/components after visual updates
     */
    markDirty(): void;
    /**
     * Clear dirty flag after successful render
     * Should be called by RenderFrameCommand after frame extraction
     */
    clearDirty(): void;
    /**
     * Check if scene has visual changes since last render
     */
    get isDirty(): boolean;
    destroy(): void;
}
export {};
