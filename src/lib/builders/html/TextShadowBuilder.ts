import tinycolor from 'tinycolor2';

/**
 * Enum of supported text shadow preset types.
 */
export enum TextEffectPresetName {
	DEFAULT = 'default',
	CLASSIC = 'classic',
	EMERGING = 'emerging',
	GLOW = 'glow',
	TEXT = 'text',
	BOLD = 'bold',
	NEON = 'neon',
	ANAGLYPH = 'anaglyph',
	FIRE = 'fire',
	THREE_D = '3d',
	FROSTY = 'frosty',
	INK = 'ink',
	RAINBOW = 'rainbow',
	OUTLINE = 'outline',
	STROKE = 'stroke'
}

/**
 * Configuration options for building a text shadow.
 */
interface TextShadowBuildConfig {
	preset: string;
	size: number;
	color: string;
	opacity: number;
	textColor?: string;
}

/**
 * Parameters passed to each shadow strategy function.
 */
interface TextShadowStrategyParams {
	size: number;
	shadowColor: string;
	textColor?: string;
}

/**
 * Type definition for a shadow strategy function.
 */
type ShadowStrategy = (params: TextShadowStrategyParams) => string;

/**
 * Utility class for building CSS text-shadow values based on different presets.
 */
export class TextShadowBuilder {
	/**
	 * Map of preset names to their corresponding shadow generation strategies.
	 */
	private static strategies: Record<TextEffectPresetName, ShadowStrategy> = {
		[TextEffectPresetName.CLASSIC]: ({ size, shadowColor }) => {
			return `0 0 ${size}em ${shadowColor}`;
		},

		[TextEffectPresetName.EMERGING]: ({ size, shadowColor, textColor }) => {
			if (!textColor) textColor = '#FFFFFF';

			const c1 = tinycolor.mix(shadowColor, textColor, 10).toString('hex8');
			const c2 = tinycolor.mix(shadowColor, textColor, 15).toString('hex8');
			const c3 = tinycolor.mix(shadowColor, textColor, 30).toString('hex8');
			const c4 = tinycolor.mix(shadowColor, textColor, 45).toString('hex8');
			const c5 = tinycolor.mix(shadowColor, textColor, 60).toString('hex8');
			const c6 = tinycolor.mix(shadowColor, textColor, 75).toString('hex8');
			const c7 = tinycolor.mix(shadowColor, textColor, 90).toString('hex8');

			return `0 ${(2 / 23) * size}em ${(2 / 23) * size}em ${c7}, ${(-2 / 23) * size}em ${
				(5 / 23) * size
			}em ${(1 / 23) * size}em ${c6}, ${(-4 / 23) * size}em ${(8 / 23) * size}em 0em ${c5}, ${
				(-6 / 23) * size
			}em ${(11 / 23) * size}em 0em ${c4}, ${(-8 / 23) * size}em ${(14 / 23) * size}em 0em ${c3}, ${
				(-10 / 23) * size
			}em ${(17 / 23) * size}em 0em ${c2}, ${(-12 / 23) * size}em ${(20 / 23) * size}em 0em ${c1}, ${
				(-14 / 23) * size
			}em ${size}em 0em ${shadowColor}`;
		},

		[TextEffectPresetName.GLOW]: ({ size, shadowColor }) => {
			const shadowsBuffer: string[] = [];
			const step = size / 7;
			for (let i = 0; i < size; i += step) {
				if (shadowsBuffer.length < 2) {
					shadowsBuffer.push(`0px 0px ${i}em #fff`);
				} else {
					shadowsBuffer.push(`0px 0px ${i}em ${shadowColor}`);
				}
			}

			return shadowsBuffer.join(', ');
		},

		[TextEffectPresetName.TEXT]: ({ size, shadowColor }) => {
			return `${size}em ${size}em 0 ${shadowColor}`;
		},

		[TextEffectPresetName.BOLD]: ({ size, shadowColor }) => {
			return TextShadowBuilder.funkyShadowString(size, shadowColor);
		},

		[TextEffectPresetName.NEON]: ({ size, shadowColor }) => {
			const shadows: string[] = [];
			for (let i = 1; i <= 3; i++) {
				shadows.push(`0 0 ${i * size}em ${shadowColor}, 0 0 ${(i * size) / 2}em ${shadowColor}`);
			}
			return shadows.join(', ');
		},

		[TextEffectPresetName.ANAGLYPH]: ({ size, shadowColor }) => {
			// We maintain the opacity from the shadowColor which already includes it
			const baseColor = tinycolor(shadowColor);
			const opacity = baseColor.getAlpha();
			const c2 = baseColor.clone().spin(120).setAlpha(opacity).toString('hex8');
			return `${size}em ${size}em ${shadowColor}, -${size}em -${size}em ${c2}`;
		},

		[TextEffectPresetName.FIRE]: ({ size, shadowColor }) => {
			return `0 0 ${size}em ${shadowColor}, 0 0 ${size / 2}em ${shadowColor}, 0 0 ${
				size / 4
			}em ${shadowColor}, 0 0 ${size / 8}em ${shadowColor}`;
		},

		[TextEffectPresetName.THREE_D]: ({ size, shadowColor }) => {
			const baseColor = tinycolor(shadowColor);
			const opacity = baseColor.getAlpha();
			const depth = size * 10;
			const shadows = [];

			for (let i = 1; i <= depth; i++) {
				const stepOpacity = opacity - i * (opacity / depth);
				shadows.push(
					`${i * 0.01}em ${i * 0.01}em rgba(0, 0, 0, ${stepOpacity > 0 ? stepOpacity : 0})`
				);
			}

			return shadows.join(', ');
		},

		[TextEffectPresetName.RAINBOW]: ({ size, shadowColor }) => {
			const baseColor = tinycolor(shadowColor);
			const opacity = baseColor.getAlpha();
			const shadows = [];
			const colorSteps = 7;
			const hueStep = 360 / colorSteps;
			const offsetIncrement = size * 0.1;
			const offsetStart = offsetIncrement;

			for (let i = 0; i < colorSteps; i++) {
				const hueShift = i * hueStep;
				const rainbowColor = baseColor.clone().spin(hueShift).setAlpha(opacity).toString('hex8');
				const offset = offsetStart + i * offsetIncrement;
				shadows.push(`${offset}em ${offset}em 0 ${rainbowColor}`);
			}

			return shadows.join(', ');
		},

		[TextEffectPresetName.FROSTY]: ({ size, shadowColor }) => {
			const baseColor = tinycolor(shadowColor);
			const opacity = baseColor.getAlpha();
			const frostEffect = tinycolor
				.mix(shadowColor, '#FFFFFF', 50)
				.setAlpha(opacity)
				.toString('hex8');
			const shadows = [];

			for (let i = 1; i <= size * 5; i++) {
				shadows.push(`0 0 ${i * 0.05}em ${frostEffect}`);
			}

			return shadows.join(', ');
		},

		[TextEffectPresetName.OUTLINE]: ({ size, shadowColor }) => {
			const shadows = [];
			const STEPS = 32; // Fixed number of steps for consistent quality

			for (let i = 0; i < STEPS; i++) {
				const angle = (i / STEPS) * 2 * Math.PI;
				const x = Math.cos(angle) * size;
				const y = Math.sin(angle) * size;
				shadows.push(`${x}em ${y}em 0 ${shadowColor}`);
			}

			return shadows.join(', ');
		},

		[TextEffectPresetName.STROKE]: ({ size, shadowColor }) => {
			// Stroke is essentially a thicker outline
			return TextShadowBuilder.strategies[TextEffectPresetName.OUTLINE]({
				size,
				shadowColor
			});
		},

		[TextEffectPresetName.INK]: ({ size, shadowColor }) => {
			// Implementation for ink effect
			const shadows = [];
			const inkSteps = 5;

			for (let i = 1; i <= inkSteps; i++) {
				const offset = (i / inkSteps) * size;
				shadows.push(`${offset}em ${offset}em 0 ${shadowColor}`);
				shadows.push(`-${offset}em ${offset}em 0 ${shadowColor}`);
				shadows.push(`${offset}em -${offset}em 0 ${shadowColor}`);
				shadows.push(`-${offset}em -${offset}em 0 ${shadowColor}`);
			}

			return shadows.join(', ');
		},

		[TextEffectPresetName.DEFAULT]: ({ size, shadowColor }) => {
			let lineColor = '#000000';
			const parsedColor = tinycolor(shadowColor);
			if (parsedColor.isValid() && parsedColor.isDark()) {
				lineColor = '#FFFFFF';
			}

			return `0 0 ${size}em ${shadowColor}, 0.015em 0.015em 0.03em ${lineColor}`;
		}
	};

