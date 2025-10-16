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
import { AnimationPresetShape, AnimationReferenceShape } from './animations.js';

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
		unit: z.enum(['px', 'em', 'rem', '%']).default('px')
	})
]);

export const StructuredEmSizeShape = z.union([
	z.number().transform((val) => ({ value: val, unit: 'em' as const })),
	z.object({
		value: z.number(),
		unit: z.enum(['px', 'em', 'rem', '%']).default('em')
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
			scale: z.number().positive().optional(),
			backgroundPaddingX: z.number().min(0).optional(),
			backgroundPaddingY: z.number().min(0).optional(),
			backgroundBorderRadius: z.number().min(0).optional()
		})
		.nullable()
		.optional(),
	activeWord: z
		.object({
			enabled: z.boolean(),
			color: ColorTypeShape.nullable().optional(),
			backgroundColor: ColorTypeShape.nullable().optional(),
			fontWeight: FontWeightShape.optional(),
			scale: z.number().positive().optional(),
			backgroundPaddingX: z.number().min(0).optional(),
			backgroundPaddingY: z.number().min(0).optional(),
			backgroundBorderRadius: z.number().min(0).optional()
		})
		.nullable()
		.optional(),
	highlightColors: z.array(ColorTypeShape).nullable().optional()
});

const BgShape = z.object({
	enabled: z.boolean().default(false),
	color: ColorTypeShape,
	target: z.enum(['wrapper', 'element']).default('wrapper').optional(),
	radius: z.number().min(0).default(0).optional()
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
	x: z.number(),
	y: z.number(),
	width: z.number().positive(),
	height: z.number().positive(),
	offsetX: z.number().optional(), // 0 = left, 132 = 132px from left
	offsetY: z.number().optional(), // 0 = top, 132 = 132px from top

	opacity: z.number().min(0).max(1).default(1).optional(),
	rotation: z.number().default(0).optional(),
	scaleX: z.number().default(1).optional(),
	scaleY: z.number().default(1).optional(),
	background: BackgroundShape.nullable().default(null).optional(), // ColorTypeShape
	// Text-specific appearance properties
	text: TextAppearanceShape.optional(),
	// Optional alignment properties
	verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
	horizontalAlign: z.enum(['left', 'center', 'right']).optional(),

	// not optimal but to prevent linter errors. This is for subtitles only
	backgroundAlwaysVisible: z.boolean().default(false).optional()
});

/**
 * Timeline structure for components
 */
export const ComponentTimelineShape = z.object({
	startAt: z.number().min(0).transform(toFixed3),
	endAt: z.number().min(0).transform(toFixed3)
});

/**
 * Animation structure
 */
export const AnimationShape = z.object({
	id: z.string(),
	name: z.string(),
	startAt: z.number().min(0).optional(),
	animation: AnimationReferenceShape,
	enabled: z.boolean().default(true).optional()
});

/**
 * Source metadata for media components
 */
export const SourceMetadataShape = z.object({
	width: z.number().positive().optional(),
	height: z.number().positive().optional(),
	duration: z.number().min(0).optional(),
	format: z.string().optional(),
	codec: z.string().optional(),
	bitrate: z.number().positive().optional(),
	fps: z.number().positive().optional(),
	hasAudio: z.boolean().optional()
});

/**
 * Component source definition
 */
export const ComponentSourceShape = z.object({
	url: z.string().url().optional(), // might have assetId. However should be required for video and other components
	streamUrl: z.string().url().optional(),
	assetId: z.string().optional(),
	languageCode: z.string().optional(),
	startAt: z.number().min(0).optional().transform(toFixed3Optional),
	endAt: z.number().min(0).optional().transform(toFixed3Optional),
	metadata: SourceMetadataShape.optional(),
	transcriptFormat: z.string().optional()
});

/**
 * Timing anchor for components that need synchronization (like subtitles)
 */
export const TimingAnchorShape = z.object({
	mode: z.enum(['ASSET_USAGE', 'COMPONENT']),
	assetId: z.string().optional(),
	layerId: z.string().optional(),
	componentId: z.string().optional(),
	offset: z.number().default(0)
});

