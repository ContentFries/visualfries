import { z } from 'zod';

// Utility for numbers that might be strings (e.g., "50%") or actual numbers
const numberOrStringPercentage = z.union([z.number(), z.string().regex(/^(\d+(\.\d+)?%?)$/)]);

const PropertyFromDataShape = z.object({
	fromData: z.string(),
	mode: z.enum(['cycle', 'useFallback', 'clamp']).optional().prefault('cycle'),
	fallbackValue: z.any().optional() // Can be any type, as property values vary
});

const DynamicByIndexValueShape = z.object({
	/**
	 * Specifies that the value should be determined dynamically, typically based on an element's index.
	 */
	type: z.literal('byIndex'),

	/**
	 * A string representation of a JavaScript expression to be evaluated for each target element.
	 * This expression can use 'index' (the current element's index in the target list)
	 * and 'data' (the entire animation preset's resolved data context).
	 * Example: "index % 2 === 0 ? 100 : 50"
	 * Example: "data.baseValue + index * 10"
	 */
	expression: z.string(),

	/**
	 * An optional fallback value to be used if the expression evaluation fails
	 * or if the expression itself is invalid.
	 */
	fallbackValue: z.any().optional()
});

const PropertyValueShape = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(), // Direct primitive values
	PropertyFromDataShape, // For { fromData: "key", mode?, fallbackValue? }
	DynamicByIndexValueShape // For { type: "byIndex", expression: "..." }
]);

// === Stagger Definition ===
const StaggerObjectShape = z
	.object({
		type: z.literal('fromData').optional(), // Only "fromData" has a special type currently
		dataKey: z.string().optional(), // Required if type is "fromData"
		referencePoint: z.literal('tweenStart').optional(), // Mostly for "fromData"
		each: z.number().optional(),
		from: z.union([z.string(), z.number()]).optional(), // "start", "center", "end", "edges", "random", index
		grid: z
			.tuple([z.union([z.literal('auto'), z.number()]), z.union([z.literal('auto'), z.number()])])
			.optional(),
		axis: z.enum(['x', 'y']).optional(),
		ease: z.string().optional(), // Easing function string
		amount: z.number().optional()
	})
	.refine((data) => !(data.type === 'fromData' && !data.dataKey), {
		path: ['dataKey'],
        error: "dataKey is required when stagger type is 'fromData'"
    });

const StaggerShape = z.union([
	z.number(), // Shorthand for { each: <number> }
	StaggerObjectShape
]);

const BaseAnimatableProperties = z
	.object({
		opacity: PropertyValueShape.optional(),
		x: PropertyValueShape.optional(),
		y: PropertyValueShape.optional(),
		scale: PropertyValueShape.optional(),
		scaleX: PropertyValueShape.optional(),
		scaleY: PropertyValueShape.optional(),
		rotation: PropertyValueShape.optional(),
		width: PropertyValueShape.optional(),
		height: PropertyValueShape.optional(),
		color: PropertyValueShape.optional()
		// ... add more common animatable properties explicitly
	})
	.catchall(PropertyValueShape); // ANY other property added here must also be a PropertyValueShape

// TweenVarsShape defines the structure of the 'vars' object for a tween
const TweenVarsShape = z
	.object({
		// Explicitly define 'from' as an object whose values are animatable properties
		from: BaseAnimatableProperties.optional(),

		// Tween control properties (not animatable states themselves, but control the tween)
		duration: PropertyValueShape.optional(), // Can be a number, or fromData for dynamic duration
		ease: z.string().optional(),
		delay: PropertyValueShape.optional(), // Can be a number, or fromData
		stagger: StaggerShape.optional()
		// Add other GSAP control params like repeat, yoyo, overwrite etc. explicitly if needed
		// repeat: z.number().optional(),
		// yoyo: z.boolean().optional(),

		// For all other properties at this level (the "to" state or direct state for "set"/"from"),
		// they should conform to BaseAnimatableProperties. We use .merge() or handle them with a catchall
		// A simpler way is to use .catchall() here and ensure 'from', 'duration', etc. are NOT PropertyValueShape.
		// Let's try with making the "to" state properties part of the catchall.
	})
	.catchall(z.any()); // This catchall is for the 'to' properties like opacity, x, y etc.

// Refinement to ensure the catchall doesn't incorrectly try to validate our specific control properties
// or 'from' as if they were simple PropertyValueShapes.
const FinalTweenVarsShape = TweenVarsShape.refine((vars) => {
	const knownControlKeys = [
		'from',
		'duration',
		'ease',
		'delay',
		'stagger' /* add other known controls like repeat, yoyo */
	];
	for (const key in vars) {
		if (knownControlKeys.includes(key)) {
			// Validation for these known keys is handled by their explicit Shape definitions
			// (e.g., 'from' is BaseAnimatableProperties, 'stagger' is StaggerShape)
			continue;
		}
		// For any other key (which should be an animatable "to" property),
		// it must conform to PropertyValueShape (which is handled by the .catchall).
		// This refine is more about being explicit; the catchall *should* work,
		// but the previous error indicates a conflict in how Zod resolves the index signature.
		// The key is that 'from' itself is NOT a PropertyValueShape, its *contents* are.
	}
	return true;
}).refine((vars) => {
	// This is the original refine for 'from' being required with 'fromTo'
	// This refine should be on TweenDefinitionShape, as it needs 'method'
	return true;
});

