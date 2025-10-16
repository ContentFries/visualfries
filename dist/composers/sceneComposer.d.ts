import { type Scene, type SceneSettingsInput, type SceneLayer, type SceneAssetInput, type AudioTrackInput, type SceneSubtitlesSettings } from '..';
/**
 * A fluent, composable builder for creating a valid Scene object.
 */
declare class SceneComposer {
    private _scene;
    constructor(id: string, settings: SceneSettingsInput);
    /**
     * Merges new settings into the existing scene settings.
     * @param settings A partial object of scene settings to update.
     * @returns The SceneComposer instance for further chaining.
     */
    setSettings(settings: Partial<SceneSettingsInput>): this;
    setName(name: string): this;
    setSubtitles(subtitles: SceneSubtitlesSettings): this;
    /**
     * Adds a pre-composed layer to the scene.
     * @param layer The final layer object, from `layerComposer.compose()`.
     * @returns The SceneComposer instance for further chaining.
     */
    addLayer(layer: SceneLayer): this;
    /**
     * Adds an asset to the scene's asset registry.
     * @param asset The asset object to add.
     * @returns The SceneComposer instance for further chaining.
     */
    addAsset(asset: SceneAssetInput): this;
    /**
     * Adds a global audio track to the scene.
     * @param audioTrack The audio track object to add.
     * @returns The SceneComposer instance for further chaining.
     */
    addAudioTrack(audioTrack: AudioTrackInput): this;
    /**
     * Validates and finalizes the entire scene object.
     * @returns A fully formed and validated Scene object.
     */
    compose(): Scene;
    safeCompose(): Scene | undefined;
}
/**
 * Factory function to create a new SceneComposer.
 * @param id The scene's unique ID.
 * @param settings The initial scene settings.
 * @returns A new instance of SceneComposer.
 */
export declare function createSceneComposer(id: string, settings: SceneSettingsInput): SceneComposer;
export {};
