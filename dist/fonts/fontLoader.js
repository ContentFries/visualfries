import { createGoogleFontsProvider } from './GoogleFontsProvider.js';
// The default provider chain contains only the Google Fonts provider.
// This ensures the library works out of the box with no configuration.
let activeFontProviders = [createGoogleFontsProvider()];
/**
 * Sets the active font provider chain for the library.
 * This is called by `createSceneBuilder` during initialization.
 * @param providers The array of font providers from user config.
 */
export function setFontProviders(providers) {
    // If the user provides a valid array, use it. Otherwise, stick with the default.
    if (providers && providers.length > 0) {
        activeFontProviders = providers;
    }
}
/**
 * The main function the library uses to request a font.
 * It iterates through the active provider chain and returns the first success.
 * @param font The font family string (e.g., "Roboto", "Montserrat:700").
 * @param text Optional text for font subsetting.
 * @returns A Promise resolving to an ArrayBuffer or null.
 */
export async function fetchFont(font, text) {
    for (const provider of activeFontProviders) {
        try {
            const fontData = await provider(font, text);
            // If the provider returns a valid ArrayBuffer, we have succeeded.
            if (fontData) {
                return fontData;
            }
            // If the provider returns null, it means "I can't handle this font", so we continue.
        }
        catch (error) {
            // If a provider throws an error, log it but don't stop the chain.
            console.error(`A font provider failed for font "${font}"`, error);
        }
    }
    // If we get through the entire chain without success, the font is not found.
    console.warn(`No font provider could resolve the font: "${font}"`);
    return null;
}
