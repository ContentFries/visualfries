import { z } from 'zod';
/**
 * Gradient definition schema
 * Defines properties for both linear and radial gradients
 */
export declare const GradientDefinitionShape: z.ZodObject<{
    /** Gradient type */
    type: z.ZodEnum<["linear", "radial"]>;
    /** Array of color strings */
    colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
    /** Optional array of stop positions (0-1) matching colors */
    stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    /** Angle in degrees (for linear gradients) */
    angle: z.ZodOptional<z.ZodNumber>;
    /** Position description (for radial gradients) */
    position: z.ZodOptional<z.ZodString>;
    /** Shape type (for radial gradients) */
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
}>;
/**
 * Color type that can be either a string or a gradient object
 */
export declare const ColorTypeShape: z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodObject<{
    /** Gradient type */
    type: z.ZodEnum<["linear", "radial"]>;
    /** Array of color strings */
    colors: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
    /** Optional array of stop positions (0-1) matching colors */
    stops: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    /** Angle in degrees (for linear gradients) */
    angle: z.ZodOptional<z.ZodNumber>;
    /** Position description (for radial gradients) */
    position: z.ZodOptional<z.ZodString>;
    /** Shape type (for radial gradients) */
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
}>]>;
/**
 * Position property schema
 * Defines the position of a component within the scene
 */
