const NAMED_WEIGHTS = {
    normal: 400,
    regular: 400,
    italic: 400,
    bold: 700,
    bolder: 700,
    lighter: 300
};
const DEFAULT_WEIGHT = 400;
const normalizeFamily = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
    return trimmed.length > 0 ? trimmed : null;
};
const normalizeWeight = (value) => {
    if (typeof value === 'number' && value >= 100 && value <= 900) {
        return Math.round(value / 100) * 100;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    if (NAMED_WEIGHTS[normalized] !== undefined) {
        return NAMED_WEIGHTS[normalized];
    }
    const directNumeric = Number.parseInt(normalized, 10);
    if (!Number.isNaN(directNumeric) && directNumeric >= 100 && directNumeric <= 900) {
        return Math.round(directNumeric / 100) * 100;
    }
    const embeddedWeightMatch = normalized.match(/([1-9]00)/);
    if (embeddedWeightMatch?.[1]) {
        return Number.parseInt(embeddedWeightMatch[1], 10);
    }
    return null;
};
const parseWeightsFromVariants = (variants) => {
    if (!Array.isArray(variants)) {
        return [];
    }
    const weights = new Set();
    for (const variant of variants) {
        const normalizedWeight = normalizeWeight(variant);
        if (normalizedWeight !== null) {
            weights.add(normalizedWeight);
        }
    }
    return [...weights];
};
const parseConfiguredFamilyDescriptor = (value, fallbackFamily) => {
    const [familyPart, variantPart] = value.split(':', 2);
    const family = normalizeFamily(familyPart) ?? normalizeFamily(fallbackFamily) ?? fallbackFamily;
    const weights = new Set();
    if (variantPart) {
        const numericMatches = variantPart.matchAll(/([1-9]00)/g);
        for (const match of numericMatches) {
            const parsed = Number.parseInt(match[1], 10);
            if (!Number.isNaN(parsed)) {
                weights.add(parsed);
            }
        }
        if (weights.size === 0) {
            for (const token of variantPart.split(/[;,]/)) {
                const parsed = normalizeWeight(token);
                if (parsed !== null) {
                    weights.add(parsed);
                }
            }
        }
    }
    if (weights.size === 0) {
        weights.add(DEFAULT_WEIGHT);
    }
    return {
        family,
        weights: [...weights]
    };
};
const parseConfiguredFonts = (configuredFonts) => {
    const parsedFonts = [];
    for (const configuredFont of configuredFonts) {
        const alias = normalizeFamily(configuredFont.alias);
        const fallbackFamily = alias ?? 'Unnamed Font';
        const configuredFamilyDescriptor = configuredFont.data?.family ?? fallbackFamily;
        const parsedFamilyDescriptor = parseConfiguredFamilyDescriptor(configuredFamilyDescriptor, fallbackFamily);
        const fileUrl = normalizeFamily(configuredFont.src ?? configuredFont.url);
        parsedFonts.push({
            family: parsedFamilyDescriptor.family,
            source: configuredFont.source,
            fileUrl: fileUrl ?? undefined,
            weights: parsedFamilyDescriptor.weights,
            aliases: alias ? [alias] : []
        });
    }
    return parsedFonts;
};
const createConfiguredLookup = (configuredFonts) => {
    const lookup = new Map();
    for (const configuredFont of configuredFonts) {
        const keys = [configuredFont.family, ...configuredFont.aliases];
        for (const key of keys) {
            lookup.set(key.toLowerCase(), configuredFont);
        }
    }
    return lookup;
};
const upsertVariant = (variants, variant) => {
    const key = `${variant.family.toLowerCase()}::${variant.weight}`;
    const existing = variants.get(key);
    if (!existing) {
        variants.set(key, variant);
        return;
    }
    // Prefer custom source when available and preserve fileUrl if provided by any input.
    if (existing.source !== 'custom' && variant.source === 'custom') {
        existing.source = 'custom';
    }
    if (!existing.fileUrl && variant.fileUrl) {
        existing.fileUrl = variant.fileUrl;
    }
};
const collectComponentTextVariants = (component, configuredLookup, output) => {
    const textAppearance = component?.appearance?.text;
    if (!textAppearance) {
        return;
    }
    const family = normalizeFamily(textAppearance.fontFamily) ?? normalizeFamily(textAppearance.fontSource?.family);
    if (!family) {
        return;
    }
    const configMatch = configuredLookup.get(family.toLowerCase());
    const source = (textAppearance.fontSource?.source ?? configMatch?.source ?? 'google');
    const fileUrl = normalizeFamily(textAppearance.fontSource?.fileUrl) ?? configMatch?.fileUrl ?? undefined;
    const weights = new Set();
    const styleWeights = [
        textAppearance.fontWeight,
        textAppearance.activeWord?.fontWeight,
        textAppearance.activeLine?.fontWeight
    ];
    for (const styleWeight of styleWeights) {
        const parsed = normalizeWeight(styleWeight);
        if (parsed !== null) {
            weights.add(parsed);
        }
    }
    for (const variantWeight of parseWeightsFromVariants(textAppearance.fontSource?.variants)) {
        weights.add(variantWeight);
    }
    if (weights.size === 0 && configMatch?.weights?.length) {
        for (const configuredWeight of configMatch.weights) {
            weights.add(configuredWeight);
        }
    }
    if (weights.size === 0) {
        weights.add(DEFAULT_WEIGHT);
    }
    for (const weight of weights) {
        upsertVariant(output, {
            family,
            weight,
            source,
            fileUrl
        });
    }
};
export const extractConfiguredFontVariants = (configuredFonts = []) => {
    const variants = new Map();
    const parsedFonts = parseConfiguredFonts(configuredFonts);
    for (const parsedFont of parsedFonts) {
        for (const weight of parsedFont.weights) {
            upsertVariant(variants, {
                family: parsedFont.family,
                weight,
                source: parsedFont.source,
                fileUrl: parsedFont.fileUrl
            });
        }
    }
    return [...variants.values()];
};
export const discoverRequiredFontVariants = (sceneData, configuredFonts = []) => {
    const variants = new Map();
    const parsedConfiguredFonts = parseConfiguredFonts(configuredFonts);
    const configuredLookup = createConfiguredLookup(parsedConfiguredFonts);
    for (const layer of sceneData.layers ?? []) {
        for (const component of layer.components ?? []) {
            if (component.type !== 'TEXT' && component.type !== 'SUBTITLES') {
                continue;
            }
            collectComponentTextVariants(component, configuredLookup, variants);
        }
    }
    // Preserve backwards compatibility with caller-supplied fonts by including explicit config entries.
    for (const configuredVariant of extractConfiguredFontVariants(configuredFonts)) {
        upsertVariant(variants, configuredVariant);
    }
    return [...variants.values()];
};
