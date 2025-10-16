import { StateManager } from '$lib/managers/StateManager.svelte.js';
import { EventManager } from '$lib/managers/EventManager.js';
import type {
	IComponentContext,
	ComponentData,
	ResourceTypes,
	IComponentHook,
	HookType,
	ComponentProps
} from '$lib';

export class ComponentContext implements IComponentContext {
	#data!: ComponentProps;

	// context data replacement, useful for modifiing context of subtitles
	#contextData: ComponentData | undefined;
	disabled = false;

	resources: Map<keyof ResourceTypes, ResourceTypes[keyof ResourceTypes]> = new Map();
	private state: StateManager;
	public eventManager: EventManager;

	constructor(cradle: { stateManager: StateManager; eventManager: EventManager }) {
		this.state = cradle.stateManager;
		this.eventManager = cradle.eventManager;
	}

	setComponentProps(props: ComponentProps) {
		this.#data = props;
		this.#contextData = undefined;
	}

	get duration() {
		// TODO maybe we will need to get duration from the contextData
		return this.#data.duration;
	}

	get contextData(): ComponentData {
		return this.#contextData ? this.#contextData : this.#data.getData();
	}

	get data(): ComponentData {
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

		if (duration === 0) return 0;

		// Calculate progress as percentage (0-1)
		const progress = Math.max(0, Math.min(1, (currentTime - startAt) / duration));
		return progress;
	}

	get currentComponentTime(): number {
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

	get componentTimelineTime(): number | undefined {
		const startAt = this.data.timeline.startAt;
		const endAt = this.data.timeline.endAt;
		const duration = endAt - startAt;
		const relativeTime = this.sceneState.currentTime - startAt;

		if (relativeTime < 0 || relativeTime > duration) {
			return undefined;
		}

		return this.state.transformTime(relativeTime);
	}

	get currentTime(): number {
		return this.state.currentTime;
	}

	get sceneState() {
		return this.state;
	}

	updateContextData(data: ComponentData): void {
		this.#contextData = data;
	}

	resetContextData() {
		this.#contextData = undefined;
	}

	getResource<K extends keyof ResourceTypes>(type: K): ResourceTypes[K] | undefined {
		return this.resources.get(type) as ResourceTypes[K] | undefined;
	}

	setResource<K extends keyof ResourceTypes>(type: K, resource: ResourceTypes[K]): void {
		this.resources.set(type, resource);
	}

	removeResource<K extends keyof ResourceTypes>(type: K): void {
		this.resources.delete(type);
	}

	async runHooks(hooks: IComponentHook[], type: HookType) {
		// Sort handlers by priority (low to high, meaning 1 has higher priority then 100)
		const sortedHooks = [...hooks].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

		for (let i = 0; i < sortedHooks.length; i += 1) {
			const handler = sortedHooks[i];
			await handler.handle(type, this);
		}
	}

	destroy() {}
}
