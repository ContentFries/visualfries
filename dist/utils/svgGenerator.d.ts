import type { TextAppearance } from '..';
export declare class SVGGenerator {
    private fontCache;
    private emojiCache;
    private fontDataBase64Cache;
    private fontDataBase64Inflight;
    private static instance;
    static getInstance(): SVGGenerator;
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
