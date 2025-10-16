import type { FontProvider } from './types.js';
/**
 * Sets the active font provider chain for the library.
 * This is called by `createSceneBuilder` during initialization.
 * @param providers The array of font providers from user config.
 */
export declare function setFontProviders(providers?: FontProvider[]): void;
/**
 * The main function the library uses to request a font.
 * It iterates through the active provider chain and returns the first success.
 * @param font The font family string (e.g., "Roboto", "Montserrat:700").
 * @param text Optional text for font subsetting.
 * @returns A Promise resolving to an ArrayBuffer or null.
 */
export declare function fetchFont(font: string, text?: string): Promise<ArrayBuffer | null>;
