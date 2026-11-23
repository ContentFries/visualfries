export declare class TimeManager {
    fps: number;
    duration: number;
    getFrameIndex(time: number, mode?: 'nearest' | 'current', skipDurationCheck?: boolean): number;
    getTimeForFrame(frame: number, skipDurationCheck?: boolean): number;
    transformTime(time: number, skipDurationCheck?: boolean): number;
    getCurrentFrameTime(time: number, skipDurationCheck?: boolean): number;
    updateTimeConfig(newFps: number, newDuration: number): void;
}
