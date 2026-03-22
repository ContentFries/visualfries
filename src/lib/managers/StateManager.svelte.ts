import { EventManager } from './EventManager.js';
import type { BuilderState, EventPayload, IStateManager } from '$lib';
import type { RenderEnvironment, Scene as SceneData } from '$lib';
import { TimeManager } from './TimeManager.svelte.js';
import type { LayersManager } from './LayersManager.svelte.js';

type StateEvents = {
	changestate: { state: BuilderState; isPlaying: boolean };
	rerender: void;
	timeupdate: number;
};

type Zone = {
	start: number;
	end: number;
};

export class StateManager implements IStateManager {
	state: BuilderState = $state('paused');
	isPlaying = $state(false);
	renderAfterLoadingFinished = $state(false);
	private currentTimeRune = $state(0);
	scale = $state(1);
	private loadingComponents: Set<string> = $state(new Set());
	private currentSceneData: SceneData;
	private charactersList: string[] = [];
	private isDirtyFlag = true; // Tracks if visual updates occurred since last render

	private eventManager: EventManager;
	private env: RenderEnvironment;
	private loop = false;
	private timeManager: TimeManager;
	private layersManager: LayersManager;
	private disabledTimeZonesCache: Zone[] = [];
	private disabledTimeZonesCacheKey = '';

	constructor(cradle: {
		sceneData: SceneData; // SceneData
		environment: RenderEnvironment; // Environment
		scale: number; // Scale
		eventManager: EventManager;
		loop: boolean;
		timeManager: TimeManager;
		layersManager: LayersManager;
	}) {
		const sceneDataRune = $state(cradle.sceneData);
		this.currentSceneData = sceneDataRune;
		this.setScale(cradle.scale);

		this.eventManager = cradle.eventManager;
		this.env = cradle.environment;
		this.loop = cradle.loop ?? false;
		this.timeManager = cradle.timeManager;
		this.layersManager = cradle.layersManager;
		this.timeManager.updateTimeConfig(
			this.currentSceneData.settings.fps,
			this.currentSceneData.settings.duration
		);
	}

	updateSceneData(sceneData: Partial<SceneData>) {
		if (sceneData.layers) {
			this.currentSceneData.layers = sceneData.layers;
		}
	}

	updateSceneSubtitlesSettings(subtitlesSettings: SceneData['settings']['subtitles']) {
		this.currentSceneData.settings.subtitles = subtitlesSettings;
	}

	public get currentTime() {
		const clampedTime = Math.max(this.startTime, Math.min(this.currentTimeRune, this.endTime));
		return this.timeManager.getCurrentFrameTime(clampedTime, true);
	}

	public get data() {
		return this.currentSceneData;
	}

	public updateLayers() {
		this.currentSceneData.layers = this.layersManager.getData();
	}

	public get environment() {
		return this.env;
	}

	public getCharactersList() {
		return this.charactersList;
	}

	public setCharactersList(chars: string[]) {
		// remove duplicates
		chars = [...new Set(chars)];
		this.charactersList = chars;
	}

	public setScale(scale: number) {
		this.scale = scale;
	}

	public get startTime() {
		return this.data.settings.startAt || 0;
	}

	public get endTime() {
		return Math.min(this.data.settings.endAt || this.duration, this.duration);
	}

	public setCurrentTime(time: number) {
		const currentTime = Math.max(this.startTime, Math.min(time, this.endTime));

		this.currentTimeRune = currentTime;
		if (time >= this.endTime && this.isPlaying) {
			if (this.loop) {
				this.currentTimeRune = this.startTime;
			} else {
				this.changeState('paused');
			}
		}
	}

	public setStartAt(start: number | undefined) {
		if (start !== undefined) {
			this.data.settings.startAt = start <= 0 ? undefined : start;
		} else {
			this.data.settings.startAt = undefined;
		}
	}

	public setEndAt(end: number | undefined) {
		if (end !== undefined) {
			// TODO fix this because it causes bugs that shorten component duration
			this.data.settings.endAt =
				this.data.settings.endAt && end >= this.data.settings.endAt ? undefined : end;
		} else {
			this.data.settings.endAt = undefined;
		}
	}

