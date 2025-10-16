export * from './core.js';
export * from './components.js';
export * from './properties.js';
export * from './animations.js';
export type * from './components.js';
export type * from './properties.js';
export type { CompactWordMetadata, CompactWordTuple, SubtitleWord, SubtitleWithCompactWords, SubtitleWithLegacyWords, Subtitle, SubtitleCollection } from './subtitles.js';
export * from './subtitles.js';
export type FontType = {
    alias: string;
    url?: string;
    data?: {
        family: string;
    };
    source: 'google' | 'custom';
    src?: string;
};
export type BackgroundColors = {
    colors: string[];
    angle: number;
    type: string;
};
