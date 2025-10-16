import type {
	Component,
	TextComponent,
	Appearance,
	TextAppearance,
	ComponentEffect
} from '$lib';
import { AppearanceStyleProcessor } from './processors/AppearanceStyleProcessor.js';
import { TextAppearanceStyleProcessor } from './processors/TextAppearanceStyleProcessor.js';
import { TextEffectsStyleProcessor } from './processors/TextEffectsStyleProcessor.js';
import type { StyleProcessor } from './StyleProcessor.js';
import { TextEffectPresetName } from './TextShadowBuilder.js';

// This type might be better placed in a shared types file or alongside StyleProcessor.ts
// For now, removing export as TextEffectsStyleProcessor defines it locally.
type ComponentEffectsMap = Record<string, any>;

interface ProcessorEntry<K> {
	name: string;
	instance: StyleProcessor<K>;
	getData: (component: Component) => K;
	condition?: (component: Component) => boolean; // Optional condition to run this processor
}

export class StyleBuilder {
	private component: Component;
	// Using an array of a more general ProcessorEntry type or a union if strictly typed
	private processors: Array<ProcessorEntry<any>>;
	private omitStyles: string[] = [];
	private onlyStyles: string[] = [];

	constructor(component: Component) {
		this.component = this.prepareComponent(component);

		this.processors = [
			{
				name: 'appearance',
				instance: new AppearanceStyleProcessor(),
				getData: (comp: Component): Appearance | undefined =>
					comp.appearance ? (comp.appearance as Appearance) : undefined
			},
			{
				name: 'textAppearance',
				instance: new TextAppearanceStyleProcessor(),
				getData: (comp: Component): TextAppearance | undefined => {
					if (comp.type === 'TEXT' || comp.type === 'SUBTITLES') {
						return (comp as TextComponent).appearance?.text;
					}
					return undefined;
				},
				condition: (comp) => comp.type === 'TEXT' || comp.type === 'SUBTITLES'
			},
			{
				name: 'textEffects',
				instance: new TextEffectsStyleProcessor(),
				getData: (comp: Component): ComponentEffectsMap | undefined => {
					if (comp.type === 'TEXT' || comp.type === 'SUBTITLES') {
						return (comp as TextComponent).effects?.map as ComponentEffectsMap | undefined;
					}
					return undefined;
				},
				condition: (comp) => comp.type === 'TEXT' || comp.type === 'SUBTITLES'
			}
		];
	}

	private prepareComponent(c: Component): Component {
		const component = { ...c };
		if (component.type === 'TEXT' || component.type === 'SUBTITLES') {
			const { appearance } = component;
			const textAppearance = appearance?.text;

			if (textAppearance?.shadow) {
				component.effects.map['textShadow'] = {
					preset: TextEffectPresetName.DEFAULT,
					enabled: textAppearance.shadow.enabled ? true : false,
					color:
						typeof textAppearance.color === 'string'
							? textAppearance.color
							: textAppearance.color.colors[0],
					size: textAppearance.shadow.size,
					blur: textAppearance.shadow.blur,
					type: 'textShadow'
				} as ComponentEffect;
			}

			if (textAppearance?.outline) {
				// TODO
				component.effects.map['textOutline'] = {
					preset: TextEffectPresetName.OUTLINE,
					enabled: textAppearance.outline.enabled ? true : false,
					size: textAppearance.outline.size,
					color: textAppearance.outline.color
				} as ComponentEffect;
			}

			return component as TextComponent;
		}
		return component;
	}

	public omit(keys: string[]): void {
		this.omitStyles = keys;
	}

	public only(keys: string[]): void {
		this.onlyStyles = keys;
	}

	public build(): Record<string, any> {
		const finalStyles: Record<string, any> = {};
		let processedSpecificLogic = false;

		for (const processorEntry of this.processors) {
			if (processorEntry.condition && !processorEntry.condition(this.component)) {
				continue; // Skip processor if condition not met
			}

			const dataForProcessor = processorEntry.getData(this.component);

			// Ensure data is not undefined if processor expects non-nullable, though current processors handle undefined.
			const partialStyles = processorEntry.instance.process(dataForProcessor);
			this._mergeStyles(finalStyles, partialStyles);

			// Track if specific (conditional) logic was run
			if (processorEntry.condition) {
				processedSpecificLogic = true;
			}
		}

		// If it's not a TEXT/SUBTITLES component and no specific logic was run (beyond base appearance)
		if (
			!processedSpecificLogic &&
			!(this.component.type === 'TEXT' || this.component.type === 'SUBTITLES')
		) {
			// Check if only the unconditional 'appearance' processor ran
			const ranProcessors = this.processors.filter(
				(p) => !p.condition || p.condition(this.component)
			);
			if (ranProcessors.length === 1 && ranProcessors[0].name === 'appearance') {
				console.warn(
					`StyleBuilder: Fallback styling for component type '${this.component.type}'. Only base appearance processed.`
				);
			}
		}

		// Remove the omitted styles from the final styles
		this.omitStyles.forEach((key) => {
			delete finalStyles[key];
		});

		if (this.onlyStyles.length > 0) {
			Object.keys(finalStyles).forEach((key) => {
				if (!this.onlyStyles.includes(key)) {
					delete finalStyles[key];
				}
			});
		}

		return finalStyles;
	}

	private _mergeStyles(targetStyles: Record<string, any>, sourceStyles: Record<string, any>): void {
		for (const [key, value] of Object.entries(sourceStyles)) {
			if (value === undefined || value === null) continue;

			if (key === 'textShadow') {
				targetStyles[key] = targetStyles[key] ? `${targetStyles[key]}, ${value}` : value;
			} else if (key === 'transform') {
				// Ensure space separation for multiple transform functions
				targetStyles[key] = targetStyles[key] ? `${targetStyles[key]} ${value}` : value;
			} else {
				targetStyles[key] = value; // Default: overwrite
			}
		}
	}
}
