import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import { Component } from '../components/Component.svelte.js';
import { ComponentDirector } from '../directors/ComponentDirector.js';
import { PixiComponentBuilder } from '../builders/PixiComponentBuilder.js';
import { ComponentState } from '../builders/_ComponentState.svelte.js';
import { asClass, asValue } from 'awilix/browser';
import { debounce } from 'lodash-es';
// import { builtTextComponentForSubtitle } from '../utils/subtitles.js';
export class ComponentsManager {
    components = $state(new Map());
    isBuilding = false;
    state;
    eventManager;
    layersManager;
    container;
    debouncedRefreshSubtitles;
    constructor(cradle) {
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
    initializeEventListeners() {
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
    isVisible(component) {
        const { currentTime, duration } = this.state;
        const startAt = component.props.timeline.startAt || 0;
        const endAt = component.props.timeline.endAt || duration;
        return currentTime >= startAt && currentTime <= endAt;
    }
    getAll() {
        return Array.from(this.components.values());
    }
    getMediaComponents() {
        return this.getAll().filter((component) => ['VIDEO', 'AUDIO'].includes(component.type));
    }
    #refreshComponent(component, refreshType = 'refresh') {
        component.refresh();
        if (refreshType != 'refresh') {
            component.refresh(refreshType);
        }
    }
    async update(componentId, data, refreshType = 'refresh') {
        const component = this.get(componentId);
        if (component) {
            await component.props.updateAppearance(data);
            // Only manually refresh if auto-refresh is not enabled
            if (!component.autoRefresh) {
                this.#refreshComponent(component, refreshType);
            }
        }
    }
    get(componentId) {
        return this.components.get(componentId);
    }
    delete(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            const layers = this.layersManager.getAll();
            const componentLayer = layers.find((layer) => layer.components.some((component) => component.id === componentId));
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
    async #buildComponent(componentData) {
        // this.container.registerInstance('ComponentData', componentData);
        // const director = this.container.resolve(ComponentDirector);
        // const builder = this.container.resolve(PixiComponentBuilder);
        const componentScope = this.container.createScope();
        // Register component-specific data in the scope
        componentScope.register({
            componentData: asValue(componentData),
            componentState: asClass(ComponentState)
        });
        const director = componentScope.resolve('componentDirector');
        const builder = componentScope.resolve('pixiComponentBuilder');
        director.setBuilder(builder);
        director.setComponentData(componentData);
        const component = director.constructAuto();
        await component.setup();
        await component.update();
        return component;
    }
    async create(componentData) {
        if (this.isBuilding) {
            throw new Error('Attempted to create multiple components simultaneously. Construct one at the time.');
        }
        this.isBuilding = true;
        let component = null;
        try {
            component = await this.#buildComponent(componentData);
            this.components.set(componentData.id, component);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            this.isBuilding = false;
        }
        return component;
    }
    setOrder(id, order) {
        this.#reorderComponent(id, (components, index) => {
            const [component] = components.splice(index, 1);
            components.splice(order, 0, component);
        });
    }
    moveUp(id) {
        this.#reorderComponent(id, (components, index) => {
            if (index <= 0)
                return false;
            [components[index - 1], components[index]] = [components[index], components[index - 1]];
        });
    }
    moveDown(id) {
        this.#reorderComponent(id, (components, index) => {
            if (index >= components.length - 1)
                return false;
            [components[index], components[index + 1]] = [components[index + 1], components[index]];
        });
    }
    moveToTop(id) {
        this.#reorderComponent(id, (components, index) => {
            if (index === 0)
                return false;
            const [component] = components.splice(index, 1);
            components.unshift(component);
        });
    }
    moveToBottom(id) {
        this.#reorderComponent(id, (components, index) => {
            if (index === components.length - 1)
                return false;
            const [component] = components.splice(index, 1);
            components.push(component);
        });
    }
    moveAfter(id, targetId) {
        this.#reorderComponent(id, (components, index) => {
            const targetIndex = components.findIndex((c) => c.id === targetId);
            if (targetIndex === -1)
                return false;
            const [component] = components.splice(index, 1);
            const newTargetIndex = components.findIndex((c) => c.id === targetId);
            components.splice(newTargetIndex + 1, 0, component);
        });
    }
    moveBefore(id, targetId) {
        this.#reorderComponent(id, (components, index) => {
            const targetIndex = components.findIndex((c) => c.id === targetId);
            if (targetIndex === -1)
                return false;
            const [component] = components.splice(index, 1);
            const newTargetIndex = components.findIndex((c) => c.id === targetId);
            components.splice(newTargetIndex, 0, component);
        });
    }
    #reorderComponent(id, reorderFn) {
        const layer = this.#findLayerByComponentId(id);
        if (!layer)
            return;
        const index = layer.components.findIndex((c) => c.id === id);
        if (index === -1)
            return;
        const result = reorderFn(layer.components, index);
        if (result !== false) {
            this.#updateDisplayOrder(layer);
        }
    }
    #findLayerByComponentId(componentId) {
        const layers = this.layersManager.getAll();
        return layers.find((layer) => layer.components.some((c) => c.id === componentId));
    }
    #updateDisplayOrder(layer) {
        const displayObject = layer.displayObject;
        if (!displayObject)
            return;
        // Sync displayObject children order with components array
        layer.components.forEach((component, index) => {
            if (component.displayObject) {
                displayObject.setChildIndex(component.displayObject, index);
            }
        });
    }
    bulkUpdate(updates) {
        updates.forEach(({ id, data }) => this.update(id, data));
    }
    bulkDelete(ids) {
        ids.forEach((id) => this.delete(id));
    }
    async hide(id) {
        const component = this.get(id);
        if (component) {
            await component.props.setVisible(false);
        }
    }
    async show(id) {
        const component = this.get(id);
        if (component) {
            await component.props.setVisible(true);
        }
    }
    async toggle(id) {
        const component = this.get(id);
        if (component) {
            await component.props.setVisible(!component.props.visible);
        }
    }
    filter(predicate) {
        return this.getAll().filter(predicate);
    }
    isComponentVisible(componentId) {
        const component = this.get(componentId);
        if (!component) {
            return false;
        }
        return this.isVisible(component);
    }
    destroy() {
        this.eventManager.removeEventListener('subtitleschange', this.debouncedRefreshSubtitles);
        this.debouncedRefreshSubtitles.cancel(); // Cancel any pending debounced calls
    }
}
