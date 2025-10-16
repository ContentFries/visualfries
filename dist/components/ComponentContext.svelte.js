import { StateManager } from '../managers/StateManager.svelte.js';
import { EventManager } from '../managers/EventManager.js';
export class ComponentContext {
    #data;
    // context data replacement, useful for modifiing context of subtitles
    #contextData;
    disabled = false;
    resources = new Map();
    state;
    eventManager;
    constructor(cradle) {
        this.state = cradle.stateManager;
        this.eventManager = cradle.eventManager;
    }
    setComponentProps(props) {
        this.#data = props;
        this.#contextData = undefined;
    }
    get duration() {
        // TODO maybe we will need to get duration from the contextData
        return this.#data.duration;
    }
    get contextData() {
        return this.#contextData ? this.#contextData : this.#data.getData();
    }
    get data() {
        return this.#data.getData();
    }
    get id() {
        return this.data.id;
    }
    get type() {
        return this.data.type;
    }
    get isActive() {
        const currentTime = this.sceneState.currentTime;
        const startAt = this.data.timeline.startAt;
        const endAt = this.data.timeline.endAt;
        // Add small tolerance to handle floating point precision issues
        const tolerance = 1e-10;
        return currentTime >= startAt - tolerance && currentTime <= endAt + tolerance;
    }
    get progress() {
        const currentTime = this.sceneState.currentTime;
        const startAt = this.data.timeline.startAt;
        const endAt = this.data.timeline.endAt;
        const duration = endAt - startAt;
        if (duration === 0)
            return 0;
        // Calculate progress as percentage (0-1)
        const progress = Math.max(0, Math.min(1, (currentTime - startAt) / duration));
        return progress;
    }
    get currentComponentTime() {
        const startAt = this.state.transformTime(this.data.timeline.startAt);
        let startAtModifier = 0;
        if (this.data.type === 'VIDEO') {
            startAtModifier = this.data.source.startAt ?? 0;
        }
        // Calculate relative time from start of component
        const relativeTime = this.sceneState.currentTime - startAt;
        // Add starting_time modifier
        return this.state.transformTime(startAtModifier, true) + relativeTime;
    }
    get componentTimelineTime() {
        const startAt = this.data.timeline.startAt;
        const endAt = this.data.timeline.endAt;
        const duration = endAt - startAt;
        const relativeTime = this.sceneState.currentTime - startAt;
        if (relativeTime < 0 || relativeTime > duration) {
            return undefined;
        }
        return this.state.transformTime(relativeTime);
    }
    get currentTime() {
        return this.state.currentTime;
    }
    get sceneState() {
        return this.state;
    }
    updateContextData(data) {
        this.#contextData = data;
    }
    resetContextData() {
        this.#contextData = undefined;
    }
    getResource(type) {
        return this.resources.get(type);
    }
    setResource(type, resource) {
        this.resources.set(type, resource);
    }
    removeResource(type) {
        this.resources.delete(type);
    }
    async runHooks(hooks, type) {
        // Sort handlers by priority (low to high, meaning 1 has higher priority then 100)
        const sortedHooks = [...hooks].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
        for (let i = 0; i < sortedHooks.length; i += 1) {
            const handler = sortedHooks[i];
            await handler.handle(type, this);
        }
    }
    destroy() { }
}
