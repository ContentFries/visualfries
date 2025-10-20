import { z } from 'zod';
import { isValidColor } from './utils.js';
import {
	EffectBaseShape,
	EffectShape as BaseEffectShape,
	BlurEffectShape,
	ShadowShape as StructuredShadowShape,
	OutlineShape as StructuredOutlineShape,
	ColorTypeShape,
	GradientDefinitionShape
} from './properties.js';
import { AnimationReferenceShape } from './animations.js';
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
 * Structured Font Size as per schema-llm.md
 */
export const StructuredFontSizeShape = z.union([
	z
		.number()
		.positive()
		.transform((val) => ({ value: val, unit: 'px' as const })),
	z.object({
		value: z.number().positive(),
		unit: z.enum(['px', 'em', 'rem', '%']).prefault('px')
	})
]);

export const StructuredEmSizeShape = z.union([
	z.number().transform((val) => ({ value: val, unit: 'em' as const })),
	z.object({
		value: z.number(),
		unit: z.enum(['px', 'em', 'rem', '%']).prefault('em')
	})
]);

const FontWeightShape = z.enum([
	'normal',
	'bold',
	'bolder',
	'lighter',
	'100',
	'200',
	'300',
	'400',
	'500',
	'600',
	'700',
	'800',
	'900'
]);

export const FontSourceShape = z.object({
	id: z.string().optional(),
	source: z.enum(['google', 'custom']),
	family: z.string().optional(),
	category: z.string().optional().nullable(),
	subsets: z.array(z.string()).optional().nullable(),
	variants: z.array(z.string()).optional().nullable(),
	fileUrl: z.string().optional().nullable()
});

/**
 * Basic appearance structure for text components matching schema-llm.md
 */
export const TextAppearanceShape = z.object({
	fontFamily: z.string().max(255),
	fontSize: StructuredFontSizeShape,
	fontWeight: FontWeightShape.nullable().optional(),
	fontSource: FontSourceShape.nullable().optional(),

	lineHeight: StructuredEmSizeShape.nullable().optional(),
	letterSpacing: StructuredEmSizeShape.nullable().optional(),
	color: ColorTypeShape,
	textAlign: z.enum(['left', 'center', 'right', 'justify']),
	textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
	shadow: StructuredShadowShape.nullable().optional(),
	outline: StructuredOutlineShape.nullable().optional(),
	activeLine: z
		.object({
			enabled: z.boolean(),
			color: ColorTypeShape.nullable().optional(),
			backgroundColor: ColorTypeShape.nullable().optional(),
			fontWeight: FontWeightShape.optional(),
			scale: coercePositiveNumber().optional(),
			backgroundPaddingX: coerceNonNegativeNumber().optional(),
			backgroundPaddingY: coerceNonNegativeNumber().optional(),
			backgroundBorderRadius: coerceNonNegativeNumber().optional()
		})
		.nullable()
		.optional(),
	activeWord: z
		.object({
			enabled: z.boolean(),
			color: ColorTypeShape.nullable().optional(),
			backgroundColor: ColorTypeShape.nullable().optional(),
			fontWeight: FontWeightShape.optional(),
			scale: coercePositiveNumber().optional(),
			backgroundPaddingX: coerceNonNegativeNumber().optional(),
			backgroundPaddingY: coerceNonNegativeNumber().optional(),
			backgroundBorderRadius: coerceNonNegativeNumber().optional()
		})
		.nullable()
		.optional(),
	highlightColors: z.array(ColorTypeShape).nullable().optional()
});

const BgShape = z.object({
	enabled: z.boolean().prefault(false),
	color: ColorTypeShape,
	target: z.enum(['wrapper', 'element']).prefault('wrapper').optional(),
	radius: z.number().min(0).prefault(0).optional()
});

