import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import { AppManager } from './AppManager.svelte.js';
import { LayersManager } from './LayersManager.svelte.js';
export class RenderManager {
    state;
    componentsManager;
    eventManager;
    appManager;
    layersManager;
    // Track last visibility to ensure we run one more update to hide components that just became invisible
    lastActiveById = new Map();
    lastRenderTime = -1;
    constructor(cradle) {
        this.state = cradle.stateManager;
        this.componentsManager = cradle.componentsManager;
        this.eventManager = cradle.eventManager;
        this.appManager = cradle.appManager;
        this.layersManager = cradle.layersManager;
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        this.eventManager.on('beforerender', this.handleBeforeRender.bind(this));
        this.eventManager.on('timeupdate', this.render.bind(this));
        this.eventManager.on('rerender', this.render.bind(this));
        this.eventManager.on('changestate', (event) => {
            if (event.detail.state !== 'playing') {
                this.render();
            }
        });
    }
    async handleBeforeRender() { }
    #syncLayerDisplayObjects() {
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
    async render() {
        const components = this.componentsManager.getAll();
        const currentTime = this.state.currentTime;
        const entries = components.map((component) => {
            const startAt = component.props.timeline.startAt ?? 0;
            const endAt = component.props.timeline.endAt ?? this.state.duration;
            const isVisibleByTime = currentTime >= startAt && currentTime <= endAt;
            const isExplicitlyVisible = component.props.visible !== false;
            const shouldBeVisible = (isVisibleByTime && isExplicitlyVisible) || component.type === 'VIDEO';
            const wasVisible = this.lastActiveById.get(component.id) === true;
            return { component, shouldBeVisible, wasVisible };
        });
        const toUpdate = entries
            .filter((e) => e.shouldBeVisible || e.wasVisible)
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
    destroy() {
        this.eventManager.removeEventListener('beforerender', this.handleBeforeRender);
        this.eventManager.removeEventListener('timeupdate', this.render);
        this.eventManager.removeEventListener('rerender', this.render);
        this.eventManager.removeEventListener('changestate', this.render);
    }
}
