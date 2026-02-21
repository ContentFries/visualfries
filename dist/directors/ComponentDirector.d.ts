import type { IComponentBuilder, ComponentData } from '..';
import { StateManager } from '../managers/StateManager.svelte.js';
import { DeterministicMediaManager } from '../managers/DeterministicMediaManager.js';
export declare class ComponentDirector {
    private builder;
    private data;
    private sceneState;
    private deterministicMediaManager;
    constructor(cradle: {
        stateManager: StateManager;
        deterministicMediaManager: DeterministicMediaManager;
    });
    private get shouldUseDeterministicMedia();
    setBuilder(builder: IComponentBuilder): void;
    setComponentData(data: ComponentData): void;
    constructAuto(): import("..").IComponent;
    constructVideo(): import("..").IComponent;
    constructAudio(): import("..").IComponent;
    constructImage(): import("..").IComponent;
    constructGif(): import("..").IComponent;
    constructShape(): import("..").IComponent;
    constructSubtitle(): import("..").IComponent;
    constructText(): import("..").IComponent;
}