export const BackgroundShape = z.union([BgShape, ColorTypeShape]).transform((value) => {
	if (typeof value === 'object' && value !== null && 'enabled' in value) {
		return value;
	}

	return {
		enabled: true,
		color: value,
		target: 'wrapper',
		radius: 0
	};
});

/**
 * General appearance schema for all components
 */
export const AppearanceShape = z.object({
	x: coerceValidNumber(),
	y: coerceValidNumber(),
	width: coercePositiveNumber(),
	height: coercePositiveNumber(),
	offsetX: coerceValidNumber().optional(), // 0 = left, 132 = 132px from left
	offsetY: coerceValidNumber().optional(), // 0 = top, 132 = 132px from top

	opacity: coerceNormalizedNumber().prefault(1).optional(),
	rotation: coerceValidNumber().prefault(0).optional(),
	scaleX: coerceValidNumber().prefault(1).optional(),
	scaleY: coerceValidNumber().prefault(1).optional(),
	background: BackgroundShape.nullable().prefault(null).optional(), // ColorTypeShape
	// Text-specific appearance properties
	text: TextAppearanceShape.optional(),
	// Optional alignment properties
	verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
	horizontalAlign: z.enum(['left', 'center', 'right']).optional(),

	// not optimal but to prevent linter errors. This is for subtitles only
	backgroundAlwaysVisible: z.boolean().prefault(false).optional()
});

/**
 * Specialized appearance shapes for different component types
 * These are NOT exported to reduce .d.ts file size - they're only used internally
 */

/**
 * Text-focused appearance shape for TEXT components
 */
const TextFocusedAppearanceShape = AppearanceShape.extend({
	text: TextAppearanceShape,
	verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
	horizontalAlign: z.enum(['left', 'center', 'right']).optional()
});

/**
 * Shape appearance for SHAPE components
 */
const ShapeAppearanceShape = AppearanceShape.extend({
	color: ColorTypeShape.optional() // fill color
});

/**
 * Color appearance for COLOR components
 */
const ColorAppearanceShape = AppearanceShape.extend({
	background: z.string().refine(isValidColor, {
		error: 'Invalid color format for ColorComponent background'
	})
});

/**
 * Gradient appearance for GRADIENT components
 */
const GradientAppearanceShape = AppearanceShape.extend({
	background: GradientDefinitionShape // Requires a gradient type in background
});

/**
 * AI Emoji shape for subtitle components
 */
export const AIEmojiShape = z.object({
	text: z.string(),
	emoji: z.string(),
	startAt: coerceValidNumber(),
	endAt: coerceValidNumber(),
	componentId: z.string().optional()
});

/**
 * Subtitle appearance for SUBTITLES components
 */
const SubtitleAppearanceShape = AppearanceShape.extend({
	text: TextAppearanceShape,
	verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
	horizontalAlign: z.enum(['left', 'center', 'right']).optional(),
	hasAIEmojis: z.boolean().prefault(false).optional(),
	aiEmojisPlacement: z.enum(['top', 'bottom']).prefault('top').optional(),
	aiEmojisPlacementOffset: coerceValidNumber().prefault(30).optional(),
	aiEmojis: z.array(AIEmojiShape).optional(),
	highlighterColor1: ColorTypeShape.optional(),
	highlighterColor2: ColorTypeShape.optional(),
	highlighterColor3: ColorTypeShape.optional()
});

/**
 * Timeline structure for components
 */
export const ComponentTimelineShape = z
	.object({
		startAt: coerceNonNegativeNumber().transform(toFixed3),
		endAt: coerceNonNegativeNumber().transform(toFixed3)
	})
	.refine((t) => t.startAt <= t.endAt, {
		message: 'timeline endAt must be ≥ startAt',
		path: ['endAt']
	});

/**
 * Animation structure
 */
export const AnimationShape = z.object({
	id: z.string(),
	name: z.string(),
	startAt: coerceNonNegativeNumber().optional(),
	animation: AnimationReferenceShape,
	enabled: z.boolean().prefault(true).optional()
});

