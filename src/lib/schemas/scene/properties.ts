import { z } from 'zod';
import { isValidColor } from './utils.js';
import {
	coerceValidNumber,
	coerceNumber,
	coercePositiveNumber,
	coerceNormalizedNumber,
	coerceNonNegativeNumber,
	coerceInteger
} from './utils.js';

// Utility functions
const toFixed3 = (val: number) => parseFloat(val.toFixed(3));
const toFixed3Optional = (val: number | undefined | null) => {
	if (val === undefined || val === null) return val;
	return parseFloat(val.toFixed(3));
};

/**
 * Gradient definition schema
 * Defines properties for both linear and radial gradients
 */
export const GradientDefinitionShape = z.object({
	/** Gradient type */
	type: z.enum(['linear', 'radial']),
	/** Array of color strings */
	colors: z.array(z.string().refine(isValidColor, {
        error: 'Invalid gradient color'
    })).min(2),
	/** Optional array of stop positions (0-1) matching colors */
	stops: z.array(coerceNormalizedNumber()).optional(),
	/** Angle in degrees (for linear gradients) */
	angle: coerceNumber(-360, 360).optional(),
	/** Position description (for radial gradients) */
	position: z.string().optional(),
	/** Shape type (for radial gradients) */
	shape: z.enum(['ellipse', 'circle']).optional()
});

/**
 * Color type that can be either a string or a gradient object
 */
export const ColorTypeShape = z.union([
	z.string().refine(isValidColor, {
		error: 'Invalid color format'
	}),
	GradientDefinitionShape
]);

/**
 * Position property schema
 * Defines the position of a component within the scene
 */
export const PositionShape = z.object({
	/** X-coordinate position (from left) */
	x: coerceValidNumber(),
	/** Y-coordinate position (from top) */
	y: coerceValidNumber(),
	/** Rotation in degrees */
	rotation: coerceValidNumber().prefault(0),
	/** Anchor point for transformations (0,0 is top-left, 1,1 is bottom-right) */
	anchor: z
		.object({
			x: coerceNormalizedNumber().prefault(0.5),
			y: coerceNormalizedNumber().prefault(0.5)
		})
		.prefault({ x: 0.5, y: 0.5 })
});

/**
 * Size property schema
 * Defines the dimensions of a component
 */
export const SizeShape = z.object({
	/** Width in pixels */
	width: coercePositiveNumber(),
	/** Height in pixels */
	height: coercePositiveNumber(),
	/** Uniform scale factor */
	scale: coercePositiveNumber().prefault(1),
	/** Whether to maintain aspect ratio when resizing */
	maintainAspectRatio: z.boolean().prefault(true),
	/** Original dimensions before any transformations */
	original: z
		.object({
			width: coercePositiveNumber().optional(),
			height: coercePositiveNumber().optional()
		})
		.optional()
});

/**
 * Transform property schema
 * Defines additional transformations beyond basic position and size
 */
export const TransformShape = z.object({
	/** Horizontal scale factor (1 = 100%) */
	scaleX: coerceValidNumber().prefault(1),
	/** Vertical scale factor (1 = 100%) */
	scaleY: coerceValidNumber().prefault(1),
	/** Horizontal skew in degrees */
	skewX: coerceValidNumber().prefault(0),
	/** Vertical skew in degrees */
	skewY: coerceValidNumber().prefault(0),
	/** Origin point for transformations */
	transformOrigin: z
		.object({
			x: coerceNormalizedNumber().prefault(0.5),
			y: coerceNormalizedNumber().prefault(0.5)
		})
		.optional()
});

/**
 * Shadow effect schema
 */
export const ShadowShape = z.object({
	enabled: z.boolean().prefault(true).optional(),
	/** Optional preset name */
	preset: z.string().optional(),
	/** Shadow color */
	color: z.string().refine(isValidColor, {
        error: 'Invalid shadow color format'
    }).optional(),
	/** Shadow blur radius in pixels */
	blur: coerceNonNegativeNumber().optional(),
	/** Shadow size in pixels */
	size: coerceValidNumber().optional(),
	/** Horizontal offset in pixels */
	offsetX: coerceValidNumber().optional(),
	/** Vertical offset in pixels */
	offsetY: coerceValidNumber().optional(),
	/** Shadow opacity (0-1) */
	opacity: coerceNormalizedNumber().optional() // Keep opacity, useful even with presets
});

/**
 * Outline/Stroke effect schema
 */
