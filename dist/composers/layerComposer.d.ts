import { type SceneLayer, type Component } from '..';
/**
 * A fluent composer for a single SceneLayer object.
 */
declare class LayerComposer {
    private readonly _layer;
    constructor(id: string);
    /**
     * Adds a pre-composed component to the layer.
     * @param component The final component object, typically from `componentComposer.compose()`.
     * @returns The LayerComposer instance for further chaining.
     */
    addComponent(component: Component): this;
    /**
     * Sets the visibility of the layer.
     * @param isVisible Whether the layer should be visible.
     * @returns The LayerComposer instance for further chaining.
     */
    setVisible(isVisible: boolean): this;
    /**
     * Sets the stacking order of the layer. Higher numbers are on top.
     * @param order The numerical order.
     * @returns The LayerComposer instance for further chaining.
     */
    setOrder(order: number): this;
    /**
     * Sets the name of the layer.
     * @param name The desired name.
     * @returns The LayerComposer instance for further chaining.
     */
    setName(name: string): this;
    setMuted(muted: boolean): this;
    /**
     * Validates and finalizes the layer object.
     * @returns A fully formed and validated SceneLayer object.
     */
    compose(): SceneLayer;
    safeCompose(): SceneLayer | undefined;
}
/**
 * Factory function to create a new LayerComposer.
 * @param id The layer's unique ID.
 * @returns A new instance of LayerComposer.
 */
export declare function createLayerComposer(id: string): LayerComposer;
export {};
