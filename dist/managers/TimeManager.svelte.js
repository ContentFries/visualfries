import { frameIndexAtTime } from '../utils/frameTime.js';
export class TimeManager {
    fps = $state(30); // Default
    duration = $state(0);
    getFrameIndex(time, mode = 'nearest', skipDurationCheck = false) {
        let adjustedTime = Math.max(time, 0);
        if (!skipDurationCheck) {
            adjustedTime = Math.min(adjustedTime, this.duration);
        }
        if (mode === 'current') {
            return frameIndexAtTime(adjustedTime, this.fps);
        }
        return Math.max(0, Math.round(adjustedTime * this.fps));
    }
    getTimeForFrame(frame, skipDurationCheck = false) {
        const frameTime = Math.max(0, frame) / this.fps;
        if (!skipDurationCheck) {
            return frameTime > this.duration ? this.duration : frameTime;
        }
        return frameTime;
    }
    transformTime(time, skipDurationCheck = false) {
        const frame = this.getFrameIndex(time, 'current', skipDurationCheck);
        return this.getTimeForFrame(frame, skipDurationCheck);
    }
    getCurrentFrameTime(time, skipDurationCheck = false) {
        return this.transformTime(time, skipDurationCheck);
    }
    updateTimeConfig(newFps, newDuration) {
        this.fps = newFps;
        this.duration = newDuration;
    }
}