export const OutlineShape = z.object({
	enabled: z.boolean().prefault(true).optional(),
	/** Optional preset name */
	preset: z.string().optional(),
	/** Outline color */
	color: z.string().refine(isValidColor, {
        error: 'Invalid outline color format'
    }),
	/** Outline width in pixels */
	size: coerceNonNegativeNumber().optional(),
	/** Outline opacity (0-1) */
	opacity: coerceNormalizedNumber().optional(),
	/** Outline style (Note: style/dashArray not in schema-llm.md, maybe remove?) */
	style: z.enum(['solid', 'dashed', 'dotted']).prefault('solid').optional(),
	/** Custom dash pattern (only for 'dashed' style) */
	dashArray: z.array(coerceNonNegativeNumber()).optional()
});

/**
 * Font size with unit schema
 */
export const FontSizeShape = z.object({
	/** Font size value */
	value: coercePositiveNumber(),
	/** Font size unit */
	unit: z.enum(['px', 'em', 'rem', '%']).prefault('px')
});

/**
 * Line height with unit schema
 */
export const LineHeightShape = z.object({
	/** Line height value */
	value: coercePositiveNumber(),
	/** Line height unit */
	unit: z.enum(['normal', 'px', 'em', '%']).prefault('normal')
});

/**
 * Color with opacity schema
 */
export const ColorWithOpacityShape = z.object({
	/** Color value (hex, rgb, rgba, etc.) */
	color: z.string().refine(isValidColor, {
        error: 'Invalid color format'
    }),
	/** Opacity (0-1) */
	opacity: coerceNormalizedNumber().prefault(1)
});

/**
 * Gradient stop schema
 */
export const GradientStopShape = z.object({
	/** Color value */
	color: z.string().refine(isValidColor, {
        error: 'Invalid gradient color format'
    }),
	/** Position in the gradient (0-1) */
	position: coerceNormalizedNumber(),
	/** Opacity (0-1) */
	opacity: coerceNormalizedNumber().prefault(1)
});

/**
 * Gradient background schema
 */
export const GradientShape = z.object({
	/** Gradient type */
	type: z.enum(['linear', 'radial']),
	/** Gradient stops */
	stops: z.array(GradientStopShape).min(2),
	/** Angle in degrees (for linear gradients) */
	angle: z.number().min(0).max(360).prefault(0).optional(),
	/** Center position (for radial gradients) */
	center: z
		.object({
			x: z.number().min(0).max(1).prefault(0.5),
			y: z.number().min(0).max(1).prefault(0.5)
		})
		.optional()
});

/**
 * Animation timing schema
 * Defines timing properties for animations
 */
export const AnimationTimingShape = z.object({
	/** Delay before animation starts (in seconds) */
	delay: z.number().min(0).prefault(0),
	/** Animation duration (in seconds) */
	duration: z.number().min(0).prefault(1).transform(toFixed3),
	/** Number of times the animation repeats (-1 for infinite) */
	repeat: z.int().prefault(0),
	/** Delay between animation repetitions (in seconds) */
	repeatDelay: z.number().min(0).prefault(0),
	/** Time between successive animations in seconds (for staggered animations) */
	stagger: z.number().min(0).prefault(0),
	/** Whether to reverse the animation on alternate repeats */
	yoyo: z.boolean().prefault(false)
});

/**
 * Animation easing schema
 * Defines how animations accelerate and decelerate
 */
export const AnimationEasingShape = z.union([
	// Predefined easing functions
	z.enum([
		'linear',
		'power1.in',
		'power1.out',
		'power1.inOut',
		'power2.in',
		'power2.out',
		'power2.inOut',
		'power3.in',
		'power3.out',
		'power3.inOut',
		'power4.in',
		'power4.out',
		'power4.inOut',
		'back.in',
		'back.out',
		'back.inOut',
		'elastic.in',
		'elastic.out',
		'elastic.inOut',
		'bounce.in',
		'bounce.out',
		'bounce.inOut',
		'circ.in',
		'circ.out',
		'circ.inOut',
		'expo.in',
		'expo.out',
		'expo.inOut',
		'sine.in',
		'sine.out',
		'sine.inOut'
	]),
	// Custom cubic-bezier
	z.object({
		type: z.literal('cubicBezier'),
		x1: z.number().min(0).max(1),
		y1: z.number(),
		x2: z.number().min(0).max(1),
		y2: z.number()
	})
]);

/**
 * Keyframe schema
 * Defines a single keyframe in an animation
 */
