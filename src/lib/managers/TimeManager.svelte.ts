import type { EventManager } from '$lib/managers/EventManager.js';
import { frameIndexAtTime } from '$lib/utils/frameTime.js';

export class TimeManager {
	fps = $state<number>(30); // Default
	duration = $state<number>(0);

	getFrameIndex(
		time: number,
		mode: 'nearest' | 'current' = 'nearest',
		skipDurationCheck = false
	): number {
		let adjustedTime = Math.max(time, 0);

		if (!skipDurationCheck) {
			adjustedTime = Math.min(adjustedTime, this.duration);
		}

		if (mode === 'current') {
			return frameIndexAtTime(adjustedTime, this.fps);
		}

		return Math.max(0, Math.round(adjustedTime * this.fps));
	}

	getTimeForFrame(frame: number, skipDurationCheck = false): number {
		const frameTime = Math.max(0, frame) / this.fps;
		if (!skipDurationCheck) {
			return frameTime > this.duration ? this.duration : frameTime;
		}

		return frameTime;
	}

	transformTime(time: number, skipDurationCheck = false): number {
		const frame = this.getFrameIndex(time, 'current', skipDurationCheck);
		return this.getTimeForFrame(frame, skipDurationCheck);
	}

	getCurrentFrameTime(time: number, skipDurationCheck = false): number {
		return this.transformTime(time, skipDurationCheck);
	}

	updateTimeConfig(newFps: number, newDuration: number) {
		this.fps = newFps;
		this.duration = newDuration;
	}
}
