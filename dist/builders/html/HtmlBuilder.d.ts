/**
 * Represents a flexible way to define HTML element styles.
 * It uses Partial<CSSStyleDeclaration> for known CSS properties
 * and allows any string key for custom properties or less common ones.
 */
export type HtmlElementStyle = Omit<Partial<CSSStyleDeclaration>, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'> & Record<string, string | number | undefined>;
/**
 * Configuration for the wrapper HTML element.
 */
export interface WrapperConfig {
    id?: string;
    style?: HtmlElementStyle;
}
/**
 * Configuration for the inner HTML element.
 */
export interface ElementConfig {
    id?: string;
    classList?: string[];
    dir?: 'auto' | 'ltr' | 'rtl';
    innerHTML?: string;
    innerText?: string;
    style?: HtmlElementStyle;
}
export declare class HtmlBuilder {
    private wrapper;
    private element;
    private document;
    constructor(document: Document);
    private applyDefaultWrapperStyles;
    private applyDefaultElementStyles;
    /**
     * Configures the wrapper element.
     */
    withWrapper(config: WrapperConfig): HtmlBuilder;
    /**
     * Configures the inner element.
     */
    withElement(config: ElementConfig): HtmlBuilder;
    /**
     * Builds and returns the wrapper and inner HTML elements.
     * Ensures the inner element is a child of the wrapper.
     */
    build(): {
        wrapper: HTMLElement;
        element: HTMLElement;
    };
    /**
     * Builds the elements and extracts inline styles to document-level CSS rules.
     * Returns the elements with their inline styles converted to CSS classes.
     */
    buildAndExtractStyles(): {
        wrapper: HTMLElement;
        element: HTMLElement;
    };
    /**
     * Extracts inline styles from an element and registers them as CSS rules in the document.
     * Clears the inline styles after extraction.
     * Special handling for -webkit-text-stroke properties which are registered to ::before pseudo-element.
     */
    private extractAndRegisterStyles;
    /**
     * Adds a CSS rule to the document's head or creates a style element if needed.
     */
    private addStyleToDocument;
}
