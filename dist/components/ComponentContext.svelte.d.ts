import { StateManager } from '../managers/StateManager.svelte.js';
import { EventManager } from '../managers/EventManager.js';
import type { IComponentContext, ComponentData, ResourceTypes, IComponentHook, HookType, ComponentProps } from '..';
export declare class ComponentContext implements IComponentContext {
    #private;
    disabled: boolean;
    resources: Map<keyof ResourceTypes, ResourceTypes[keyof ResourceTypes]>;
    private state;
    eventManager: EventManager;
    constructor(cradle: {
        stateManager: StateManager;
        eventManager: EventManager;
    });
    setComponentProps(props: ComponentProps): void;
    get duration(): number;
    get contextData(): ComponentData;
    get data(): ComponentData;
    get id(): string;
    get type(): "IMAGE" | "GIF" | "VIDEO" | "TEXT" | "SHAPE" | "AUDIO" | "COLOR" | "GRADIENT" | "SUBTITLES";
    get isActive(): boolean;
    get progress(): number;
    get currentComponentTime(): number;
    get componentTimelineTime(): number | undefined;
    get currentTime(): number;
    get sceneState(): StateManager;
    updateContextData(data: ComponentData): void;
    resetContextData(): void;
    getResource<K extends keyof ResourceTypes>(type: K): ResourceTypes[K] | undefined;
    setResource<K extends keyof ResourceTypes>(type: K, resource: ResourceTypes[K]): void;
    removeResource<K extends keyof ResourceTypes>(type: K): void;
    runHooks(hooks: IComponentHook[], type: HookType): Promise<void>;
    destroy(): void;
}
