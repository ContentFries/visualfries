import type { FontType } from '../schemas/scene/index.js';
import type { TextAppearance } from '../index.js';
export declare class SVGGenerator {
    private fontCache;
    /** Fonts the scene builder was given; text without its own fontSource inlines these. */
    private configuredFonts;
    private emojiCache;
    private fontDataBase64Cache;
    private fontDataBase64Inflight;
    private static instance;
    static getInstance(): SVGGenerator;
    setConfiguredFonts(fonts: FontType[]): void;
    generateSVG(el: HTMLElement, config: TextAppearance, width: number, height: number, svgParentId?: string, fontText?: string): Promise<{
        base: string;
        content: string;
        end: string;
    }>;
    private isTextEmoji;
    private getFontDataArrayBuffer;
    private arrayBufferToDataURL;
    private getFontDataBase64;
    clearCache(): void;
}
export declare const svgGenerator: SVGGenerator;
