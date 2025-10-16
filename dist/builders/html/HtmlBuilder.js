import { sanitizeElement } from '../../utils/html.js';
export class HtmlBuilder {
    wrapper;
    element;
    document;
    constructor(document) {
        this.document = document;
        this.wrapper = this.document.createElement('div');
        this.element = this.document.createElement('div');
        this.applyDefaultWrapperStyles();
        this.applyDefaultElementStyles();
    }
    applyDefaultWrapperStyles() {
        this.wrapper.style.position = 'absolute';
        this.wrapper.style.display = 'flex';
        // Consider if top/left should be default 0px if not using transform for positioning
        // this.wrapper.style.top = '0px';
        // this.wrapper.style.left = '0px';
    }
    applyDefaultElementStyles() {
        // The inner element is often positioned relative to the wrapper
        this.element.style.position = 'relative'; // Or 'absolute' with top/left 0 if preferred
        // this.element.style.display = 'flex';
        this.element.dir = 'auto';
        this.element.classList.add('con-el'); // Common class from your example
        // this.element.style.width = '100%'; // Often inner element spans full wrapper width
        // this.element.style.height = '100%'; // Often inner element spans full wrapper height
    }
    /**
     * Configures the wrapper element.
     */
    withWrapper(config) {
        if (config.id)
            this.wrapper.id = config.id;
        if (config.style) {
            Object.assign(this.wrapper.style, config.style);
        }
        return this;
    }
    /**
     * Configures the inner element.
     */
    withElement(config) {
        if (config.id)
            this.element.id = config.id;
        if (config.classList) {
            config.classList.forEach((cls) => {
                if (!this.element.classList.contains(cls)) {
                    // Avoid duplicates if con-el is passed again
                    this.element.classList.add(cls);
                }
            });
        }
        if (config.dir)
            this.element.dir = config.dir;
        // innerHTML takes precedence over innerText if both are provided
        if (config.innerHTML !== undefined) {
            this.element.innerHTML = config.innerHTML;
        }
        else if (config.innerText !== undefined) {
            this.element.innerText = config.innerText;
        }
        if (config.style) {
            Object.assign(this.element.style, config.style);
        }
        return this;
    }
    /**
     * Builds and returns the wrapper and inner HTML elements.
     * Ensures the inner element is a child of the wrapper.
     */
    build() {
        if (!this.wrapper.contains(this.element)) {
            this.wrapper.appendChild(this.element);
        }
        return {
            wrapper: sanitizeElement(this.wrapper),
            element: sanitizeElement(this.element)
        };
    }
    /**
     * Builds the elements and extracts inline styles to document-level CSS rules.
     * Returns the elements with their inline styles converted to CSS classes.
     */
    buildAndExtractStyles() {
        if (!this.wrapper.contains(this.element)) {
            this.wrapper.appendChild(this.element);
        }
        // Extract and register wrapper styles
        if (this.wrapper.id) {
            this.extractAndRegisterStyles(this.wrapper, this.wrapper.id);
        }
        // Extract and register element styles
        if (this.element.id) {
            this.extractAndRegisterStyles(this.element, this.element.id);
        }
        return { wrapper: this.wrapper, element: this.element };
    }
    /**
     * Extracts inline styles from an element and registers them as CSS rules in the document.
     * Clears the inline styles after extraction.
     * Special handling for -webkit-text-stroke properties which are registered to ::before pseudo-element.
     */
    extractAndRegisterStyles(element, elementId) {
        const inlineStyles = element.style;
        const regularStyleProperties = [];
        const beforeProperties = [];
        // Collect all inline style properties and separate webkit-text-stroke properties
        for (let i = 0; i < inlineStyles.length; i++) {
            const property = inlineStyles.item(i);
            const value = inlineStyles.getPropertyValue(property);
            if (value) {
                if (property.startsWith('-webkit-text-stroke')) {
                    beforeProperties.push(`${property}: ${value}`);
                }
                else {
                    regularStyleProperties.push(`${property}: ${value}`);
                }
            }
        }
        if (beforeProperties.length > 0) {
            beforeProperties.push(`color: transparent`);
            beforeProperties.push('content: "' + element.textContent + '"');
            beforeProperties.push('position: absolute');
            beforeProperties.push('top: 0');
            beforeProperties.push('left: 0');
            beforeProperties.push('paint-order: stroke');
        }
        // Register regular styles to the main element
        if (regularStyleProperties.length > 0) {
            const cssRule = `#${elementId} { ${regularStyleProperties.join('; ')} }`;
            this.addStyleToDocument(cssRule);
        }
        // Register webkit-text-stroke properties to ::before pseudo-element
        if (beforeProperties.length > 0) {
            const pseudoRule = `#${elementId}::before { ${beforeProperties.join('; ')} }`;
            this.addStyleToDocument(pseudoRule);
        }
        // Clear inline styles after extraction
        element.style.cssText = '';
    }
    /**
     * Adds a CSS rule to the document's head or creates a style element if needed.
     */
    addStyleToDocument(cssRule) {
        // Try to find existing style element for this builder
        let styleElement = this.document.getElementById('html-builder-styles');
        if (!styleElement) {
            // Create new style element if it doesn't exist
            styleElement = this.document.createElement('style');
            styleElement.id = 'html-builder-styles';
            styleElement.type = 'text/css';
            this.document.head.appendChild(styleElement);
        }
        // Add the CSS rule to the style element
        if (styleElement.sheet) {
            try {
                styleElement.sheet.insertRule(cssRule, styleElement.sheet.cssRules.length);
            }
            catch (error) {
                // Fallback: append as text content if insertRule fails
                console.warn('Failed to insert CSS rule, using fallback method:', error);
                styleElement.textContent += cssRule + '\n';
            }
        }
        else {
            // Fallback: append as text content
            styleElement.textContent += cssRule + '\n';
        }
    }
}
