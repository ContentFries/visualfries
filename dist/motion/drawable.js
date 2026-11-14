// How a canvas opts in to HTML-in-Canvas, on Chromium before and after the API's rename.
//
// The explainer (github.com/WICG/html-in-canvas) first opted a canvas's children into layout with
// a boolean `layoutsubtree` attribute. In September 2026 it became `content="drawable"` on the
// canvas, and `drawElementImage` (and WebGL's `texElementSubImage2D`) also need a `drawable`
// attribute on the element they draw. Chromium 156 reads either canvas attribute; Chromium 158
// reads only `content="drawable"` and throws without `drawable` on the element. Setting both
// canvas attributes and `drawable` works on each.
/** A canvas whose children are laid out and drawable, opted in with either attribute. */
export const DRAWABLE_CANVAS = 'canvas[layoutsubtree],canvas[content="drawable" i]';
/** Any other canvas: its children are fallback content. */
export const PLAIN_CANVAS = 'canvas:not([layoutsubtree]):not([content="drawable" i])';
const CANVAS_ATTRIBUTES = [
    ['layoutsubtree', ''],
    ['content', 'drawable']
];
/** Adds whichever of the two opt-in attributes the canvas lacks. */
export function optInCanvas(canvas) {
    for (const [name, value] of CANVAS_ATTRIBUTES)
        if (!canvas.hasAttribute(name))
            canvas.setAttribute(name, value);
}
/** Opts `canvas` in and marks `element`, its child, as the element it draws. */
export function optInDrawing(canvas, element) {
    optInCanvas(canvas);
    element.setAttribute('drawable', '');
}
