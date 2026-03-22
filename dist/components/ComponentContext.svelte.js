import { StateManager } from '../managers/StateManager.svelte.js';
import { EventManager } from '../managers/EventManager.js';
import { DeterministicRenderError } from '../schemas/runtime/deterministic.js';
import { isTimeWithinTimeline, TIMELINE_BOUNDARY_EPSILON } from '../utils/timelineWindow.js';
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
    #getBaseData() {
        return this.#data.getData();
    }
    #getBaseId() {
        if ('id' in this.#data && typeof this.#data.id === 'string') {
            return this.#data.id;
        }
        return this.#getBaseData().id;
    }
    #getBaseType() {
        if ('type' in this.#data && typeof this.#data.type === 'string') {
            return this.#data.type;
        }
        return this.#getBaseData().type;
    }
    #getBaseTimeline() {
        if ('timeline' in this.#data && this.#data.timeline) {
            return this.#data.timeline;
        }
        return this.#getBaseData().timeline;
    }
    #getBaseSourceStartAt() {
        if ('sourceStartAt' in this.#data) {
            return this.#data.sourceStartAt;
        }
        const data = this.#getBaseData();
        if (data.type === 'VIDEO' || data.type === 'AUDIO') {
            return data.source.startAt ?? undefined;
        }
        return undefined;
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
        return this.#contextData?.id ?? this.#getBaseId();
    }
    get type() {
        return this.#contextData?.type ?? this.#getBaseType();
    }
    get isActive() {
        const currentTime = this.sceneState.currentTime;
        const timeline = this.#contextData?.timeline ?? this.#getBaseTimeline();
        const startAt = timeline.startAt;
        const endAt = timeline.endAt;
        return isTimeWithinTimeline(currentTime, startAt, endAt, TIMELINE_BOUNDARY_EPSILON);
    }
    get progress() {
        const currentTime = this.sceneState.currentTime;
        const timeline = this.#contextData?.timeline ?? this.#getBaseTimeline();
        const startAt = timeline.startAt;
        const endAt = timeline.endAt;
        const duration = endAt - startAt;
        if (duration === 0)
            return 0;
        // Calculate progress as percentage (0-1)
        const progress = Math.max(0, Math.min(1, (currentTime - startAt) / duration));
        return progress;
    }
    get currentComponentTime() {
        const timeline = this.#contextData?.timeline ?? this.#getBaseTimeline();
        const componentType = this.#contextData?.type ?? this.#getBaseType();
        const startAt = this.state.transformTime(timeline.startAt);
        let startAtModifier = 0;
        if (componentType === 'VIDEO' || componentType === 'AUDIO') {
            const overrideSourceStartAt = this.#contextData?.type === 'VIDEO' || this.#contextData?.type === 'AUDIO'
                ? this.#contextData.source.startAt
                : undefined;
            startAtModifier = overrideSourceStartAt ?? this.#getBaseSourceStartAt() ?? 0;
        }
        // Calculate relative time from start of component
        const relativeTime = this.sceneState.currentTime - startAt;
        // Add starting_time modifier
        return this.state.transformTime(startAtModifier, true) + relativeTime;
    }
    get componentTimelineTime() {
        const timeline = this.#contextData?.timeline ?? this.#getBaseTimeline();
        const startAt = timeline.startAt;
        const endAt = timeline.endAt;
        if (!isTimeWithinTimeline(this.sceneState.currentTime, startAt, endAt, TIMELINE_BOUNDARY_EPSILON)) {
            return undefined;
        }
        const relativeTime = this.sceneState.currentTime - startAt;
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
        const sortedHooks = [...hooks];
        for (let i = 1; i < sortedHooks.length; i += 1) {
            if ((sortedHooks[i - 1].priority ?? 0) > (sortedHooks[i].priority ?? 0)) {
                sortedHooks.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
                break;
            }
        }
        for (let i = 0; i < sortedHooks.length; i += 1) {
            const handler = sortedHooks[i];
            try {
                await handler.handle(type, this);
            }
            catch (error) {
                const normalizedError = error instanceof Error ? error : new Error(String(error));
                const hookName = handler.constructor?.name ?? `Hook[${i}]`;
                console.warn(`[ComponentContext] Hook "${hookName}" failed during "${type}" for component "${this.id}":`, normalizedError.message);
                this.eventManager.emit('hookerror', {
                    hookName,
                    hookType: type,
                    error: normalizedError,
                    componentId: this.id,
                    timestamp: Date.now()
                });
                if (normalizedError instanceof DeterministicRenderError) {
                    throw normalizedError;
                }
            }
        }
    }
    destroy() { }
}
