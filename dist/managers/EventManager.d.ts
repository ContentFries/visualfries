import type { EventType, EventPayload, EventMap } from '../index.js';
export declare class EventManager extends EventTarget {
    isReady: boolean;
    constructor();
    emit<T extends EventType>(event: T, props?: EventPayload<T>): void;
    on<K extends keyof EventMap>(event: K, callback: (event: CustomEvent<EventMap[K]>) => void, options?: boolean | AddEventListenerOptions): void;
}
