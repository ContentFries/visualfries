/**
 * Component Context Helpers
 *
 * Type guards and helper functions for type-safe access to component-specific data
 * in hook contexts. Eliminates the need for `as any` casts throughout the codebase.
 */
import type { Component, VideoComponent, AudioComponent, ImageComponent, GifComponent, TextComponent, SubtitleComponent, ShapeComponent, ColorComponent, GradientComponent, ComponentSource, IComponentContext } from '..';
export declare const MEDIA_COMPONENT_TYPES: readonly ["VIDEO", "AUDIO"];
export declare const SOURCE_COMPONENT_TYPES: readonly ["VIDEO", "AUDIO", "IMAGE", "GIF"];
export declare const VISUAL_COMPONENT_TYPES: readonly ["VIDEO", "IMAGE", "GIF", "TEXT", "SHAPE", "SUBTITLES", "COLOR", "GRADIENT"];
export type MediaComponentType = (typeof MEDIA_COMPONENT_TYPES)[number];
export type SourceComponentType = (typeof SOURCE_COMPONENT_TYPES)[number];
/**
 * Type guard for VIDEO component
 */
export declare function isVideoComponent(data: Component | undefined): data is VideoComponent;
/**
 * Type guard for AUDIO component
 */
export declare function isAudioComponent(data: Component | undefined): data is AudioComponent;
/**
 * Type guard for IMAGE component
 */
export declare function isImageComponent(data: Component | undefined): data is ImageComponent;
/**
 * Type guard for GIF component
 */
export declare function isGifComponent(data: Component | undefined): data is GifComponent;
/**
 * Type guard for TEXT component
 */
export declare function isTextComponent(data: Component | undefined): data is TextComponent;
/**
 * Type guard for SUBTITLES component
 */
export declare function isSubtitleComponent(data: Component | undefined): data is SubtitleComponent;
/**
 * Type guard for SHAPE component
 */
export declare function isShapeComponent(data: Component | undefined): data is ShapeComponent;
/**
 * Type guard for COLOR component
 */
export declare function isColorComponent(data: Component | undefined): data is ColorComponent;
/**
 * Type guard for GRADIENT component
 */
export declare function isGradientComponent(data: Component | undefined): data is GradientComponent;
/**
 * Type guard for components with a media source (VIDEO, AUDIO, IMAGE, GIF)
 */
export declare function hasSource(data: Component | undefined): data is VideoComponent | AudioComponent | ImageComponent | GifComponent;
/**
 * Type guard for media components (VIDEO, AUDIO)
 */
export declare function isMediaComponent(data: Component | undefined): data is VideoComponent | AudioComponent;
/**
 * Safely get source from component data
 */
export declare function getSource(data: Component | undefined): ComponentSource | undefined;
/**
 * Safely get source.url from component data
 */
export declare function getSourceUrl(data: Component | undefined): string | undefined;
/**
 * Safely get source.startAt from component data (for VIDEO/AUDIO)
 */
export declare function getSourceStartAt(data: Component | undefined): number | undefined;
/**
 * Safely get muted state from media component
 */
export declare function getMuted(data: Component | undefined): boolean;
/**
 * Safely get volume from media component
 */
export declare function getVolume(data: Component | undefined): number;
/**
 * Safely get text content from TEXT component
 */
export declare function getTextContent(data: Component | undefined): string | undefined;
/**
 * Get typed component data from context
 */
export declare function getContextData<T extends Component>(context: IComponentContext, typeGuard: (data: Component | undefined) => data is T): T | undefined;
/**
 * Get video component data from context
 */
export declare function getVideoData(context: IComponentContext): VideoComponent | undefined;
/**
 * Get audio component data from context
 */
export declare function getAudioData(context: IComponentContext): AudioComponent | undefined;
/**
 * Get image component data from context
 */
export declare function getImageData(context: IComponentContext): ImageComponent | undefined;
/**
 * Get gif component data from context
 */
export declare function getGifData(context: IComponentContext): GifComponent | undefined;
/**
 * Get text component data from context
 */
export declare function getTextData(context: IComponentContext): TextComponent | undefined;
/**
 * Get source from context's component data
 */
export declare function getContextSource(context: IComponentContext): ComponentSource | undefined;
/**
 * Get media properties (muted, volume) from context
 */
export declare function getMediaProps(context: IComponentContext): {
    muted: boolean;
    volume: number;
};
