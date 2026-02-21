import * as PIXI from 'pixi.js-legacy';
import { gsap } from 'gsap';

import type {
	Scene,
	SceneLayer,
	RenderEnvironment,
	SceneLayerInput,
	ComponentInput,
	Component as ComponentData,
	SceneSubtitlesSettings,
	FontType
} from '$lib';
import { ComponentShape } from '$lib';

import { buildCharactersListFromComponentsAndSubtitles, changeIdDeep } from './utils/utils.js';
import { loadFonts } from './utils/document.js';
import { discoverRequiredFontVariants } from './fonts/fontDiscovery.js';

import { CommandType } from './commands/CommandTypes.js';
import { CommandRunner } from './commands/CommandRunner.js';

import { StateManager } from './managers/StateManager.svelte.js';
import { TimelineManager } from './managers/TimelineManager.svelte.js';
import { EventManager } from './managers/EventManager.js';
import { DomManager } from './managers/DomManager.js';
import { AppManager } from './managers/AppManager.svelte.js';
import { ComponentsManager } from './managers/ComponentsManager.svelte.js';
import { v4 as uuidv4 } from 'uuid';

import type { EventMap, EventType, EventPayload, BuilderState, ISceneBuilder } from '$lib';
import type {
	DeterministicFrameProvider,
	DeterministicMediaConfig,
	DeterministicDiagnosticsReport,
	FrameImageEncodingOptions,
	RenderFrameRangeOptions,
	RenderFrameRangeSummary
} from '$lib';

import { MediaManager } from './managers/MediaManager.js';
import { DeterministicMediaManager } from './managers/DeterministicMediaManager.js';
import { LayersManager } from './managers/LayersManager.svelte.js';
import { SubtitlesManager } from './managers/SubtitlesManager.svelte.js';
import type { Component } from './components/Component.svelte.js';
import { removeContainer } from './DIContainer.js';

export class SceneBuilder implements ISceneBuilder {
	private initialized: boolean = false;
	private renderTicker!: () => void;

	private timelineManager: TimelineManager;
	private eventManager: EventManager;
	private domManager: DomManager;
	private appManager: AppManager;
	private layersManager: LayersManager;
	private componentsManager: ComponentsManager;
	private stateManager: StateManager;
	private commandRunner: CommandRunner;
	private mediaManager: MediaManager;
	private deterministicMediaManager: DeterministicMediaManager;
	private subtitlesManager: SubtitlesManager;
	private fonts: FontType[];

	// Replace constructor with cradle pattern
	constructor(cradle: {
		timelineManager: TimelineManager;
		eventManager: EventManager;
		domManager: DomManager;
		appManager: AppManager;
		layersManager: LayersManager;
		componentsManager: ComponentsManager;
		stateManager: StateManager;
		commandRunner: CommandRunner;
		mediaManager: MediaManager;
		deterministicMediaManager: DeterministicMediaManager;
		subtitlesManager: SubtitlesManager;
		fonts: FontType[];
	}) {
		this.timelineManager = cradle.timelineManager;
		this.eventManager = cradle.eventManager;
		this.domManager = cradle.domManager;
		this.appManager = cradle.appManager;
		this.layersManager = cradle.layersManager;
		this.componentsManager = cradle.componentsManager;
		this.stateManager = cradle.stateManager;
		this.commandRunner = cradle.commandRunner;
		this.mediaManager = cradle.mediaManager;
		this.deterministicMediaManager = cradle.deterministicMediaManager;
		this.subtitlesManager = cradle.subtitlesManager;
		this.fonts = cradle.fonts;

		// TODO - check scene is v2
		// SceneShape.parse(this.sceneData);
	}

	public get sceneData(): Scene {
		return this.stateManager.data;
	}

	public get environment(): RenderEnvironment {
		return this.stateManager.environment;
	}

	public get state(): BuilderState {
		return this.stateManager.state;
	}

	public get isPlaying(): boolean {
		return this.stateManager.isPlaying;
	}

	public get isLoading(): boolean {
		return this.stateManager.state === 'loading';
	}

	public get currentTime(): number {
		return this.stateManager.currentTime;
	}

	public get currentFrame(): number {
		return Math.round(this.stateManager.currentTime * this.fps);
	}

	public get duration(): number {
		return this.stateManager.duration;
	}

