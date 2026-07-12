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
export class TextEffectsStyleProcessor {
    process(effectsMap) {
        const styles = {};
        if (!effectsMap)
            return styles;
        const shadowStrings = [];
        // text-stroke
        if (effectsMap.textOutline) {
            const data = effectsMap.textOutline;
            const parsedEffect = GenericTextEffectShape.safeParse(data);
            if (parsedEffect.success &&
                parsedEffect.data.enabled &&
                parsedEffect.data.size &&
                parsedEffect.data.size > 0) {
                const data = parsedEffect.data;
                const size = data.size || 0.3;
                const color = data.color || '#000000';
                if (data.structured) {
                    const strokeColor = data.opacity === undefined || data.opacity === 1
                        ? color
                        : tinycolor(color).setAlpha(data.opacity).toRgbString();
                    styles.webkitTextStroke = `${size}px ${strokeColor}`;
                    styles.paintOrder = 'stroke fill';
                }
                else {
                    const shadow = TextShadowBuilder.build({
                        preset: TextEffectPresetName.OUTLINE,
                        size,
                        color,
                        opacity: data.opacity ?? 1
                    });
                    if (shadow && shadow !== 'none') {
                        shadowStrings.push(shadow);
                    }
                }
            }
        }
        for (const effectName in effectsMap) {
            const effect = effectsMap[effectName];
            if (effect.type === 'textShadow') {
                const parsedEffect = GenericTextEffectShape.safeParse(effect);
                if (parsedEffect.success && parsedEffect.data.enabled && parsedEffect.data.structured) {
                    const data = parsedEffect.data;
                    const color = tinycolor(data.color ?? '#000000')
                        .setAlpha(data.opacity ?? 1)
                        .toRgbString();
                    shadowStrings.push(`${data.offsetX ?? 0}px ${data.offsetY ?? 0}px ${data.blur ?? data.size ?? 0}px ${color}`);
                    continue;
                }
                if (parsedEffect.success &&
                    parsedEffect.data.enabled &&
                    parsedEffect.data.size &&
                    parsedEffect.data.size > 0) {
                    const data = parsedEffect.data;
                    const preset = data.preset || TextEffectPresetName.CLASSIC;
                    const shadow = TextShadowBuilder.build({
                        preset,
                        size: data.size || 0.3,
                        color: data.color || '#000000',
                        opacity: data.opacity ?? 1
                    });
                    if (shadow && shadow !== 'none') {
                        shadowStrings.push(shadow);
                    }
                }
            }
        }
        if (shadowStrings.length > 0) {
            styles.textShadow = shadowStrings.join(', ');
        }
        return styles;
    }
}
