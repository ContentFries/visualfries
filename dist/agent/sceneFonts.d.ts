import type { FontType, Scene } from '../schemas/scene/index.js';
/**
 * Fonts the scene's TEXT and SUBTITLES components ask for, in the shape `createSceneBuilder`
 * loads. Without them the headless renderer falls back to the browser's default serif font.
 */
export declare function discoverSceneFonts(scene: Scene): FontType[];
