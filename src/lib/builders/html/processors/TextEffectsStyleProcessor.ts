import type { StyleProcessor } from '../StyleProcessor.js';
import { z } from 'zod';
import { TextEffectPresetName, TextShadowBuilder } from '../TextShadowBuilder.js';
// Assuming ComponentEffectsMap will be defined in or imported into StyleBuilder or a shared types file
// For now, let's define it locally if not available, or adjust import path.
// For example: import type { ComponentEffectsMap } from '../StyleBuilder.ts';
// If StyleBuilder doesn't export it yet, define a local version for now:
type ComponentEffectsMap = Record<string, any>;

const GenericTextEffectShape = z.object({
	enabled: z.boolean().optional(),
	preset: z.enum(TextEffectPresetName).optional(),
	size: z.number().optional(),
	color: z.string().optional(),
	opacity: z.number().optional()
});

export class TextEffectsStyleProcessor implements StyleProcessor<ComponentEffectsMap | undefined> {
	public process(effectsMap: ComponentEffectsMap | undefined): Record<string, any> {
		const styles: Record<string, any> = {};
		if (!effectsMap) return styles;
		const shadowStrings: string[] = [];

		// text-stroke
		if (effectsMap.textOutline) {
			const data = effectsMap.textOutline;
			const parsedEffect = GenericTextEffectShape.safeParse(data);

			if (
				parsedEffect.success &&
				parsedEffect.data.enabled &&
				parsedEffect.data.size &&
				parsedEffect.data.size > 0
			) {
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

				if (
					parsedEffect.success &&
					parsedEffect.data.enabled &&
					parsedEffect.data.size &&
					parsedEffect.data.size > 0
				) {
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
