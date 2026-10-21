/** The ease named `name`, or null when GSAP does not know it. */
export declare function parseEase(name: string): ((x: number) => number) | null;
/** The ease named `name`; throws on a name GSAP does not know. */
export declare function easeOf(name: string): (x: number) => number;
