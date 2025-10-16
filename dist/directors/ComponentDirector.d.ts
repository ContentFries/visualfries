import type { IComponentBuilder, ComponentData } from '..';
import { StateManager } from '../managers/StateManager.svelte.js';
export declare class ComponentDirector {
    private builder;
    private data;
    private sceneState;
    constructor(cradle: {
        stateManager: StateManager;
    });
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