	public get progress(): number {
		// value between 0 - 1, 1 is compo
		return this.duration ? this.currentTime / this.duration : 0;
	}

	public get app(): PIXI.Application {
		return this.appManager.app;
	}

	public get timeline(): gsap.core.Timeline {
		return this.timelineManager.timeline;
	}

	public get fps(): number {
		return this.sceneData.settings.fps ?? 30;
	}

	// we should remove this later and inject domManager where needed instead
	public get htmlContainer() {
		return this.domManager.htmlContainer;
	}

	public get canvasContainer() {
		return this.domManager.canvas;
	}

	public get components() {
		return this.componentsManager;
	}

	public get layers() {
		return this.layersManager;
	}

	public get subtitles() {
		return this.subtitlesManager;
	}

	public get disabledTimeZones() {
		return this.stateManager.disabledTimeZones;
	}

	public addExcludedTimestamp(start: number, end: number) {
		this.stateManager.data.settings.trimZones = this.stateManager.data.settings?.trimZones || [];
		this.stateManager.data.settings.trimZones.push({
			start: this.stateManager.transformTime(start),
			end: this.stateManager.transformTime(end)
		});
	}

	public removeExcludedTimestampsBetween(start: number, end: number) {
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

		this.stateManager.data.settings.trimZones = this.stateManager.data.settings.trimZones.filter(
			({ start, end }) => {
				// Keep zones that are completely outside the removal range
				return end < transformedStart || start > transformedEnd;
			}
		);
	}

	public syncChanges() {
		this.stateManager.updateLayers();
	}

	setStartAt(start: number | undefined) {
		this.stateManager.setStartAt(start ? this.stateManager.transformTime(start) : undefined);
	}

	setEndAt(end: number | undefined) {
		this.stateManager.setEndAt(end ? this.stateManager.transformTime(end) : undefined);
	}

	markDirty() {
		this.stateManager.markDirty();
	}

	updateSubtitlesSettings(settings: Partial<SceneSubtitlesSettings>) {
		const currentSubtitlesSettincs = this.stateManager.data.settings.subtitles
			? this.stateManager.data.settings.subtitles
			: {
					punctuation: true
				};

		const newSettings = { ...currentSubtitlesSettincs, ...settings };
		this.stateManager.updateSceneSubtitlesSettings(newSettings);
		this.subtitlesManager.updateSettings(newSettings);
	}

	public dispatchEvent<T extends EventType>(event: T, props?: EventPayload<T>) {
		this.eventManager.emit(event, props);
	}

	public addEventListener<K extends keyof EventMap>(
		event: K,
		callback: (event: CustomEvent<EventMap[K]>) => void,
		options?: boolean | AddEventListenerOptions
	): void {
		this.eventManager.addEventListener(
			event,
			((e: Event) => callback(e as CustomEvent<EventMap[K]>)) as EventListener,
			options
		);
	}
	public removeEventListener<K extends keyof EventMap>(
		event: K,
		callback: (event: CustomEvent<EventMap[K]>) => void,
		options?: boolean | EventListenerOptions
	): void {
		this.eventManager.removeEventListener(
			event,
			((e: Event) => callback(e as CustomEvent<EventMap[K]>)) as EventListener,
			options
		);
	}

	private async run<T>(commandType: CommandType, props?: unknown): Promise<T> {
		return await this.commandRunner.run<T>(commandType, props);
	}

	private runSync<T>(commandType: CommandType, props?: unknown): T {
		return this.commandRunner.runSync<T>(commandType, props);
	}

	public scale(scale: number) {
		const clampedScale = Math.max(0.01, Math.min(scale, 2));
		this.appManager.scale(clampedScale);
		this.domManager.scale(clampedScale);
	}

