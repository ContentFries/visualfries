import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
export declare class TimelineManager {
    #private;
    playbackRate: number;
    private state;
    private eventManager;
    private loop;
    constructor(cradle: {
        stateManager: StateManager;
        eventManager: EventManager;
        loop: boolean;
    });
    private initStateSyncWatchers;
    private watch;
    get timeline(): gsap.core.Timeline;
    get duration(): number;
    add(timeline: gsap.core.Timeline, position?: gsap.Position): void;
    addLabel(label: string, position?: gsap.Position): void;
    seek(requestedTime: number): void;
    play(): void;
    pause(): void;
    setPlaybackRate(rate: number): void;
    destroy(): void;
}
