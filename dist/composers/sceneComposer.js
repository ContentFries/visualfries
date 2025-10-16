import { SceneShape } from '..'; // Adjust path as needed
/**
 * A fluent, composable builder for creating a valid Scene object.
 */
class SceneComposer {
    _scene;
    constructor(id, settings) {
        this._scene = {
            id,
            settings,
            layers: [],
        };
    }
    /**
     * Merges new settings into the existing scene settings.
     * @param settings A partial object of scene settings to update.
     * @returns The SceneComposer instance for further chaining.
     */
    setSettings(settings) {
        // Perform a shallow merge to update settings
        this._scene.settings = { ...this._scene.settings, ...settings };
        return this;
    }
    setName(name) {
        this._scene.name = name;
        return this;
    }
    setSubtitles(subtitles) {
        this._scene.settings.subtitles = subtitles;
        return this;
    }
    /**
     * Adds a pre-composed layer to the scene.
     * @param layer The final layer object, from `layerComposer.compose()`.
     * @returns The SceneComposer instance for further chaining.
     */
    addLayer(layer) {
        if (!this._scene.layers) {
            this._scene.layers = [];
        }
        this._scene.layers.push(layer);
        return this;
    }
    /**
     * Adds an asset to the scene's asset registry.
     * @param asset The asset object to add.
     * @returns The SceneComposer instance for further chaining.
     */
    addAsset(asset) {
        if (!this._scene.assets) {
            this._scene.assets = [];
        }
        this._scene.assets.push(asset);
        return this;
    }
    /**
     * Adds a global audio track to the scene.
     * @param audioTrack The audio track object to add.
     * @returns The SceneComposer instance for further chaining.
     */
    addAudioTrack(audioTrack) {
        if (!this._scene.audioTracks) {
            this._scene.audioTracks = [];
        }
        this._scene.audioTracks.push(audioTrack);
        return this;
    }
    /**
     * Validates and finalizes the entire scene object.
     * @returns A fully formed and validated Scene object.
     */
    compose() {
        return SceneShape.parse(this._scene);
    }
    safeCompose() {
        const resp = SceneShape.safeParse(this._scene);
        if (!resp.success) {
            console.error('Invalid scene input:', resp.error.format());
            return undefined;
        }
        return resp.data;
    }
}
/**
 * Factory function to create a new SceneComposer.
 * @param id The scene's unique ID.
 * @param settings The initial scene settings.
 * @returns A new instance of SceneComposer.
 */
export function createSceneComposer(id, settings) {
    return new SceneComposer(id, settings);
}
