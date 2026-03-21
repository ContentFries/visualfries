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
import { DeterministicRenderError } from '$lib/schemas/runtime/deterministic.js';
import { isTimeWithinTimeline, TIMELINE_BOUNDARY_EPSILON } from '$lib/utils/timelineWindow.js';

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

	#getBaseData(): ComponentData {
		return this.#data.getData();
	}

	#getBaseId(): string {
		if ('id' in this.#data && typeof this.#data.id === 'string') {
			return this.#data.id;
		}
		return this.#getBaseData().id;
	}

	#getBaseType(): ComponentData['type'] {
		if ('type' in this.#data && typeof this.#data.type === 'string') {
			return this.#data.type as ComponentData['type'];
		}
		return this.#getBaseData().type;
	}

	#getBaseTimeline(): ComponentData['timeline'] {
		if ('timeline' in this.#data && this.#data.timeline) {
			return this.#data.timeline;
		}
		return this.#getBaseData().timeline;
	}

	#getBaseSourceStartAt(): number | undefined {
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

	get contextData(): ComponentData {
		return this.#contextData ? this.#contextData : this.#data.getData();
	}

	get data(): ComponentData {
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

		if (duration === 0) return 0;

		// Calculate progress as percentage (0-1)
		const progress = Math.max(0, Math.min(1, (currentTime - startAt) / duration));
		return progress;
	}

	get currentComponentTime(): number {
		const timeline = this.#contextData?.timeline ?? this.#getBaseTimeline();
		const componentType = this.#contextData?.type ?? this.#getBaseType();
		const startAt = this.state.transformTime(timeline.startAt);
		let startAtModifier = 0;
		if (componentType === 'VIDEO' || componentType === 'AUDIO') {
			const overrideSourceStartAt =
				this.#contextData?.type === 'VIDEO' || this.#contextData?.type === 'AUDIO'
					? this.#contextData.source.startAt
					: undefined;
			startAtModifier = overrideSourceStartAt ?? this.#getBaseSourceStartAt() ?? 0;
		}

		// Calculate relative time from start of component
		const relativeTime = this.sceneState.currentTime - startAt;

		// Add starting_time modifier
		return this.state.transformTime(startAtModifier, true) + relativeTime;
	}

	get componentTimelineTime(): number | undefined {
		const timeline = this.#contextData?.timeline ?? this.#getBaseTimeline();
		const startAt = timeline.startAt;
		const endAt = timeline.endAt;
		if (
			!isTimeWithinTimeline(this.sceneState.currentTime, startAt, endAt, TIMELINE_BOUNDARY_EPSILON)
		) {
			return undefined;
		}

		const relativeTime = this.sceneState.currentTime - startAt;
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
			} catch (error) {
				const normalizedError = error instanceof Error ? error : new Error(String(error));
				const hookName = handler.constructor?.name ?? `Hook[${i}]`;
				console.warn(
					`[ComponentContext] Hook "${hookName}" failed during "${type}" for component "${this.id}":`,
					normalizedError.message
				);

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

	destroy() {}
}