	public get currentFrame() {
		const clampedTime = Math.max(this.startTime, Math.min(this.currentTimeRune, this.endTime));
		return this.timeManager.getFrameIndex(clampedTime, 'current', true);
	}

	public get disabledTimeZones(): Zone[] {
		const start = this.data.settings.startAt;
		const end = this.data.settings.endAt;
		const excludedTimestamps = this.data.settings.trimZones ?? [];
		const duration = this.data.settings.duration;
		const cacheKey = [
			start ?? '',
			end ?? '',
			duration,
			excludedTimestamps.map((zone) => `${zone.start}:${zone.end}`).join('|')
		].join('::');

		if (cacheKey === this.disabledTimeZonesCacheKey) {
			return this.disabledTimeZonesCache;
		}

		const output: Zone[] = [];

		if (start && start > 0) {
			output.push({
				start: 0,
				end: start
			});
		}

		if (excludedTimestamps.length) {
			for (const disabledZone of excludedTimestamps) {
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

		output.sort((a, b) => a.start - b.start);

		const mergedZones: Zone[] = [];
		let currentZone: Zone | null = null;

		for (const zone of output) {
			if (!currentZone) {
				currentZone = { ...zone };
			} else if (zone.start <= currentZone.end) {
				currentZone.end = Math.max(currentZone.end, zone.end);
			} else {
				mergedZones.push(currentZone);
				currentZone = { ...zone };
			}
		}

		if (currentZone) {
			mergedZones.push(currentZone);
		}

		this.disabledTimeZonesCacheKey = cacheKey;
		this.disabledTimeZonesCache = mergedZones;
		return this.disabledTimeZonesCache;
	}

	public changeState(updateState: 'playing' | 'paused'): void {
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

	private determineNewState(requestedState: 'playing' | 'paused'): BuilderState {
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

	transformTime(time: number, skipDurationCheck = false): number {
		return this.timeManager.transformTime(time, skipDurationCheck);
	}

	private updatePlayingState(newState: BuilderState): void {
		if (newState === 'playing') {
			this.isPlaying = true;
		} else if (newState === 'paused' || newState === 'ended') {
			this.isPlaying = false;
		}
		this.state = newState;
	}

	private emitStateChange(newState: BuilderState): void {
		this.emit('changestate', { state: newState, isPlaying: this.isPlaying });

		if (this.renderAfterLoadingFinished && newState !== 'loading') {
			this.renderAfterLoadingFinished = false;
			this.emit('rerender');
		}
	}

	private emit<T extends keyof StateEvents>(event: T, props?: EventPayload<T>) {
		if (!this.eventManager) {
			return;
		}

		this.eventManager.emit(event, props);
	}

	private refreshState() {
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

	public setDuration(dur: number) {
		this.data.settings.duration = dur;
	}

	public setWidth(width: number) {
		this.data.settings.width = width;
	}

	public setHeight(height: number) {
		this.data.settings.height = height;
	}

	public setRenderAfterLoadingFinished(newVal: boolean) {
		this.renderAfterLoadingFinished = newVal;
	}

	public addLoadingComponent(componentId: string, type?: string) {
		if (this.loadingComponents.has(componentId)) return;

		this.loadingComponents.add(componentId);
		this.refreshState();
	}

	public removeLoadingComponent(componentId: string) {
		if (!this.loadingComponents.has(componentId)) return;

		this.loadingComponents.delete(componentId);
		if (this.loadingComponents.size === 0) {
			this.refreshState();
		}
	}

	isLoadingComponent(componentId: string) {
		return this.loadingComponents.has(componentId);
	}

	/**
	 * Mark scene as dirty (visual changes occurred)
	 * Should be called by hooks/components after visual updates
	 */
	public markDirty(): void {
		this.isDirtyFlag = true;
	}

	/**
	 * Clear dirty flag after successful render
	 * Should be called by RenderFrameCommand after frame extraction
	 */
	public clearDirty(): void {
		this.isDirtyFlag = false;
	}

	/**
	 * Check if scene has visual changes since last render
	 */
	public get isDirty(): boolean {
		return this.isDirtyFlag;
	}

	destroy() {
		this.loadingComponents.clear();
	}
}
