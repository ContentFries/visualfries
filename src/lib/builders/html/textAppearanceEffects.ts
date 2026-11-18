import { TextEffectPresetName } from './TextShadowBuilder.js';

// Shadow and outline written on appearance.text come in two formats.
//
// Structured (the documented authoring format): sizes in pixels, and a shadow is
// described by blur and offsets, e.g. { color, blur: 12, offsetY: 4 }.
//
// Legacy (written by the ContentFries editor and stored in its scenes): sizes in em.
// A shadow is { preset?, size } and glows in the text colour unless it names one; an
// outline is { color, size } with size around 0.09–0.26.

type TextColor = string | { colors?: string[] } | null | undefined;

type ShadowInput = {
	enabled?: boolean;
	preset?: string;
	color?: string;
	size?: number;
	blur?: number;
	offsetX?: number;
	offsetY?: number;
	opacity?: number;
};

type OutlineInput = {
	enabled?: boolean;
	preset?: string;
	color?: string;
	size?: number;
	opacity?: number;
};

const isNumber = (value: unknown): value is number => typeof value === 'number';

// A shadow is structured when it says how to blur or offset it.
export const isStructuredShadow = (shadow: ShadowInput): boolean =>
	isNumber(shadow.blur) || isNumber(shadow.offsetX) || isNumber(shadow.offsetY);

// A structured outline is at least one pixel wide; legacy em sizes stay below 1.
export const isStructuredOutline = (outline: OutlineInput): boolean =>
	!outline.preset && isNumber(outline.size) && outline.size >= 1;

const firstTextColor = (color: TextColor): string | undefined => {
	if (typeof color === 'string') return color;
	return color?.colors?.[0];
};

export function textShadowEffect(shadow: ShadowInput, textColor: TextColor) {
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
		preset: shadow.preset ?? TextEffectPresetName.DEFAULT,
		enabled,
		color: shadow.color ?? firstTextColor(textColor),
		size: shadow.size,
		opacity: shadow.opacity
	};
}

export function textOutlineEffect(outline: OutlineInput) {
	return {
		type: 'textOutline',
		...(isStructuredOutline(outline) ? { structured: true } : {}),
		enabled: outline.enabled ? true : false,
		size: outline.size,
		color: outline.color,
		opacity: outline.opacity ?? 1
	};
}
