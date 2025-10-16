import type { Component } from '../..';
/**
 * Factory for creating the appropriate HTML builder based on component type.
 *
 * This factory simplifies the process of creating component-specific builders,
 * allowing hooks to easily get the right builder without needing to know which
 * concrete class to instantiate.
 */
export declare class HtmlBuilderFactory {
    /**
     * Creates the appropriate builder for a given component.
     *
     * @param component The component to create a builder for
     * @param document The document object to use for creating elements
     * @returns A builder capable of creating HTML elements for the component
     */
    static createBuilder(component: Component, document: Document): {
        build(): {
            wrapper: HTMLElement;
            element: HTMLElement;
        };
        buildAndExtractStyles(): {
            wrapper: HTMLElement;
            element: HTMLElement;
        };
    };
}
