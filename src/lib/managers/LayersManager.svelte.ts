import { AppManager } from './AppManager.svelte.js';
import type { ResourceManager, ILayer } from '$lib';
import type { SceneLayer, SceneLayerInput } from '$lib';
import { Layer } from '$lib/layers/Layer.svelte.js';
import type { AwilixContainer } from 'awilix/browser';
import { asValue } from 'awilix/browser';

export class LayersManager implements ResourceManager<ILayer, SceneLayer, SceneLayerInput> {
	layers: Map<string, ILayer> = new Map();
	private isBuilding = false;

	private appManager!: AppManager;
	private container: AwilixContainer; // Container

	constructor(cradle: { container: AwilixContainer }) {
		this.container = cradle.container;
	}

	setAppManager(appManager: AppManager) {
		this.appManager = appManager;
	}

	getAll() {
		const layers = Array.from(this.layers.values()).sort((a, b) => b.order - a.order);
		return layers;
	}

	update(layerId: string, data: Partial<SceneLayerInput>) {
		const layer = this.get(layerId);

		if (layer) {
			layer.update(data);
		}
	}

	get(layerId: string) {
		return this.layers.get(layerId);
	}

	getData() {
		return this.getAll().map((layer) => layer.getData());
	}

	delete(layerId: string) {
		const layer = this.layers.get(layerId);
		if (layer) {
			try {
				if (layer.displayObject && this.appManager?.stage) {
					this.appManager.stage.removeChild(layer.displayObject);
				}
				layer.destroy?.();
			} catch (error) {
				console.error('Error during layer cleanup:', error);
			} finally {
				this.layers.delete(layerId);
			}
		}
	}

	async create(layerData: SceneLayer): Promise<ILayer | null> {
		if (this.isBuilding) {
			throw new Error(
				'Attempted to create multiple layers simultaneously. Construct one at the time.'
			);
		}

		let layer: ILayer | null = null;
		this.isBuilding = true;

		try {
			// Register component-specific data in the scope
			this.container.register({
				layerData: asValue(layerData)
			});

			layer = this.container.resolve<Layer>('layer');
			if (!layer) {
				throw new Error('Layer not found');
			}

			await layer.build();
			this.layers.set(layer.id, layer);
			if (layer.displayObject) {
				this.appManager.stage.addChild(layer.displayObject);
			}
		} catch (err) {
			console.error(err);
		} finally {
			this.isBuilding = false;
		}

		return layer;
	}

	setOrder(id: string, order: number): void {
		const layer = this.layers.get(id);
		if (!layer) return;

		if (layer.order === order) {
			return;
		}
		layer.setOrder(order);
		this.appManager.stage.sortChildren();
	}

	moveUp(id: string): void {
		this.#reorderLayer(id, (sortedLayers, index) => {
			if (index >= sortedLayers.length - 1) return false;
			const currentOrder = sortedLayers[index].order;
			const aboveOrder = sortedLayers[index + 1].order;
			sortedLayers[index].setOrder(aboveOrder);
			sortedLayers[index + 1].setOrder(currentOrder);
		});
	}

	moveDown(id: string): void {
		this.#reorderLayer(id, (sortedLayers, index) => {
			if (index <= 0) return false;
			const currentOrder = sortedLayers[index].order;
			const belowOrder = sortedLayers[index - 1].order;
			sortedLayers[index].setOrder(belowOrder);
			sortedLayers[index - 1].setOrder(currentOrder);
		});
	}

	moveToTop(id: string): void {
		this.#reorderLayer(id, (sortedLayers, index) => {
			if (index === sortedLayers.length - 1) return false;
			const topOrder = sortedLayers[sortedLayers.length - 1].order;
			sortedLayers[index].setOrder(topOrder + 1);
		});
	}

	moveToBottom(id: string): void {
		this.#reorderLayer(id, (sortedLayers, index) => {
			if (index === 0) return false;
			const bottomOrder = sortedLayers[0].order;
			sortedLayers[index].setOrder(bottomOrder - 1);
		});
	}

	moveAfter(id: string, targetId: string): void {
		this.#reorderLayer(id, (sortedLayers, index) => {
			const targetIndex = sortedLayers.findIndex((l) => l.id === targetId);
			if (targetIndex === -1 || targetIndex === index) return false;

			const targetOrder = sortedLayers[targetIndex].order;
			const newOrder =
				targetIndex > 0 ? (targetOrder + sortedLayers[targetIndex - 1].order) / 2 : targetOrder - 1;
			sortedLayers[index].setOrder(newOrder);
		});
	}

	moveBefore(id: string, targetId: string): void {
		this.#reorderLayer(id, (sortedLayers, index) => {
			const targetIndex = sortedLayers.findIndex((l) => l.id === targetId);
			if (targetIndex === -1 || targetIndex === index) return false;

			const targetOrder = sortedLayers[targetIndex].order;
			const newOrder =
				targetIndex < sortedLayers.length - 1
					? (targetOrder + sortedLayers[targetIndex + 1].order) / 2
					: targetOrder + 1;
			sortedLayers[index].setOrder(newOrder);
		});
	}

	#reorderLayer(
		id: string,
		reorderFn: (sortedLayers: ILayer[], index: number) => void | false
	): void {
		const sortedLayers = this.getAll();
		const index = sortedLayers.findIndex((l) => l.id === id);
		if (index === -1) return;

		const result = reorderFn(sortedLayers, index);
		if (result !== false) {
			this.appManager.stage.sortChildren();
		}
	}

	bulkUpdate(updates: { id: string; data: Partial<SceneLayerInput> }[]): void {
		updates.forEach(({ id, data }) => this.update(id, data));
	}

	bulkDelete(ids: string[]): void {
		ids.forEach((id) => this.delete(id));
	}

	hide(id: string): void {
		this.update(id, { visible: false });
	}

	show(id: string): void {
		this.update(id, { visible: true });
	}

	toggle(id: string): void {
		const layer = this.get(id);
		if (layer) {
			this.update(id, { visible: !layer.visible });
		}
	}

	filter(predicate: (layer: ILayer) => boolean): ILayer[] {
		return this.getAll().filter(predicate);
	}
}