	/**
	 * Helper method to create a funky shadow string for specific presets.
	 * @param toSize The maximum size for the shadow.
	 * @param color The shadow color.
	 * @returns A CSS text-shadow string.
	 */
	private static funkyShadowString(toSize: number, color: string): string {
		const shadows: string[] = [];

		for (let i = -0.07; i <= toSize; i += 0.01) {
			shadows.push(`${i}em ${i}em ${color}`);
		}

		return shadows.join(', ');
	}

	/**
	 * Builds a CSS text-shadow value based on the provided configuration.
	 * @param config The configuration for the text shadow.
	 * @returns A CSS text-shadow string or 'none' if size is <= 0.
	 */
	public static build(config: TextShadowBuildConfig): string {
		const { preset, size, color, opacity, textColor } = config;

		// If size is less than or equal to 0, return 'none' (no shadow)
		if (size <= 0) {
			return 'none';
		}

		// Process the color with opacity
		const colorObj = tinycolor(color);
		const shadowColor = colorObj.setAlpha(opacity).toString('hex8');

		// Get the appropriate strategy based on presetName
		const strategy = TextShadowBuilder.strategies[preset as TextEffectPresetName];

		// If no strategy is found, fall back to 'classic' or return 'none'
		if (!strategy) {
			console.warn(
				`TextShadowBuilder: Unknown preset name "${preset}". Falling back to "classic".`
			);
			return TextShadowBuilder.strategies[TextEffectPresetName.CLASSIC]({
				size,
				shadowColor
			});
		}

		// Execute the strategy with the processed params
		return strategy({
			size,
			shadowColor,
			textColor
		});
	}

	/**
	 * Builds a CSS filter drop-shadow value by converting a text-shadow string.
	 * This is used to apply shadows to elements with transparent text, such as those with gradient fills.
	 * @param config The configuration for the text shadow.
	 * @returns A CSS filter string with one or more drop-shadow() functions, or 'none'.
	 */
	public static buildDropShadow(config: TextShadowBuildConfig): string {
		const textShadowString = this.build(config);

		if (textShadowString === 'none' || !textShadowString) {
			return 'none';
		}

		// Split the text-shadow string by commas, but be careful not to split inside `rgba()` or other color functions.
		// A simple split by comma is usually sufficient here as the color functions are at the end.
		const shadows = textShadowString.split(/,(?=\s*[\d-])/);

		const dropShadows = shadows.map((shadow) => {
			// Trim and wrap each individual shadow definition in its own drop-shadow() function.
			return `drop-shadow(${shadow.trim()})`;
		});

		// Join the individual drop-shadow() functions with spaces for the final filter property.
		return dropShadows.join(' ');
	}
}
