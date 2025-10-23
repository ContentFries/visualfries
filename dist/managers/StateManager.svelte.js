import { EventManager } from './EventManager.js';
import { TimeManager } from './TimeManager.svelte.js';
export class StateManager {
    state = $state('paused');
    isPlaying = $state(false);
    renderAfterLoadingFinished = $state(false);
    currentTimeRune = $state(0);
    scale = $state(1);
    loadingComponents = $state(new Set());
    currentSceneData;
    charactersList = [];
    isDirtyFlag = true; // Tracks if visual updates occurred since last render
    eventManager;
    env;
    loop = false;
    timeManager;
    layersManager;
    constructor(cradle) {
        const sceneDataRune = $state(cradle.sceneData);
        this.currentSceneData = sceneDataRune;
        this.setScale(cradle.scale);
        this.eventManager = cradle.eventManager;
        this.env = cradle.environment;
        this.loop = cradle.loop ?? false;
        this.timeManager = cradle.timeManager;
        this.layersManager = cradle.layersManager;
        this.timeManager.updateTimeConfig(this.currentSceneData.settings.fps, this.currentSceneData.settings.duration);
    }
    updateSceneData(sceneData) {
        if (sceneData.layers) {
            this.currentSceneData.layers = sceneData.layers;
        }
    }
    updateSceneSubtitlesSettings(subtitlesSettings) {
        this.currentSceneData.settings.subtitles = subtitlesSettings;
    }
    get currentTime() {
        if (this.currentTimeRune >= this.endTime) {
            return this.endTime;
        }
        else if (this.currentTimeRune <= this.startTime) {
            return this.startTime;
        }
        // Could cache fps if it doesn't change frequently
        return this.timeManager.transformTime(this.currentTimeRune);
    }
    get data() {
        return this.currentSceneData;
    }
    updateLayers() {
        this.currentSceneData.layers = this.layersManager.getData();
    }
    get environment() {
        return this.env;
    }
    getCharactersList() {
        return this.charactersList;
    }
    setCharactersList(chars) {
        // remove duplicates
        chars = [...new Set(chars)];
        this.charactersList = chars;
    }
    setScale(scale) {
        this.scale = scale;
    }
    get startTime() {
        return this.data.settings.startAt || 0;
    }
    get endTime() {
        return Math.min(this.data.settings.endAt || this.duration, this.duration);
    }
    setCurrentTime(time) {
        const currentTime = this.timeManager.transformTime(Math.max(this.startTime, Math.min(time, this.endTime)));
        this.currentTimeRune = currentTime;
        if (time >= this.endTime && this.isPlaying) {
            if (this.loop) {
                this.currentTimeRune = this.startTime;
            }
            else {
                this.changeState('paused');
            }
        }
    }
    setStartAt(start) {
        if (start !== undefined) {
            this.data.settings.startAt = start <= 0 ? undefined : start;
        }
        else {
            this.data.settings.startAt = undefined;
        }
    }
    setEndAt(end) {
        if (end !== undefined) {
            // TODO fix this because it causes bugs that shorten component duration
            this.data.settings.endAt =
                this.data.settings.endAt && end >= this.data.settings.endAt ? undefined : end;
        }
        else {
            this.data.settings.endAt = undefined;
        }
    }
    get currentFrame() {
        return Math.round(this.currentTime * this.data.settings.fps);
    }
    get disabledTimeZones() {
        const start = $derived(this.data.settings.startAt);
        const end = $derived(this.data.settings.endAt);
        const excluded_timestamps = $derived(this.data.settings.trimZones);
        const duration = $derived(this.data.settings.duration);
        const zones = $derived.by(() => {
            const output = [];
            if (start && start > 0) {
                output.push({
                    start: 0,
                    end: start
                });
            }
            if (excluded_timestamps && excluded_timestamps.length) {
                for (const disabledZone of excluded_timestamps) {
                    const { start, end } = disabledZone;
                    if (end < duration) {
                        output.push({
                            start,
                            end
                        });
                    }
                }
            }
            if (end && end < duration) {
                output.push({
                    start: end,
                    end: duration
                });
            }
            // Sort zones by start time
            output.sort((a, b) => a.start - b.start);
            // Merge overlapping zones
            const mergedZones = [];
            let currentZone = null;
            for (const zone of output) {
                if (!currentZone) {
                    currentZone = { ...zone };
                }
                else if (zone.start <= currentZone.end) {
                    // Zones overlap, extend the current zone
                    currentZone.end = Math.max(currentZone.end, zone.end);
                }
                else {
                    // No overlap, push current zone and start a new one
                    mergedZones.push(currentZone);
                    currentZone = { ...zone };
                }
            }
            if (currentZone) {
                mergedZones.push(currentZone);
            }
            return mergedZones;
        });
        return zones;
    }
    changeState(updateState) {
        let newState = this.determineNewState(updateState);
        if (newState === 'ended' && this.loop) {
            newState = 'playing';
            this.setCurrentTime(this.startTime);
        }
        this.updatePlayingState(newState);
        this.emitStateChange(newState);
        // if (newState !== 'playing') {
        // 	this.mediaManager.stopMediaElements();
        // }
    }
    determineNewState(requestedState) {
        if (this.loadingComponents.size > 0) {
            return 'loading';
        }
        const t1 = this.transformTime(this.currentTime);
        const t2 = this.transformTime(this.endTime);
        if (t1 >= t2) {
            return 'ended';
        }
        return requestedState;
    }
    transformTime(time, skipDurationCheck = false) {
        return this.timeManager.transformTime(time, skipDurationCheck);
    }
    updatePlayingState(newState) {
        if (newState === 'playing') {
            this.isPlaying = true;
        }
        else if (newState === 'paused' || newState === 'ended') {
            this.isPlaying = false;
        }
        this.state = newState;
    }
    emitStateChange(newState) {
        this.emit('changestate', { state: newState, isPlaying: this.isPlaying });
        if (this.renderAfterLoadingFinished && newState !== 'loading') {
            this.renderAfterLoadingFinished = false;
            this.emit('rerender');
        }
    }
    emit(event, props) {
        if (!this.eventManager) {
            return;
        }
        this.eventManager.emit(event, props);
    }
    refreshState() {
        this.changeState(this.isPlaying ? 'playing' : 'paused');
    }
    get duration() {
        return this.data.settings.duration;
    }
    get width() {
        return this.data.settings.width;
    }
    get height() {
        return this.data.settings.height;
    }
    setDuration(dur) {
        this.data.settings.duration = dur;
    }
    setWidth(width) {
        this.data.settings.width = width;
    }
    setHeight(height) {
        this.data.settings.height = height;
    }
    setRenderAfterLoadingFinished(newVal) {
        this.renderAfterLoadingFinished = newVal;
    }
    addLoadingComponent(componentId, type) {
        if (this.loadingComponents.has(componentId))
            return;
        this.loadingComponents.add(componentId);
        this.refreshState();
    }
    removeLoadingComponent(componentId) {
        if (!this.loadingComponents.has(componentId))
            return;
        this.loadingComponents.delete(componentId);
        if (this.loadingComponents.size === 0) {
            this.refreshState();
        }
    }
    isLoadingComponent(componentId) {
        return this.loadingComponents.has(componentId);
    }
    /**
     * Mark scene as dirty (visual changes occurred)
     * Should be called by hooks/components after visual updates
     */
    markDirty() {
        this.isDirtyFlag = true;
    }
    /**
     * Clear dirty flag after successful render
     * Should be called by RenderFrameCommand after frame extraction
     */
    clearDirty() {
        this.isDirtyFlag = false;
    }
    /**
     * Check if scene has visual changes since last render
     */
    get isDirty() {
        return this.isDirtyFlag;
    }
    destroy() {
        this.loadingComponents.clear();
    }
}
