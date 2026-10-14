/**
 * Finds attribute values a block computed from broken math: `NaN`, `undefined`, `Infinity` in
 * inline styles, transforms and SVG geometry. A shadowed variable that turns every polygon's
 * `points` into `NaN,NaN` renders nothing and throws nothing; `visualfries check` reports it.
 */
export type BadValue = {
    path: string;
    attr: string;
    value: string;
};
export declare function findBadValues(root: Element, limit?: number): BadValue[];
