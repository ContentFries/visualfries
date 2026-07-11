export class TimeManager {
    fps = $state(30); // Default
    duration = $state(0);
    static FRAME_EPSILON = 1e-4;
    getFrameIndex(time, mode = 'nearest', skipDurationCheck = false) {
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
