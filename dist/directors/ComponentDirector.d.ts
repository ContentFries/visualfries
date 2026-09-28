import type { IComponentBuilder, ComponentData } from '../index.js';
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
    constructAuto(): import("../index.js").IComponent;
    constructVideo(): import("../index.js").IComponent;
    constructAudio(): import("../index.js").IComponent;
    constructImage(): import("../index.js").IComponent;
    constructGif(): import("../index.js").IComponent;
    constructShape(): import("../index.js").IComponent;
    constructFill(): import("../index.js").IComponent;
    constructSubtitle(): import("../index.js").IComponent;
    constructText(): import("../index.js").IComponent;
}
