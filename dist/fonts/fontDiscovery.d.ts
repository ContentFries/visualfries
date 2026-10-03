import type { FontType, Scene } from '../index.js';
export type FontVariantDescriptor = {
    family: string;
    weight: number;
    source: 'google' | 'custom';
    fileUrl?: string;
};
/**
 * Where a text component's font comes from: its own `fontSource`, else a font configured on the
 * builder under the same family or alias, else nowhere (a system font). Font loading and SVG
 * inlining share this rule, so a font that loads is also the font that gets drawn.
 */
export declare const resolveTextFontSource: (text: {
    fontFamily?: string | null;
    fontWeight?: string | number | null;
    fontSource?: {
        source?: "google" | "custom" | null;
    } | null;
}, configuredFonts: FontType[]) => "google" | "custom" | null;
export declare const extractConfiguredFontVariants: (configuredFonts?: FontType[]) => FontVariantDescriptor[];
export declare const discoverRequiredFontVariants: (sceneData: Scene, configuredFonts?: FontType[]) => FontVariantDescriptor[];
