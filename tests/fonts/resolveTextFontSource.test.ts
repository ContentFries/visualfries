import { describe, expect, it } from 'vitest';
import { resolveTextFontSource } from '../../src/lib/fonts/fontDiscovery.js';
import type { FontType } from '../../src/lib/index.js';

const configured: FontType[] = [
	{ alias: 'Montserrat', source: 'google', data: { family: 'Montserrat:400,900' } } as FontType,
	{ alias: 'Brand Sans', source: 'custom', url: 'https://example.com/brand.woff2' } as FontType
];

describe('resolveTextFontSource', () => {
	it('uses the component fontSource when it names one', () => {
		expect(resolveTextFontSource({ fontFamily: 'Anton', fontSource: { source: 'custom' } }, [])).toBe('custom');
	});

	it('falls back to a configured font with the same family (issue #56: presets without fontSource)', () => {
		expect(resolveTextFontSource({ fontFamily: 'Montserrat' }, configured)).toBe('google');
		expect(resolveTextFontSource({ fontFamily: 'montserrat' }, configured)).toBe('google');
		expect(resolveTextFontSource({ fontFamily: 'Brand Sans' }, configured)).toBe('custom');
	});

	it('treats an unconfigured family without fontSource as a system font', () => {
		expect(resolveTextFontSource({ fontFamily: 'Georgia' }, configured)).toBeNull();
		expect(resolveTextFontSource({}, configured)).toBeNull();
	});
});

describe('resolveTextFontSource precedence', () => {
	it('prefers a custom entry when Google and custom both configure the family, like loading does', () => {
		const both: FontType[] = [
			{ alias: 'Brand', source: 'google', data: { family: 'Brand' } } as FontType,
			{ alias: 'Brand', source: 'custom', url: 'https://example.com/brand.woff2' } as FontType
		];
		expect(resolveTextFontSource({ fontFamily: 'Brand' }, both)).toBe('custom');
	});

	it('only lets a custom entry win when it has the requested weight', () => {
		const mixed: FontType[] = [
			{ alias: 'Roboto', source: 'custom', url: 'https://x/r700.woff2', data: { family: 'Roboto:700' } } as FontType,
			{ alias: 'Roboto', source: 'google', data: { family: 'Roboto:400' } } as FontType
		];
		expect(resolveTextFontSource({ fontFamily: 'Roboto', fontWeight: '400' }, mixed)).toBe('google');
		expect(resolveTextFontSource({ fontFamily: 'Roboto', fontWeight: 700 }, mixed)).toBe('custom');
	});
});