/**
 * Source metadata for media components
 */
export const SourceMetadataShape = z.object({
	width: coercePositiveNumber().optional(),
	height: coercePositiveNumber().optional(),
	duration: coerceNonNegativeNumber().optional(),
	format: z.string().optional(),
	codec: z.string().optional(),
	bitrate: coercePositiveNumber().optional(),
	fps: coercePositiveNumber().optional(),
	hasAudio: z.boolean().optional()
});

/**
 * Component source definition
 */
export const ComponentSourceShape = z
	.object({
		url: z.url().optional(), // might have assetId. However should be required for video and other components
		streamUrl: z.url().optional(),
		assetId: z.string().optional(),
		languageCode: z.string().optional(),
		startAt: coerceNonNegativeNumber().transform(toFixed3Optional).optional(),
		endAt: coerceNonNegativeNumber().transform(toFixed3Optional).optional(),
		metadata: SourceMetadataShape.optional(),
		transcriptFormat: z.string().optional()
	})
	.refine(
		(data) => {
			// Only validate if both startAt and endAt are present and not null
			if (
				data.startAt !== undefined &&
				data.startAt !== null &&
				data.endAt !== undefined &&
				data.endAt !== null
			) {
				return data.startAt <= data.endAt;
			}
			// If either is undefined or null, validation passes
			return true;
		},
		{
			message: 'endAt must be greater than or equal to startAt',
			path: ['endAt'] // Error targets the endAt field
		}
	);

/**
 * Timing anchor for components that need synchronization (like subtitles)
 */
export const TimingAnchorShape = z.object({
	mode: z.enum(['ASSET_USAGE', 'COMPONENT']),
	assetId: z.string().optional(),
	layerId: z.string().optional(),
	componentId: z.string().optional(),
	offset: coerceValidNumber().prefault(0)
});

/**
 * Layout split effect schema
 */
export const LayoutSplitEffectShape = EffectBaseShape.extend({
	type: z.literal('layoutSplit'),
	pieces: coerceInteger(1).optional(),
	sceneWidth: coercePositiveNumber().optional(),
	sceneHeight: coercePositiveNumber().optional(),
	chunks: z.array(z.record(z.string(), z.any())).optional()
});

/**
 * Rotation randomizer effect schema
 */
export const RotationRandomizerEffectShape = EffectBaseShape.extend({
	type: z.literal('rotationRandomizer'),
	maxRotation: coerceValidNumber().prefault(2),
	animate: z.boolean().prefault(true),
	seed: coerceInteger().optional()
});

export const FillBackgroundBlurEffectShape = z.object({
	type: z.literal('fillBackgroundBlur'),
	enabled: z.boolean().prefault(true),
	// Using the hardcoded value from PixiSplitScreenDisplayObjectHook.ts as default
	blurAmount: coerceNonNegativeNumber().prefault(50)
	// Note: intensity and blendMode might not be applicable here, keeping it simple.
});

/**
 * Text Shadow effect schema
 */
export const TextShadowEffectShape = EffectBaseShape.extend({
	type: z.literal('textShadow'),
	// Use the imported StructuredShadowShape for parameters
	...StructuredShadowShape.shape
});

/**
 * Text Outline effect schema
 */
export const TextOutlineEffectShape = EffectBaseShape.extend({
	type: z.literal('textOutline'),
	// Use the imported StructuredOutlineShape for parameters
	...StructuredOutlineShape.shape
});

/**
 * Union of all effect types for components
 */
export const ComponentEffectShape = z.union([
	BaseEffectShape,
	LayoutSplitEffectShape,
	RotationRandomizerEffectShape,
	BlurEffectShape,
	FillBackgroundBlurEffectShape,
	TextShadowEffectShape,
	TextOutlineEffectShape
]);

