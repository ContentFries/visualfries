// Style layering. The style file schema (`StyleShape`) lives in project.ts.
import { StyleShape } from './project.js';
/**
 * Built-in styles. Each is an example of a good style, not a fixed set; for now they fill only
 * `energy`. Style names never reuse energy names.
 */
export const BUILTIN_STYLES = {
    solid: { name: 'solid', energy: 'balanced' },
    glass: { name: 'glass', energy: 'balanced' },
    clean: { name: 'clean', energy: 'calm' },
    editorial: { name: 'editorial', energy: 'calm' },
    kinetic: { name: 'kinetic', energy: 'punchy' },
    depth: { name: 'depth', energy: 'balanced' },
    brutal: { name: 'brutal', energy: 'punchy' }
};
export function isBuiltinStyle(name) {
    return Object.hasOwn(BUILTIN_STYLES, name);
}
/** Energy of a project without a style, or of a style chain that sets none. */
export const DEFAULT_ENERGY = 'balanced';
export const NEUTRAL_STYLE = {
    neutral: true,
    energy: DEFAULT_ENERGY,
    layers: []
};
const isPlain = (v) => !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype;
/** `over` on top of `base`: objects merge key by key, everything else (arrays too) replaces. */
export function mergeLayers(base, over) {
    const out = { ...base };
    for (const [key, value] of Object.entries(over)) {
        if (value === undefined)
            continue;
        out[key] = isPlain(value) && isPlain(out[key]) ? mergeLayers(out[key], value) : value;
    }
    return out;
}
/**
 * Resolve a style reference into one style: the built-in, then every `extends` layer, then the
 * project's own. A string is a built-in name or a style file.
 */
export function resolveStyle(spec, load) {
    const layers = [];
    const seen = new Set();
    let next = { ref: spec, from: null };
    while (next) {
        const { ref, from } = next;
        next = null;
        if (typeof ref === 'string' && isBuiltinStyle(ref)) {
            layers.push({ id: ref, style: BUILTIN_STYLES[ref] });
            break;
        }
        let id;
        let style;
        if (typeof ref === 'string') {
            const file = load(ref, from);
            id = file.id;
            if (seen.has(id))
                throw new Error(`Style "${id}" extends itself: ${[...layers.map((l) => l.id), id].join(' → ')}.`);
            const parsed = StyleShape.safeParse(file.data);
            if (!parsed.success)
                throw new Error(`Style "${id}": ${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`);
            style = parsed.data;
        }
        else {
            id = '(project)';
            style = ref;
        }
        seen.add(id);
        layers.push({ id, style });
        if (style.extends)
            next = { ref: style.extends, from: id === '(project)' ? null : id };
    }
    let merged = {};
    for (const layer of [...layers].reverse())
        merged = mergeLayers(merged, layer.style);
    delete merged.extends;
    return {
        ...merged,
        neutral: false,
        energy: merged.energy ?? DEFAULT_ENERGY,
        layers: layers.map((l) => l.id).reverse()
    };
}
