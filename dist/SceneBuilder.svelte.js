import * as PIXI from 'pixi.js-legacy';
import { gsap } from 'gsap';
import { ComponentShape } from './';
import { buildCharactersListFromComponentsAndSubtitles, changeIdDeep } from './utils/utils.js';
import { loadFonts } from './utils/document.js';
import { CommandType } from './commands/CommandTypes.js';
import { CommandRunner } from './commands/CommandRunner.js';
import { StateManager } from './managers/StateManager.svelte.js';
import { TimelineManager } from './managers/TimelineManager.svelte.js';
import { EventManager } from './managers/EventManager.js';
import { DomManager } from './managers/DomManager.js';
import { AppManager } from './managers/AppManager.svelte.js';
import { ComponentsManager } from './managers/ComponentsManager.svelte.js';
import { v4 as uuidv4 } from 'uuid';
import { MediaManager } from './managers/MediaManager.js';
import { LayersManager } from './managers/LayersManager.svelte.js';
import { SubtitlesManager } from './managers/SubtitlesManager.svelte.js';
import { removeContainer } from './DIContainer.js';
export class SceneBuilder {
    initialized = false;
    renderTicker;
    timelineManager;
    eventManager;
    domManager;
    appManager;
    layersManager;
    componentsManager;
    stateManager;
    commandRunner;
    mediaManager;
    subtitlesManager;
    fonts;
    // Replace constructor with cradle pattern
    constructor(cradle) {
        this.timelineManager = cradle.timelineManager;
        this.eventManager = cradle.eventManager;
        this.domManager = cradle.domManager;
        this.appManager = cradle.appManager;
        this.layersManager = cradle.layersManager;
        this.componentsManager = cradle.componentsManager;
        this.stateManager = cradle.stateManager;
        this.commandRunner = cradle.commandRunner;
        this.mediaManager = cradle.mediaManager;
        this.subtitlesManager = cradle.subtitlesManager;
        this.fonts = cradle.fonts;
        // TODO - check scene is v2
        // SceneShape.parse(this.sceneData);
    }
    get sceneData() {
        return this.stateManager.data;
    }
    get environment() {
        return this.stateManager.environment;
    }
    get state() {
        return this.stateManager.state;
    }
    get isPlaying() {
        return this.stateManager.isPlaying;
    }
    get isLoading() {
        return this.stateManager.state === 'loading';
    }
    get currentTime() {
        return this.stateManager.currentTime;
    }
    get currentFrame() {
        return Math.round(this.stateManager.currentTime * this.fps);
    }
    get duration() {
        return this.stateManager.duration;
    }
    get progress() {
        // value between 0 - 1, 1 is compo
        return this.duration ? this.currentTime / this.duration : 0;
    }
    get app() {
        return this.appManager.app;
    }
    get timeline() {
        return this.timelineManager.timeline;
    }
    get fps() {
        return this.sceneData.settings.fps ?? 30;
    }
    // we should remove this later and inject domManager where needed instead
    get htmlContainer() {
        return this.domManager.htmlContainer;
    }
    get canvasContainer() {
        return this.domManager.canvas;
    }
    get components() {
        return this.componentsManager;
    }
    get layers() {
        return this.layersManager;
    }
    get subtitles() {
        return this.subtitlesManager;
    }
    get disabledTimeZones() {
        return this.stateManager.disabledTimeZones;
    }
    addExcludedTimestamp(start, end) {
        this.stateManager.data.settings.trimZones = this.stateManager.data.settings?.trimZones || [];
        this.stateManager.data.settings.trimZones.push({
            start: this.stateManager.transformTime(start),
            end: this.stateManager.transformTime(end)
        });
    }
    removeExcludedTimestampsBetween(start, end) {
        const transformedStart = this.stateManager.transformTime(start);
        const transformedEnd = this.stateManager.transformTime(end);
        if (transformedEnd === this.stateManager.startTime) {
            this.setStartAt(undefined);
        }
        if (transformedStart === this.stateManager.endTime) {
            this.setEndAt(undefined);
        }
        if (!this.stateManager.data.settings.trimZones) {
            return;
        }
        this.stateManager.data.settings.trimZones = this.stateManager.data.settings.trimZones.filter(({ start, end }) => {
            // Keep zones that are completely outside the removal range
            return end < transformedStart || start > transformedEnd;
        });
    }
    syncChanges() {
        this.stateManager.updateLayers();
    }
    setStartAt(start) {
        this.stateManager.setStartAt(start ? this.stateManager.transformTime(start) : undefined);
    }
    setEndAt(end) {
        this.stateManager.setEndAt(end ? this.stateManager.transformTime(end) : undefined);
    }
    updateSubtitlesSettings(settings) {
        const currentSubtitlesSettincs = this.stateManager.data.settings.subtitles
            ? this.stateManager.data.settings.subtitles
            : {
                punctuation: true
            };
        const newSettings = { ...currentSubtitlesSettincs, ...settings };
        this.stateManager.updateSceneSubtitlesSettings(newSettings);
        this.subtitlesManager.updateSettings(newSettings);
    }
    dispatchEvent(event, props) {
        this.eventManager.emit(event, props);
    }
    addEventListener(event, callback, options) {
        this.eventManager.addEventListener(event, ((e) => callback(e)), options);
    }
    removeEventListener(event, callback, options) {
        this.eventManager.removeEventListener(event, ((e) => callback(e)), options);
    }
    async run(commandType, props) {
        return await this.commandRunner.run(commandType, props);
    }
    runSync(commandType, props) {
        return this.commandRunner.runSync(commandType, props);
    }
    scale(scale) {
        const clampedScale = Math.max(0.01, Math.min(scale, 2));
        this.appManager.scale(clampedScale);
        this.domManager.scale(clampedScale);
    }
    async loadFonts(fonts) {
        return await loadFonts(fonts);
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        gsap.ticker.fps(this.fps);
        this.renderTicker = () => {
            this.render();
        };
        if (this.fonts.length > 0) {
            await this.loadFonts(this.fonts);
        }
        this.layersManager.setAppManager(this.appManager);
        await this.appManager.initialize();
        if (this.stateManager.scale !== 1) {
            this.scale(this.stateManager.scale);
        }
        await this.buildSceneTree();
        this.seek(0);
        this.render();
        this.eventManager.isReady = true;
        this.domManager.removeLoader();
    }
    async buildSceneTree() {
        // Sort layers by order
        const sortedLayers = [...this.sceneData.layers].sort((a, b) => a.order - b.order);
        for (const layerData of sortedLayers) {
            await this.layersManager.create(layerData);
        }
    }
    async addLayer(layerInput) {
        const layers = this.layersManager.getAll().sort((a, b) => b.order - a.order);
        const lastLayerOrder = layers.length ? layers[0].order : 0;
        const sceneLayer = {
            id: layerInput.id ?? uuidv4(),
            name: layerInput.name ?? 'Layer ' + (layers.length + 1),
            order: layerInput.order ?? lastLayerOrder + 1, // TODO - should probably go into the first layer
            components: layerInput.components ?? [],
            visible: layerInput.visible ?? true,
            muted: layerInput.muted ?? false
        };
        const layer = await this.layersManager.create(sceneLayer);
        this.eventManager.emit('layerschange');
        this.eventManager.emit('componentschange');
        return layer ? layer : undefined;
    }
    async addNewLayerWithComponents(components) {
        const layers = this.layersManager.getAll().sort((a, b) => b.order - a.order);
        const lastLayerOrder = layers.length ? layers[0].order : 0;
        const layer = await this.layersManager.create({
            id: uuidv4(),
            name: 'Layer ' + (this.layersManager.getAll().length + 1),
            order: lastLayerOrder + 1,
            components: components,
            visible: true,
            muted: false
        });
        this.eventManager.emit('layerschange');
        this.eventManager.emit('componentschange');
        return layer ? layer : undefined;
    }
    async addComponent(componentInput) {
        // 1. Parse the input using the Zod schema
        const result = ComponentShape.safeParse(componentInput);
        // 2. Handle validation failure
        if (!result.success) {
            console.error('Invalid component input:', result.error.format());
            // Potentially emit an error event or throw
            return undefined;
        }
        // 3. Work with the validated and normalized data (result.data is type ComponentData)
        const validatedComponentData = result.data;
        // Pass the validated data
        const layer = await this.addNewLayerWithComponents([componentInput]);
        if (!layer) {
            // Handle layer creation failure if necessary
            return undefined;
        }
        // Return the validated data object
        return validatedComponentData;
    }
    async splitComponent(component) {
        // Find the layer containing this component
        const compStart = component.props.timeline.startAt;
        const compEnd = component.props.timeline.endAt;
        const currentTime = this.currentTime;
        const isInTime = currentTime > compStart && currentTime < compEnd;
        if (!isInTime) {
            return false;
        }
        const layer = this.layers
            .getAll()
            .find((layer) => layer.components.some((comp) => comp.id === component.id));
        if (!layer) {
            return false;
        }
        // Create clone of component data with adjusted times
        const originalEndAt = component.props.timeline.endAt;
        const newData = changeIdDeep(component.props.getData());
        const cloneData = {
            ...newData,
            id: uuidv4(), // Generate new ID for clone
            timeline: {
                ...newData.timeline,
                endAt: originalEndAt
            },
            checksum: 'new-' + uuidv4()
        };
        // Update original component's end time
        component.props.setEnd(this.currentTime);
        // Add the cloned component to the same layer
        const newComponent = await this.componentsManager.create(cloneData);
        newComponent?.props.setStart(this.currentTime);
        if (newComponent) {
            layer.addComponent(newComponent);
        }
        this.dispatchEvent('componentschange');
        return true;
    }
    async seek(time) {
        await this.run(CommandType.SEEK, { time });
    }
    async replaceSourceOnTime(time, componentId, base64data) {
        await this.run(CommandType.REPLACE_SOURCE_ON_TIME, {
            time,
            componentId,
            base64data
        });
    }
    async seekAndRenderFrame(time, target, format = 'png', quality = 1) {
        await this.seek(time);
        // Ensure scene is rendered after seek so media hooks apply their updates
        this.render();
        const frame = await this.renderFrame(target, format, quality);
        return frame;
    }
    /**
     * Check if seeking to a specific time would result in visual changes
     * without actually extracting frame data.
     *
     * This is useful for determining if consecutive frames are identical,
     * allowing you to skip rendering and return cached frame data.
     *
     * @param time Time in seconds to check
     * @returns Promise<boolean> True if scene has visual changes at this time
     *
     * @example
     * // Check if frame needs re-rendering
     * const time = frame / sceneBuilder.fps;
     * const isDirty = await sceneBuilder.isSceneDirty(time);
     *
     * if (!isDirty && isConsecutiveFrame) {
     *   // Return cached frame - scene hasn't changed
     *   return cachedFrameData;
     * } else {
     *   // Render new frame - scene has changes
     *   return await sceneBuilder.seekAndRenderFrame(time);
     * }
     */
    async isSceneDirty(time) {
        // Seek to the specified time to trigger component/hook updates
        await this.seek(time);
        // Get current dirty state BEFORE calling render()
        // This prevents render() from clearing the dirty flag
        const wasDirty = this.stateManager.isDirty;
        // Render to update all display objects and let hooks detect changes
        // This triggers all hook updates but doesn't extract frame data
        this.render();
        // Return the dirty state we captured before render()
        // Don't clear the dirty flag - let actual frame extraction handle that
        return wasDirty;
    }
    async renderFrame(target, format = 'png', quality = 1) {
        const frame = (await this.run(CommandType.RENDER_FRAME, { target, format, quality }));
        if (!frame) {
            throw new Error('Rendering frame failed');
        }
        return frame;
    }
    log(message) {
        $effect.root(function () {
            $inspect(message);
        });
    }
    play(changeState = true) {
        if (this.state === 'loading' || this.state === 'playing') {
            return;
        }
        if (changeState) {
            this.stateManager.changeState('playing');
        }
        this.timelineManager.play();
        gsap.ticker.add(this.renderTicker);
    }
    pause(changeState = true) {
        if (changeState) {
            this.stateManager.changeState('paused');
        }
        this.timelineManager.pause();
        this.render();
        gsap.ticker.remove(this.renderTicker);
    }
    setPlaybackRate(rate) {
        this.timeline.timeScale(rate);
    }
    addLoadingComponent(componentId) {
        this.stateManager.addLoadingComponent(componentId);
    }
    removeLoadingComponent(componentId) {
        this.stateManager.removeLoadingComponent(componentId);
    }
    buildCharactersList() {
        this.stateManager.setCharactersList(buildCharactersListFromComponentsAndSubtitles(this.sceneData.layers, this.subtitles.getSubtitlesCharactersList()));
    }
    render() {
        const rendered = this.runSync(CommandType.RENDER);
        if (rendered === false) {
            this.stateManager.setRenderAfterLoadingFinished(true);
        }
        if (this.stateManager.state === 'ended') {
            gsap.ticker.remove(this.renderTicker);
        }
    }
    destroy() {
        // Stop the timeline and remove the render ticker
        gsap.ticker.remove(this.renderTicker);
        // Clear the components map
        this.initialized = false;
        this.appManager.destroy();
        this.domManager.destroy();
        this.stateManager.destroy();
        this.timelineManager.destroy();
        this.componentsManager.destroy();
        // media manages should be destroyed last
        this.mediaManager.destroy();
        // Remove the container from the DI container cache
        removeContainer(this.sceneData.id);
    }
}
