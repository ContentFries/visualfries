/**
 * Component Context Helpers
 *
 * Type guards and helper functions for type-safe access to component-specific data
 * in hook contexts. Eliminates the need for `as any` casts throughout the codebase.
 */

import type {
	Component,
	VideoComponent,
	AudioComponent,
	ImageComponent,
	GifComponent,
	TextComponent,
	SubtitleComponent,
	ShapeComponent,
	ColorComponent,
	GradientComponent,
	ComponentSource,
	IComponentContext
} from '$lib';

// ============================================================================
// Component Type Constants
// ============================================================================

export const MEDIA_COMPONENT_TYPES = ['VIDEO', 'AUDIO'] as const;
export const SOURCE_COMPONENT_TYPES = ['VIDEO', 'AUDIO', 'IMAGE', 'GIF'] as const;
export const VISUAL_COMPONENT_TYPES = ['VIDEO', 'IMAGE', 'GIF', 'TEXT', 'SHAPE', 'SUBTITLES', 'COLOR', 'GRADIENT'] as const;

export type MediaComponentType = (typeof MEDIA_COMPONENT_TYPES)[number];
export type SourceComponentType = (typeof SOURCE_COMPONENT_TYPES)[number];

// ============================================================================
// Type Guards for Component Data
// ============================================================================

/**
 * Type guard for VIDEO component
 */
export function isVideoComponent(data: Component | undefined): data is VideoComponent {
	return data?.type === 'VIDEO';
}

/**
 * Type guard for AUDIO component
 */
export function isAudioComponent(data: Component | undefined): data is AudioComponent {
	return data?.type === 'AUDIO';
}

/**
 * Type guard for IMAGE component
 */
export function isImageComponent(data: Component | undefined): data is ImageComponent {
	return data?.type === 'IMAGE';
}

/**
 * Type guard for GIF component
 */
export function isGifComponent(data: Component | undefined): data is GifComponent {
	return data?.type === 'GIF';
}

/**
 * Type guard for TEXT component
 */
export function isTextComponent(data: Component | undefined): data is TextComponent {
	return data?.type === 'TEXT';
}

/**
 * Type guard for SUBTITLES component
 */
export function isSubtitleComponent(data: Component | undefined): data is SubtitleComponent {
	return data?.type === 'SUBTITLES';
}

/**
 * Type guard for SHAPE component
 */
export function isShapeComponent(data: Component | undefined): data is ShapeComponent {
	return data?.type === 'SHAPE';
}

/**
 * Type guard for COLOR component
 */
export function isColorComponent(data: Component | undefined): data is ColorComponent {
	return data?.type === 'COLOR';
}

/**
 * Type guard for GRADIENT component
 */
export function isGradientComponent(data: Component | undefined): data is GradientComponent {
	return data?.type === 'GRADIENT';
}

/**
 * Type guard for components with a media source (VIDEO, AUDIO, IMAGE, GIF)
 */
export function hasSource(
	data: Component | undefined
): data is VideoComponent | AudioComponent | ImageComponent | GifComponent {
	return (
		data !== undefined &&
		SOURCE_COMPONENT_TYPES.includes(data.type as SourceComponentType)
	);
}

/**
 * Type guard for media components (VIDEO, AUDIO)
 */
export function isMediaComponent(
	data: Component | undefined
): data is VideoComponent | AudioComponent {
	return (
		data !== undefined &&
		MEDIA_COMPONENT_TYPES.includes(data.type as MediaComponentType)
	);
}

// ============================================================================
// Safe Accessor Helpers
// ============================================================================

/**
 * Safely get source from component data
 */
export function getSource(data: Component | undefined): ComponentSource | undefined {
	if (hasSource(data)) {
		return data.source;
	}
	return undefined;
}

/**
 * Safely get source.url from component data
 */
export function getSourceUrl(data: Component | undefined): string | undefined {
	return getSource(data)?.url;
}

/**
 * Safely get source.startAt from component data (for VIDEO/AUDIO)
 */
export function getSourceStartAt(data: Component | undefined): number | undefined {
	const startAt = getSource(data)?.startAt;
	// Convert null to undefined for consistency
	return startAt ?? undefined;
}

/**
 * Safely get muted state from media component
 */
export function getMuted(data: Component | undefined): boolean {
	if (isVideoComponent(data) || isAudioComponent(data)) {
		return data.muted ?? false;
	}
	return false;
}

/**
 * Safely get volume from media component
 */
export function getVolume(data: Component | undefined): number {
	if (isVideoComponent(data) || isAudioComponent(data)) {
		return data.volume ?? 1;
	}
	return 1;
}

/**
 * Safely get text content from TEXT component
 */
export function getTextContent(data: Component | undefined): string | undefined {
	if (isTextComponent(data)) {
		return data.text;
	}
	return undefined;
}

// ============================================================================
// Context Helper Functions
// ============================================================================

/**
 * Get typed component data from context
 */
export function getContextData<T extends Component>(
	context: IComponentContext,
	typeGuard: (data: Component | undefined) => data is T
): T | undefined {
	const data = context.contextData as Component | undefined;
	if (typeGuard(data)) {
		return data;
	}
	return undefined;
}

/**
 * Get video component data from context
 */
export function getVideoData(context: IComponentContext): VideoComponent | undefined {
	return getContextData(context, isVideoComponent);
}

/**
 * Get audio component data from context
 */
export function getAudioData(context: IComponentContext): AudioComponent | undefined {
	return getContextData(context, isAudioComponent);
}

/**
 * Get image component data from context
 */
export function getImageData(context: IComponentContext): ImageComponent | undefined {
	return getContextData(context, isImageComponent);
}

/**
 * Get gif component data from context
 */
export function getGifData(context: IComponentContext): GifComponent | undefined {
	return getContextData(context, isGifComponent);
}

/**
 * Get text component data from context
 */
export function getTextData(context: IComponentContext): TextComponent | undefined {
	return getContextData(context, isTextComponent);
}

/**
 * Get source from context's component data
 */
export function getContextSource(context: IComponentContext): ComponentSource | undefined {
	const data = context.contextData as Component | undefined;
	return getSource(data);
}

/**
 * Get media properties (muted, volume) from context
 */
export function getMediaProps(context: IComponentContext): { muted: boolean; volume: number } {
	const data = context.contextData as Component | undefined;
	return {
		muted: getMuted(data),
		volume: getVolume(data)
	};
}
