import * as systemPresets from "./presets/index.js";
export class AnimationPresetsRegister {
    presets = new Map();
    constructor() {
        this.#registerSystemPresets();
    }
    #registerSystemPresets() {
        Object.values(systemPresets).forEach((preset) => {
            if (preset && typeof preset === 'object' && 'id' in preset) {
                this.presets.set(preset.id, preset);
            }
        });
    }
    register(preset) {
        this.presets.set(preset.id, preset);
    }
    getPresets() {
        return this.presets;
    }
}
