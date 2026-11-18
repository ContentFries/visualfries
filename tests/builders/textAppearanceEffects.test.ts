import { describe, expect, it } from 'vitest';
import { StyleBuilder } from '../../src/lib/builders/html/StyleBuilder.js';
import {
	TextEffectPresetName,
	TextShadowBuilder
} from '../../src/lib/builders/html/TextShadowBuilder.js';
import {
	isStructuredOutline,
	isStructuredShadow,
	textOutlineEffect,
	textShadowEffect
} from '../../src/lib/builders/html/textAppearanceEffects.js';

// A subtitle as the ContentFries editor stores it: shadow and outline sizes in em.
const subtitle = (text: Record<string, unknown>) =>
	({
		id: 'subs',
		name: 'Subtitles',
		type: 'SUBTITLES',
		timeline: { startAt: 0, endAt: 2 },
		animations: { enabled: true, list: [] },
		effects: { enabled: true, map: {} },
		appearance: {
			x: 20,
			y: 1065,
			width: 1040,
			height: 205,
			text: {
				fontFamily: 'Alata',
				fontSize: { value: 60, unit: 'px' },
				color: 'rgb(255, 255, 255)',
				...text
			}
		}
	}) as any;

describe('text appearance shadow', () => {
	it('is structured only when it has a blur or an offset', () => {
		expect(isStructuredShadow({ blur: 0 })).toBe(true);
		expect(isStructuredShadow({ offsetX: 2 })).toBe(true);
		expect(isStructuredShadow({ offsetY: 4 })).toBe(true);
		expect(isStructuredShadow({ enabled: true, size: 0.5, opacity: 1 })).toBe(false);
	});

	it('keeps the structured pixel format', () => {
		expect(
			textShadowEffect({ enabled: true, color: '#112233', blur: 12, offsetY: 6 }, '#fff')
		).toEqual({
			type: 'textShadow',
			structured: true,
			enabled: true,
			color: '#112233',
			size: undefined,
			blur: 12,
			offsetX: 0,
			offsetY: 6,
			opacity: 1
		});
	});

	it('makes a legacy shadow glow in the text colour', () => {
		expect(
			textShadowEffect({ enabled: true, size: 0.5, opacity: 1 }, 'rgb(255, 255, 255)')
		).toEqual({
			type: 'textShadow',
			preset: TextEffectPresetName.DEFAULT,
			enabled: true,
			color: 'rgb(255, 255, 255)',
			size: 0.5
		});
		expect(textShadowEffect({ size: 1 }, { colors: ['#ff0000', '#00ff00'] })).toMatchObject({
			enabled: false,
			color: '#ff0000'
		});
		expect(textShadowEffect({ size: 1 }, null).color).toBeUndefined();
	});

	it('draws a legacy shadow as 0.1.13 did, whatever preset, colour or opacity it carries', () => {
		expect(
			textShadowEffect(
				{ enabled: true, preset: 'soft', color: '#00ffff', opacity: 0.4, size: 1 },
				'#ffffff'
			)
		).toEqual({
			type: 'textShadow',
			preset: TextEffectPresetName.DEFAULT,
			enabled: true,
			color: '#ffffff',
			size: 1
		});
	});

	it('renders the ContentFries glow again', () => {
		const style = new StyleBuilder(
			subtitle({ shadow: { enabled: true, opacity: 1, size: 0.5 } })
		).build();

		expect(style.textShadow).toBe(
			TextShadowBuilder.build({
				preset: TextEffectPresetName.DEFAULT,
				size: 0.5,
				color: 'rgb(255, 255, 255)',
				opacity: 1
			})
		);
	});
});

describe('text appearance outline', () => {
	it('is structured with a stroke style or from one pixel up, unless it names a preset', () => {
		expect(isStructuredOutline({ size: 0.5, style: 'solid' })).toBe(true);
		expect(isStructuredOutline({ size: 2 })).toBe(true);
		expect(isStructuredOutline({ size: 1 })).toBe(true);
		expect(isStructuredOutline({ size: 0.18 })).toBe(false);
		expect(isStructuredOutline({ size: 2, preset: 'outline' })).toBe(false);
		expect(isStructuredOutline({})).toBe(false);
	});

	it('marks only pixel outlines as structured', () => {
		expect(textOutlineEffect({ enabled: true, color: '#fff', size: 2 })).toEqual({
			type: 'textOutline',
			structured: true,
			enabled: true,
			size: 2,
			color: '#fff',
			opacity: 1
		});
		expect(textOutlineEffect({ color: '#000', size: 0.18, opacity: 0.5 })).toEqual({
			type: 'textOutline',
			enabled: false,
			size: 0.18,
			color: '#000'
		});
	});

	it('renders the ContentFries em outline again', () => {
		const style = new StyleBuilder(
			subtitle({ outline: { enabled: true, color: '#000000', size: 0.18 } })
		).build();

		expect(style.webkitTextStroke).toBeUndefined();
		expect(style.textShadow).toBe(
			TextShadowBuilder.build({
				preset: TextEffectPresetName.OUTLINE,
				size: 0.18,
				color: '#000000',
				opacity: 1
			})
		);
	});
});
