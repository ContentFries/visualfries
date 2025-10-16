import { AppManager } from './AppManager.svelte.js';
import { Layer } from '../layers/Layer.svelte.js';
import { asValue } from 'awilix/browser';
export class LayersManager {
    layers = new Map();
    isBuilding = false;
    appManager;
    container; // Container
    constructor(cradle) {
        this.container = cradle.container;
    }
    setAppManager(appManager) {
        this.appManager = appManager;
    }
    getAll() {
        const layers = Array.from(this.layers.values()).sort((a, b) => b.order - a.order);
        return layers;
    }
    update(layerId, data) {
        const layer = this.get(layerId);
        if (layer) {
            layer.update(data);
        }
    }
    get(layerId) {
        return this.layers.get(layerId);
    }
    getData() {
        return this.getAll().map((layer) => layer.getData());
    }
    delete(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            try {
                if (layer.displayObject && this.appManager?.stage) {
                    this.appManager.stage.removeChild(layer.displayObject);
                }
                layer.destroy?.();
            }
            catch (error) {
                console.error('Error during layer cleanup:', error);
            }
            finally {
                this.layers.delete(layerId);
            }
        }
    }
    async create(layerData) {
        if (this.isBuilding) {
            throw new Error('Attempted to create multiple layers simultaneously. Construct one at the time.');
        }
        let layer = null;
        this.isBuilding = true;
        try {
            // Register component-specific data in the scope
            this.container.register({
                layerData: asValue(layerData)
            });
            layer = this.container.resolve('layer');
            if (!layer) {
                throw new Error('Layer not found');
            }
            await layer.build();
            this.layers.set(layer.id, layer);
            if (layer.displayObject) {
                this.appManager.stage.addChild(layer.displayObject);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            this.isBuilding = false;
        }
        return layer;
    }
    setOrder(id, order) {
        const layer = this.layers.get(id);
        if (!layer)
            return;
        if (layer.order === order) {
            return;
        }
        layer.setOrder(order);
        this.appManager.stage.sortChildren();
    }
    moveUp(id) {
        this.#reorderLayer(id, (sortedLayers, index) => {
            if (index >= sortedLayers.length - 1)
                return false;
            const currentOrder = sortedLayers[index].order;
            const aboveOrder = sortedLayers[index + 1].order;
            sortedLayers[index].setOrder(aboveOrder);
            sortedLayers[index + 1].setOrder(currentOrder);
        });
    }
    moveDown(id) {
        this.#reorderLayer(id, (sortedLayers, index) => {
            if (index <= 0)
                return false;
            const currentOrder = sortedLayers[index].order;
            const belowOrder = sortedLayers[index - 1].order;
            sortedLayers[index].setOrder(belowOrder);
            sortedLayers[index - 1].setOrder(currentOrder);
        });
    }
    moveToTop(id) {
        this.#reorderLayer(id, (sortedLayers, index) => {
            if (index === sortedLayers.length - 1)
                return false;
            const topOrder = sortedLayers[sortedLayers.length - 1].order;
            sortedLayers[index].setOrder(topOrder + 1);
        });
    }
    moveToBottom(id) {
        this.#reorderLayer(id, (sortedLayers, index) => {
            if (index === 0)
                return false;
            const bottomOrder = sortedLayers[0].order;
            sortedLayers[index].setOrder(bottomOrder - 1);
        });
    }
    moveAfter(id, targetId) {
        this.#reorderLayer(id, (sortedLayers, index) => {
            const targetIndex = sortedLayers.findIndex((l) => l.id === targetId);
            if (targetIndex === -1 || targetIndex === index)
                return false;
            const targetOrder = sortedLayers[targetIndex].order;
            const newOrder = targetIndex > 0 ? (targetOrder + sortedLayers[targetIndex - 1].order) / 2 : targetOrder - 1;
            sortedLayers[index].setOrder(newOrder);
        });
    }
    moveBefore(id, targetId) {
        this.#reorderLayer(id, (sortedLayers, index) => {
            const targetIndex = sortedLayers.findIndex((l) => l.id === targetId);
            if (targetIndex === -1 || targetIndex === index)
                return false;
            const targetOrder = sortedLayers[targetIndex].order;
            const newOrder = targetIndex < sortedLayers.length - 1
                ? (targetOrder + sortedLayers[targetIndex + 1].order) / 2
                : targetOrder + 1;
            sortedLayers[index].setOrder(newOrder);
        });
    }
    #reorderLayer(id, reorderFn) {
        const sortedLayers = this.getAll();
        const index = sortedLayers.findIndex((l) => l.id === id);
        if (index === -1)
            return;
        const result = reorderFn(sortedLayers, index);
        if (result !== false) {
            this.appManager.stage.sortChildren();
        }
    }
    bulkUpdate(updates) {
        updates.forEach(({ id, data }) => this.update(id, data));
    }
    bulkDelete(ids) {
        ids.forEach((id) => this.delete(id));
    }
    hide(id) {
        this.update(id, { visible: false });
    }
    show(id) {
        this.update(id, { visible: true });
    }
    toggle(id) {
        const layer = this.get(id);
        if (layer) {
            this.update(id, { visible: !layer.visible });
        }
    }
    filter(predicate) {
        return this.getAll().filter(predicate);
    }
}