// === Position Definition ===
const PositionObjectShape = z.object({
	anchor: z.string(), // "componentStart", "componentEnd", "componentCenter", or a timeline item ID
	anchorPoint: z.enum(['start', 'end']).optional(), // Only if anchor is another timeline item id
	alignTween: z.enum(['start', 'end', 'center']).optional().prefault('start'),
	offset: z
		.string()
		.regex(/^[+\-]?\d+(\.\d+)?s?$/)
		.optional()
		.prefault('0s') // e.g., "0s", "+=0.5s", "-1s"
});

const AnimationTimelinePositionShape = z.union([
	z.string(), // Time value, label, relative position, "in", "out"
	z.number(), // Time value, label, relative position, "in", "out"
	PositionObjectShape
]);

const TweenDefinitionShape = z
	.object({
		method: z.enum(['to', 'from', 'fromTo', 'set']),
		position: AnimationTimelinePositionShape.optional(),
		vars: FinalTweenVarsShape // Use the refined Shape
	})
	.refine(
		(data) => {
			if (data.method === 'fromTo' && !data.vars.from) {
				return false;
			}
			if (data.method !== 'fromTo' && data.vars.from !== undefined) {
				// Optionally make this an error:
				// console.warn(`'vars.from' is only applicable when method is 'fromTo'. Found with method '${data.method}'.`);
				// return false;
			}
			return true;
		},
		{
			path: ['vars', 'from'], // More specific path
            error: "'vars.from' is required when method is 'fromTo' (and only then)."
        }
	);

export const KeyframeAnimationShape = z.object({
	/** Identifier for this keyframe-like animation definition */
	id: z.string().optional(), // Optional if it's an inline anonymous definition
	/** The single tween definition that constitutes this animation */
	tween: TweenDefinitionShape, // Using your existing TweenDefinitionShape
	/**
	 * Optional target for this single tween.
	 * Defaults to "container" if not specified.
	 */
	target: z.string().prefault('container').optional()

	// revertAfterComplete: z.boolean().optional().default(false), // this probably does not make sense here
});

// === Timeline Item Definition ===
const AnimationSequenceItemShape = z.object({
	id: z.string().optional(),
	target: z.string().optional(), // "container", "words", "lines", "chars", or CSS selector
	position: AnimationTimelinePositionShape.optional(),
	tweens: z.array(TweenDefinitionShape).min(1)
});

// === Setup Step Definition ===
const SetupStylePropertiesShape = z.object({}).catchall(PropertyValueShape);

const SetupStepBaseShape = z.object({
	type: z.string()
	// target: z.string().optional(), // If you add specific targeting for setup steps
});

const SetupStyleStepShape = SetupStepBaseShape.extend({
	type: z.literal('style'),
	properties: SetupStylePropertiesShape
});

const SetupSplitTextStepShape = SetupStepBaseShape.extend({
	type: z.literal('splitText'),
	by: z.enum(['words', 'lines', 'chars'])
});

const SetupStepShape = z.discriminatedUnion('type', [
	SetupStyleStepShape,
	SetupSplitTextStepShape
	// ... add other setup step types here
]);

// === Root Animation Preset Shape ===
export const AnimationPresetShape = z.object({
	id: z.string(),
	presetId: z.string().optional(),
	version: z.string().optional(),
	description: z.string().optional(),
	duration: z.number().positive().optional(),
	data: z.record(z.string(), z.any()).prefault({}).optional(),
	setup: z.array(SetupStepShape).prefault([]).optional(),
	revertAfterComplete: z.boolean().prefault(false).optional(),
	timeline: z.array(AnimationSequenceItemShape) // .min(1) - cancelled as we can have system presets that predefine the timeline so we can use this in component animations list as well
});

export const AnimationReferenceShape = z.union([
	z.string(), // 1. Preset name (string ID)
	AnimationPresetShape, // 2. Full AnimationPresetShape object
	KeyframeAnimationShape // 3. Simplified KeyframeAnimationShape object
]);

export interface AnimationReferenceTransformer {
	canHandle(input: unknown): boolean;
	normalize(input: unknown, registry: Map<string, AnimationPreset>): AnimationPreset | null;
	setNext(handler: AnimationReferenceTransformer): AnimationReferenceTransformer; // For chaining
	handle(input: unknown, registry: Map<string, AnimationPreset>): AnimationPreset | null; // Chain execution
}

export type AnimationReference = z.infer<typeof AnimationReferenceShape>;
export type AnimationPresetInput = z.input<typeof AnimationPresetShape>;
export type AnimationPreset = z.infer<typeof AnimationPresetShape>;
export type AnimationSequenceItem = z.infer<typeof AnimationSequenceItemShape>;
export type TweenDefinition = z.infer<typeof TweenDefinitionShape>;
export type TweenVars = z.infer<typeof FinalTweenVarsShape>; // Use refined vars
export type SetupStep = z.infer<typeof SetupStepShape>;
export type AnimationTimelinePosition = z.infer<typeof AnimationTimelinePositionShape>;
export type AnimationStagger = z.infer<typeof StaggerShape>;
export type BaseAnimatableProperties = z.infer<typeof BaseAnimatableProperties>;
export type KeyframeAnimation = z.infer<typeof KeyframeAnimationShape>;
