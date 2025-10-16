// src/lib/fonts/GoogleFontsProvider.ts

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
export const createGoogleFontsProvider = (): FontProvider => {
	// A cache lives inside this closure, unique to each provider instance.
	const fontCache: Record<string, ArrayBuffer> = {};

	/**
	 * Attempts to fetch a font with the given fontFamily.
	 * Internal helper that doesn't use cache.
	 */
	const fetchFont = async (fontFamily: string, text?: string): Promise<ArrayBuffer | null> => {
		try {
			// Google Fonts API uses '+' for spaces and ':' for weight specifiers.
			const formattedFontFamily = fontFamily.replace(/\s/g, '+');
			let apiUrl = `https://fonts.googleapis.com/css2?family=${formattedFontFamily}`;
			if (text) {
				apiUrl += `&text=${encodeURIComponent(text)}`;
			}

			// 1. Fetch the CSS file from Google Fonts.
			const cssResponse = await fetch(apiUrl, {
				headers: {
					// User-Agent that Google Fonts typically returns woff2 for.
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			});

			if (!cssResponse.ok) {
				return null;
			}
			const cssText = await cssResponse.text();

			// 2. Parse the CSS to find the font URL (woff2).
			const fontUrlMatch = cssText.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
			if (!fontUrlMatch || !fontUrlMatch[1]) {
				return null;
			}
			const fontUrl = fontUrlMatch[1];

			// 3. Fetch the font file itself.
			const fontDataResponse = await fetch(fontUrl);
			if (!fontDataResponse.ok) {
				return null;
			}
			return await fontDataResponse.arrayBuffer();
		} catch (error) {
			return null;
		}
	};

	/**
	 * Generates fallback weights for a given weight.
	 * For high weights (>= 500), tries decreasing: 900 -> 800 -> 700 -> ... -> 400
	 * For low weights (< 500), tries increasing: 100 -> 200 -> 300 -> 400
	 */
	const getFallbackWeights = (weight: number): number[] => {
		const fallbacks: number[] = [];

		if (weight >= 500) {
			// Try decreasing weights from 900 down to 400
			for (let w = 900; w >= 400; w -= 100) {
				if (w !== weight) {
					fallbacks.push(w);
				}
			}
		} else {
			// Try increasing weights from 100 up to 400
			for (let w = 100; w <= 400; w += 100) {
				if (w !== weight) {
					fallbacks.push(w);
				}
			}
		}

		return fallbacks;
	};

	return async (fontFamily: string, text?: string): Promise<ArrayBuffer | null> => {
		const cacheKey = text ? JSON.stringify({ fontFamily, text }) : fontFamily;
		if (fontCache[cacheKey]) {
			return fontCache[cacheKey];
		}

		// Parse font family to extract base name and weight
		const weightMatch = fontFamily.match(/(.*):wght@(\d+)/);
		const baseFontFamily = weightMatch ? weightMatch[1] : fontFamily;
		const requestedWeight = weightMatch ? parseInt(weightMatch[2], 10) : null;

		try {
			// Try the original font family first
			let fontArrayBuffer = await fetchFont(fontFamily, text);

			if (!fontArrayBuffer && requestedWeight) {
				// If original failed and we have a weight, try fallbacks
				const fallbackWeights = getFallbackWeights(requestedWeight);

				for (const fallbackWeight of fallbackWeights) {
					const fallbackFontFamily = `${baseFontFamily}:wght@${fallbackWeight}`;
					console.warn(`Font "${fontFamily}" failed, trying fallback weight: ${fallbackWeight}`);

					fontArrayBuffer = await fetchFont(fallbackFontFamily, text);
					if (fontArrayBuffer) {
						console.log(`Successfully loaded font with fallback weight: ${fallbackWeight}`);
						break;
					}
				}

				// If all weighted fallbacks failed, try without weight specification
				if (!fontArrayBuffer) {
					console.warn(`All weight fallbacks failed for "${fontFamily}", trying base font`);
					fontArrayBuffer = await fetchFont(baseFontFamily, text);
					if (fontArrayBuffer) {
						console.log(`Successfully loaded base font: ${baseFontFamily}`);
					}
				}
			}

			if (!fontArrayBuffer) {
				console.error(`Failed to fetch font: ${fontFamily}`);
				return null;
			}

			fontCache[cacheKey] = fontArrayBuffer;
			return fontArrayBuffer;
		} catch (error) {
			console.error(`Error in GoogleFontsProvider for font "${fontFamily}":`, error);
			return null;
		}
	};
};