/**
 * Layout split effect schema
 */
export const LayoutSplitEffectShape = EffectBaseShape.extend({
	type: z.literal('layoutSplit'),
	pieces: z.number().int().positive().optional(),
	sceneWidth: z.number().positive().optional(),
	sceneHeight: z.number().positive().optional(),
	chunks: z.array(z.record(z.any())).optional()
});

/**
 * Rotation randomizer effect schema
 */
export const RotationRandomizerEffectShape = EffectBaseShape.extend({
	type: z.literal('rotationRandomizer'),
	maxRotation: z.number().default(2),
	animate: z.boolean().default(true),
	seed: z.number().int().optional()
});

export const FillBackgroundBlurEffectShape = z.object({
	type: z.literal('fillBackgroundBlur'),
	enabled: z.boolean().default(true),
	// Using the hardcoded value from PixiSplitScreenDisplayObjectHook.ts as default
	blurAmount: z.number().min(0).default(50)
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
	enabled: z.boolean().optional().default(true), // Globally enable/disable all effects?
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
		.default({}) // Default to an empty object if no effects
});

const ComponentAnimationsShape = z.object({
	enabled: z.boolean().optional().default(true), // Globally enable/disable all animations?
	list: z.array(AnimationShape).default([]),
	subtitlesSeed: z.number().int().optional()
});

/**
 * Base component schema that all component types will extend
 */
export const ComponentBaseShape = z.object({
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
	appearance: AppearanceShape,
	animations: ComponentAnimationsShape.default({}),
	effects: ComponentEffectsShape.default({}),
	visible: z.boolean().default(true),
	order: z.number().default(0),
	checksum: z.string().optional()
});

/**
 * Text component schema
 */
export const TextComponentShape = ComponentBaseShape.extend({
	type: z.literal('TEXT'),
	text: z.string(),
	isAIEmoji: z.boolean().default(false).optional(),
	appearance: AppearanceShape.extend({
		text: TextAppearanceShape,
		verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
		horizontalAlign: z.enum(['left', 'center', 'right']).optional()
	})
}).strict();

/**
 * Image component schema
 */
export const ImageComponentShape = ComponentBaseShape.extend({
	type: z.literal('IMAGE'),
	source: ComponentSourceShape,
	crop: z
		.object({
			xPercent: z.number().min(0).max(1).default(0),
			yPercent: z.number().min(0).max(1).default(0),
			widthPercent: z.number().min(0).max(1).default(1),
			heightPercent: z.number().min(0).max(1).default(1)
		})
		.optional()
}).strict();

/**
 * GIF component schema
 */
export const GifComponentShape = ComponentBaseShape.extend({
	type: z.literal('GIF'),
	source: ComponentSourceShape,
	playback: z
		.object({
			loop: z.boolean().default(true),
			speed: z.number().positive().default(1)
		})
		.optional()
}).strict();

/**
 * Video component schema
 */
export const VideoComponentShape = ComponentBaseShape.extend({
	type: z.literal('VIDEO'),
	source: ComponentSourceShape,
	volume: z.number().min(0).max(1).default(1),
	muted: z.boolean().default(false),
	playback: z
		.object({
			autoplay: z.boolean().default(true),
			loop: z.boolean().default(false),
			playbackRate: z.number().positive().default(1),
			startAt: z.number().min(0).default(0),
			endAt: z.number().optional()
		})
		.optional(),
	crop: z
		.object({
			x: z.number().default(0),
			y: z.number().default(0),
			width: z.number().min(0).max(1).default(1),
			height: z.number().min(0).max(1).default(1)
		})
		.optional()
}).strict();

/**
 * Progress configuration schemas for different progress types
 */
export const LinearProgressConfigShape = z.object({
	type: z.literal('linear'),
	direction: z.enum(['horizontal', 'vertical']).default('horizontal'),
	reverse: z.boolean().default(false).optional(),
	anchor: z.enum(['start', 'center', 'end']).default('start').optional()
});

