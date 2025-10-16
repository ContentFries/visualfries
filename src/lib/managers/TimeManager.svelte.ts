import type { EventManager } from '$lib/managers/EventManager.js';

export class TimeManager {
	fps = $state<number>(30); // Default
	duration = $state<number>(0);

	transformTime(time: number, skipDurationCheck = false): number {
		// Round to nearest frame boundary (1/fps seconds)
		let frameAdjustedTime = Math.round(time * this.fps) / this.fps;
		frameAdjustedTime = Math.max(frameAdjustedTime, 0);

		if (!skipDurationCheck) {
			// Keep duration check since endTime is always <= duration
			return frameAdjustedTime > this.duration ? this.duration : frameAdjustedTime;
		}

		return frameAdjustedTime;
	}

	updateTimeConfig(newFps: number, newDuration: number) {
		this.fps = newFps;
		this.duration = newDuration;
	}
}
