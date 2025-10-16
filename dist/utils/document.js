async function waitForAllFonts() {
    // Guard clause for server-side rendering or non-browser environments
    if (typeof document === 'undefined' || !document.fonts) {
        return;
    }
    try {
        await document.fonts.ready;
    }
    catch (error) {
        console.warn('One or more fonts failed to load.', error);
    }
}
export const loadFonts = async function (fonts) {
    // const results = await PIXI.Assets.load(fonts);
    const googleFonts = fonts.reduce((acc, font) => {
        if (font.source == 'google' && font.data) {
            acc.push(font.data.family);
        }
        return acc;
    }, []);
    if (document && googleFonts.length > 0 && typeof document !== 'undefined') {
        const fontPromises = googleFonts.map((font) => new Promise((resolve) => {
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css?family=${encodeURIComponent(font)}`;
            link.rel = 'stylesheet';
            link.onload = () => resolve(true);
            link.onerror = () => {
                console.warn(`Failed to load font: ${font}`);
                resolve(false);
            };
            document.head.appendChild(link);
        }));
        await Promise.all(fontPromises);
    }
    await waitForAllFonts();
};