export const PerimeterProgressConfigShape = z.object({
	type: z.literal('perimeter'),
	startCorner: z.enum(['top-left', 'top-right', 'bottom-right', 'bottom-left']).default('top-left'),
	clockwise: z.boolean().default(true).optional(),
	strokeWidth: z.number().positive().default(4).optional()
});

export const RadialProgressConfigShape = z.object({
	type: z.literal('radial'),
	startAngle: z.number().default(-90).optional(), // -90 = top (12 o'clock), 0 = right (3 o'clock)
	clockwise: z.boolean().default(true).optional(),
	innerRadius: z.number().min(0).max(1).default(0).optional(), // 0 = filled circle, >0 = ring/donut
	strokeWidth: z.number().positive().optional(), // For ring style
	capStyle: z.enum(['butt', 'round', 'square']).default('round').optional()
});

export const DoubleProgressConfigShape = z.object({
	type: z.literal('double'),
	paths: z
		.array(
			z.object({
				direction: z.enum(['horizontal', 'vertical']),
				position: z.enum(['top', 'bottom', 'left', 'right']),
				reverse: z.boolean().default(false).optional(),
				offset: z.number().default(0).optional() // Offset from edge in pixels
			})
		)
		.min(2)
		.max(4) // At least 2 paths, max 4 for performance
});

export const CustomProgressConfigShape = z.object({
	type: z.literal('custom'),
	pathData: z.string(), // SVG path data for custom progress shapes
	strokeWidth: z.number().positive().default(4).optional(),
	capStyle: z.enum(['butt', 'round', 'square']).default('round').optional()
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
export const ShapeComponentShape = ComponentBaseShape.extend({
	type: z.literal('SHAPE'),
	shape: z.union([
		// Progress shape with specialized configuration
		z.object({
			type: z.literal('progress'),
			progressConfig: ProgressConfigShape.optional().default({
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
	appearance: AppearanceShape.extend({
		color: ColorTypeShape.optional() // fill color
	})
}).strict();

/**
 * Audio component schema
 */
export const AudioComponentShape = ComponentBaseShape.extend({
	type: z.literal('AUDIO'),
	source: ComponentSourceShape,
	volume: z.number().min(0).max(1).default(1),
	muted: z.boolean().default(false)
}).strict();

/**
 * Color component schema
 */
export const ColorComponentShape = ComponentBaseShape.extend({
	type: z.literal('COLOR'),
	appearance: AppearanceShape.extend({
		background: z
			.string()
			.refine(isValidColor, { message: 'Invalid color format for ColorComponent background' })
	})
}).strict();

/**
 * Gradient component schema
 */
export const GradientComponentShape = ComponentBaseShape.extend({
	type: z.literal('GRADIENT'),
	appearance: AppearanceShape.extend({
		background: GradientDefinitionShape // Requires a gradient type in background
	})
}).strict();

/**
 * Subtitles component schema
 */

export const AIEmojiShape = z.object({
	text: z.string(),
	emoji: z.string(),
	startAt: z.number(),
	endAt: z.number(),
	componentId: z.string().optional()
});

export const SubtitleComponentShape = ComponentBaseShape.extend({
	type: z.literal('SUBTITLES'),
	source: ComponentSourceShape.extend({
		url: z.string().url().optional()
		// Subtitles might need specific source fields, e.g., format
	}).optional(),
	timingAnchor: TimingAnchorShape,
	text: z.string().optional(), // Optional: if text is directly embedded
	appearance: AppearanceShape.extend({
		text: TextAppearanceShape,
		verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
		horizontalAlign: z.enum(['left', 'center', 'right']).optional(),
		hasAIEmojis: z.boolean().default(false).optional(),
		aiEmojisPlacement: z.enum(['top', 'bottom']).default('top').optional(),
		aiEmojisPlacementOffset: z.number().default(30).optional(),
		aiEmojis: z.array(AIEmojiShape).optional(),
		highlighterColor1: ColorTypeShape.optional(),
		highlighterColor2: ColorTypeShape.optional(),
		highlighterColor3: ColorTypeShape.optional()
	})
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