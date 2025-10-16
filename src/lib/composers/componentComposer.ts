import { merge } from 'lodash-es';
import {
	type Component,
	type ComponentInput,
	ComponentShape,
	type AnimationInput,
	type AppearanceInput
} from '$lib'; 

import type { ComponentEffect, ComponentSourceInput } from '$lib';

/**
 * A fluent composer for a single Component object.
 */
class ComponentComposer {
	private readonly _component: ComponentInput;

	constructor(id: string, type: ComponentInput['type'], timeline: ComponentInput['timeline']) {
		this._component = {
			id,
			type,
			timeline,
			name: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
			// Appearance is initialized as an empty object and built up
			appearance: {} as AppearanceInput
		} as ComponentInput;
	}

	/**
	 * Deeply merges new appearance settings into the existing ones using lodash.
	 * Allows for updating nested properties like `text.color` without overwriting the whole `text` object.
	 * @param appearance A partial object of appearance settings to merge.
	 * @returns The ComponentComposer instance for further chaining.
	 */
	public setAppearance(appearance: Partial<AppearanceInput>): this {
		// Use lodash's merge for a robust deep merge.
		// It mutates the first argument, which is exactly what we want here.
		merge(this._component.appearance, appearance);
		return this;
	}

	public setText(text: string): this {
		if (this._component.type === 'TEXT') {
			this._component.text = text;
		}
		return this;
	}

	public setSource(source: Partial<ComponentSourceInput>): this {
		if (
			this._component.type === 'IMAGE' ||
			this._component.type === 'GIF' ||
			this._component.type === 'VIDEO' ||
			this._component.type === 'SUBTITLES'
		) {
			this._component.source = source;
		}
		return this;
	}

	/**
	 * Adds an animation to the component's animation list.
	 * @param animation The animation object to add.
	 * @returns The ComponentComposer instance for further chaining.
	 */
	public addAnimation(animation: AnimationInput): this {
		if (!this._component.animations) this._component.animations = { enabled: true, list: [] };
		if (!this._component.animations.list) this._component.animations.list = [];
		this._component.animations.list.push(animation);
		return this;
	}

	/**
	 * Adds an effect to the component's effects map.
	 * @param key A unique key for the effect (e.g., "mainBlur", "layoutSplit").
	 * @param effect The effect object.
	 * @returns The ComponentComposer instance for further chaining.
	 */
	public addEffect(key: string, effect: ComponentEffect): this {
		if (!this._component.effects) this._component.effects = { enabled: true, map: {} };
		if (!this._component.effects.map) this._component.effects.map = {};
		(this._component.effects.map as Record<string, ComponentEffect>)[key] = effect;
		return this;
	}

	/**
	 * Sets extra properties on the component (e.g., `text`, `source`, `shape`).
	 * @param props A partial object of component properties to merge.
	 * @returns The ComponentComposer instance for further chaining.
	 */
	public setProps(props: Partial<ComponentInput>): this {
		Object.assign(this._component, props);
		return this;
	}

	public setName(name: string): this {
		this._component.name = name;
		return this;
	}

	public setOrder(order: number): this {
		this._component.order = order;
		return this;
	}

	public setVisible(visible: boolean): this {
		this._component.visible = visible;
		return this;
	}

	/**
	 * Validates and finalizes the component object.
	 * @returns A fully formed and validated Component object.
	 */
	public compose(): Component {
		return ComponentShape.parse(this._component);
	}

	public safeCompose(): Component | undefined {
		const resp = ComponentShape.safeParse(this._component);
		if (!resp.success) {
			console.error('Invalid component input:', resp.error.format());
			return undefined;
		}
		return resp.data;
	}
}

/**
 * Factory function to create a new ComponentComposer.
 * @param id The component's unique ID.
 * @param type The component's type (e.g., 'TEXT', 'IMAGE').
 * @param timeline The component's timeline.
 * @returns A new instance of ComponentComposer.
 */
export function createComponentComposer(
	id: string,
	type: ComponentInput['type'],
	timeline: ComponentInput['timeline']
) {
	return new ComponentComposer(id, type, timeline);
}
