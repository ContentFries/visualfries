import type { EventManager } from '$lib/managers/EventManager.js';

export class TimeManager {
	fps = $state<number>(30); // Default
	duration = $state<number>(0);
	private static readonly FRAME_EPSILON = 1e-9;

	getFrameIndex(
		time: number,
		mode: 'nearest' | 'current' = 'nearest',
		skipDurationCheck = false
	): number {
		let adjustedTime = Math.max(time, 0);

		if (!skipDurationCheck) {
			adjustedTime = Math.min(adjustedTime, this.duration);
		}

		const scaledTime = adjustedTime * this.fps;
		if (mode === 'current') {
			return Math.max(0, Math.floor(scaledTime + TimeManager.FRAME_EPSILON));
		}

		return Math.max(0, Math.round(scaledTime));
	}

	getTimeForFrame(frame: number, skipDurationCheck = false): number {
		const frameTime = Math.max(0, frame) / this.fps;
		if (!skipDurationCheck) {
			return frameTime > this.duration ? this.duration : frameTime;
		}

		return frameTime;
	}

	transformTime(time: number, skipDurationCheck = false): number {
		const frame = this.getFrameIndex(time, 'nearest', skipDurationCheck);
		return this.getTimeForFrame(frame, skipDurationCheck);
	}

	getCurrentFrameTime(time: number, skipDurationCheck = false): number {
		const frame = this.getFrameIndex(time, 'nearest', skipDurationCheck);
		return this.getTimeForFrame(frame, skipDurationCheck);
	}

	updateTimeConfig(newFps: number, newDuration: number) {
		this.fps = newFps;
		this.duration = newDuration;
	}
}
