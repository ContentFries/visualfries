import type { Component, TextComponent } from '$lib';
import { TextComponentHtmlBuilder } from './TextComponentHtmlBuilder.js';

/**
 * Factory for creating the appropriate HTML builder based on component type.
 *
 * This factory simplifies the process of creating component-specific builders,
 * allowing hooks to easily get the right builder without needing to know which
 * concrete class to instantiate.
 */
export class HtmlBuilderFactory {
	/**
	 * Creates the appropriate builder for a given component.
	 *
	 * @param component The component to create a builder for
	 * @param document The document object to use for creating elements
	 * @returns A builder capable of creating HTML elements for the component
	 */
	public static createBuilder(
		component: Component,
		document: Document
	): {
		build(): { wrapper: HTMLElement; element: HTMLElement };
		buildAndExtractStyles(): { wrapper: HTMLElement; element: HTMLElement };
	} {
		switch (component.type) {
			case 'TEXT':
				return new TextComponentHtmlBuilder(component as TextComponent, document);
			// Add cases for other component types as they're implemented
			// case 'SUBTITLES':
			//   return new SubtitleComponentHtmlBuilder(component as SubtitleComponent, document);
			// case 'SHAPE':
			//   return new ShapeComponentHtmlBuilder(component as ShapeComponent, document);
			default:
				throw new Error(`No HTML builder available for component type: ${component.type}`);
		}
	}
}
