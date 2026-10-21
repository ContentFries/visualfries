import { gsap } from 'gsap';
/**
 * Ease functions by name, parsed by GSAP ("expo.inOut", "back.out(1.8)", "none"). The engine
 * mixes the values; GSAP only shapes progress.
 */
const eases = new Map();
/** The ease named `name`, or null when GSAP does not know it. */
export function parseEase(name) {
    let fn = eases.get(name);
    if (!fn) {
        const parsed = gsap.parseEase(name);
        if (typeof parsed !== 'function')
            return null;
        fn = parsed;
        eases.set(name, fn);
    }
    return fn;
}
/** The ease named `name`; throws on a name GSAP does not know. */
export function easeOf(name) {
    const fn = parseEase(name);
    if (!fn)
        throw new Error(`Unknown ease "${name}".`);
    return fn;
}
