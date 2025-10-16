import type { Scene, RenderEnvironment, Subtitle, FontType, SubtitleCollection } from '..';
import { SceneBuilder } from '../SceneBuilder.svelte.js';
import type { FontProvider } from '../fonts/types.js';
type Config = {
    environment: RenderEnvironment;
    subtitles: Record<string, Subtitle[]> | Record<string, SubtitleCollection>;
    fonts: FontType[];
    forceCanvas: boolean;
    scale: number;
    autoPlay?: boolean;
    loop?: boolean;
    fontProviders?: FontProvider[];
};
export declare const createSceneBuilder: (sceneData: Scene, container: HTMLDivElement, config?: Partial<Config>) => Promise<SceneBuilder>;
export {};
