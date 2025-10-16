import type { Container, Texture, Sprite, Application, DisplayObject, RenderTexture, TextureSource } from 'pixi.js-legacy';
import { z } from 'zod';
import type { ComponentsManager } from '../../managers/ComponentsManager.svelte.js';
import type { LayersManager } from '../../managers/LayersManager.svelte.js';
import type { SubtitlesManager } from '../../managers/SubtitlesManager.svelte.js';
import type { EventManager } from '../../managers/EventManager.js';
import type { Component as SceneLayerComponent, ComponentBase, AppearanceInput, Scene, RenderEnvironment, ComponentInput, SceneLayerInput, SceneLayer, VideoComponentShape, ImageComponentShape, GifComponentShape, Subtitle } from '../..';
declare const SCENE_LAYER_COMPONENT_TYPE: readonly ["IMAGE", "GIF", "VIDEO", "TEXT", "SHAPE", "AUDIO", "COLOR", "GRADIENT", "SUBTITLES"];
export type SceneLayerComponentType = (typeof SCENE_LAYER_COMPONENT_TYPE)[number];
type MediaShape = z.infer<typeof VideoComponentShape>;
type ImageShape = z.infer<typeof ImageComponentShape>;
type GifShape = z.infer<typeof GifComponentShape>;
export type BuilderState = 'playing' | 'paused' | 'loading' | 'loading-done' | 'ended';
export interface StateEvents {
    changestate: {
        state: BuilderState;
        isPlaying: boolean;
    };
    rerender: void;
}
export interface TimelineEvents {
    timeupdate: number;
    seek: number;
}
export interface RenderEvents {
    beforerender: void;
    afterrender: void;
    render: void;
}
export interface PlaybackEvents {
    play: void;
    pause: void;
}
export interface LayerEvents {
    layerschange: void;
}
export interface ComponentEvents {
    componentschange: void;
    componentchange: ComponentData;
}
export interface SubtitlesEvents {
    subtitleschange: void;
    subtitlessettingschange: void;
    subtitlechange: {
        assetId: string;
        language: string;
        subtitleId: string;
        subtitle: Subtitle;
    };
    subtitlesplit: {
        assetId: string;
        language: string;
        subtitleId: string;
        subtitle: Subtitle;
        newSubtitle: Subtitle;
    };
    subtitlemerge: {
        assetId: string;
        language: string;
        targetSubtitle: Subtitle;
        sourceSubtitle: Subtitle;
        mergeTo: 'start' | 'end';
    };
    subtitledelete: {
        assetId: string;
        language: string;
        subtitleId: string;
    };
}
export type EventMap = StateEvents & TimelineEvents & RenderEvents & PlaybackEvents & LayerEvents & ComponentEvents & SubtitlesEvents;
export type EventType = keyof EventMap;
export type EventPayload<T extends EventType> = EventMap[T];
export interface MediaComponent {
    play: () => void;
    pause: () => void;
    seek: (time: number) => Promise<void>;
    autoSeek: () => Promise<void>;
}
export interface ResourceManager<T, D, F> {
    get(id: string): T | undefined;
    getAll(): T[];
    update(id: string, data: Partial<F>, refreshType?: ComponentRefreshType): void;
    delete(id: string): void;
    create(data: D): Promise<T | null>;
    setOrder(id: string, newOrder: number): void;
    moveUp(id: string): void;
    moveDown(id: string): void;
    moveToTop(id: string): void;
    moveToBottom(id: string): void;
    bulkUpdate(updates: Array<{
        id: string;
        data: Partial<F>;
    }>): void;
    bulkDelete(ids: string[]): void;
    hide(id: string): void;
    show(id: string): void;
    toggle(id: string): void;
    filter(predicate: (item: T) => boolean): T[];
}
export type ComponentData = SceneLayerComponent;
export type ComponentProps = ComponentBase & {
    checksum: string;
    duration: number;
    setStart(start: number): void;
    setEnd(end: number): void;
    getData(): ComponentData;
    update(data: Partial<AppearanceInput>): void;
    updateText(text: string): Promise<void>;
    updateAppearance(appearance: Partial<AppearanceInput>): Promise<void>;
    setVisible(visible: boolean): Promise<void>;
    setOrder(order: number): Promise<void>;
};
export interface PixiComponent {
    displayObject: Container;
}
export interface ComponentBuilder {
    getComponent(): Component;
    withMedia(): ComponentBuilder;
    withMediaSeeking(): ComponentBuilder;
    withVideoTexture(): ComponentBuilder;
    withSplitScreen(): ComponentBuilder;
    withHtmlText(): ComponentBuilder;
    withHtmlAnimation(): ComponentBuilder;
    withAnimation(): ComponentBuilder;
    withSubtitles(): ComponentBuilder;
    withDisplayObject(): ComponentBuilder;
    withTexture(): ComponentBuilder;
    withImage(): ComponentBuilder;
    withDisplayObject(): ComponentBuilder;
    withGif(): ComponentBuilder;
    withShape(): ComponentBuilder;
    withCanvasShape(): ComponentBuilder;
    withProgressShape(): ComponentBuilder;
    withHtmlToCanvasHook(): ComponentBuilder;
}
export interface Component {
    readonly id: string;
    readonly type: SceneLayerComponentType;
    readonly props: ComponentProps;
    readonly displayObject: Container | undefined;
    readonly checksum: string;
    readonly context: ComponentContext;
    readonly autoRefresh: boolean;
    setAutoRefresh(enabled: boolean): Component;
    addHook(hook: ComponentHook, priority?: number): void;
    setup(): void;
    update(): void;
    refresh(type?: ComponentRefreshType): void;
    destroy(): void;
    setStart(start: number): Component;
    setEnd(end: number): Component;
    updateAppearance(appearance: Partial<AppearanceInput>): Promise<Component>;
    updateText(text: string): Promise<Component>;
    setText(text: string): Promise<Component>;
    setVisible(visible: boolean): Promise<Component>;
    setOrder(order: number): Promise<Component>;
    onChange(callback: (changes: ComponentData) => void): () => void;
    onTimelineChange(callback: (time: number) => void): () => void;
}
export interface Layer {
    readonly id: string;
    readonly checksum: string;
    readonly displayObject: Container | undefined;
    components: Component[];
    name: string;
    order: number;
    visible?: boolean;
    update(layerData: Partial<SceneLayerInput>): void;
    addComponent(component: Component): void;
    removeComponent(component: Component): void;
    build(): Promise<void>;
    setOrder(order: number): void;
    getData(): SceneLayer;
    destroy(): void;
}
export interface ResourceTypes {
    videoElement: HTMLVideoElement | undefined;
    audioElement: HTMLAudioElement | undefined;
    imageElement: HTMLImageElement | undefined;
    pixiResource: TextureSource | undefined;
    pixiTexture: Texture | undefined;
    pixiSprite: Sprite | undefined;
    pixiContainer: Container | undefined;
    wrapperHtmlEl: HTMLElement | undefined;
    htmlEl: HTMLElement | undefined;
    animationTarget: HTMLElement | Container | undefined;
    animationData: Record<string, any> | undefined;
    pixiRenderObject: Container | undefined;
    htmlRenderObject: HTMLDivElement | undefined;
    mediaShape: MediaShape | undefined;
    imageShape: ImageShape | undefined;
    gifShape: GifShape | undefined;
}
export interface ComponentContext {
    id: string;
    type: string;
    data: ComponentData;
    contextData: ComponentData;
    eventManager: EventManager;
    isActive: boolean;
    currentComponentTime: number;
    componentTimelineTime?: number;
    sceneState: StateManager;
    disabled: boolean;
    progress: number;
    duration: number;
    resources: Map<keyof ResourceTypes, ResourceTypes[keyof ResourceTypes]>;
    setComponentProps(props: ComponentProps): void;
    updateContextData(data: ComponentData): void;
    resetContextData(): void;
    getResource<K extends keyof ResourceTypes>(type: K): ResourceTypes[K];
    setResource<K extends keyof ResourceTypes>(type: K, resource: ResourceTypes[K]): void;
    removeResource<K extends keyof ResourceTypes>(type: K): void;
    runHooks(handlers: ComponentHook[], type: HookType): Promise<void>;
    destroy(): void;
}
type Zone = {
    start: number;
    end: number;
};
export interface SceneBuilder {
    readonly sceneData: Scene;
    readonly environment: RenderEnvironment;
    readonly state: BuilderState;
    readonly isPlaying: boolean;
    readonly isLoading: boolean;
    readonly currentTime: number;
    readonly currentFrame: number;
    readonly duration: number;
    readonly progress: number;
    readonly app: Application;
    readonly timeline: gsap.core.Timeline;
    readonly fps: number;
    readonly layers: LayersManager;
    readonly components: ComponentsManager;
    readonly subtitles: SubtitlesManager;
    readonly htmlContainer: HTMLElement;
    readonly canvasContainer: HTMLElement;
    readonly disabledTimeZones: Zone[];
    syncChanges: () => void;
    addExcludedTimestamp(start: number, end: number): void;
    removeExcludedTimestampsBetween(start: number, end: number): void;
    setStartAt(start: number | undefined): void;
    setEndAt(end: number | undefined): void;
    dispatchEvent<T extends EventType>(event: T, props?: EventPayload<T>): void;
    addEventListener<K extends keyof EventMap>(event: K, callback: (event: CustomEvent<EventMap[K]>) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof EventMap>(event: K, callback: (event: CustomEvent<EventMap[K]>) => void, options?: boolean | AddEventListenerOptions): void;
    scale(scale: number): void;
    initialize(): Promise<void>;
    seek(time: number): Promise<void>;
    replaceSourceOnTime(time: number, componentId: string, base64data: string): Promise<void>;
    seekAndRenderFrame(time: number, target?: DisplayObject | RenderTexture, format?: string, quality?: number): Promise<string | ArrayBuffer | Blob>;
    isSceneDirty(time: number): Promise<boolean>;
    renderFrame(target?: DisplayObject | RenderTexture, format?: string, quality?: number): Promise<string | ArrayBuffer | Blob>;
    log(message: string): void;
    play(changeState?: boolean): void;
    pause(changeState?: boolean): void;
    setPlaybackRate(rate: number): void;
    addLoadingComponent(componentId: string): void;
    removeLoadingComponent(componentId: string): void;
    buildCharactersList(): void;
    render(): void;
    destroy(): void;
    addComponent(componentData: ComponentInput): Promise<ComponentData | undefined>;
    addLayer(layerInput: SceneLayerInput): Promise<Layer | undefined>;
    addNewLayerWithComponents(components: ComponentInput[]): Promise<Layer | undefined>;
    splitComponent(component: Component): Promise<boolean>;
}
export interface StateManager {
    state: BuilderState;
    isPlaying: boolean;
    renderAfterLoadingFinished: boolean;
    currentTime: number;
    currentFrame: number;
    duration: number;
    width: number;
    height: number;
    scale: number;
    setScale(scale: number): void;
    setCurrentTime(time: number): void;
    changeState(updateState: 'playing' | 'paused'): void;
    setDuration(dur: number): void;
    setRenderAfterLoadingFinished(newVal: boolean): void;
    addLoadingComponent(componentId: string): void;
    removeLoadingComponent(componentId: string): void;
    destroy(): void;
}
export type ComponentRefreshType = 'refresh' | 'refresh:content' | 'refresh:config' | 'refresh:metadata' | 'refresh:animation' | 'refresh:audio';
export type HookType = 'setup' | 'update' | 'destroy' | ComponentRefreshType;
export interface ComponentHook {
    types: HookType[];
    priority: number;
    handle(type: HookType, context: ComponentContext): Promise<void>;
}
export type HookHandler = () => Promise<void>;
export type HookHandlers = {
    [K in HookType]?: HookHandler;
};
export interface ComponentBuildStrategy {
    build(data: ComponentData): Component;
}
export type SplitScreenChunk = {
    group: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    component: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};
export type SplitScreen = {
    enabled: boolean;
    pieces: number;
    sceneWidth: number;
    sceneHeight: number;
    chunks: SplitScreenChunk[];
};
export {};
