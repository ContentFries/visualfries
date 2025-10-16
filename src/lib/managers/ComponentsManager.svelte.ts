import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import type {
	MediaComponent,
	ResourceManager,
	IComponent,
	ComponentData,
	ComponentRefreshType
} from '$lib';
import type { AppearanceInput } from '$lib';
import { Component } from '$lib/components/Component.svelte.js';
import { ComponentDirector } from '$lib/directors/ComponentDirector.js';
import { PixiComponentBuilder } from '$lib/builders/PixiComponentBuilder.js';
import { ComponentState } from '$lib/builders/_ComponentState.svelte.js';
import { asClass, asValue, type AwilixContainer } from 'awilix/browser';
import type { LayersManager } from './LayersManager.svelte.js';
import { debounce, type DebouncedFunc } from 'lodash-es';
// import { builtTextComponentForSubtitle } from '$lib/utils/subtitles.js';

export class ComponentsManager
	implements ResourceManager<IComponent, ComponentData, AppearanceInput>
{
	private components: Map<string, IComponent> = $state(new Map());
	private isBuilding = false;

	private state: StateManager;
	private eventManager: EventManager;
	private layersManager: LayersManager;
	private container: AwilixContainer;
	private debouncedRefreshSubtitles: DebouncedFunc<() => void>;

	constructor(cradle: {
		stateManager: StateManager;
		eventManager: EventManager;
		layersManager: LayersManager;
		container: AwilixContainer;
	}) {
		this.state = cradle.stateManager;
		this.eventManager = cradle.eventManager;
		this.layersManager = cradle.layersManager;
		this.container = cradle.container;

		// Debounce subtitle refreshes to batch rapid changes (16ms = ~60fps)
		this.debouncedRefreshSubtitles = debounce(() => this.#scheduleSubtitleRefresh(), 16, {
			leading: false,
			trailing: true
		});

		this.initializeEventListeners();
	}

	private initializeEventListeners(): void {
		this.eventManager.on('subtitleschange', this.debouncedRefreshSubtitles.bind(this));
	}

	#scheduleSubtitleRefresh() {
		// Schedule the refresh on the next animation frame to avoid blocking
		requestAnimationFrame(() => {
			const components = this.filter((c) => c.type === 'SUBTITLES');
			components.forEach((c) => {
				c.refresh();
			});
		});
	}

	private isVisible(component: IComponent) {
		const { currentTime, duration } = this.state;

		const startAt = component.props.timeline.startAt || 0;
		const endAt = component.props.timeline.endAt || duration;
		return currentTime >= startAt && currentTime <= endAt;
	}

	getAll() {
		return Array.from(this.components.values());
	}

	getMediaComponents() {
		return this.getAll().filter((component): component is Component & MediaComponent =>
			['VIDEO', 'AUDIO'].includes(component.type)
		);
	}

	#refreshComponent(component: IComponent, refreshType: ComponentRefreshType = 'refresh') {
		component.refresh();
		if (refreshType != 'refresh') {
			component.refresh(refreshType);
		}
	}

	async update(
		componentId: string,
		data: Partial<AppearanceInput>,
		refreshType: ComponentRefreshType = 'refresh'
	) {
		const component = this.get(componentId);

		if (component) {
			await component.props.updateAppearance(data);
			// Only manually refresh if auto-refresh is not enabled
			if (!component.autoRefresh) {
				this.#refreshComponent(component, refreshType);
			}
		}
	}

	get(componentId: string) {
		return this.components.get(componentId);
	}

	delete(componentId: string) {
		const component = this.components.get(componentId);
		if (component) {
			const layers = this.layersManager.getAll();
			const componentLayer = layers.find((layer) =>
				layer.components.some((component) => component.id === componentId)
			);

			// manage parent layer
			if (componentLayer) {
				componentLayer.removeComponent(component);
				if (!componentLayer.components.length) {
					this.layersManager.delete(componentLayer.id);
				}
			}

			component.destroy();
			this.components.delete(componentId);
		}
	}

	async #buildComponent(componentData: ComponentData) {
		// this.container.registerInstance('ComponentData', componentData);
		// const director = this.container.resolve(ComponentDirector);
		// const builder = this.container.resolve(PixiComponentBuilder);

		const componentScope = this.container.createScope();

		// Register component-specific data in the scope
		componentScope.register({
			componentData: asValue(componentData),
			componentState: asClass(ComponentState)
		});

		const director = componentScope.resolve<ComponentDirector>('componentDirector');
		const builder = componentScope.resolve<PixiComponentBuilder>('pixiComponentBuilder');

		director.setBuilder(builder);
		director.setComponentData(componentData);
		const component = director.constructAuto();
		await component.setup();
		await component.update();
		return component;
	}

	async create(componentData: ComponentData): Promise<IComponent | null> {
		if (this.isBuilding) {
			throw new Error(
				'Attempted to create multiple components simultaneously. Construct one at the time.'
			);
		}

		this.isBuilding = true;
		let component: IComponent | null = null;

		try {
			component = await this.#buildComponent(componentData);
			this.components.set(componentData.id, component);
		} catch (err) {
			console.error(err);
		} finally {
			this.isBuilding = false;
		}

		return component;
	}

	setOrder(id: string, order: number): void {
		this.#reorderComponent(id, (components, index) => {
			const [component] = components.splice(index, 1);
			components.splice(order, 0, component);
		});
	}

	moveUp(id: string): void {
		this.#reorderComponent(id, (components, index) => {
			if (index <= 0) return false;
			[components[index - 1], components[index]] = [components[index], components[index - 1]];
		});
	}

	moveDown(id: string): void {
		this.#reorderComponent(id, (components, index) => {
			if (index >= components.length - 1) return false;
			[components[index], components[index + 1]] = [components[index + 1], components[index]];
		});
	}

	moveToTop(id: string): void {
		this.#reorderComponent(id, (components, index) => {
			if (index === 0) return false;
			const [component] = components.splice(index, 1);
			components.unshift(component);
		});
	}

	moveToBottom(id: string): void {
		this.#reorderComponent(id, (components, index) => {
			if (index === components.length - 1) return false;
			const [component] = components.splice(index, 1);
			components.push(component);
		});
	}

	moveAfter(id: string, targetId: string): void {
		this.#reorderComponent(id, (components, index) => {
			const targetIndex = components.findIndex((c) => c.id === targetId);
			if (targetIndex === -1) return false;

			const [component] = components.splice(index, 1);
			const newTargetIndex = components.findIndex((c) => c.id === targetId);
			components.splice(newTargetIndex + 1, 0, component);
		});
	}

	moveBefore(id: string, targetId: string): void {
		this.#reorderComponent(id, (components, index) => {
			const targetIndex = components.findIndex((c) => c.id === targetId);
			if (targetIndex === -1) return false;

			const [component] = components.splice(index, 1);
			const newTargetIndex = components.findIndex((c) => c.id === targetId);
			components.splice(newTargetIndex, 0, component);
		});
	}

	#reorderComponent(
		id: string,
		reorderFn: (components: IComponent[], index: number) => void | false
	): void {
		const layer = this.#findLayerByComponentId(id);
		if (!layer) return;

		const index = layer.components.findIndex((c) => c.id === id);
		if (index === -1) return;

		const result = reorderFn(layer.components, index);
		if (result !== false) {
			this.#updateDisplayOrder(layer);
		}
	}

	#findLayerByComponentId(componentId: string) {
		const layers = this.layersManager.getAll();
		return layers.find((layer) => layer.components.some((c) => c.id === componentId));
	}

	#updateDisplayOrder(layer: LayersManager['layers'] extends Map<string, infer L> ? L : never) {
		const displayObject = layer.displayObject;
		if (!displayObject) return;

		// Sync displayObject children order with components array
		layer.components.forEach((component, index) => {
			if (component.displayObject) {
				displayObject.setChildIndex(component.displayObject, index);
			}
		});
	}

	bulkUpdate(updates: { id: string; data: Partial<AppearanceInput> }[]): void {
		updates.forEach(({ id, data }) => this.update(id, data));
	}

	bulkDelete(ids: string[]): void {
		ids.forEach((id) => this.delete(id));
	}

	async hide(id: string): Promise<void> {
		const component = this.get(id);
		if (component) {
			await component.props.setVisible(false);
		}
	}

	async show(id: string): Promise<void> {
		const component = this.get(id);
		if (component) {
			await component.props.setVisible(true);
		}
	}

	async toggle(id: string): Promise<void> {
		const component = this.get(id);
		if (component) {
			await component.props.setVisible(!component.props.visible);
		}
	}

	filter(predicate: (component: IComponent) => boolean): IComponent[] {
		return this.getAll().filter(predicate);
	}

	public isComponentVisible(componentId: string): boolean {
		const component = this.get(componentId);
		if (!component) {
			return false;
		}

		return this.isVisible(component);
	}

	public destroy(): void {
		this.eventManager.removeEventListener('subtitleschange', this.debouncedRefreshSubtitles);
		this.debouncedRefreshSubtitles.cancel(); // Cancel any pending debounced calls
	}
}
