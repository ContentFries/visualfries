export * from './core.js';
export type * from './core.js';
export * from './components.js';
export type * from './components.js';
export * from './properties.js';
export type * from './properties.js';
export * from './animations.js';
export type * from './animations.js';
export * from './subtitles.js';
export type * from './subtitles.js';
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
