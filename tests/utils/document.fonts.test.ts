import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FontVariantDescriptor } from '$lib/fonts/fontDiscovery.js';
import { loadFonts } from '$lib/utils/document.js';

const originalFonts = (document as any).fonts;
const originalFontFace = (globalThis as any).FontFace;

const setFontsApi = (overrides: Partial<FontFaceSet> = {}) => {
	const api = {
		load: vi.fn(async () => [{} as FontFace]),
		ready: Promise.resolve([]),
		add: vi.fn(),
		...overrides
	} as unknown as FontFaceSet;

	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: api
	});

	return api;
};

const mockStylesheetLoad = () =>
	vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
		const element = node as HTMLLinkElement;
		if (element.tagName === 'LINK') {
			queueMicrotask(() => element.onload?.(new Event('load')));
		}
		return node;
	});

afterEach(() => {
	vi.restoreAllMocks();
	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: originalFonts
	});
	(globalThis as any).FontFace = originalFontFace;
});

describe('loadFonts', () => {
	it('builds Google CSS2 URL and explicitly preloads each font descriptor', async () => {
		const fontsApi = setFontsApi();
		const appendSpy = mockStylesheetLoad();
		const variants: FontVariantDescriptor[] = [
			{ family: 'Raleway', weight: 400, source: 'google' },
			{ family: 'Raleway', weight: 900, source: 'google' }
		];

		await loadFonts([], variants);

		const appendedLinks = appendSpy.mock.calls
			.map(([node]) => node as HTMLLinkElement)
			.filter((node) => node.tagName === 'LINK');
		expect(appendedLinks).toHaveLength(1);
		expect(appendedLinks[0].href).toContain(
			'fonts.googleapis.com/css2?family=Raleway:wght@400;900&display=swap'
		);
		expect((fontsApi.load as any).mock.calls).toContainEqual(['400 60px "Raleway"', 'BESbswy']);
		expect((fontsApi.load as any).mock.calls).toContainEqual(['900 60px "Raleway"', 'BESbswy']);
	});

	it('preloads custom fonts via FontFace and still calls document.fonts.load descriptors', async () => {
		const addMock = vi.fn();
		const loadMock = vi.fn(async () => [{} as FontFace]);
		setFontsApi({
			add: addMock as any,
			load: loadMock as any
		});
		const createdFaces: Array<{ family: string; source: string; descriptors: FontFaceDescriptors }> =
			[];
		(globalThis as any).FontFace = vi.fn().mockImplementation(
			(family: string, source: string, descriptors: FontFaceDescriptors) => {
				createdFaces.push({ family, source, descriptors });
				return {
					load: vi.fn(async () => undefined)
				};
			}
		);

		await loadFonts([], [
			{
				family: 'Brand Sans',
				weight: 700,
				source: 'custom',
				fileUrl: 'https://cdn.example.com/fonts/brand.woff2'
			}
		]);

		expect(createdFaces).toEqual([
			{
				family: 'Brand Sans',
				source: 'url("https://cdn.example.com/fonts/brand.woff2")',
				descriptors: { weight: '700', style: 'normal' }
			}
		]);
		expect(addMock).toHaveBeenCalledTimes(1);
		expect(loadMock).toHaveBeenCalledWith('700 60px "Brand Sans"', 'BESbswy');
	});
});