export declare const PositionShape: z.ZodObject<{
    /** X-coordinate position (from left) */
    x: z.ZodNumber;
    /** Y-coordinate position (from top) */
    y: z.ZodNumber;
    /** Rotation in degrees */
    rotation: z.ZodDefault<z.ZodNumber>;
    /** Anchor point for transformations (0,0 is top-left, 1,1 is bottom-right) */
    anchor: z.ZodDefault<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x?: number | undefined;
        y?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    rotation: number;
    anchor: {
        x: number;
        y: number;
    };
}, {
    x: number;
    y: number;
    rotation?: number | undefined;
    anchor?: {
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}>;
/**
 * Size property schema
 * Defines the dimensions of a component
 */
export declare const SizeShape: z.ZodObject<{
    /** Width in pixels */
    width: z.ZodNumber;
    /** Height in pixels */
    height: z.ZodNumber;
    /** Uniform scale factor */
    scale: z.ZodDefault<z.ZodNumber>;
    /** Whether to maintain aspect ratio when resizing */
    maintainAspectRatio: z.ZodDefault<z.ZodBoolean>;
    /** Original dimensions before any transformations */
    original: z.ZodOptional<z.ZodObject<{
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        width?: number | undefined;
        height?: number | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    scale: number;
    maintainAspectRatio: boolean;
    original?: {
        width?: number | undefined;
        height?: number | undefined;
    } | undefined;
}, {
    width: number;
    height: number;
    scale?: number | undefined;
    maintainAspectRatio?: boolean | undefined;
    original?: {
        width?: number | undefined;
        height?: number | undefined;
    } | undefined;
}>;
/**
 * Transform property schema
 * Defines additional transformations beyond basic position and size
 */
export declare const TransformShape: z.ZodObject<{
    /** Horizontal scale factor (1 = 100%) */
    scaleX: z.ZodDefault<z.ZodNumber>;
    /** Vertical scale factor (1 = 100%) */
    scaleY: z.ZodDefault<z.ZodNumber>;
    /** Horizontal skew in degrees */
    skewX: z.ZodDefault<z.ZodNumber>;
    /** Vertical skew in degrees */
    skewY: z.ZodDefault<z.ZodNumber>;
    /** Origin point for transformations */
    transformOrigin: z.ZodOptional<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x?: number | undefined;
        y?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    scaleX: number;
    scaleY: number;
    skewX: number;
    skewY: number;
    transformOrigin?: {
        x: number;
        y: number;
    } | undefined;
}, {
    scaleX?: number | undefined;
    scaleY?: number | undefined;
    skewX?: number | undefined;
    skewY?: number | undefined;
    transformOrigin?: {
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}>;
/**
 * Shadow effect schema
 */
export declare const ShadowShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    /** Optional preset name */
    preset: z.ZodOptional<z.ZodString>;
    /** Shadow color */
    color: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** Shadow blur radius in pixels */
    blur: z.ZodOptional<z.ZodNumber>;
    /** Shadow size in pixels */
    size: z.ZodOptional<z.ZodNumber>;
    /** Horizontal offset in pixels */
    offsetX: z.ZodOptional<z.ZodNumber>;
    /** Vertical offset in pixels */
    offsetY: z.ZodOptional<z.ZodNumber>;
    /** Shadow opacity (0-1) */
    opacity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    offsetX?: number | undefined;
    offsetY?: number | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    color?: string | undefined;
    preset?: string | undefined;
    blur?: number | undefined;
    size?: number | undefined;
}, {
    offsetX?: number | undefined;
    offsetY?: number | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    color?: string | undefined;
    preset?: string | undefined;
    blur?: number | undefined;
    size?: number | undefined;
}>;
/**
 * Outline/Stroke effect schema
 */
export declare const OutlineShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    /** Optional preset name */
    preset: z.ZodOptional<z.ZodString>;
    /** Outline color */
    color: z.ZodEffects<z.ZodString, string, string>;
    /** Outline width in pixels */
    size: z.ZodOptional<z.ZodNumber>;
    /** Outline opacity (0-1) */
    opacity: z.ZodOptional<z.ZodNumber>;
    /** Outline style (Note: style/dashArray not in schema-llm.md, maybe remove?) */
    style: z.ZodOptional<z.ZodDefault<z.ZodEnum<["solid", "dashed", "dotted"]>>>;
    /** Custom dash pattern (only for 'dashed' style) */
    dashArray: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    color: string;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    preset?: string | undefined;
    size?: number | undefined;
    style?: "solid" | "dashed" | "dotted" | undefined;
    dashArray?: number[] | undefined;
}, {
    color: string;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    preset?: string | undefined;
    size?: number | undefined;
    style?: "solid" | "dashed" | "dotted" | undefined;
    dashArray?: number[] | undefined;
}>;
/**
 * Font size with unit schema
 */
export declare const FontSizeShape: z.ZodObject<{
    /** Font size value */
    value: z.ZodNumber;
    /** Font size unit */
    unit: z.ZodDefault<z.ZodEnum<["px", "em", "rem", "%"]>>;
}, "strip", z.ZodTypeAny, {
    value: number;
    unit: "px" | "em" | "rem" | "%";
}, {
    value: number;
    unit?: "px" | "em" | "rem" | "%" | undefined;
}>;
/**
 * Line height with unit schema
 */
export declare const LineHeightShape: z.ZodObject<{
    /** Line height value */
    value: z.ZodNumber;
    /** Line height unit */
    unit: z.ZodDefault<z.ZodEnum<["normal", "px", "em", "%"]>>;
}, "strip", z.ZodTypeAny, {
    value: number;
    unit: "px" | "em" | "%" | "normal";
}, {
    value: number;
    unit?: "px" | "em" | "%" | "normal" | undefined;
}>;
/**
 * Color with opacity schema
 */
export declare const ColorWithOpacityShape: z.ZodObject<{
    /** Color value (hex, rgb, rgba, etc.) */
    color: z.ZodEffects<z.ZodString, string, string>;
    /** Opacity (0-1) */
    opacity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    opacity: number;
    color: string;
}, {
    color: string;
    opacity?: number | undefined;
}>;
/**
 * Gradient stop schema
 */
export declare const GradientStopShape: z.ZodObject<{
    /** Color value */
    color: z.ZodEffects<z.ZodString, string, string>;
    /** Position in the gradient (0-1) */
    position: z.ZodNumber;
    /** Opacity (0-1) */
    opacity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    opacity: number;
    position: number;
    color: string;
}, {
    position: number;
    color: string;
    opacity?: number | undefined;
}>;
/**
 * Gradient background schema
 */
export declare const GradientShape: z.ZodObject<{
    /** Gradient type */
    type: z.ZodEnum<["linear", "radial"]>;
    /** Gradient stops */
    stops: z.ZodArray<z.ZodObject<{
        /** Color value */
        color: z.ZodEffects<z.ZodString, string, string>;
        /** Position in the gradient (0-1) */
        position: z.ZodNumber;
        /** Opacity (0-1) */
        opacity: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        opacity: number;
        position: number;
        color: string;
    }, {
        position: number;
        color: string;
        opacity?: number | undefined;
    }>, "many">;
    /** Angle in degrees (for linear gradients) */
    angle: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    /** Center position (for radial gradients) */
    center: z.ZodOptional<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x?: number | undefined;
        y?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "linear" | "radial";
    stops: {
        opacity: number;
        position: number;
        color: string;
    }[];
    angle?: number | undefined;
    center?: {
        x: number;
        y: number;
    } | undefined;
}, {
    type: "linear" | "radial";
    stops: {
        position: number;
        color: string;
        opacity?: number | undefined;
    }[];
    angle?: number | undefined;
    center?: {
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}>;
/**
 * Animation timing schema
 * Defines timing properties for animations
 */
export declare const AnimationTimingShape: z.ZodObject<{
    /** Delay before animation starts (in seconds) */
    delay: z.ZodDefault<z.ZodNumber>;
    /** Animation duration (in seconds) */
    duration: z.ZodEffects<z.ZodDefault<z.ZodNumber>, number, number | undefined>;
    /** Number of times the animation repeats (-1 for infinite) */
    repeat: z.ZodDefault<z.ZodNumber>;
    /** Delay between animation repetitions (in seconds) */
    repeatDelay: z.ZodDefault<z.ZodNumber>;
    /** Time between successive animations in seconds (for staggered animations) */
    stagger: z.ZodDefault<z.ZodNumber>;
    /** Whether to reverse the animation on alternate repeats */
    yoyo: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    delay: number;
    stagger: number;
    repeat: number;
    repeatDelay: number;
    yoyo: boolean;
}, {
    duration?: number | undefined;
    delay?: number | undefined;
    stagger?: number | undefined;
    repeat?: number | undefined;
    repeatDelay?: number | undefined;
    yoyo?: boolean | undefined;
}>;
/**
 * Animation easing schema
 * Defines how animations accelerate and decelerate
 */
export declare const AnimationEasingShape: z.ZodUnion<[z.ZodEnum<["linear", "power1.in", "power1.out", "power1.inOut", "power2.in", "power2.out", "power2.inOut", "power3.in", "power3.out", "power3.inOut", "power4.in", "power4.out", "power4.inOut", "back.in", "back.out", "back.inOut", "elastic.in", "elastic.out", "elastic.inOut", "bounce.in", "bounce.out", "bounce.inOut", "circ.in", "circ.out", "circ.inOut", "expo.in", "expo.out", "expo.inOut", "sine.in", "sine.out", "sine.inOut"]>, z.ZodObject<{
    type: z.ZodLiteral<"cubicBezier">;
    x1: z.ZodNumber;
    y1: z.ZodNumber;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "cubicBezier";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}, {
    type: "cubicBezier";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}>]>;
/**
 * Keyframe schema
 * Defines a single keyframe in an animation
 */
export declare const KeyframeShape: z.ZodObject<{
    /** Time position in seconds relative to animation start */
    time: z.ZodEffects<z.ZodNumber, number, number>;
    /** Target property values at this keyframe */
    value: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    /** Easing to use when transitioning to this keyframe */
    easing: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["linear", "power1.in", "power1.out", "power1.inOut", "power2.in", "power2.out", "power2.inOut", "power3.in", "power3.out", "power3.inOut", "power4.in", "power4.out", "power4.inOut", "back.in", "back.out", "back.inOut", "elastic.in", "elastic.out", "elastic.inOut", "bounce.in", "bounce.out", "bounce.inOut", "circ.in", "circ.out", "circ.inOut", "expo.in", "expo.out", "expo.inOut", "sine.in", "sine.out", "sine.inOut"]>, z.ZodObject<{
        type: z.ZodLiteral<"cubicBezier">;
        x1: z.ZodNumber;
        y1: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }, {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }>]>>;
}, "strip", z.ZodTypeAny, {
    value: Record<string, string | number | boolean>;
    time: number;
    easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | undefined;
}, {
    value: Record<string, string | number | boolean>;
    time: number;
    easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | undefined;
}>;
/**
 * Animation target schema
 * Defines what elements an animation affects
 */
export declare const AnimationTargetShape: z.ZodEnum<["element", "words", "lines", "chars", "transform", "opacity", "position", "size"]>;
/**
 * Enhanced animation schema
 * Comprehensive definition of an animation
 */
export declare const EnhancedAnimationShape: z.ZodObject<{
    /** Unique identifier */
    id: z.ZodString;
    /** Animation name */
    name: z.ZodString;
    /** Animation type */
    type: z.ZodEnum<["preset", "custom", "keyframe"]>;
    /** Preset identifier (for preset animations) */
    presetId: z.ZodOptional<z.ZodString>;
    /** What the animation targets */
    target: z.ZodDefault<z.ZodEnum<["element", "words", "lines", "chars", "transform", "opacity", "position", "size"]>>;
    /** Animation timing properties */
    timing: z.ZodDefault<z.ZodObject<{
        /** Delay before animation starts (in seconds) */
        delay: z.ZodDefault<z.ZodNumber>;
        /** Animation duration (in seconds) */
        duration: z.ZodEffects<z.ZodDefault<z.ZodNumber>, number, number | undefined>;
        /** Number of times the animation repeats (-1 for infinite) */
        repeat: z.ZodDefault<z.ZodNumber>;
        /** Delay between animation repetitions (in seconds) */
        repeatDelay: z.ZodDefault<z.ZodNumber>;
        /** Time between successive animations in seconds (for staggered animations) */
        stagger: z.ZodDefault<z.ZodNumber>;
        /** Whether to reverse the animation on alternate repeats */
        yoyo: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        delay: number;
        stagger: number;
        repeat: number;
        repeatDelay: number;
        yoyo: boolean;
    }, {
        duration?: number | undefined;
        delay?: number | undefined;
        stagger?: number | undefined;
        repeat?: number | undefined;
        repeatDelay?: number | undefined;
        yoyo?: boolean | undefined;
    }>>;
    /** Animation easing */
    easing: z.ZodDefault<z.ZodUnion<[z.ZodEnum<["linear", "power1.in", "power1.out", "power1.inOut", "power2.in", "power2.out", "power2.inOut", "power3.in", "power3.out", "power3.inOut", "power4.in", "power4.out", "power4.inOut", "back.in", "back.out", "back.inOut", "elastic.in", "elastic.out", "elastic.inOut", "bounce.in", "bounce.out", "bounce.inOut", "circ.in", "circ.out", "circ.inOut", "expo.in", "expo.out", "expo.inOut", "sine.in", "sine.out", "sine.inOut"]>, z.ZodObject<{
        type: z.ZodLiteral<"cubicBezier">;
        x1: z.ZodNumber;
        y1: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }, {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }>]>>;
    /** For keyframe animations: the keyframes */
    keyframes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Time position in seconds relative to animation start */
        time: z.ZodEffects<z.ZodNumber, number, number>;
        /** Target property values at this keyframe */
        value: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        /** Easing to use when transitioning to this keyframe */
        easing: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["linear", "power1.in", "power1.out", "power1.inOut", "power2.in", "power2.out", "power2.inOut", "power3.in", "power3.out", "power3.inOut", "power4.in", "power4.out", "power4.inOut", "back.in", "back.out", "back.inOut", "elastic.in", "elastic.out", "elastic.inOut", "bounce.in", "bounce.out", "bounce.inOut", "circ.in", "circ.out", "circ.inOut", "expo.in", "expo.out", "expo.inOut", "sine.in", "sine.out", "sine.inOut"]>, z.ZodObject<{
            type: z.ZodLiteral<"cubicBezier">;
            x1: z.ZodNumber;
            y1: z.ZodNumber;
            x2: z.ZodNumber;
            y2: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "cubicBezier";
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        }, {
            type: "cubicBezier";
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        value: Record<string, string | number | boolean>;
        time: number;
        easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
            type: "cubicBezier";
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        } | undefined;
    }, {
        value: Record<string, string | number | boolean>;
        time: number;
        easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
            type: "cubicBezier";
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        } | undefined;
    }>, "many">>;
    /** Whether animation plays automatically */
    autoplay: z.ZodDefault<z.ZodBoolean>;
    /** Whether to preserve transform styles that aren't explicitly animated */
    preserveTransform: z.ZodDefault<z.ZodBoolean>;
    /** Additional animation parameters */
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    type: "custom" | "preset" | "keyframe";
    target: "opacity" | "position" | "element" | "size" | "words" | "lines" | "chars" | "transform";
    autoplay: boolean;
    easing: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    };
    timing: {
        duration: number;
        delay: number;
        stagger: number;
        repeat: number;
        repeatDelay: number;
        yoyo: boolean;
    };
    preserveTransform: boolean;
    presetId?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
    keyframes?: {
        value: Record<string, string | number | boolean>;
        time: number;
        easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
            type: "cubicBezier";
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        } | undefined;
    }[] | undefined;
}, {
    id: string;
    name: string;
    type: "custom" | "preset" | "keyframe";
    target?: "opacity" | "position" | "element" | "size" | "words" | "lines" | "chars" | "transform" | undefined;
    presetId?: string | undefined;
    autoplay?: boolean | undefined;
    parameters?: Record<string, unknown> | undefined;
    easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | undefined;
    timing?: {
        duration?: number | undefined;
        delay?: number | undefined;
        stagger?: number | undefined;
        repeat?: number | undefined;
        repeatDelay?: number | undefined;
        yoyo?: boolean | undefined;
    } | undefined;
    keyframes?: {
        value: Record<string, string | number | boolean>;
        time: number;
        easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
            type: "cubicBezier";
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        } | undefined;
    }[] | undefined;
    preserveTransform?: boolean | undefined;
}>;
/**
 * Transition schema
 * Defines a transition between two components or states
 */
