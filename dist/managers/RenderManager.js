import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import { AppManager } from './AppManager.svelte.js';
import { LayersManager } from './LayersManager.svelte.js';
import { shouldPrepareMediaAtTime } from '../utils/mediaWindow.js';
import { isTimeWithinTimeline } from '../utils/timelineWindow.js';
export class RenderManager {
    state;
    componentsManager;
    eventManager;
    appManager;
    layersManager;
    // Track last prepared/visible state so media hooks get one final update to release resources.
    lastActiveById = new Map();
    lastRenderTime = -1;
    renderInFlight = null;
    rerenderRequested = false;
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
        if (this.renderInFlight) {
            this.rerenderRequested = true;
            return this.renderInFlight;
        }
        this.renderInFlight = this.#drainRenderQueue();
        return this.renderInFlight;
    }
    async #drainRenderQueue() {
        try {
            do {
                this.rerenderRequested = false;
                await this.#renderOnce();
            } while (this.rerenderRequested);
        }
        finally {
            this.renderInFlight = null;
        }
    }
    async #renderOnce() {
        const components = this.componentsManager.getAll();
        const currentTime = this.state.currentTime;
        const entries = components.map((component) => {
            const startAt = component.props.timeline.startAt ?? 0;
            const endAt = component.props.timeline.endAt ?? this.state.duration;
            const isVisibleByTime = isTimeWithinTimeline(currentTime, startAt, endAt);
            const isExplicitlyVisible = component.props.visible !== false;
            const shouldBeVisible = isVisibleByTime && isExplicitlyVisible;
            const shouldPrepareMedia = component.type === 'VIDEO' || component.type === 'AUDIO'
                ? shouldPrepareMediaAtTime({
                    type: component.type,
                    visible: component.props.visible,
                    timeline: component.props.timeline,
                    source: { url: component.props.sourceUrl }
                }, currentTime)
                : false;
            const wasVisible = this.lastActiveById.get(component.id) === true;
            return { component, shouldBeVisible, shouldPrepareMedia, wasVisible };
        });
        const toUpdate = entries
            .filter((e) => e.shouldBeVisible || e.wasVisible || e.shouldPrepareMedia)
            .map((e) => e.component);
        await Promise.all(toUpdate.map((component) => component.update()));
        // Keep one extra tick after the warm window ends so media hooks can release pooled resources.
        for (const e of entries) {
            this.lastActiveById.set(e.component.id, e.shouldBeVisible || e.shouldPrepareMedia);
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
