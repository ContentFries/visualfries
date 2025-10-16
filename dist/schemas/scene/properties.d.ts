import { z } from 'zod';
/**
 * Gradient definition schema
 * Defines properties for both linear and radial gradients
 */
export declare const GradientDefinitionShape: z.ZodObject<{
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
}, z.core.$strip>;
/**
 * Color type that can be either a string or a gradient object
 */
export declare const ColorTypeShape: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
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
}, z.core.$strip>]>;
/**
 * Position property schema
 * Defines the position of a component within the scene
 */
export declare const PositionShape: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodPrefault<z.ZodNumber>;
    anchor: z.ZodPrefault<z.ZodObject<{
        x: z.ZodPrefault<z.ZodNumber>;
        y: z.ZodPrefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Size property schema
 * Defines the dimensions of a component
 */
export declare const SizeShape: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
    scale: z.ZodPrefault<z.ZodNumber>;
    maintainAspectRatio: z.ZodPrefault<z.ZodBoolean>;
    original: z.ZodOptional<z.ZodObject<{
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Transform property schema
 * Defines additional transformations beyond basic position and size
 */
export declare const TransformShape: z.ZodObject<{
    scaleX: z.ZodPrefault<z.ZodNumber>;
    scaleY: z.ZodPrefault<z.ZodNumber>;
    skewX: z.ZodPrefault<z.ZodNumber>;
    skewY: z.ZodPrefault<z.ZodNumber>;
    transformOrigin: z.ZodOptional<z.ZodObject<{
        x: z.ZodPrefault<z.ZodNumber>;
        y: z.ZodPrefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Shadow effect schema
 */
export declare const ShadowShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    preset: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    blur: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Outline/Stroke effect schema
 */
export declare const OutlineShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    preset: z.ZodOptional<z.ZodString>;
    color: z.ZodString;
    size: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    style: z.ZodOptional<z.ZodPrefault<z.ZodEnum<{
        solid: "solid";
        dashed: "dashed";
        dotted: "dotted";
    }>>>;
    dashArray: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
/**
 * Font size with unit schema
 */
export declare const FontSizeShape: z.ZodObject<{
    value: z.ZodNumber;
    unit: z.ZodPrefault<z.ZodEnum<{
        px: "px";
        em: "em";
        rem: "rem";
        "%": "%";
    }>>;
}, z.core.$strip>;
/**
 * Line height with unit schema
 */
export declare const LineHeightShape: z.ZodObject<{
    value: z.ZodNumber;
    unit: z.ZodPrefault<z.ZodEnum<{
        normal: "normal";
        px: "px";
        em: "em";
        "%": "%";
    }>>;
}, z.core.$strip>;
/**
 * Color with opacity schema
 */
export declare const ColorWithOpacityShape: z.ZodObject<{
    color: z.ZodString;
    opacity: z.ZodPrefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Gradient stop schema
 */
export declare const GradientStopShape: z.ZodObject<{
    color: z.ZodString;
    position: z.ZodNumber;
    opacity: z.ZodPrefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Gradient background schema
 */
export declare const GradientShape: z.ZodObject<{
    type: z.ZodEnum<{
        linear: "linear";
        radial: "radial";
    }>;
    stops: z.ZodArray<z.ZodObject<{
        color: z.ZodString;
        position: z.ZodNumber;
        opacity: z.ZodPrefault<z.ZodNumber>;
    }, z.core.$strip>>;
    angle: z.ZodOptional<z.ZodPrefault<z.ZodNumber>>;
    center: z.ZodOptional<z.ZodObject<{
        x: z.ZodPrefault<z.ZodNumber>;
        y: z.ZodPrefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Animation timing schema
 * Defines timing properties for animations
 */
export declare const AnimationTimingShape: z.ZodObject<{
    delay: z.ZodPrefault<z.ZodNumber>;
    duration: z.ZodPipe<z.ZodPrefault<z.ZodNumber>, z.ZodTransform<number, number>>;
    repeat: z.ZodPrefault<z.ZodInt>;
    repeatDelay: z.ZodPrefault<z.ZodNumber>;
    stagger: z.ZodPrefault<z.ZodNumber>;
    yoyo: z.ZodPrefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Animation easing schema
 * Defines how animations accelerate and decelerate
 */
export declare const AnimationEasingShape: z.ZodUnion<readonly [z.ZodEnum<{
    linear: "linear";
    "power1.in": "power1.in";
    "power1.out": "power1.out";
    "power1.inOut": "power1.inOut";
    "power2.in": "power2.in";
    "power2.out": "power2.out";
    "power2.inOut": "power2.inOut";
    "power3.in": "power3.in";
    "power3.out": "power3.out";
    "power3.inOut": "power3.inOut";
    "power4.in": "power4.in";
    "power4.out": "power4.out";
    "power4.inOut": "power4.inOut";
    "back.in": "back.in";
    "back.out": "back.out";
    "back.inOut": "back.inOut";
    "bounce.in": "bounce.in";
    "bounce.out": "bounce.out";
    "bounce.inOut": "bounce.inOut";
    "circ.in": "circ.in";
    "circ.out": "circ.out";
    "circ.inOut": "circ.inOut";
    "elastic.in": "elastic.in";
    "elastic.out": "elastic.out";
    "elastic.inOut": "elastic.inOut";
    "expo.in": "expo.in";
    "expo.out": "expo.out";
    "expo.inOut": "expo.inOut";
    "sine.in": "sine.in";
    "sine.out": "sine.out";
    "sine.inOut": "sine.inOut";
}>, z.ZodObject<{
    type: z.ZodLiteral<"cubicBezier">;
    x1: z.ZodNumber;
    y1: z.ZodNumber;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
}, z.core.$strip>]>;
/**
 * Keyframe schema
 * Defines a single keyframe in an animation
 */
export declare const KeyframeShape: z.ZodObject<{
    time: z.ZodPipe<z.ZodNumber, z.ZodTransform<number, number>>;
    value: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    easing: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        linear: "linear";
        "power1.in": "power1.in";
        "power1.out": "power1.out";
        "power1.inOut": "power1.inOut";
        "power2.in": "power2.in";
        "power2.out": "power2.out";
        "power2.inOut": "power2.inOut";
        "power3.in": "power3.in";
        "power3.out": "power3.out";
        "power3.inOut": "power3.inOut";
        "power4.in": "power4.in";
        "power4.out": "power4.out";
        "power4.inOut": "power4.inOut";
        "back.in": "back.in";
        "back.out": "back.out";
        "back.inOut": "back.inOut";
        "bounce.in": "bounce.in";
        "bounce.out": "bounce.out";
        "bounce.inOut": "bounce.inOut";
        "circ.in": "circ.in";
        "circ.out": "circ.out";
        "circ.inOut": "circ.inOut";
        "elastic.in": "elastic.in";
        "elastic.out": "elastic.out";
        "elastic.inOut": "elastic.inOut";
        "expo.in": "expo.in";
        "expo.out": "expo.out";
        "expo.inOut": "expo.inOut";
        "sine.in": "sine.in";
        "sine.out": "sine.out";
        "sine.inOut": "sine.inOut";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"cubicBezier">;
        x1: z.ZodNumber;
        y1: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
/**
 * Animation target schema
 * Defines what elements an animation affects
 */
export declare const AnimationTargetShape: z.ZodEnum<{
    transform: "transform";
    words: "words";
    lines: "lines";
    chars: "chars";
    position: "position";
    opacity: "opacity";
    size: "size";
    element: "element";
}>;
/**
 * Enhanced animation schema
 * Comprehensive definition of an animation
 */
export declare const EnhancedAnimationShape: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        custom: "custom";
        preset: "preset";
        keyframe: "keyframe";
    }>;
    presetId: z.ZodOptional<z.ZodString>;
    target: z.ZodPrefault<z.ZodEnum<{
        transform: "transform";
        words: "words";
        lines: "lines";
        chars: "chars";
        position: "position";
        opacity: "opacity";
        size: "size";
        element: "element";
    }>>;
    timing: z.ZodPrefault<z.ZodObject<{
        delay: z.ZodPrefault<z.ZodNumber>;
        duration: z.ZodPipe<z.ZodPrefault<z.ZodNumber>, z.ZodTransform<number, number>>;
        repeat: z.ZodPrefault<z.ZodInt>;
        repeatDelay: z.ZodPrefault<z.ZodNumber>;
        stagger: z.ZodPrefault<z.ZodNumber>;
        yoyo: z.ZodPrefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    easing: z.ZodPrefault<z.ZodUnion<readonly [z.ZodEnum<{
        linear: "linear";
        "power1.in": "power1.in";
        "power1.out": "power1.out";
        "power1.inOut": "power1.inOut";
        "power2.in": "power2.in";
        "power2.out": "power2.out";
        "power2.inOut": "power2.inOut";
        "power3.in": "power3.in";
        "power3.out": "power3.out";
        "power3.inOut": "power3.inOut";
        "power4.in": "power4.in";
        "power4.out": "power4.out";
        "power4.inOut": "power4.inOut";
        "back.in": "back.in";
        "back.out": "back.out";
        "back.inOut": "back.inOut";
        "bounce.in": "bounce.in";
        "bounce.out": "bounce.out";
        "bounce.inOut": "bounce.inOut";
        "circ.in": "circ.in";
        "circ.out": "circ.out";
        "circ.inOut": "circ.inOut";
        "elastic.in": "elastic.in";
        "elastic.out": "elastic.out";
        "elastic.inOut": "elastic.inOut";
        "expo.in": "expo.in";
        "expo.out": "expo.out";
        "expo.inOut": "expo.inOut";
        "sine.in": "sine.in";
        "sine.out": "sine.out";
        "sine.inOut": "sine.inOut";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"cubicBezier">;
        x1: z.ZodNumber;
        y1: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
    }, z.core.$strip>]>>;
    keyframes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        time: z.ZodPipe<z.ZodNumber, z.ZodTransform<number, number>>;
        value: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        easing: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            linear: "linear";
            "power1.in": "power1.in";
            "power1.out": "power1.out";
            "power1.inOut": "power1.inOut";
            "power2.in": "power2.in";
            "power2.out": "power2.out";
            "power2.inOut": "power2.inOut";
            "power3.in": "power3.in";
            "power3.out": "power3.out";
            "power3.inOut": "power3.inOut";
            "power4.in": "power4.in";
            "power4.out": "power4.out";
            "power4.inOut": "power4.inOut";
            "back.in": "back.in";
            "back.out": "back.out";
            "back.inOut": "back.inOut";
            "bounce.in": "bounce.in";
            "bounce.out": "bounce.out";
            "bounce.inOut": "bounce.inOut";
            "circ.in": "circ.in";
            "circ.out": "circ.out";
            "circ.inOut": "circ.inOut";
            "elastic.in": "elastic.in";
            "elastic.out": "elastic.out";
            "elastic.inOut": "elastic.inOut";
            "expo.in": "expo.in";
            "expo.out": "expo.out";
            "expo.inOut": "expo.inOut";
            "sine.in": "sine.in";
            "sine.out": "sine.out";
            "sine.inOut": "sine.inOut";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"cubicBezier">;
            x1: z.ZodNumber;
            y1: z.ZodNumber;
            x2: z.ZodNumber;
            y2: z.ZodNumber;
        }, z.core.$strip>]>>;
    }, z.core.$strip>>>;
    autoplay: z.ZodPrefault<z.ZodBoolean>;
    preserveTransform: z.ZodPrefault<z.ZodBoolean>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
/**
 * Transition schema
 * Defines a transition between two components or states
 */
export declare const TransitionShape: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    fromComponentId: z.ZodString;
    toComponentId: z.ZodString;
    type: z.ZodEnum<{
        custom: "custom";
        preset: "preset";
        zoom: "zoom";
        fade: "fade";
        slide: "slide";
        wipe: "wipe";
    }>;
    presetId: z.ZodOptional<z.ZodString>;
    duration: z.ZodPipe<z.ZodNumber, z.ZodTransform<number, number>>;
    direction: z.ZodOptional<z.ZodEnum<{
        in: "in";
        out: "out";
        left: "left";
        right: "right";
        up: "up";
        down: "down";
    }>>;
    easing: z.ZodPrefault<z.ZodUnion<readonly [z.ZodEnum<{
        linear: "linear";
        "power1.in": "power1.in";
        "power1.out": "power1.out";
        "power1.inOut": "power1.inOut";
        "power2.in": "power2.in";
        "power2.out": "power2.out";
        "power2.inOut": "power2.inOut";
        "power3.in": "power3.in";
        "power3.out": "power3.out";
        "power3.inOut": "power3.inOut";
        "power4.in": "power4.in";
        "power4.out": "power4.out";
        "power4.inOut": "power4.inOut";
        "back.in": "back.in";
        "back.out": "back.out";
        "back.inOut": "back.inOut";
        "bounce.in": "bounce.in";
        "bounce.out": "bounce.out";
        "bounce.inOut": "bounce.inOut";
        "circ.in": "circ.in";
        "circ.out": "circ.out";
        "circ.inOut": "circ.inOut";
        "elastic.in": "elastic.in";
        "elastic.out": "elastic.out";
        "elastic.inOut": "elastic.inOut";
        "expo.in": "expo.in";
        "expo.out": "expo.out";
        "expo.inOut": "expo.inOut";
        "sine.in": "sine.in";
        "sine.out": "sine.out";
        "sine.inOut": "sine.inOut";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"cubicBezier">;
        x1: z.ZodNumber;
        y1: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
    }, z.core.$strip>]>>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
/**
 * Effect schema base
 * Base schema for all effects
 */
export declare const EffectBaseShape: z.ZodObject<{
    type: z.ZodString;
    enabled: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    intensity: z.ZodPrefault<z.ZodNumber>;
    blendMode: z.ZodPrefault<z.ZodEnum<{
        color: "color";
        normal: "normal";
        multiply: "multiply";
        screen: "screen";
        overlay: "overlay";
        darken: "darken";
        lighten: "lighten";
        "color-dodge": "color-dodge";
        "color-burn": "color-burn";
        "hard-light": "hard-light";
        "soft-light": "soft-light";
        difference: "difference";
        exclusion: "exclusion";
        hue: "hue";
        saturation: "saturation";
        luminosity: "luminosity";
    }>>;
}, z.core.$strip>;
/**
 * Blur effect schema
 */
export declare const BlurEffectShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    intensity: z.ZodPrefault<z.ZodNumber>;
    blendMode: z.ZodPrefault<z.ZodEnum<{
        color: "color";
        normal: "normal";
        multiply: "multiply";
        screen: "screen";
        overlay: "overlay";
        darken: "darken";
        lighten: "lighten";
        "color-dodge": "color-dodge";
        "color-burn": "color-burn";
        "hard-light": "hard-light";
        "soft-light": "soft-light";
        difference: "difference";
        exclusion: "exclusion";
        hue: "hue";
        saturation: "saturation";
        luminosity: "luminosity";
    }>>;
    type: z.ZodLiteral<"blur">;
    radius: z.ZodPrefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Color adjustment effect schema
 */
export declare const ColorAdjustmentEffectShape: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    intensity: z.ZodPrefault<z.ZodNumber>;
    blendMode: z.ZodPrefault<z.ZodEnum<{
        color: "color";
        normal: "normal";
        multiply: "multiply";
        screen: "screen";
        overlay: "overlay";
        darken: "darken";
        lighten: "lighten";
        "color-dodge": "color-dodge";
        "color-burn": "color-burn";
        "hard-light": "hard-light";
        "soft-light": "soft-light";
        difference: "difference";
        exclusion: "exclusion";
        hue: "hue";
        saturation: "saturation";
        luminosity: "luminosity";
    }>>;
    type: z.ZodLiteral<"colorAdjustment">;
    brightness: z.ZodPrefault<z.ZodNumber>;
    contrast: z.ZodPrefault<z.ZodNumber>;
    saturation: z.ZodPrefault<z.ZodNumber>;
    hue: z.ZodPrefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Union of all effect types
 */
export declare const EffectShape: z.ZodDiscriminatedUnion<[z.ZodObject<{
    enabled: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    intensity: z.ZodPrefault<z.ZodNumber>;
    blendMode: z.ZodPrefault<z.ZodEnum<{
        color: "color";
        normal: "normal";
        multiply: "multiply";
        screen: "screen";
        overlay: "overlay";
        darken: "darken";
        lighten: "lighten";
        "color-dodge": "color-dodge";
        "color-burn": "color-burn";
        "hard-light": "hard-light";
        "soft-light": "soft-light";
        difference: "difference";
        exclusion: "exclusion";
        hue: "hue";
        saturation: "saturation";
        luminosity: "luminosity";
    }>>;
    type: z.ZodLiteral<"blur">;
    radius: z.ZodPrefault<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    enabled: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    intensity: z.ZodPrefault<z.ZodNumber>;
    blendMode: z.ZodPrefault<z.ZodEnum<{
        color: "color";
        normal: "normal";
        multiply: "multiply";
        screen: "screen";
        overlay: "overlay";
        darken: "darken";
        lighten: "lighten";
        "color-dodge": "color-dodge";
        "color-burn": "color-burn";
        "hard-light": "hard-light";
        "soft-light": "soft-light";
        difference: "difference";
        exclusion: "exclusion";
        hue: "hue";
        saturation: "saturation";
        luminosity: "luminosity";
    }>>;
    type: z.ZodLiteral<"colorAdjustment">;
    brightness: z.ZodPrefault<z.ZodNumber>;
    contrast: z.ZodPrefault<z.ZodNumber>;
    saturation: z.ZodPrefault<z.ZodNumber>;
    hue: z.ZodPrefault<z.ZodNumber>;
}, z.core.$strip>], "type">;
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