export declare const TransitionShape: z.ZodObject<{
    /** Unique identifier */
    id: z.ZodString;
    /** Transition name */
    name: z.ZodOptional<z.ZodString>;
    /** Source component ID */
    fromComponentId: z.ZodString;
    /** Target component ID */
    toComponentId: z.ZodString;
    /** Transition type */
    type: z.ZodEnum<["fade", "slide", "zoom", "wipe", "custom", "preset"]>;
    /** Preset identifier (for preset transitions) */
    presetId: z.ZodOptional<z.ZodString>;
    /** Transition duration in seconds */
    duration: z.ZodEffects<z.ZodNumber, number, number>;
    /** Transition direction (for directional transitions) */
    direction: z.ZodOptional<z.ZodEnum<["left", "right", "up", "down", "in", "out"]>>;
    /** Transition easing */
    easing: z.ZodDefault<z.ZodUnion<[z.ZodEnum<["linear", "power1.in", "power1.out", "power1.inOut", "power2.in", "power2.out", "power2.inOut", "power3.in", "power3.out", "power3.inOut", "power4.in", "power4.out", "power4.inOut", "back.in", "back.out", "back.inOut", "elastic.in", "elastic.out", "elastic.inOut", "bounce.in", "bounce.out", "bounce.inOut", "circ.in", "circ.out", "circ.inOut", "expo.in", "expo.out", "expo.inOut", "sine.in", "sine.out", "sine.inOut"]>, z.ZodObject<{
        type: z.ZodLiteral<"cubicBezier">;
        x1: z.ZodNumber;
        y1: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }, {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }>]>>;
    /** Additional transition parameters */
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "custom" | "preset" | "zoom" | "fade" | "slide" | "wipe";
    duration: number;
    fromComponentId: string;
    toComponentId: string;
    easing: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    };
    name?: string | undefined;
    presetId?: string | undefined;
    direction?: "left" | "right" | "up" | "down" | "in" | "out" | undefined;
    parameters?: Record<string, unknown> | undefined;
}, {
    id: string;
    type: "custom" | "preset" | "zoom" | "fade" | "slide" | "wipe";
    duration: number;
    fromComponentId: string;
    toComponentId: string;
    name?: string | undefined;
    presetId?: string | undefined;
    direction?: "left" | "right" | "up" | "down" | "in" | "out" | undefined;
    parameters?: Record<string, unknown> | undefined;
    easing?: "linear" | "power1.in" | "power1.out" | "power1.inOut" | "power2.in" | "power2.out" | "power2.inOut" | "power3.in" | "power3.out" | "power3.inOut" | "power4.in" | "power4.out" | "power4.inOut" | "back.in" | "back.out" | "back.inOut" | "bounce.in" | "bounce.out" | "bounce.inOut" | "circ.in" | "circ.out" | "circ.inOut" | "elastic.in" | "elastic.out" | "elastic.inOut" | "expo.in" | "expo.out" | "expo.inOut" | "sine.in" | "sine.out" | "sine.inOut" | {
        type: "cubicBezier";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | undefined;
}>;
/**
 * Effect schema base
 * Base schema for all effects
 */
export declare const EffectBaseShape: z.ZodObject<{
    /** Effect type */
    type: z.ZodString;
    /** Whether the effect is enabled */
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    /** Effect intensity (0-1) */
    intensity: z.ZodDefault<z.ZodNumber>;
    /** Effect mix blend mode */
    blendMode: z.ZodDefault<z.ZodEnum<["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    intensity: number;
    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
    enabled?: boolean | undefined;
}, {
    type: string;
    enabled?: boolean | undefined;
    intensity?: number | undefined;
    blendMode?: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity" | undefined;
}>;
/**
 * Blur effect schema
 */
export declare const BlurEffectShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    intensity: z.ZodDefault<z.ZodNumber>;
    blendMode: z.ZodDefault<z.ZodEnum<["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]>>;
} & {
    type: z.ZodLiteral<"blur">;
    radius: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "blur";
    radius: number;
    intensity: number;
    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
    enabled?: boolean | undefined;
}, {
    type: "blur";
    enabled?: boolean | undefined;
    radius?: number | undefined;
    intensity?: number | undefined;
    blendMode?: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity" | undefined;
}>;
/**
 * Color adjustment effect schema
 */
export declare const ColorAdjustmentEffectShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    intensity: z.ZodDefault<z.ZodNumber>;
    blendMode: z.ZodDefault<z.ZodEnum<["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]>>;
} & {
    type: z.ZodLiteral<"colorAdjustment">;
    brightness: z.ZodDefault<z.ZodNumber>;
    contrast: z.ZodDefault<z.ZodNumber>;
    saturation: z.ZodDefault<z.ZodNumber>;
    hue: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "colorAdjustment";
    intensity: number;
    hue: number;
    saturation: number;
    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
    brightness: number;
    contrast: number;
    enabled?: boolean | undefined;
}, {
    type: "colorAdjustment";
    enabled?: boolean | undefined;
    intensity?: number | undefined;
    hue?: number | undefined;
    saturation?: number | undefined;
    blendMode?: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity" | undefined;
    brightness?: number | undefined;
    contrast?: number | undefined;
}>;
/**
 * Union of all effect types
 */
export declare const EffectShape: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    intensity: z.ZodDefault<z.ZodNumber>;
    blendMode: z.ZodDefault<z.ZodEnum<["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]>>;
} & {
    type: z.ZodLiteral<"blur">;
    radius: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "blur";
    radius: number;
    intensity: number;
    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
    enabled?: boolean | undefined;
}, {
    type: "blur";
    enabled?: boolean | undefined;
    radius?: number | undefined;
    intensity?: number | undefined;
    blendMode?: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity" | undefined;
}>, z.ZodObject<{
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    intensity: z.ZodDefault<z.ZodNumber>;
    blendMode: z.ZodDefault<z.ZodEnum<["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]>>;
} & {
    type: z.ZodLiteral<"colorAdjustment">;
    brightness: z.ZodDefault<z.ZodNumber>;
    contrast: z.ZodDefault<z.ZodNumber>;
    saturation: z.ZodDefault<z.ZodNumber>;
    hue: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "colorAdjustment";
    intensity: number;
    hue: number;
    saturation: number;
    blendMode: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity";
    brightness: number;
    contrast: number;
    enabled?: boolean | undefined;
}, {
    type: "colorAdjustment";
    enabled?: boolean | undefined;
    intensity?: number | undefined;
    hue?: number | undefined;
    saturation?: number | undefined;
    blendMode?: "color" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "luminosity" | undefined;
    brightness?: number | undefined;
    contrast?: number | undefined;
}>]>;
export type Position = z.infer<typeof PositionShape>;
export type Size = z.infer<typeof SizeShape>;
export type Transform = z.infer<typeof TransformShape>;
export type Shadow = z.infer<typeof ShadowShape>;
export type Outline = z.infer<typeof OutlineShape>;
export type FontSize = z.infer<typeof FontSizeShape>;
export type LineHeight = z.infer<typeof LineHeightShape>;
export type ColorWithOpacity = z.infer<typeof ColorWithOpacityShape>;
export type GradientStop = z.infer<typeof GradientStopShape>;
export type Gradient = z.infer<typeof GradientShape>;
export type AnimationTiming = z.infer<typeof AnimationTimingShape>;
export type AnimationEasing = z.infer<typeof AnimationEasingShape>;
export type Keyframe = z.infer<typeof KeyframeShape>;
export type AnimationTarget = z.infer<typeof AnimationTargetShape>;
export type EnhancedAnimation = z.infer<typeof EnhancedAnimationShape>;
export type Transition = z.infer<typeof TransitionShape>;
export type EffectBase = z.infer<typeof EffectBaseShape>;
export type BlurEffect = z.infer<typeof BlurEffectShape>;
export type ColorAdjustmentEffect = z.infer<typeof ColorAdjustmentEffectShape>;
export type Effect = z.infer<typeof EffectShape>;
export type ColorType = z.infer<typeof ColorTypeShape>;
export type GradientDefinition = z.infer<typeof GradientDefinitionShape>;