	private async loadFonts(fonts: FontType[]) {
		const variants = discoverRequiredFontVariants(this.sceneData, fonts);
		return await loadFonts(fonts, variants);
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
		await this.loadFonts(this.fonts);

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

	private async buildSceneTree() {
		// Sort layers by order

		const sortedLayers = [...this.sceneData.layers].sort((a, b) => a.order - b.order);

		for (const layerData of sortedLayers) {
			await this.layersManager.create(layerData);
		}
	}

	async addLayer(layerInput: SceneLayerInput) {
		const layers = this.layersManager.getAll().sort((a, b) => b.order - a.order);
		const lastLayerOrder = layers.length ? layers[0].order : 0;

		const sceneLayer = {
			id: layerInput.id ?? uuidv4(),
			name: layerInput.name ?? 'Layer ' + (layers.length + 1),
			order: layerInput.order ?? lastLayerOrder + 1, // TODO - should probably go into the first layer
			components: layerInput.components ?? [],
			visible: layerInput.visible ?? true,
			muted: layerInput.muted ?? false
		} as SceneLayer;

		const layer = await this.layersManager.create(sceneLayer);

		this.eventManager.emit('layerschange');
		this.eventManager.emit('componentschange');
		return layer ? layer : undefined;
	}

	async addNewLayerWithComponents(components: ComponentInput[]) {
		const layers = this.layersManager.getAll().sort((a, b) => b.order - a.order);
		const lastLayerOrder = layers.length ? layers[0].order : 0;

		const layer = await this.layersManager.create({
			id: uuidv4(),
			name: 'Layer ' + (this.layersManager.getAll().length + 1),
			order: lastLayerOrder + 1,
			components: components as ComponentData[],
			visible: true,
			muted: false
		});

		this.eventManager.emit('layerschange');
		this.eventManager.emit('componentschange');
		return layer ? layer : undefined;
	}

	async addComponent(componentInput: ComponentInput) {
		// 1. Parse the input using the Zod schema
		const result = ComponentShape.safeParse(componentInput);

		// 2. Handle validation failure
		if (!result.success) {
			console.error('Invalid component input:', result.error.format());
			// Potentially emit an error event or throw
			return undefined;
		}

		// 3. Work with the validated and normalized data (result.data is type ComponentData)
		const validatedComponentData: ComponentData = result.data;

		// Pass the validated data
		const layer = await this.addNewLayerWithComponents([componentInput]);
		if (!layer) {
			// Handle layer creation failure if necessary
			return undefined;
		}

		// Return the validated data object
		return validatedComponentData;
	}

	async splitComponent(component: Component) {
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

		// Create clone of component data EXACTLY as it is
		const newData = changeIdDeep(component.props.getData());
		const cloneData: ComponentData = {
			...newData,
			id: uuidv4(), // Generate new ID for clone
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

	public async seek(time: number) {
		await this.run(CommandType.SEEK, { time });
	}

	public async replaceSourceOnTime(time: number, componentId: string, base64data: string) {
		await this.run(CommandType.REPLACE_SOURCE_ON_TIME, {
			time,
			componentId,
			base64data
		});
	}

	public setDeterministicFrameProvider(provider: DeterministicFrameProvider | null): void {
		this.deterministicMediaManager.setProvider(provider);
	}

	public getDeterministicFrameProvider(): DeterministicFrameProvider | null {
		return this.deterministicMediaManager.getProvider();
	}

	public getDeterministicMediaConfig(): DeterministicMediaConfig {
		return this.deterministicMediaManager.config;
	}

	public getDiagnosticsReport(): DeterministicDiagnosticsReport | null {
		return this.deterministicMediaManager.getDiagnosticsReport();
	}

	public async seekAndRenderFrame(
		time: number,
		target?: PIXI.DisplayObject | PIXI.RenderTexture,
		format = 'png',
		quality = 1,
		imageOptions?: FrameImageEncodingOptions
	): Promise<string | ArrayBuffer | Blob> {
		await this.seek(time);
		// In server mode SeekCommand performs awaited render preparation.
		// Keep client render behavior unchanged.
		if (this.environment !== 'server') {
			this.render();
		}
		const frame = await this.renderFrame(target, format, quality, imageOptions);
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
	public async isSceneDirty(time: number): Promise<boolean> {
		await this.seek(time);

		// In server mode seek already ran awaited render preparation, so read
		// dirty state after seek to capture deterministic frame changes.
		if (this.environment === 'server') {
			return this.stateManager.isDirty;
		}

		const wasDirty = this.stateManager.isDirty;
		this.render();
		return wasDirty || this.stateManager.isDirty;
	}

	public async renderFrame(
		target?: PIXI.DisplayObject | PIXI.RenderTexture,
		format = 'png',
		quality = 1,
		imageOptions?: FrameImageEncodingOptions
	): Promise<string | ArrayBuffer | Blob> {
		const frame = (await this.run(CommandType.RENDER_FRAME, {
			target,
			format,
			quality,
			imageFormat: imageOptions?.imageFormat,
			imageQuality: imageOptions?.imageQuality
		})) as
			| string
			| ArrayBuffer
			| Blob
			| null;
		if (!frame) {
			throw new Error('Rendering frame failed');
		}
		return frame;
	}

	public async renderFrameRange(options: RenderFrameRangeOptions): Promise<RenderFrameRangeSummary> {
		if (this.environment !== 'server') {
			throw new Error('renderFrameRange is only available in server environment');
		}

		const format = options.format ?? 'blob';
		const quality = options.quality ?? 1;
		const imageOptions = {
			imageFormat: options.imageFormat,
			imageQuality: options.imageQuality
		} as const;
		const skipDuplicates = options.skipDuplicates ?? false;
		const fromFrame = Math.max(0, Math.floor(options.fromFrame));
		const toFrame = Math.max(fromFrame, Math.floor(options.toFrame));

		let framesRendered = 0;
		let framesSkipped = 0;
		let aborted = false;
		let previousFrame: string | ArrayBuffer | Blob | null = null;
		let previousMimeType: string | undefined;

		for (let frameIndex = fromFrame; frameIndex < toFrame; frameIndex += 1) {
			if (options.signal?.aborted) {
				aborted = true;
				break;
			}

			let frame: string | ArrayBuffer | Blob;
			let isDuplicate = false;
			let mimeType: string | undefined;
			const frameTime = frameIndex / this.fps;

			if (skipDuplicates) {
				const isDirty = await this.isSceneDirty(frameTime);
				if (!isDirty && previousFrame) {
					frame = previousFrame;
					mimeType = previousMimeType;
					isDuplicate = true;
					framesSkipped += 1;
				} else {
					frame = await this.seekAndRenderFrame(
						frameTime,
						undefined,
						format,
						quality,
						imageOptions
					);
					previousFrame = frame;
				}
			} else {
				frame = await this.seekAndRenderFrame(frameTime, undefined, format, quality, imageOptions);
				previousFrame = frame;
			}

			if (!mimeType && frame instanceof Blob) {
				mimeType = frame.type || undefined;
			}
			if (!mimeType && format === 'blob') {
				const imageFormat = imageOptions.imageFormat ?? 'png';
				mimeType = imageFormat === 'jpg' || imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
			}
			if (!isDuplicate) {
				previousMimeType = mimeType;
			}

			let released = false;
			const release = () => {
				if (released) {
					return;
				}
				released = true;
			};

			await options.onFrame({
				frameIndex,
				frame,
				isDuplicate,
				mimeType,
				release
			});

			release();
			framesRendered += 1;
		}

		return {
			framesRendered,
			framesSkipped,
			aborted,
			diagnostics: this.getDiagnosticsReport()
		};
	}

	public log(message: string) {
		$effect.root(function () {
			$inspect(message);
		});
	}

	public play(changeState = true) {
		if (this.state === 'loading' || this.state === 'playing') {
			return;
		}

		if (changeState) {
			this.stateManager.changeState('playing');
		}

		this.timelineManager.play();
		gsap.ticker.add(this.renderTicker);
	}

	public pause(changeState = true) {
		if (changeState) {
			this.stateManager.changeState('paused');
		}

		this.timelineManager.pause();
		this.render();
		gsap.ticker.remove(this.renderTicker);
	}

	public setPlaybackRate(rate: number) {
		this.timeline.timeScale(rate);
	}

	public addLoadingComponent(componentId: string) {
		this.stateManager.addLoadingComponent(componentId);
	}

	public removeLoadingComponent(componentId: string) {
		this.stateManager.removeLoadingComponent(componentId);
	}

	public buildCharactersList() {
		this.stateManager.setCharactersList(
			buildCharactersListFromComponentsAndSubtitles(
				this.sceneData.layers,
				this.subtitles.getSubtitlesCharactersList()
			)
		);
	}

	public render() {
		const rendered = this.runSync<boolean | number>(CommandType.RENDER);
		if (rendered === false) {
			this.stateManager.setRenderAfterLoadingFinished(true);
		}

		if (this.stateManager.state === 'ended') {
			gsap.ticker.remove(this.renderTicker);
		}
	}

	public destroy() {
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
		void this.deterministicMediaManager.destroy();

		// Remove the container from the DI container cache
		removeContainer(this.sceneData.id);
	}
}
