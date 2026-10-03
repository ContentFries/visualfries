import type { FontType, Scene } from '../schemas/scene/index.js';
/**
 * Fonts the scene's TEXT and SUBTITLES components ask for, in the shape `createSceneBuilder`
 * loads. Without them the headless renderer falls back to the browser's default serif font.
 * Like the ContentFries render worker, a family without a fontSource is taken from Google Fonts,
 * except system and generic families, which the browser already has.
 */
export declare function discoverSceneFonts(scene: Scene): FontType[];
