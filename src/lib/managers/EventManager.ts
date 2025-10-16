import type { EventType, EventPayload, EventMap } from '$lib';

export class EventManager extends EventTarget {
	isReady = false;

	constructor() {
		super();
	}

	public emit<T extends EventType>(event: T, props?: EventPayload<T>) {
		if (!this.isReady) {
			return;
		}

		// Note: 'subtitleschange' is NOT in this list - subtitle refreshes are handled
		// by ComponentsManager with debouncing to avoid blocking the main thread
		const rerenderableEvents = ['layerschange', 'componentschange', 'componentchange'];
		if (rerenderableEvents.includes(event)) {
			this.emit('rerender');
		}

		this.dispatchEvent(new CustomEvent(event, { detail: props }));
	}

	// "on" automatically returns the right type under event.details object
	public on<K extends keyof EventMap>(
		event: K,
		callback: (event: CustomEvent<EventMap[K]>) => void,
		options?: boolean | AddEventListenerOptions
	): void {
		this.addEventListener(
			event,
			((e: Event) => callback(e as CustomEvent<EventMap[K]>)) as EventListener,
			options
		);
	}
}
