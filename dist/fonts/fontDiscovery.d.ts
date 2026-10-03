import type { FontType, Scene } from '../index.js';
export type FontVariantDescriptor = {
    family: string;
    weight: number;
    source: 'google' | 'custom';
    fileUrl?: string;
};
/**
 * Where a text component's font comes from, decided exactly as loading decides it for that
 * component (collectComponentTextVariants): its own `fontSource`, else the configured font that
 * the family or alias looks up to, else nowhere (a system font). SVG inlining uses this, so a font
 * that loads is also the font that gets drawn.
 */
export declare const resolveTextFontSource: (text: {
    fontFamily?: string | null;
    fontSource?: {
        source?: "google" | "custom" | null;
    } | null;
}, configuredFonts: FontType[]) => "google" | "custom" | null;
export declare const extractConfiguredFontVariants: (configuredFonts?: FontType[]) => FontVariantDescriptor[];
export declare const discoverRequiredFontVariants: (sceneData: Scene, configuredFonts?: FontType[]) => FontVariantDescriptor[];
