import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import type { ResourceManager, IComponent, ComponentData } from '$lib';
import type { AppearanceInput } from '$lib';

import { AppManager } from './AppManager.svelte.js';
import { LayersManager } from './LayersManager.svelte.js';
import { shouldPrepareMediaAtTime } from '$lib/utils/mediaWindow.js';
import { isTimeWithinTimeline } from '$lib/utils/timelineWindow.js';

export class RenderManager {
	private state: StateManager;
	private componentsManager: ResourceManager<IComponent, ComponentData, AppearanceInput>;
	private eventManager: EventManager;
	private appManager: AppManager;
	private layersManager: LayersManager;
	// Track last visibility to ensure we run one more update to hide components that just became invisible
	private lastActiveById: Map<string, boolean> = new Map();
	private lastRenderTime: number = -1;
	private renderInFlight: Promise<void> | null = null;
	private rerenderRequested = false;

	constructor(cradle: {
		stateManager: StateManager;
		componentsManager: ResourceManager<IComponent, ComponentData, AppearanceInput>;
		eventManager: EventManager;
		appManager: AppManager;
		layersManager: LayersManager;
	}) {
		this.state = cradle.stateManager;
		this.componentsManager = cradle.componentsManager;
		this.eventManager = cradle.eventManager;
		this.appManager = cradle.appManager;
		this.layersManager = cradle.layersManager;
		this.initializeEventListeners();
	}

	private initializeEventListeners(): void {
		this.eventManager.on('beforerender', this.handleBeforeRender.bind(this));
		this.eventManager.on('timeupdate', this.render.bind(this));
		this.eventManager.on('rerender', this.render.bind(this));
		this.eventManager.on('changestate', (event) => {
			if (event.detail.state !== 'playing') {
				this.render();
			}
		});
	}

	private async handleBeforeRender(): Promise<void> {}

	#syncLayerDisplayObjects(): void {
		const layers = this.layersManager.getAll();
		let changed = false;
		for (const layer of layers) {
			if (layer.syncDisplayObjects()) {
				changed = true;
			}
		}

		if (changed) {
			this.state.markDirty();
		}
	}

	async render(): Promise<void> {
		if (this.renderInFlight) {
			this.rerenderRequested = true;
			return this.renderInFlight;
		}

		this.renderInFlight = this.#drainRenderQueue();
		return this.renderInFlight;
	}

	async #drainRenderQueue(): Promise<void> {
		try {
			do {
				this.rerenderRequested = false;
				await this.#renderOnce();
			} while (this.rerenderRequested);
		} finally {
			this.renderInFlight = null;
		}
	}

	async #renderOnce(): Promise<void> {
		const components: IComponent[] = this.componentsManager.getAll();
		const currentTime = this.state.currentTime;

		const entries: Array<{
			component: IComponent;
			shouldBeVisible: boolean;
			shouldPrepareMedia: boolean;
			wasVisible: boolean;
		}> =
			components.map((component: IComponent) => {
				const startAt = component.props.timeline.startAt ?? 0;
				const endAt = component.props.timeline.endAt ?? this.state.duration;
				const isVisibleByTime = isTimeWithinTimeline(currentTime, startAt, endAt);
				const isExplicitlyVisible = component.props.visible !== false;
				const shouldBeVisible = isVisibleByTime && isExplicitlyVisible;
				const shouldPrepareMedia =
					component.type === 'VIDEO' || component.type === 'AUDIO'
						? shouldPrepareMediaAtTime(
								{
									type: component.type,
									visible: component.props.visible,
									timeline: component.props.timeline,
									source: { url: component.props.sourceUrl }
								},
								currentTime
							)
						: false;
				const wasVisible = this.lastActiveById.get(component.id) === true;
				return { component, shouldBeVisible, shouldPrepareMedia, wasVisible };
			});

		const toUpdate: IComponent[] = entries
			.filter((e) => e.shouldBeVisible || e.wasVisible || e.shouldPrepareMedia)
			.map((e) => e.component);

		await Promise.all(toUpdate.map((component) => component.update()));

		// Update visibility cache after updates
		for (const e of entries) {
			this.lastActiveById.set(e.component.id, e.shouldBeVisible);
		}

		this.#syncLayerDisplayObjects();
		this.appManager.render();
		this.lastRenderTime = currentTime;
	}

	public destroy(): void {
		this.eventManager.removeEventListener('beforerender', this.handleBeforeRender);
		this.eventManager.removeEventListener('timeupdate', this.render);
		this.eventManager.removeEventListener('rerender', this.render);
		this.eventManager.removeEventListener('changestate', this.render);
	}
}
