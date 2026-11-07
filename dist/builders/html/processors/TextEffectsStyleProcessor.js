import { z } from 'zod';
import { TextEffectPresetName, TextShadowBuilder } from '../TextShadowBuilder.js';
import tinycolor from 'tinycolor2';
const GenericTextEffectShape = z.object({
    enabled: z.boolean().optional(),
    preset: z.enum(TextEffectPresetName).optional(),
    size: z.number().optional(),
    color: z.string().optional(),
    opacity: z.number().optional(),
    blur: z.number().optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
    structured: z.boolean().optional()
});
// An effect only paints when it is enabled and has a positive size.
const hasVisibleSize = (effect) => Boolean(effect.enabled && effect.size && effect.size > 0);
const pushShadow = (shadowStrings, shadow) => {
    if (shadow && shadow !== 'none')
        shadowStrings.push(shadow);
};
// Applies the textOutline effect: a webkit stroke when structured, otherwise an outline shadow.
function applyOutline(data, styles, shadowStrings) {
    const parsedEffect = GenericTextEffectShape.safeParse(data);
    if (!parsedEffect.success || !hasVisibleSize(parsedEffect.data))
        return;
    const effect = parsedEffect.data;
    const size = effect.size || 0.3;
    const color = effect.color || '#000000';
    if (effect.structured) {
        const strokeColor = effect.opacity === undefined || effect.opacity === 1
            ? color
            : tinycolor(color).setAlpha(effect.opacity).toRgbString();
        styles.webkitTextStroke = `${size}px ${strokeColor}`;
        styles.paintOrder = 'stroke fill';
        return;
    }
    pushShadow(shadowStrings, TextShadowBuilder.build({
        preset: TextEffectPresetName.OUTLINE,
        size,
        color,
        opacity: effect.opacity ?? 1
    }));
}
// Returns the CSS shadow for one textShadow effect, or undefined when it paints nothing.
function textShadowFor(effect) {
    const parsedEffect = GenericTextEffectShape.safeParse(effect);
    if (!parsedEffect.success || !parsedEffect.data.enabled)
        return undefined;
    const data = parsedEffect.data;
    if (data.structured) {
        const color = tinycolor(data.color ?? '#000000')
            .setAlpha(data.opacity ?? 1)
            .toRgbString();
        return `${data.offsetX ?? 0}px ${data.offsetY ?? 0}px ${data.blur ?? data.size ?? 0}px ${color}`;
    }
    if (!hasVisibleSize(data))
        return undefined;
    const shadow = TextShadowBuilder.build({
        preset: data.preset || TextEffectPresetName.CLASSIC,
        size: data.size || 0.3,
        color: data.color || '#000000',
        opacity: data.opacity ?? 1
    });
    return shadow && shadow !== 'none' ? shadow : undefined;
}
export class TextEffectsStyleProcessor {
    process(effectsMap) {
        const styles = {};
        if (!effectsMap)
            return styles;
        const shadowStrings = [];
        if (effectsMap.textOutline)
            applyOutline(effectsMap.textOutline, styles, shadowStrings);
        for (const effectName in effectsMap) {
            const effect = effectsMap[effectName];
            if (effect.type !== 'textShadow')
                continue;
            const shadow = textShadowFor(effect);
            if (shadow)
                shadowStrings.push(shadow);
        }
        if (shadowStrings.length > 0) {
            styles.textShadow = shadowStrings.join(', ');
        }
        return styles;
    }
}
