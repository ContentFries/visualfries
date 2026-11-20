import { TextEffectPresetName } from './TextShadowBuilder.js';
const isNumber = (value) => typeof value === 'number';
// A shadow is structured when it says how to blur or offset it.
export const isStructuredShadow = (shadow) => isNumber(shadow.blur) || isNumber(shadow.offsetX) || isNumber(shadow.offsetY);
// A structured outline names a stroke style or is at least one pixel wide; legacy em
// sizes stay below 1 and never name a style.
export const isStructuredOutline = (outline) => Boolean(outline.style) || (!outline.preset && isNumber(outline.size) && outline.size >= 1);
const firstTextColor = (color) => {
    if (typeof color === 'string')
        return color;
    return color?.colors?.[0];
};
export function textShadowEffect(shadow, textColor) {
    const enabled = shadow.enabled ? true : false;
    if (isStructuredShadow(shadow)) {
        return {
            type: 'textShadow',
            structured: true,
            enabled,
            color: shadow.color ?? '#000000',
            size: shadow.size,
            blur: shadow.blur ?? 0,
            offsetX: shadow.offsetX ?? 0,
            offsetY: shadow.offsetY ?? 0,
            opacity: shadow.opacity ?? 1
        };
    }
    return {
        type: 'textShadow',
        preset: TextEffectPresetName.DEFAULT,
        enabled,
        color: firstTextColor(textColor),
        size: shadow.size
    };
}
export function textOutlineEffect(outline) {
    const effect = {
        type: 'textOutline',
        enabled: outline.enabled ? true : false,
        size: outline.size,
        color: outline.color
    };
    if (!isStructuredOutline(outline))
        return effect;
    return { ...effect, structured: true, opacity: outline.opacity ?? 1 };
}
