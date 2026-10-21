/**
 * Finds attribute values a block computed from broken math: `NaN`, `undefined`, `Infinity` in
 * SVG geometry and transforms, and in `style` attributes written as raw strings. A shadowed
 * variable that turns every polygon's `points` into `NaN,NaN` renders nothing and throws nothing;
 * `visualfries check` reports it. Styles set through the DOM (as Svelte does) never keep an invalid
 * value, so they cannot be checked here.
 */
export type BadValue = {
    path: string;
    attr: string;
    value: string;
};
export declare function findBadValues(root: Element, limit?: number): BadValue[];