export const KeyframeShape = z.object({
	/** Time position in seconds relative to animation start */
	time: z.number().min(0).transform(toFixed3),
	/** Target property values at this keyframe */
	value: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
	/** Easing to use when transitioning to this keyframe */
	easing: AnimationEasingShape.optional()
});

/**
 * Animation target schema
 * Defines what elements an animation affects
 */
export const AnimationTargetShape = z.enum([
	'element', // The entire element
	'words', // Individual words (for text)
	'lines', // Lines of text
	'chars', // Individual characters (for text)
	'transform', // Just transform properties
	'opacity', // Just opacity
	'position', // Just position
	'size' // Just size
]);

/**
 * Enhanced animation schema
 * Comprehensive definition of an animation
 */
export const EnhancedAnimationShape = z.object({
	/** Unique identifier */
	id: z.string().max(255),
	/** Animation name */
	name: z.string().max(255),
	/** Animation type */
	type: z.enum(['preset', 'custom', 'keyframe']),
	/** Preset identifier (for preset animations) */
	presetId: z.string().max(255).optional(),
	/** What the animation targets */
	target: AnimationTargetShape.prefault('element'),
	/** Animation timing properties */
	timing: AnimationTimingShape.prefault({}),
	/** Animation easing */
	easing: AnimationEasingShape.prefault('power2.out'),
	/** For keyframe animations: the keyframes */
	keyframes: z.array(KeyframeShape).optional(),
	/** Whether animation plays automatically */
	autoplay: z.boolean().prefault(true),
	/** Whether to preserve transform styles that aren't explicitly animated */
	preserveTransform: z.boolean().prefault(true),
	/** Additional animation parameters */
	parameters: z.record(z.string(), z.unknown()).optional()
});

/**
 * Transition schema
 * Defines a transition between two components or states
 */
export const TransitionShape = z.object({
	/** Unique identifier */
	id: z.string().max(255),
	/** Transition name */
	name: z.string().max(255).optional(),
	/** Source component ID */
	fromComponentId: z.string().max(255),
	/** Target component ID */
	toComponentId: z.string().max(255),
	/** Transition type */
	type: z.enum(['fade', 'slide', 'zoom', 'wipe', 'custom', 'preset']),
	/** Preset identifier (for preset transitions) */
	presetId: z.string().optional(),
	/** Transition duration in seconds */
	duration: z.number().min(0).max(72000).transform(toFixed3),
	/** Transition direction (for directional transitions) */
	direction: z.enum(['left', 'right', 'up', 'down', 'in', 'out']).optional(),
	/** Transition easing */
	easing: AnimationEasingShape.prefault('power2.inOut'),
	/** Additional transition parameters */
	parameters: z.record(z.string(), z.unknown()).optional()
});

/**
 * Effect schema base
 * Base schema for all effects
 */
export const EffectBaseShape = z.object({
	/** Effect type */
	type: z.string(),
	/** Whether the effect is enabled */
	enabled: z.boolean().prefault(true).optional(),
	/** Effect intensity (0-1) */
	intensity: z.number().min(0).max(1).prefault(1),
	/** Effect mix blend mode */
	blendMode: z
		.enum([
			'normal',
			'multiply',
			'screen',
			'overlay',
			'darken',
			'lighten',
			'color-dodge',
			'color-burn',
			'hard-light',
			'soft-light',
			'difference',
			'exclusion',
			'hue',
			'saturation',
			'color',
			'luminosity'
		])
		.prefault('normal')
});

/**
 * Blur effect schema
 */
export const BlurEffectShape = EffectBaseShape.extend({
	type: z.literal('blur'),
	/** Blur radius in pixels */
	radius: z.number().min(0).prefault(5)
});

/**
 * Color adjustment effect schema
 */
export const ColorAdjustmentEffectShape = EffectBaseShape.extend({
	type: z.literal('colorAdjustment'),
	/** Brightness adjustment (-1 to 1) */
	brightness: z.number().min(-1).max(1).prefault(0),
	/** Contrast adjustment (-1 to 1) */
	contrast: z.number().min(-1).max(1).prefault(0),
	/** Saturation adjustment (-1 to 1) */
	saturation: z.number().min(-1).max(1).prefault(0),
	/** Hue rotation in degrees (0-360) */
	hue: z.number().min(0).max(360).prefault(0)
});

/**
 * Union of all effect types
 */
export const EffectShape = z.discriminatedUnion('type', [
	BlurEffectShape,
	ColorAdjustmentEffectShape
	// Additional effect schemas can be added here
]);

// Export inferred types from schemas
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
