import { describe, expect, it } from 'vitest';
import { discoverSceneFonts } from '../../src/lib/agent/sceneFonts.js';
import type { Scene } from '../../src/lib/schemas/scene/index.js';

const scene = (components: Array<Record<string, unknown>>) =>
	({
		id: 'scene',
		settings: { width: 1080, height: 1920, duration: 5, fps: 30 },
		layers: [{ id: 'layer', components }]
	}) as unknown as Scene;

describe('discoverSceneFonts', () => {
	it('lists each text and subtitle font family once', () => {
		const fonts = discoverSceneFonts(
			scene([
				{ type: 'SUBTITLES', appearance: { text: { fontFamily: 'Anton' } } },
				{ type: 'TEXT', appearance: { text: { fontFamily: 'Anton' } } },
				{
					type: 'TEXT',
					appearance: {
						text: { fontFamily: 'Sora', fontSource: { source: 'google', variants: ['700', '800'] } }
					}
				},
				{ type: 'VIDEO', appearance: {} }
			])
		);
		expect(fonts).toEqual([
			{ alias: 'Anton', source: 'google', data: { family: 'Anton' } },
			{ alias: 'Sora', source: 'google', data: { family: 'Sora:700,800' } }
		]);
	});

	it('uses the file of a custom font and skips custom fonts without one', () => {
		const fonts = discoverSceneFonts(
			scene([
				{
					type: 'TEXT',
					appearance: {
						text: {
							fontFamily: 'Brand',
							fontSource: { source: 'custom', fileUrl: 'https://cdn.example/brand.woff2' }
						}
					}
				},
				{
					type: 'TEXT',
					appearance: { text: { fontFamily: 'Missing', fontSource: { source: 'custom' } } }
				}
			])
		);
		expect(fonts).toEqual([
			{ alias: 'Brand', source: 'custom', url: 'https://cdn.example/brand.woff2' }
		]);
	});
});
