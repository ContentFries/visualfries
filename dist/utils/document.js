import { extractConfiguredFontVariants } from '../fonts/fontDiscovery.js';
const FONT_PROBE_TEXT = 'BESbswy';
const FONT_PROBE_SIZE = '60px';
const customFaceRegistry = new Set();
const isFontApiAvailable = () => typeof document !== 'undefined' &&
    typeof document.fonts !== 'undefined' &&
    typeof document.createElement === 'function';
const loadStylesheet = async (href) => {
    await new Promise((resolve) => {
        const link = document.createElement('link');
        link.href = href;
        link.rel = 'stylesheet';
        link.onload = () => resolve();
        link.onerror = () => {
            console.warn(`Failed to load font stylesheet: ${href}`);
            resolve();
        };
        document.head.appendChild(link);
    });
};
const groupByFamily = (variants) => {
    const grouped = new Map();
    for (const variant of variants) {
        if (!grouped.has(variant.family)) {
            grouped.set(variant.family, new Set());
        }
        grouped.get(variant.family).add(variant.weight);
    }
    return grouped;
};
const buildGoogleCss2Url = (variants) => {
    if (!variants.length) {
        return null;
    }
    const groupedFamilies = groupByFamily(variants);
    const familyQueryParts = [];
    for (const [family, weights] of groupedFamilies.entries()) {
        const encodedFamily = encodeURIComponent(family).replace(/%20/g, '+');
        const sortedWeights = [...weights].sort((a, b) => a - b);
        const familyPart = sortedWeights.length
            ? `family=${encodedFamily}:wght@${sortedWeights.join(';')}`
            : `family=${encodedFamily}`;
        familyQueryParts.push(familyPart);
    }
    if (!familyQueryParts.length) {
        return null;
    }
    return `https://fonts.googleapis.com/css2?${familyQueryParts.join('&')}&display=swap`;
};
const registerCustomFontFaces = async (variants) => {
    const customVariants = variants.filter((variant) => variant.source === 'custom');
    if (!customVariants.length) {
        return;
    }
    const hasFontFaceApi = typeof FontFace !== 'undefined';
    for (const variant of customVariants) {
        if (!variant.fileUrl) {
            console.warn(`Custom font "${variant.family}" (weight ${variant.weight}) is missing fileUrl/src and cannot be preloaded.`);
            continue;
        }
        if (!hasFontFaceApi) {
            console.warn(`FontFace API is unavailable. Skipping custom font preload for "${variant.family}" (${variant.weight}).`);
            continue;
        }
        const registryKey = `${variant.family}::${variant.weight}::${variant.fileUrl}`;
        if (customFaceRegistry.has(registryKey)) {
            continue;
        }
        try {
            const face = new FontFace(variant.family, `url("${variant.fileUrl}")`, {
                weight: String(variant.weight),
                style: 'normal'
            });
            await face.load();
            document.fonts.add(face);
            customFaceRegistry.add(registryKey);
        }
        catch (error) {
            console.warn(`Failed to preload custom font "${variant.family}" (${variant.weight}) from ${variant.fileUrl}.`, error);
        }
    }
};
const loadDescriptors = async (variants) => {
    const descriptorPromises = variants.map(async (variant) => {
        const descriptor = `${variant.weight} ${FONT_PROBE_SIZE} "${variant.family}"`;
        try {
            const loadedFaces = await document.fonts.load(descriptor, FONT_PROBE_TEXT);
            if (!loadedFaces.length) {
                console.warn(`Font descriptor did not resolve any faces: ${descriptor}`);
            }
        }
        catch (error) {
            console.warn(`Failed to load font descriptor: ${descriptor}`, error);
        }
    });
    await Promise.all(descriptorPromises);
};
async function waitForAllFonts() {
    if (!isFontApiAvailable()) {
        return;
    }
    try {
        await document.fonts.ready;
    }
    catch (error) {
        console.warn('One or more fonts failed to reach ready state.', error);
    }
}
export const loadFonts = async function (fonts, variants) {
    if (!isFontApiAvailable()) {
        return;
    }
    const resolvedVariants = variants && variants.length ? variants : extractConfiguredFontVariants(fonts);
    if (!resolvedVariants.length) {
        return;
    }
    const googleVariants = resolvedVariants.filter((variant) => variant.source === 'google');
    const googleCss2Url = buildGoogleCss2Url(googleVariants);
    if (googleCss2Url) {
        await loadStylesheet(googleCss2Url);
    }
    await registerCustomFontFaces(resolvedVariants);
    await loadDescriptors(resolvedVariants);
    await waitForAllFonts();
};
