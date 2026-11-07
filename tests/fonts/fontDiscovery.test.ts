import { describe, expect, it } from 'vitest';
import type { FontType } from '$lib';
import { discoverRequiredFontVariants } from '$lib/fonts/fontDiscovery.ts';

const createBaseScene = () =>
	({
		id: 'scene-fonts',
		settings: {
			width: 1080,
			height: 1920,
			duration: 5,
			fps: 30,
			backgroundColor: '#000000'
		},
		assets: [],
		transitions: [],
		audioTracks: [],
		layers: []
	}) as any;

describe('font discovery', () => {
	it('discovers text/subtitles font weights including active word/line overrides and fontSource variants', () => {
		const scene = createBaseScene();
		scene.layers = [
			{
				id: 'layer-1',
				order: 0,
				visible: true,
				muted: false,
				components: [
					{
						id: 'text-1',
						type: 'TEXT',
						appearance: {
							text: {
								fontFamily: 'Raleway',
								fontWeight: '900',
								activeWord: { enabled: true, fontWeight: '700' },
								activeLine: { enabled: true, fontWeight: '300' },
								fontSource: {
									source: 'google',
									family: 'Raleway',
									variants: ['regular', '500', '900italic']
								}
							}
						}
					},
					{
						id: 'sub-1',
						type: 'SUBTITLES',
						appearance: {
							text: {
								fontFamily: 'Inter',
								activeWord: { enabled: true, fontWeight: '800' },
								fontSource: { source: 'google', family: 'Inter', variants: ['regular', '700'] }
							}
						}
					}
				]
			}
		];

		const variants = discoverRequiredFontVariants(scene, []);
		const ralewayWeights = variants
			.filter((variant) => variant.family === 'Raleway')
			.map((variant) => variant.weight)
			.sort((a, b) => a - b);
		const interWeights = variants
			.filter((variant) => variant.family === 'Inter')
			.map((variant) => variant.weight)
			.sort((a, b) => a - b);

		expect(ralewayWeights).toEqual([300, 400, 500, 700, 900]);
		expect(interWeights).toEqual([400, 700, 800]);
		expect(
			variants
				.filter((variant) => variant.family === 'Raleway')
				.every((variant) => variant.source === 'google')
		).toBe(true);
	});

	it('resolves custom fonts from configured font list when scene omits fontSource', () => {
		const scene = createBaseScene();
		scene.layers = [
			{
				id: 'layer-1',
				order: 0,
				visible: true,
				muted: false,
				components: [
					{
						id: 'text-1',
						type: 'TEXT',
						appearance: {
							text: {
								fontFamily: 'Brand Sans',
								fontWeight: '700',
								activeWord: { enabled: true, fontWeight: '400' }
							}
						}
					}
				]
			}
		];

		const configuredFonts: FontType[] = [
			{
				alias: 'Brand Sans',
				source: 'custom',
				src: 'https://cdn.example.com/fonts/brand-sans.woff2',
				data: { family: 'Brand Sans:400,700' }
			}
		];

		const variants = discoverRequiredFontVariants(scene, configuredFonts);
		const brandVariants = variants
			.filter((variant) => variant.family === 'Brand Sans')
			.sort((a, b) => a.weight - b.weight);

		expect(brandVariants).toEqual([
			{
				family: 'Brand Sans',
				weight: 400,
				source: 'custom',
				fileUrl: 'https://cdn.example.com/fonts/brand-sans.woff2'
			},
			{
				family: 'Brand Sans',
				weight: 700,
				source: 'custom',
				fileUrl: 'https://cdn.example.com/fonts/brand-sans.woff2'
			}
		]);
	});

	it('skips blank utility text components that do not render glyphs', () => {
		const scene = createBaseScene();
		scene.layers = [
			{
				id: 'transition-layer',
				order: 0,
				visible: true,
				muted: false,
				components: [
					{
						id: 'transition-cover',
						type: 'TEXT',
						text: '',
						appearance: {
							text: { fontFamily: 'Arial', fontWeight: '400' }
						}
					}
				]
			}
		];

		expect(discoverRequiredFontVariants(scene, [])).toEqual([]);
	});

	it('treats an unconfigured family as a system font instead of implicit Google Fonts', () => {
		const scene = createBaseScene();
		scene.layers = [
			{
				id: 'system-font-layer',
				order: 0,
				visible: true,
				muted: false,
				components: [
					{
						id: 'system-text',
						type: 'TEXT',
						text: 'Native Arial',
						appearance: { text: { fontFamily: 'Arial', fontWeight: '700' } }
					}
				]
			}
		];

		expect(discoverRequiredFontVariants(scene, [])).toEqual([]);
	});

	const sceneWith = (components: any[]) => {
		const scene = createBaseScene();
		scene.layers = [{ id: 'l', order: 0, visible: true, muted: false, components }];
		return scene;
	};
	const textComponent = (id: string, text: any) => ({
		id,
		type: 'TEXT',
		text: 'Hello',
		appearance: { text }
	});

	it('falls back to the configured weights when the component names none', () => {
		const scene = sceneWith([textComponent('t', { fontFamily: 'Brand Sans' })]);
		const configuredFonts: FontType[] = [
			{
				alias: 'Brand Sans',
				source: 'custom',
				src: 'https://cdn.example.com/b.woff2',
				data: { family: 'Brand Sans:300,600' }
			}
		];

		const weights = discoverRequiredFontVariants(scene, configuredFonts)
			.map((variant) => variant.weight)
			.sort((a, b) => a - b);

		expect(weights).toEqual([300, 600]);
	});

	it('requests regular weight when neither the component nor the config names one', () => {
		const scene = sceneWith([
			textComponent('t', { fontFamily: 'Raleway', fontSource: { source: 'google' } })
		]);

		expect(discoverRequiredFontVariants(scene, [])).toEqual([
			{ family: 'Raleway', weight: 400, source: 'google', fileUrl: undefined }
		]);
	});

	it('takes the family from fontSource when fontFamily is missing', () => {
		const scene = sceneWith([
			textComponent('t', { fontWeight: '500', fontSource: { source: 'google', family: 'Inter' } })
		]);

		expect(discoverRequiredFontVariants(scene, [])).toEqual([
			{ family: 'Inter', weight: 500, source: 'google', fileUrl: undefined }
		]);
	});

	it('skips text without any family', () => {
		const scene = sceneWith([textComponent('t', { fontWeight: '500' })]);

		expect(discoverRequiredFontVariants(scene, [])).toEqual([]);
	});

	it('merges duplicate variants, preferring custom and keeping any file url', () => {
		const scene = sceneWith([
			textComponent('a', { fontFamily: 'Brand', fontWeight: '700', fontSource: { source: 'google' } }),
			textComponent('b', {
				fontFamily: 'brand',
				fontWeight: '700',
				fontSource: { source: 'custom', fileUrl: 'https://cdn.example.com/brand.woff2' }
			})
		]);

		const variants = discoverRequiredFontVariants(scene, []);

		expect(variants).toHaveLength(1);
		expect(variants[0]).toMatchObject({
			weight: 700,
			source: 'custom',
			fileUrl: 'https://cdn.example.com/brand.woff2'
		});
	});
});
