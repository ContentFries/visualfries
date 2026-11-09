import { describe, expect, it } from 'vitest';

import { TextEffectsStyleProcessor } from '$lib/builders/html/processors/TextEffectsStyleProcessor.js';
import { TextEffectPresetName, TextShadowBuilder } from '$lib/builders/html/TextShadowBuilder.js';

const process = (map: Record<string, any> | undefined) =>
	new TextEffectsStyleProcessor().process(map);

describe('TextEffectsStyleProcessor', () => {
	it('returns no styles without effects', () => {
		expect(process(undefined)).toEqual({});
		expect(process({})).toEqual({});
	});

	it('ignores a disabled, sizeless or invalid outline', () => {
		expect(process({ textOutline: { enabled: false, size: 2 } })).toEqual({});
		expect(process({ textOutline: { enabled: true } })).toEqual({});
		expect(process({ textOutline: { enabled: true, size: 0 } })).toEqual({});
		expect(process({ textOutline: { enabled: true, size: 'big' } })).toEqual({});
	});

	it('draws a structured outline with a webkit stroke', () => {
		expect(
			process({ textOutline: { enabled: true, size: 2, color: '#ff0000', structured: true } })
		).toEqual({ webkitTextStroke: '2px #ff0000', paintOrder: 'stroke fill' });
		expect(
			process({ textOutline: { enabled: true, size: 2, opacity: 1, structured: true } })
		).toEqual({ webkitTextStroke: '2px #000000', paintOrder: 'stroke fill' });
		expect(
			process({
				textOutline: { enabled: true, size: 3, color: '#ff0000', opacity: 0.5, structured: true }
			})
		).toEqual({ webkitTextStroke: '3px rgba(255, 0, 0, 0.5)', paintOrder: 'stroke fill' });
	});

	it('builds a shadow-based outline when not structured', () => {
		const expected = TextShadowBuilder.build({
			preset: TextEffectPresetName.OUTLINE,
			size: 2,
			color: '#00ff00',
			opacity: 0.8
		});
		expect(
			process({ textOutline: { enabled: true, size: 2, color: '#00ff00', opacity: 0.8 } })
		).toEqual({ textShadow: expected });
		const defaults = TextShadowBuilder.build({
			preset: TextEffectPresetName.OUTLINE,
			size: 1,
			color: '#000000',
			opacity: 1
		});
		expect(process({ textOutline: { enabled: true, size: 1 } })).toEqual({ textShadow: defaults });
	});

	it('writes structured text shadows with defaults', () => {
		expect(
			process({
				a: {
					type: 'textShadow',
					enabled: true,
					structured: true,
					offsetX: 2,
					offsetY: 3,
					blur: 4,
					color: '#0000ff',
					opacity: 0.5
				}
			})
		).toEqual({ textShadow: '2px 3px 4px rgba(0, 0, 255, 0.5)' });
		expect(
			process({ a: { type: 'textShadow', enabled: true, structured: true, size: 6 } })
		).toEqual({ textShadow: '0px 0px 6px rgb(0, 0, 0)' });
		expect(process({ a: { type: 'textShadow', enabled: true, structured: true } })).toEqual({
			textShadow: '0px 0px 0px rgb(0, 0, 0)'
		});
	});

	it('builds preset text shadows, defaulting to classic', () => {
		const classic = TextShadowBuilder.build({
			preset: TextEffectPresetName.CLASSIC,
			size: 1.5,
			color: '#123456',
			opacity: 1
		});
		expect(
			process({ a: { type: 'textShadow', enabled: true, size: 1.5, color: '#123456' } })
		).toEqual({ textShadow: classic });
		const neon = TextShadowBuilder.build({
			preset: TextEffectPresetName.NEON,
			size: 1,
			color: '#000000',
			opacity: 0.4
		});
		expect(
			process({
				a: { type: 'textShadow', enabled: true, size: 1, preset: 'neon', opacity: 0.4 }
			})
		).toEqual({ textShadow: neon });
	});

	it('skips disabled, sizeless, invalid and non shadow effects', () => {
		expect(process({ a: { type: 'textShadow', enabled: false, size: 1 } })).toEqual({});
		expect(process({ a: { type: 'textShadow', enabled: true } })).toEqual({});
		expect(process({ a: { type: 'textShadow', enabled: true, size: -1 } })).toEqual({});
		expect(process({ a: { type: 'textShadow', enabled: true, size: 'x' } })).toEqual({});
		expect(process({ a: { type: 'glow', enabled: true, size: 1 } })).toEqual({});
	});

	it('joins several shadows, outline first', () => {
		const outline = TextShadowBuilder.build({
			preset: TextEffectPresetName.OUTLINE,
			size: 1,
			color: '#000000',
			opacity: 1
		});
		const result = process({
			s1: { type: 'textShadow', enabled: true, structured: true, offsetX: 1, offsetY: 1, blur: 1 },
			textOutline: { enabled: true, size: 1 },
			s2: { type: 'textShadow', enabled: true, size: 1 }
		});
		const classic = TextShadowBuilder.build({
			preset: TextEffectPresetName.CLASSIC,
			size: 1,
			color: '#000000',
			opacity: 1
		});
		expect(result.textShadow).toBe(`${outline}, 1px 1px 1px rgb(0, 0, 0), ${classic}`);
	});
});
