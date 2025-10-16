import { z } from 'zod';
import { TextEffectPresetName, TextShadowBuilder } from '../TextShadowBuilder.js';
const GenericTextEffectShape = z.object({
    enabled: z.boolean().optional(),
    preset: z.enum(TextEffectPresetName).optional(),
    size: z.number().optional(),
    color: z.string().optional(),
    opacity: z.number().optional()
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
                const shadow = TextShadowBuilder.build({
                    preset: TextEffectPresetName.OUTLINE,
                    size,
                    color,
                    opacity: data.opacity || 1
                });
                if (shadow && shadow !== 'none') {
                    shadowStrings.push(shadow);
                }
                // styles.webkitTextStroke = `${size}em ${color}`;
                // styles.webkitTextFillColor = 'white';
                // styles.paintOrder = 'stroke fill';
            }
        }
        for (const effectName in effectsMap) {
            const effect = effectsMap[effectName];
            if (effect.type === 'textShadow') {
                const parsedEffect = GenericTextEffectShape.safeParse(effect);
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
                        opacity: data.opacity || 1
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
