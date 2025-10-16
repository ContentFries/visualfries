import type { IComponent, IComponentContext, ComponentProps, IComponentHook, ComponentRefreshType, ComponentData } from '..';
import type { AppearanceInput } from '..';
import { ComponentContext } from './ComponentContext.svelte.js';
export declare class Component implements IComponent {
    #private;
    constructor(cradle: {
        componentState: ComponentProps;
        componentContext: ComponentContext;
    });
    get id(): string;
    get type(): "IMAGE" | "GIF" | "VIDEO" | "TEXT" | "SHAPE" | "AUDIO" | "COLOR" | "GRADIENT" | "SUBTITLES";
    get props(): ComponentProps;
    get displayObject(): import("pixi.js-legacy").Container<import("pixi.js-legacy").DisplayObject> | undefined;
    get context(): IComponentContext;
    get checksum(): string;
    get autoRefresh(): boolean;
    setAutoRefresh(enabled: boolean): Component;
    private maybeRefresh;
    addHook(hook: IComponentHook, priority?: number): void;
    setup(): Promise<void>;
    update(): Promise<void>;
    refresh(type?: ComponentRefreshType): Promise<void>;
    destroy(): Promise<void>;
    updateAppearance(appearance: Partial<AppearanceInput>): Promise<Component>;
    setStart(start: number): Component;
    setEnd(end: number): Component;
    updateText(text: string): Promise<Component>;
    setText(text: string): Promise<Component>;
    setVisible(visible: boolean): Promise<Component>;
    setOrder(order: number): Promise<Component>;
    onChange(callback: (changes: ComponentData) => void): () => void;
    onTimelineChange(callback: (time: number) => void): () => void;
}