const ComponentEffectsShape = z.object({
	enabled: z.boolean().optional().prefault(true), // Globally enable/disable all effects?
	map: z
		.union([
			z.record(
				z.string().min(1), // Key: Effect name/ID (e.g., "mainBlur", "rotator")
				ComponentEffectShape // Value: An object conforming to one of the effect shapes
			),
			z.array(z.any()) // Support array format for backward compatibility
		])
		.transform((val) => {
			// If it's an array, convert to empty object
			if (Array.isArray(val)) {
				return {};
			}
			// If it's already an object, return as is
			return val;
		})
		.prefault({}) // Default to an empty object if no effects
});

const ComponentAnimationsShape = z.object({
	enabled: z.boolean().optional().prefault(true), // Globally enable/disable all animations?
	list: z.array(AnimationShape).prefault([]),
	subtitlesSeed: z.int().optional()
});

/**
 * Base component schema without appearance (to reduce type duplication)
 * Each component type will add its own specialized appearance
 */
const ComponentBaseWithoutAppearanceShape = z.object({
	id: z.string(),
	name: z.string().optional(),
	type: z.enum([
		'IMAGE',
		'GIF',
		'VIDEO',
		'TEXT',
		'SHAPE',
		'AUDIO',
		'COLOR',
		'GRADIENT',
		'SUBTITLES'
	]),
	timeline: ComponentTimelineShape,
	animations: ComponentAnimationsShape.prefault({}),
	effects: ComponentEffectsShape.prefault({}),
	visible: z.boolean().prefault(true),
	order: coerceValidNumber().prefault(0),
	checksum: z.string().optional()
});

/**
 * Base component schema that all component types will extend
 * @deprecated Use ComponentBaseWithoutAppearanceShape and add appearance per component
 */
export const ComponentBaseShape = ComponentBaseWithoutAppearanceShape.extend({
	appearance: AppearanceShape
});

/**
 * Text component schema
 */
export const TextComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('TEXT'),
	text: z.string(),
	isAIEmoji: z.boolean().prefault(false).optional(),
	appearance: TextFocusedAppearanceShape
}).strict();

/**
 * Image component schema
 */
export const ImageComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('IMAGE'),
	source: ComponentSourceShape,
	appearance: AppearanceShape,
	crop: z
		.object({
			xPercent: coerceNormalizedNumber().prefault(0),
			yPercent: coerceNormalizedNumber().prefault(0),
			widthPercent: coerceNormalizedNumber().prefault(1),
			heightPercent: coerceNormalizedNumber().prefault(1)
		})
		.optional()
}).strict();

/**
 * GIF component schema
 */
export const GifComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('GIF'),
	source: ComponentSourceShape,
	appearance: AppearanceShape,
	playback: z
		.object({
			loop: z.boolean().prefault(true),
			speed: coercePositiveNumber().prefault(1)
		})
		.optional()
}).strict();

/**
 * Video component schema
 */
export const VideoComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('VIDEO'),
	source: ComponentSourceShape,
	appearance: AppearanceShape,
	volume: coerceNormalizedNumber().prefault(1),
	muted: z.boolean().prefault(false),
	playback: z
		.object({
			autoplay: z.boolean().prefault(true),
			loop: z.boolean().prefault(false),
			playbackRate: coercePositiveNumber().prefault(1),
			startAt: coerceNonNegativeNumber().prefault(0),
			endAt: coerceValidNumber().optional()
		})
		.optional(),
	crop: z
		.object({
			x: coerceValidNumber().prefault(0),
			y: coerceValidNumber().prefault(0),
			width: coerceNormalizedNumber().prefault(1),
			height: coerceNormalizedNumber().prefault(1)
		})
		.optional()
}).strict();

/**
 * Progress configuration schemas for different progress types
 */
export const LinearProgressConfigShape = z.object({
	type: z.literal('linear'),
	direction: z.enum(['horizontal', 'vertical']).prefault('horizontal'),
	reverse: z.boolean().prefault(false).optional(),
	anchor: z.enum(['start', 'center', 'end']).prefault('start').optional()
});

