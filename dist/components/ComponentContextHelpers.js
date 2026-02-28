/**
 * Component Context Helpers
 *
 * Type guards and helper functions for type-safe access to component-specific data
 * in hook contexts. Eliminates the need for `as any` casts throughout the codebase.
 */
// ============================================================================
// Component Type Constants
// ============================================================================
export const MEDIA_COMPONENT_TYPES = ['VIDEO', 'AUDIO'];
export const SOURCE_COMPONENT_TYPES = ['VIDEO', 'AUDIO', 'IMAGE', 'GIF'];
export const VISUAL_COMPONENT_TYPES = ['VIDEO', 'IMAGE', 'GIF', 'TEXT', 'SHAPE', 'SUBTITLES', 'COLOR', 'GRADIENT'];
// ============================================================================
// Type Guards for Component Data
// ============================================================================
/**
 * Type guard for VIDEO component
 */
export function isVideoComponent(data) {
    return data?.type === 'VIDEO';
}
/**
 * Type guard for AUDIO component
 */
export function isAudioComponent(data) {
    return data?.type === 'AUDIO';
}
/**
 * Type guard for IMAGE component
 */
export function isImageComponent(data) {
    return data?.type === 'IMAGE';
}
/**
 * Type guard for GIF component
 */
export function isGifComponent(data) {
    return data?.type === 'GIF';
}
/**
 * Type guard for TEXT component
 */
export function isTextComponent(data) {
    return data?.type === 'TEXT';
}
/**
 * Type guard for SUBTITLES component
 */
export function isSubtitleComponent(data) {
    return data?.type === 'SUBTITLES';
}
/**
 * Type guard for SHAPE component
 */
export function isShapeComponent(data) {
    return data?.type === 'SHAPE';
}
/**
 * Type guard for COLOR component
 */
export function isColorComponent(data) {
    return data?.type === 'COLOR';
}
/**
 * Type guard for GRADIENT component
 */
export function isGradientComponent(data) {
    return data?.type === 'GRADIENT';
}
/**
 * Type guard for components with a media source (VIDEO, AUDIO, IMAGE, GIF)
 */
export function hasSource(data) {
    return (data !== undefined &&
        SOURCE_COMPONENT_TYPES.includes(data.type));
}
/**
 * Type guard for media components (VIDEO, AUDIO)
 */
export function isMediaComponent(data) {
    return (data !== undefined &&
        MEDIA_COMPONENT_TYPES.includes(data.type));
}
// ============================================================================
// Safe Accessor Helpers
// ============================================================================
/**
 * Safely get source from component data
 */
export function getSource(data) {
    if (hasSource(data)) {
        return data.source;
    }
    return undefined;
}
/**
 * Safely get source.url from component data
 */
export function getSourceUrl(data) {
    return getSource(data)?.url;
}
/**
 * Safely get source.startAt from component data (for VIDEO/AUDIO)
 */
export function getSourceStartAt(data) {
    const startAt = getSource(data)?.startAt;
    // Convert null to undefined for consistency
    return startAt ?? undefined;
}
/**
 * Safely get muted state from media component
 */
export function getMuted(data) {
    if (isVideoComponent(data) || isAudioComponent(data)) {
        return data.muted ?? false;
    }
    return false;
}
/**
 * Safely get volume from media component
 */
export function getVolume(data) {
    if (isVideoComponent(data) || isAudioComponent(data)) {
        return data.volume ?? 1;
    }
    return 1;
}
/**
 * Safely get text content from TEXT component
 */
export function getTextContent(data) {
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
export function getContextData(context, typeGuard) {
    const data = context.contextData;
    if (typeGuard(data)) {
        return data;
    }
    return undefined;
}
/**
 * Get video component data from context
 */
export function getVideoData(context) {
    return getContextData(context, isVideoComponent);
}
/**
 * Get audio component data from context
 */
export function getAudioData(context) {
    return getContextData(context, isAudioComponent);
}
/**
 * Get image component data from context
 */
export function getImageData(context) {
    return getContextData(context, isImageComponent);
}
/**
 * Get gif component data from context
 */
export function getGifData(context) {
    return getContextData(context, isGifComponent);
}
/**
 * Get text component data from context
 */
export function getTextData(context) {
    return getContextData(context, isTextComponent);
}
/**
 * Get source from context's component data
 */
export function getContextSource(context) {
    const data = context.contextData;
    return getSource(data);
}
/**
 * Get media properties (muted, volume) from context
 */
export function getMediaProps(context) {
    const data = context.contextData;
    return {
        muted: getMuted(data),
        volume: getVolume(data)
    };
}
