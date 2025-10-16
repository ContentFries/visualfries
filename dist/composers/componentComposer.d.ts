import { type Component, type ComponentInput, type AnimationInput, type AppearanceInput } from '..';
import type { ComponentEffect, ComponentSourceInput } from '..';
/**
 * A fluent composer for a single Component object.
 */
declare class ComponentComposer {
    private readonly _component;
    constructor(id: string, type: ComponentInput['type'], timeline: ComponentInput['timeline']);
    /**
     * Deeply merges new appearance settings into the existing ones using lodash.
     * Allows for updating nested properties like `text.color` without overwriting the whole `text` object.
     * @param appearance A partial object of appearance settings to merge.
     * @returns The ComponentComposer instance for further chaining.
     */
    setAppearance(appearance: Partial<AppearanceInput>): this;
    setText(text: string): this;
    setSource(source: Partial<ComponentSourceInput>): this;
    /**
     * Adds an animation to the component's animation list.
     * @param animation The animation object to add.
     * @returns The ComponentComposer instance for further chaining.
     */
    addAnimation(animation: AnimationInput): this;
    /**
     * Adds an effect to the component's effects map.
     * @param key A unique key for the effect (e.g., "mainBlur", "layoutSplit").
     * @param effect The effect object.
     * @returns The ComponentComposer instance for further chaining.
     */
    addEffect(key: string, effect: ComponentEffect): this;
    /**
     * Sets extra properties on the component (e.g., `text`, `source`, `shape`).
     * @param props A partial object of component properties to merge.
     * @returns The ComponentComposer instance for further chaining.
     */
    setProps(props: Partial<ComponentInput>): this;
    setName(name: string): this;
    setOrder(order: number): this;
    setVisible(visible: boolean): this;
    /**
     * Validates and finalizes the component object.
     * @returns A fully formed and validated Component object.
     */
    compose(): Component;
    safeCompose(): Component | undefined;
}
/**
 * Factory function to create a new ComponentComposer.
 * @param id The component's unique ID.
 * @param type The component's type (e.g., 'TEXT', 'IMAGE').
 * @param timeline The component's timeline.
 * @returns A new instance of ComponentComposer.
 */
export declare function createComponentComposer(id: string, type: ComponentInput['type'], timeline: ComponentInput['timeline']): ComponentComposer;
export {};