export const PerimeterProgressConfigShape = z.object({
	type: z.literal('perimeter'),
	startCorner: z
		.enum(['top-left', 'top-right', 'bottom-right', 'bottom-left'])
		.prefault('top-left'),
	clockwise: z.boolean().prefault(true).optional(),
	strokeWidth: coercePositiveNumber().prefault(4).optional()
});

export const RadialProgressConfigShape = z.object({
	type: z.literal('radial'),
	startAngle: coerceValidNumber().prefault(-90).optional(), // -90 = top (12 o'clock), 0 = right (3 o'clock)
	clockwise: z.boolean().prefault(true).optional(),
	innerRadius: coerceNormalizedNumber().prefault(0).optional(), // 0 = filled circle, >0 = ring/donut
	strokeWidth: coercePositiveNumber().optional(), // For ring style
	capStyle: z.enum(['butt', 'round', 'square']).prefault('round').optional()
});

export const DoubleProgressConfigShape = z.object({
	type: z.literal('double'),
	paths: z
		.array(
			z.object({
				direction: z.enum(['horizontal', 'vertical']),
				position: z.enum(['top', 'bottom', 'left', 'right']),
				reverse: z.boolean().prefault(false).optional(),
				offset: coerceValidNumber().prefault(0).optional() // Offset from edge in pixels
			})
		)
		.min(2)
		.max(4) // At least 2 paths, max 4 for performance
});

export const CustomProgressConfigShape = z.object({
	type: z.literal('custom'),
	pathData: z.string(), // SVG path data for custom progress shapes
	strokeWidth: coercePositiveNumber().prefault(4).optional(),
	capStyle: z.enum(['butt', 'round', 'square']).prefault('round').optional()
});

/**
 * Union of all progress configuration types
 */
export const ProgressConfigShape = z.discriminatedUnion('type', [
	LinearProgressConfigShape,
	PerimeterProgressConfigShape,
	RadialProgressConfigShape,
	DoubleProgressConfigShape,
	CustomProgressConfigShape
]);

/**
 * Shape component schema for basic geometric shapes
 */
export const ShapeComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('SHAPE'),
	shape: z.union([
		// Progress shape with specialized configuration
		z.object({
			type: z.literal('progress'),
			progressConfig: ProgressConfigShape.optional().prefault({
				type: 'linear',
				direction: 'horizontal',
				reverse: false,
				anchor: 'start'
			})
		}),
		// Other shape types
		z.object({
			type: z.enum(['rectangle', 'triangle', 'circle', 'ellipse', 'polygon', 'star', 'path']),
			// Specific properties for each shape type
			points: z.array(z.object({ x: z.number(), y: z.number() })).optional(), // For polygon
			pathData: z.string().optional(), // For path
			cornerRadius: z.number().min(0).optional() // For rectangle
		})
	]),
	appearance: ShapeAppearanceShape
}).strict();

/**
 * Audio component schema
 */
export const AudioComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('AUDIO'),
	source: ComponentSourceShape,
	appearance: AppearanceShape,
	volume: coerceNormalizedNumber().prefault(1),
	muted: z.boolean().prefault(false)
}).strict();

/**
 * Color component schema
 */
export const ColorComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('COLOR'),
	appearance: ColorAppearanceShape
}).strict();

/**
 * Gradient component schema
 */
export const GradientComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('GRADIENT'),
	appearance: GradientAppearanceShape
}).strict();

/**
 * Subtitles component schema
 */
export const SubtitleComponentShape = ComponentBaseWithoutAppearanceShape.extend({
	type: z.literal('SUBTITLES'),
	source: ComponentSourceShape.safeExtend({
		url: z.url().optional()
		// Subtitles might need specific source fields, e.g., format
	}).optional(),
	timingAnchor: TimingAnchorShape,
	text: z.string().optional(), // Optional: if text is directly embedded
	appearance: SubtitleAppearanceShape
}).strict();

