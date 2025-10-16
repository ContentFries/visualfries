import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import type { MediaComponent, ResourceManager, IComponent, ComponentData, ComponentRefreshType } from '..';
import type { AppearanceInput } from '..';
import { Component } from '../components/Component.svelte.js';
import { type AwilixContainer } from 'awilix/browser';
import type { LayersManager } from './LayersManager.svelte.js';
export declare class ComponentsManager implements ResourceManager<IComponent, ComponentData, AppearanceInput> {
    #private;
    private components;
    private isBuilding;
    private state;
    private eventManager;
    private layersManager;
    private container;
    private debouncedRefreshSubtitles;
    constructor(cradle: {
        stateManager: StateManager;
        eventManager: EventManager;
        layersManager: LayersManager;
        container: AwilixContainer;
    });
    private initializeEventListeners;
    private isVisible;
    getAll(): IComponent[];
    getMediaComponents(): (Component & MediaComponent)[];
    update(componentId: string, data: Partial<AppearanceInput>, refreshType?: ComponentRefreshType): Promise<void>;
    get(componentId: string): IComponent | undefined;
    delete(componentId: string): void;
    create(componentData: ComponentData): Promise<IComponent | null>;
    setOrder(id: string, order: number): void;
    moveUp(id: string): void;
    moveDown(id: string): void;
    moveToTop(id: string): void;
    moveToBottom(id: string): void;
    moveAfter(id: string, targetId: string): void;
    moveBefore(id: string, targetId: string): void;
    bulkUpdate(updates: {
        id: string;
        data: Partial<AppearanceInput>;
    }[]): void;
    bulkDelete(ids: string[]): void;
    hide(id: string): Promise<void>;
    show(id: string): Promise<void>;
    toggle(id: string): Promise<void>;
    filter(predicate: (component: IComponent) => boolean): IComponent[];
    isComponentVisible(componentId: string): boolean;
    destroy(): void;
}
