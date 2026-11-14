/** A canvas whose children are laid out and drawable, opted in with either attribute. */
export declare const DRAWABLE_CANVAS = "canvas[layoutsubtree],canvas[content=\"drawable\" i]";
/** Any other canvas: its children are fallback content. */
export declare const PLAIN_CANVAS = "canvas:not([layoutsubtree]):not([content=\"drawable\" i])";
/** Adds whichever of the two opt-in attributes the canvas lacks. */
export declare function optInCanvas(canvas: Element): void;
/** Opts `canvas` in and marks `element`, its child, as the element it draws. */
export declare function optInDrawing(canvas: Element, element: Element): void;
