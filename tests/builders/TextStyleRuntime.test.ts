import { describe, expect, it } from 'vitest';
import { StyleBuilder } from '../../src/lib/builders/html/StyleBuilder.js';
import { TextComponentHtmlBuilder } from '../../src/lib/builders/html/TextComponentHtmlBuilder.js';

const badge = {
	id: 'views-badge',
	name: '881 VIEWS',
	type: 'TEXT',
	text: '881 VIEWS',
	timeline: { startAt: 0, endAt: 2 },
	order: 1,
	visible: true,
	animations: { enabled: true, list: [] },
	effects: { enabled: true, map: {} },
	appearance: {
		x: 90,
		y: 140,
		width: 420,
		height: 132,
		rotation: -2,
		background: { enabled: true, color: '#F5D547', target: 'wrapper', radius: 24 },
		text: {
			fontFamily: 'Montserrat',
			fontSize: { value: 72, unit: 'px' },
			fontWeight: '900',
			color: '#101820',
			textAlign: 'center',
			outline: { enabled: true, color: '#FFFFFF', size: 2, opacity: 1, style: 'solid' },
			shadow: {
				enabled: true,
				color: '#112233',
				blur: 12,
				offsetX: 3,
				offsetY: 6,
				opacity: 0.5
			}
		}
	}
} as any;

describe('native TEXT style runtime', () => {
	it('renders badge radius in pixels plus structured outline and shadow fields', () => {
		const style = new StyleBuilder(badge).build();

		expect(style.borderRadius).toBe('24px');
		expect(style.webkitTextStroke).toBe('2px #FFFFFF');
		expect(style.paintOrder).toBe('stroke fill');
		expect(style.textShadow).toBe('3px 6px 12px rgba(17, 34, 51, 0.5)');
	});

	it('keeps rotation/placement on the wrapper so its background and glyph stay together', () => {
		const { wrapper, element } = new TextComponentHtmlBuilder(badge, document).build();

		expect(wrapper.style.transform).toContain('translate(90px, 140px)');
		expect(wrapper.style.transform).toContain('rotate(');
		expect(element.style.transform).toBe('');
	});

	it('supports explicit px padding while preserving the legacy element-background fallback', () => {
		const explicit = structuredClone(badge);
		explicit.appearance.text.padding = { top: 8, right: 18, bottom: 10, left: 16 };
		const explicitElement = new TextComponentHtmlBuilder(explicit, document).build().element;
		expect(explicitElement.style.padding).toBe('8px 18px 10px 16px');
		expect(explicitElement.style.boxSizing).toBe('border-box');

		const legacy = structuredClone(badge);
		legacy.appearance.background.target = 'element';
		const legacyElement = new TextComponentHtmlBuilder(legacy, document).build().element;
		expect(legacyElement.style.padding).toBe('0.22em');
	});
});
