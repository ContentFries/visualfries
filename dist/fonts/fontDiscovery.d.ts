import type { FontType, Scene } from '..';
export type FontVariantDescriptor = {
    family: string;
    weight: number;
    source: 'google' | 'custom';
    fileUrl?: string;
};
export declare const extractConfiguredFontVariants: (configuredFonts?: FontType[]) => FontVariantDescriptor[];
export declare const discoverRequiredFontVariants: (sceneData: Scene, configuredFonts?: FontType[]) => FontVariantDescriptor[];