/**
 * Union of all component types for polymorphic handling
 */
export const ComponentShape = z.discriminatedUnion('type', [
	TextComponentShape,
	ImageComponentShape,
	GifComponentShape,
	VideoComponentShape,
	ShapeComponentShape,
	AudioComponentShape,
	ColorComponentShape,
	GradientComponentShape,
	SubtitleComponentShape
]);

// Export inferred types from schemas
export type StructuredFontSize = z.infer<typeof StructuredFontSizeShape>;
export type TextAppearance = z.infer<typeof TextAppearanceShape>;
export type Appearance = z.infer<typeof AppearanceShape>;
export type ComponentTimeline = z.infer<typeof ComponentTimelineShape>;
export type Animation = z.infer<typeof AnimationShape>;
export type ComponentSource = z.infer<typeof ComponentSourceShape>;
export type TimingAnchor = z.infer<typeof TimingAnchorShape>;
export type ComponentBase = z.infer<typeof ComponentBaseShape>;
export type TextComponent = z.infer<typeof TextComponentShape>;
export type ImageComponent = z.infer<typeof ImageComponentShape>;
export type GifComponent = z.infer<typeof GifComponentShape>;
export type VideoComponent = z.infer<typeof VideoComponentShape>;
export type ShapeComponent = z.infer<typeof ShapeComponentShape>;
export type AudioComponent = z.infer<typeof AudioComponentShape>;
export type ColorComponent = z.infer<typeof ColorComponentShape>;
export type GradientComponent = z.infer<typeof GradientComponentShape>;
export type SubtitleComponent = z.infer<typeof SubtitleComponentShape>;
export type FontSource = z.infer<typeof FontSourceShape>;
export type Component = z.infer<typeof ComponentShape>;

// Progress config types
export type LinearProgressConfig = z.infer<typeof LinearProgressConfigShape>;
export type PerimeterProgressConfig = z.infer<typeof PerimeterProgressConfigShape>;
export type RadialProgressConfig = z.infer<typeof RadialProgressConfigShape>;
export type DoubleProgressConfig = z.infer<typeof DoubleProgressConfigShape>;
export type CustomProgressConfig = z.infer<typeof CustomProgressConfigShape>;
export type ProgressConfig = z.infer<typeof ProgressConfigShape>;

export type ComponentInput = z.input<typeof ComponentShape>;

// individual component inputs
export type TextComponentInput = z.input<typeof TextComponentShape>;
export type ImageComponentInput = z.input<typeof ImageComponentShape>;
export type GifComponentInput = z.input<typeof GifComponentShape>;
export type VideoComponentInput = z.input<typeof VideoComponentShape>;
export type ShapeComponentInput = z.input<typeof ShapeComponentShape>;
export type AudioComponentInput = z.input<typeof AudioComponentShape>;
export type ColorComponentInput = z.input<typeof ColorComponentShape>;
export type GradientComponentInput = z.input<typeof GradientComponentShape>;
export type SubtitleComponentInput = z.input<typeof SubtitleComponentShape>;
export type ComponentEffect = z.infer<typeof ComponentEffectShape>;

// component props as inputs
export type AppearanceInput = z.input<typeof AppearanceShape>;
export type TextAppearanceInput = z.input<typeof TextAppearanceShape>;
export type StructuredFontSizeInput = z.input<typeof StructuredFontSizeShape>;
export type FontSourceInput = z.input<typeof FontSourceShape>;
export type ComponentTimelineInput = z.input<typeof ComponentTimelineShape>;
export type AnimationInput = z.input<typeof AnimationShape>;
export type SourceMetadataInput = z.input<typeof SourceMetadataShape>;
export type TimingAnchorInput = z.input<typeof TimingAnchorShape>;
export type ComponentSourceInput = z.input<typeof ComponentSourceShape>;
export type ColorTypeInput = z.input<typeof ColorTypeShape>;
