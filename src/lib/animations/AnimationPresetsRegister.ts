import type { AnimationPreset } from "$lib";
import * as systemPresets from "./presets/index.js";

export class AnimationPresetsRegister {
  private presets: Map<string, AnimationPreset> = new Map();

  constructor() {
    this.#registerSystemPresets();
  }

  #registerSystemPresets() {
    Object.values(systemPresets).forEach((preset: AnimationPreset) => {
      if (preset && typeof preset === 'object' && 'id' in preset) {
        this.presets.set(preset.id, preset);
      }
    });
  }

  public register(preset: AnimationPreset) {
    this.presets.set(preset.id, preset);
  }

  public getPresets() {
    return this.presets;
  }
}