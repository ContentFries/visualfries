import { type AnimationPreset as AnimationPresetData, type AnimationPresetInput, type AnimationSequenceItem } from '..';
export declare class AnimationPreset {
    preset: AnimationPresetData;
    constructor(presetJson: AnimationPresetInput);
    get duration(): number;
    getTimelineItems(): AnimationSequenceItem[];
}
