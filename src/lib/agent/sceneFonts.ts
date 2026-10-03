import type { FontType, Scene } from '../schemas/scene/index.js';

/** Families every browser has; never fetched from Google Fonts. */
const SYSTEM_FAMILIES = new Set(
	[
		'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif',
		'ui-monospace', 'arial', 'helvetica', 'helvetica neue', 'georgia', 'times', 'times new roman',
		'courier', 'courier new', 'verdana', 'tahoma', 'trebuchet ms', 'impact', 'segoe ui',
		'-apple-system', 'blinkmacsystemfont'
	]
);

/**
 * Fonts the scene's TEXT and SUBTITLES components ask for, in the shape `createSceneBuilder`
 * loads. Without them the headless renderer falls back to the browser's default serif font.
 * Like the ContentFries render worker, a family without a fontSource is taken from Google Fonts,
 * except system and generic families, which the browser already has.
 */
export function discoverSceneFonts(scene: Scene): FontType[] {
	// One entry per family; an explicit custom font replaces an implicit Google one, as loading does.
	const byFamily = new Map<string, FontType>();
	for (const layer of scene.layers ?? []) {
		for (const component of layer.components ?? []) {
			if (component.type !== 'TEXT' && component.type !== 'SUBTITLES') continue;
			const text = component.appearance?.text;
			const fontFamily = text?.fontFamily;
			if (!fontFamily) continue;
			if (!text?.fontSource?.source && SYSTEM_FAMILIES.has(fontFamily.trim().toLowerCase())) continue;
			const existing = byFamily.get(fontFamily);
			const fontSource = text?.fontSource;
			if (fontSource?.source === 'custom') {
				if (!fontSource.fileUrl || existing?.source === 'custom') continue;
				byFamily.set(fontFamily, { alias: fontFamily, source: 'custom', url: fontSource.fileUrl });
				continue;
			}
			if (existing) continue;
			const variants = fontSource?.variants?.length ? `:${fontSource.variants.join(',')}` : '';
			byFamily.set(fontFamily, {
				alias: fontFamily,
				source: 'google',
				data: { family: `${fontFamily}${variants}` }
			});
		}
	}
	return [...byFamily.values()];
}
