import {
	AnimationPresetShape,
	type AnimationPreset as AnimationPresetData,
	type AnimationPresetInput,
	type AnimationSequenceItem
} from '$lib';
import { get } from 'lodash-es';

export class AnimationPreset {
	preset: AnimationPresetData;

	constructor(presetJson: AnimationPresetInput) {
		const parsedPreset = AnimationPresetShape.safeParse(presetJson);
		if (!parsedPreset.success) {
			console.error('Invalid preset JSON', presetJson);
			throw new Error('Invalid preset JSON');
		}
		this.preset = parsedPreset.data;
	}

	get duration(): number {
		if (this.preset.duration) {
			return Math.max(0.5, this.preset.duration);
		}

		const offset = Math.min(0.5, get(this.preset, 'startAt', 0.5));
		const timeline = this.getTimelineItems();
		let durations = 0;
		if (timeline.length > 0) {
			durations = timeline
				.map((item) =>
					item.tweens.map((tween) =>
						typeof tween.vars.duration === 'number' ? tween.vars.duration : 0.5
					)
				)
				.reduce(
					(acc, curr) => acc + curr.map((d) => d || 0.5).reduce((acc, curr) => acc + curr, 0),
					0
				);
		}
		durations = parseFloat(durations.toFixed(2));
		return durations + offset;
	}

	getTimelineItems(): AnimationSequenceItem[] {
		return this.preset.timeline;
	}
}
