export declare class TimeManager {
    fps: number;
    duration: number;
    transformTime(time: number, skipDurationCheck?: boolean): number;
    updateTimeConfig(newFps: number, newDuration: number): void;
}
