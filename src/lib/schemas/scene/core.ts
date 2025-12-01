import { z } from 'zod';
import { isValidColor } from './utils.js';
import { ComponentShape } from './components.js';
import { SubtitleCollectionShape, SubtitleWithCompactWordsShape } from './subtitles.js';

// Utility functions
const toFixed3 = (val: number) => parseFloat(val.toFixed(3));

/**
 * Basic asset metadata
 */
export const SceneAssetMetadataShape = z.object({
	width: z.number().positive().optional(),
	height: z.number().positive().optional(),
	duration: z.number().min(0).optional(),
	format: z.string().optional(),
	codec: z.string().optional(),
	bitrate: z.number().positive().optional(),
	fps: z.number().positive().optional(),
	hasAudio: z.boolean().optional()
});

export const AssetSubtitleShape = z.object({
	// id: z.string(),
	url: z.url().optional(),
	language_code: z.string().optional(),
	subtitles: z.array(SubtitleWithCompactWordsShape).optional()
});

/**
 * Asset schema for centralized asset registry
 */
export const SceneAssetShape = z.object({
	id: z.string(),
	type: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'FONT', 'GIF']),
	url: z.string(),
	path: z.string().optional(),
	language_code: z.string().optional(),
	metadata: SceneAssetMetadataShape.optional(),
	subtitles: z.array(AssetSubtitleShape).optional()
});

export const SceneSubtitlesSettingsShape = z.object({
	punctuation: z.boolean().prefault(true),
	mergeGap: z.number().min(0).prefault(0.2).optional(),
	data: z.record(z.string(), SubtitleCollectionShape).optional()
});

/**
 * Core scene settings schema defining dimensions, background, and other scene-level properties
 */
export const SceneSettingsShape = z.object({
	/** Scene dimensions in pixels */
	width: z.number().positive(),
	height: z.number().positive(),
	language_code: z.string().optional(),
	/** Scene duration in seconds */
	duration: z.number().positive().transform(toFixed3),
	startAt: z.number().min(0).transform(toFixed3).optional(),
	endAt: z.number().min(0).transform(toFixed3).optional(),
	trimZones: z
		.array(
			z.object({
				start: z.number().min(0).transform(toFixed3),
				end: z.number().positive().transform(toFixed3)
			})
		)
		.optional(),
	/** Frame rate for rendering */
	fps: z.int().positive().prefault(30),
	/** Background configuration */
	backgroundColor: z
		.union([
			z.string().refine(isValidColor, {
				error: 'Invalid color format'
			}),
			z.object({
				type: z.enum(['linear', 'radial']),
				colors: z.array(z.string().refine(isValidColor)).min(2),
				stops: z.array(z.number().min(0).max(100)).optional(),
				angle: z.number().min(0).max(360).prefault(180).optional(),
				position: z.string().optional(),
				shape: z.enum(['ellipse', 'circle']).optional()
			})
		])
		.prefault('#FFFFFF'),
	/** Audio configuration */
	audio: z
		.object({
			src: z.url().optional(),
			volume: z.number().min(0).max(1).prefault(1),
			muted: z.boolean().prefault(false)
		})
		.optional(),
	subtitles: SceneSubtitlesSettingsShape.optional()
});

/**
 * Schema for a scene layer in v2.0
 * Layers organize related components and control their stacking order
 */
export const SceneLayerShape = z.object({
	/** Unique identifier for the layer */
	id: z.string(),
	/** Optional name for the layer */
	name: z.string().optional(),
	/** Layer stacking order (higher values appear on top) */
	order: z.number().prefault(0),
	/** Whether the layer is visible */
	visible: z.boolean().prefault(true),
	/** Whether audio in this layer is muted */
	muted: z.boolean().prefault(false),
	/** Components contained in this layer */
	components: z
		.array(
			// Will be extended with component schemas in components.ts
			ComponentShape
		)
		.prefault([])
});

/**
 * Audio track schema for global audio playback
 */
export const AudioTrackShape = z.object({
	id: z.string(),
	name: z.string().optional(),
	url: z.string(),
	volume: z.number().min(0).max(1).prefault(1),
	startAt: z.number().min(0).transform(toFixed3),
	endAt: z
		.number()
		.min(0)
		.optional()
		.transform((val) => (val === undefined ? undefined : toFixed3(val))),
	muted: z.boolean().prefault(false)
});

/**
 * Schema for transitions between components
 */
export const SceneTransitionShape = z.object({
	id: z.string(),
	name: z.string().optional(),
	fromComponentId: z.string(),
	toComponentId: z.string(),
	type: z.string(),
	presetId: z.string().optional(),
	duration: z.number().min(0).transform(toFixed3),
	parameters: z.record(z.string(), z.unknown()).optional()
});

/**
 * Schema for the main scene structure in v2.0
 */
export const SceneShape = z.strictObject({
	/** Unique identifier for the scene */
	id: z.string(),
	/** Schema version */
	version: z.coerce.string().optional(),
	/** Optional name for the scene */
	name: z.string().optional(),
	/** Scene settings */
	settings: SceneSettingsShape,
	/** Assets registry */
	assets: z.array(SceneAssetShape).prefault([]),
	/** Layers in the scene */
	layers: z.array(SceneLayerShape).prefault([]),
	/** Scene transitions */
	transitions: z.array(SceneTransitionShape).prefault([]),
	/** Audio tracks */
	audioTracks: z.array(AudioTrackShape).prefault([]),
	/** Optional checksum */
	checksum: z.string().optional()
});

// Export inferred types from schemas
export type SceneAssetMetadata = z.infer<typeof SceneAssetMetadataShape>;
export type SceneAsset = z.infer<typeof SceneAssetShape>;
export type SceneSettings = z.infer<typeof SceneSettingsShape>;
export type SceneSubtitlesSettings = z.infer<typeof SceneSubtitlesSettingsShape>;
export type SceneLayer = z.infer<typeof SceneLayerShape>;
export type AudioTrack = z.infer<typeof AudioTrackShape>;
export type SceneTransition = z.infer<typeof SceneTransitionShape>;
export type Scene = z.infer<typeof SceneShape>;

export type SceneInput = z.input<typeof SceneShape>;
export type SceneLayerInput = z.input<typeof SceneLayerShape>;
export type AudioTrackInput = z.input<typeof AudioTrackShape>;
export type SceneTransitionInput = z.input<typeof SceneTransitionShape>;
export type SceneAssetInput = z.input<typeof SceneAssetShape>;
export type SceneAssetMetadataInput = z.input<typeof SceneAssetMetadataShape>;
export type SceneSettingsInput = z.input<typeof SceneSettingsShape>;

export type RenderEnvironment = 'client' | 'server';
