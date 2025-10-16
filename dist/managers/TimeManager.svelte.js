export class TimeManager {
    fps = $state(30); // Default
    duration = $state(0);
    transformTime(time, skipDurationCheck = false) {
        // Round to nearest frame boundary (1/fps seconds)
        let frameAdjustedTime = Math.round(time * this.fps) / this.fps;
        frameAdjustedTime = Math.max(frameAdjustedTime, 0);
        if (!skipDurationCheck) {
            // Keep duration check since endTime is always <= duration
            return frameAdjustedTime > this.duration ? this.duration : frameAdjustedTime;
        }
        return frameAdjustedTime;
    }
    updateTimeConfig(newFps, newDuration) {
        this.fps = newFps;
        this.duration = newDuration;
    }
}
