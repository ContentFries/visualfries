import {
	type SceneLayer,
	type SceneLayerInput,
	SceneLayerShape,
	type Component,
	type ComponentInput
} from '$lib'; // Adjust path as needed

/**
 * A fluent composer for a single SceneLayer object.
 */
class LayerComposer {
	private readonly _layer: SceneLayerInput;

	constructor(id: string) {
		this._layer = {
			id,
			components: []
		} as SceneLayerInput;
	}

	/**
	 * Adds a pre-composed component to the layer.
	 * @param component The final component object, typically from `componentComposer.compose()`.
	 * @returns The LayerComposer instance for further chaining.
	 */
	public addComponent(component: Component): this {
		if (!this._layer.components) {
			this._layer.components = [];
		}
		this._layer.components.push(component as ComponentInput);
		return this;
	}

	/**
	 * Sets the visibility of the layer.
	 * @param isVisible Whether the layer should be visible.
	 * @returns The LayerComposer instance for further chaining.
	 */
	public setVisible(isVisible: boolean): this {
		this._layer.visible = isVisible;
		return this;
	}

	/**
	 * Sets the stacking order of the layer. Higher numbers are on top.
	 * @param order The numerical order.
	 * @returns The LayerComposer instance for further chaining.
	 */
	public setOrder(order: number): this {
		this._layer.order = order;
		return this;
	}

	/**
	 * Sets the name of the layer.
	 * @param name The desired name.
	 * @returns The LayerComposer instance for further chaining.
	 */
	public setName(name: string): this {
		this._layer.name = name;
		return this;
	}

	public setMuted(muted: boolean): this {
		this._layer.muted = muted;
		return this;
	}

	/**
	 * Validates and finalizes the layer object.
	 * @returns A fully formed and validated SceneLayer object.
	 */
	public compose(): SceneLayer {
		return SceneLayerShape.parse(this._layer);
	}

	public safeCompose(): SceneLayer | undefined {
		const resp = SceneLayerShape.safeParse(this._layer);
		if (!resp.success) {
			console.error('Invalid layer input:', resp.error.format());
			return undefined;
		}
		return resp.data;
	}
}

/**
 * Factory function to create a new LayerComposer.
 * @param id The layer's unique ID.
 * @returns A new instance of LayerComposer.
 */
export function createLayerComposer(id: string) {
	return new LayerComposer(id);
}
