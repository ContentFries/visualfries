import type { FontProvider } from './types.js';
/**
 * Creates a browser-only font provider for Google Fonts.
 *
 * This provider fetches fonts in the woff2 format, as it cannot
 * set the User-Agent header to request TTF files. For environments
 * that strictly require TTF (like server-side rendering with some libraries),
 * a custom server-backed provider is necessary.
 *
 * @returns A FontProvider function with its own internal cache.
 */
export declare const createGoogleFontsProvider: () => FontProvider;
