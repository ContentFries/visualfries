import { createTrack, resolveEase } from './interpolate.js';
/**
 * Keys of a shot or a clip as per-frame values: one track per property, built once per key list
 * and evaluated at any program frame. Pure (no DOM): the program resolver builds the same tracks
 * to report bad keys, the stage builds them to draw, and the two always agree.
 */
/** Placement properties a key can set on any shot or clip. */
export const PLACEMENT = ['x', 'y', 'scale', 'rotation', 'opacity'];
export const NO_PLACEMENT = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
/** Kinds a block may declare. */
export const ANIMATABLE_KINDS = [
    'number',
    'length',
    'color',
    'gradient',
    'shadow'
];
/** Default ease of keys without `ease`, by the style's (or clip's) energy. */
export const KEY_EASE = {
    calm: 'sine.inOut',
    balanced: 'power2.inOut',
    punchy: 'expo.inOut'
};
const PLACEMENT_KIND = {
    x: 'length',
    y: 'length',
    scale: 'number',
    rotation: 'number',
    opacity: 'number'
};
/** A length a track gives (px number or "12.5%") in pixels of `extent`. */
function pixels(value, extent) {
    if (typeof value === 'number')
        return value;
    const n = parseFloat(value);
    return value.endsWith('%') ? (n / 100) * extent : n;
}
/** Whole thousandths: the same numbers on every page, smooth motion between frames. */
const fine = (v) => Math.round(v * 1000) / 1000;
/**
 * The tracks of one item's keys. Throws (with the property in the message) when a key cannot be
 * drawn: an unknown or non-animatable prop, a value of the wrong kind, units or gradient types
 * that differ between keys, an unknown ease.
 */
export function buildKeyTracks(keys, opts) {
    for (const key of keys)
        resolveEase(key.ease);
    const used = (name, pick) => keys
        .filter((k) => pick(k) !== undefined)
        .map((k) => ({ frame: k.frame, value: pick(k), ease: k.ease, space: k.mix }));
    const placement = [];
    for (const name of PLACEMENT) {
        const own = used(name, (k) => k.values[name]);
        if (own.length)
            placement.push([name, createTrack(PLACEMENT_KIND[name], own, { name })]);
    }
    const propNames = [...new Set(keys.flatMap((k) => Object.keys(k.values.props ?? {})))].sort();
    if (propNames.length && !opts.animatable)
        throw new Error(`Keys of a shot take x, y, scale, rotation and opacity, not props (${propNames.join(', ')}).`);
    const props = [];
    for (const name of propNames) {
        const kind = Object.hasOwn(opts.animatable, name) ? opts.animatable[name] : undefined;
        if (!kind) {
            const declared = Object.keys(opts.animatable);
            throw new Error(`Prop "${name}" is not animatable${opts.block ? ` in ${opts.block}` : ''}. ` +
                (declared.length
                    ? `Animatable: ${declared.join(', ')}.`
                    : `The block marks no props animatable (export const animatable = { ${name}: 'color' } in <script module>).`));
        }
        props.push([
            name,
            createTrack(kind, used(name, (k) => k.values.props?.[name]), { name })
        ]);
    }
    const [width, height] = opts.size;
    return {
        placement: placement.length
            ? (f) => {
                const out = { ...NO_PLACEMENT };
                for (const [name, track] of placement) {
                    const v = track(f);
                    out[name] =
                        name === 'x'
                            ? fine(pixels(v, width))
                            : name === 'y'
                                ? fine(pixels(v, height))
                                : fine(v);
                }
                return out;
            }
            : null,
        props: props.length
            ? (f) => Object.fromEntries(props.map(([name, track]) => [name, track(f)]))
            : null,
        propNames
    };
}
const cache = new WeakMap();
/** `buildKeyTracks`, built once per key list and options (the stage evaluates it every frame). */
export function keyTracks(keys, opts) {
    let byOpts = cache.get(keys);
    if (!byOpts)
        cache.set(keys, (byOpts = new Map()));
    const id = JSON.stringify([opts.size, opts.animatable ?? null, opts.block ?? null]);
    let tracks = byOpts.get(id);
    if (!tracks)
        byOpts.set(id, (tracks = buildKeyTracks(keys, opts)));
    return tracks;
}
/** CSS transform of a placement about the element's origin; empty for no movement. */
export function placementTransform(p) {
    const parts = [];
    if (p.x || p.y)
        parts.push(`translate(${p.x}px, ${p.y}px)`);
    if (p.rotation)
        parts.push(`rotate(${p.rotation}deg)`);
    if (p.scale !== 1)
        parts.push(`scale(${p.scale})`);
    return parts.join(' ');
}
// Brand tokens
const BRAND_TOKEN = /\bbrand\.(extra\.[A-Za-z0-9_-]+|[A-Za-z]+)\b/g;
const ROLES = [
    'primary',
    'accent',
    'background',
    'surface',
    'text',
    'muted',
    'onPrimary',
    'onAccent'
];
/**
 * A key value with brand tokens (`"brand.primary"`, `"brand.extra.sky"`) replaced by the brand's
 * colours, also inside gradients and shadows (`"linear-gradient(90deg, brand.primary, brand.accent)"`).
 * Other values come back unchanged. Throws on a token the brand does not have.
 */
export function substituteBrand(value, brand) {
    if (typeof value !== 'string' || !value.includes('brand.'))
        return value;
    return value.replace(BRAND_TOKEN, (token, name) => {
        const c = brand.colors;
        if (name.startsWith('extra.')) {
            const extra = name.slice('extra.'.length);
            if (Object.hasOwn(c.extra, extra))
                return c.extra[extra];
        }
        else if (ROLES.includes(name)) {
            return c[name];
        }
        const extras = Object.keys(c.extra).map((e) => `brand.extra.${e}`);
        throw new Error(`Unknown brand colour "${token}". Use ${[...ROLES.map((r) => `brand.${r}`), ...extras].join(', ')}.`);
    });
}
