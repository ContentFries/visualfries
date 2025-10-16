import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import type { ResourceManager, IComponent, ComponentData } from '$lib';
import type { AppearanceInput } from '$lib';

import { AppManager } from './AppManager.svelte.js';

export class RenderManager {
	private state: StateManager;
	private componentsManager: ResourceManager<IComponent, ComponentData, AppearanceInput>;
	private eventManager: EventManager;
	private appManager: AppManager;
	// Track last visibility to ensure we run one more update to hide components that just became invisible
	private lastActiveById: Map<string, boolean> = new Map();
	private lastRenderTime: number = -1;

	constructor(cradle: {
		stateManager: StateManager;
		componentsManager: ResourceManager<IComponent, ComponentData, AppearanceInput>;
		eventManager: EventManager;
		appManager: AppManager;
	}) {
		this.state = cradle.stateManager;
		this.componentsManager = cradle.componentsManager;
		this.eventManager = cradle.eventManager;
		this.appManager = cradle.appManager;
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

	async render(): Promise<void> {
		const components: IComponent[] = this.componentsManager.getAll();
		const currentTime = this.state.currentTime;

		const entries: Array<{ component: IComponent; shouldBeVisible: boolean; wasVisible: boolean }> =
			components.map((component: IComponent) => {
				const startAt = component.props.timeline.startAt ?? 0;
				const endAt = component.props.timeline.endAt ?? this.state.duration;
				const isVisibleByTime = currentTime >= startAt && currentTime <= endAt;
				const isExplicitlyVisible = component.props.visible !== false;
				const shouldBeVisible =
					(isVisibleByTime && isExplicitlyVisible) || component.type === 'VIDEO';
				const wasVisible = this.lastActiveById.get(component.id) === true;
				return { component, shouldBeVisible, wasVisible };
			});

		const toUpdate: IComponent[] = entries
			.filter((e) => e.shouldBeVisible || e.wasVisible)
			.map((e) => e.component);

		await Promise.all(toUpdate.map((component) => component.update()));

		// Update visibility cache after updates
		for (const e of entries) {
			this.lastActiveById.set(e.component.id, e.shouldBeVisible);
		}

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
