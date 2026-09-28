/**
 * Fonts the scene's TEXT and SUBTITLES components ask for, in the shape `createSceneBuilder`
 * loads. Without them the headless renderer falls back to the browser's default serif font.
 */
export function discoverSceneFonts(scene) {
    const fonts = [];
    const seen = new Set();
    for (const layer of scene.layers ?? []) {
        for (const component of layer.components ?? []) {
            if (component.type !== 'TEXT' && component.type !== 'SUBTITLES')
                continue;
            const text = component.appearance?.text;
            const fontFamily = text?.fontFamily;
            if (!fontFamily || seen.has(fontFamily))
                continue;
            seen.add(fontFamily);
            const fontSource = text?.fontSource;
            if (fontSource?.source === 'custom') {
                if (!fontSource.fileUrl)
                    continue;
                fonts.push({ alias: fontFamily, source: 'custom', url: fontSource.fileUrl });
                continue;
            }
            const variants = fontSource?.variants?.length ? `:${fontSource.variants.join(',')}` : '';
            fonts.push({ alias: fontFamily, source: 'google', data: { family: `${fontFamily}${variants}` } });
        }
    }
    return fonts;
}
