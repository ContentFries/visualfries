export declare const VISUAL_COMPONENT_TYPES: readonly ["TEXT", "SUBTITLES", "IMAGE", "VIDEO", "GIF", "SHAPE", "COLOR", "GRADIENT"];
export declare const COMPONENT_TYPES: readonly ["TEXT", "SUBTITLES", "IMAGE", "VIDEO", "GIF", "SHAPE", "COLOR", "GRADIENT", "AUDIO"];
export type CapabilityComponentType = (typeof COMPONENT_TYPES)[number];
export type VisualCapabilityComponentType = (typeof VISUAL_COMPONENT_TYPES)[number];
export type AnimationTransform = 'x' | 'y' | 'opacity' | 'rotation' | 'scale' | 'scaleX' | 'scaleY';
export type ComponentCapability = {
    type: CapabilityComponentType;
    visual: boolean;
    renderers: {
        preview: 'html' | 'pixi' | 'native-media' | 'none';
        final: 'pixi' | 'deterministic-media-pixi' | 'audio-mix' | 'none';
        parity: 'same-representation' | 'different-representation' | 'media-predecoded' | 'not-applicable';
    };
    animation: {
        attached: boolean;
        target: 'html-element-or-wrapper' | 'pixi-container' | 'none';
        transforms: AnimationTransform[];
        selectors: Array<'container' | 'words' | 'lines' | 'chars' | 'css'>;
        coordinateSpace: 'css-transform' | 'component-relative-offset' | 'none';
        transformOrigin: 'css-center-fixed' | 'component-center-fixed' | 'none';
        seekDeterministic: boolean;
    };
    effects: {
        supported: string[];
        validationOnly: string[];
    };
    backgrounds: string[];
    textFeatures: string[];
    caveats: string[];
};
export declare const COMPONENT_CAPABILITIES: Record<CapabilityComponentType, ComponentCapability>;
export declare function getComponentCapability(type: string): ComponentCapability | undefined;
export declare function getCapabilityCatalog(): ComponentCapability[];
export declare function componentSupportsRuntimeAnimation(type: string): boolean;
