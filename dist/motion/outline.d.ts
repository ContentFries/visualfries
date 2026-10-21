export type OutlineMode = 'hollow' | 'filled';
export type OutlineOptions = {
    /** Thickness of the line, outside the letters: px, or a CSS length such as `"0.05em"`. */
    width: number | string;
    /** CSS colour of the line. */
    color: string;
    /**
     * `hollow` (default): only the line; the element's own text colour is not drawn.
     * `filled`: the line behind the element's text.
     */
    mode?: OutlineMode;
};
/** Id of the hollow-text filter for a colour; equal colours give the same id. */
export declare function outlineFilterId(color: string): string;
/** The `<filter>` element that turns red-fill, green-stroke text into a hollow outline. */
export declare function outlineFilterMarkup(color: string): string;
/**
 * Make sure the document has the hollow-text filter for a colour and return the CSS `filter`
 * value that applies it, e.g. `url(#vf-outline-1x2k3)`. Filters live in one hidden `<svg>` at
 * the end of `<body>`, shared by every clip on the page.
 */
export declare function outlineFilter(color: string, doc?: Document): string;
/**
 * CSS declarations that outline an element's text. `filled` needs no filter; `hollow` adds
 * its filter to `doc` and replaces the text colour.
 */
export declare function outlineStyle(options: OutlineOptions, doc?: Document): Record<string, string>;
/**
 * Svelte action: outline the element's text, e.g.
 * `<span use:outline={{ width: 6, color: '#fff' }}>AI</span>`.
 *
 * Hollow text sets the element's CSS `filter` and text colours: animate blur on a parent and
 * keep text-shadow off the element. Give inline elements `display: inline-block`.
 */
export declare function outline(node: HTMLElement, options: OutlineOptions): {
    update: (o: OutlineOptions) => void;
    destroy(): void;
};
