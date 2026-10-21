import { createTrack, resolveEase, TrackError } from './interpolate.js';
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
 * The tracks of one item's keys and everything wrong with them: an unknown or non-animatable
 * prop, a value of the wrong kind, units or gradient types that differ between keys, an unknown
 * ease. Each property is checked on its own, so one bad property does not hide another.
 * `opts.authored` gives each key's index as written (keys arrive sorted by frame); messages and
 * `KeyProblem.key` use it.
 */
export function compileKeyTracks(keys, opts) {
    const problems = [];
    const authored = (i) => opts.authored?.[i] ?? i;
    keys.forEach((key, i) => {
        try {
            resolveEase(key.ease);
        }
        catch (error) {
            problems.push({ message: error.message, key: authored(i), property: null });
        }
    });
    if (problems.length)
        return { tracks: NO_TRACKS, problems };
    /** Keys setting one property, with their authored index and label. */
    const used = (pick) => {
        const own = [];
        keys.forEach((k, i) => {
            const value = pick(k);
            if (value === undefined)
                return;
            own.push({
                at: authored(i),
                key: {
                    frame: k.frame,
                    value,
                    ease: k.ease,
                    space: k.mix,
                    label: `keys[${authored(i)}]`
                }
            });
        });
        return own;
    };
    const track = (kind, name, pick, property = name) => {
        const own = used(pick);
        if (!own.length)
            return null;
        try {
            return createTrack(kind, own.map((o) => o.key), { name });
        }
        catch (error) {
            const at = error instanceof TrackError ? own[error.key].at : null;
            problems.push({ message: error.message, key: at, property });
            return null;
        }
    };
    const placement = [];
    for (const name of PLACEMENT) {
        const t = track(PLACEMENT_KIND[name], name, (k) => k.values[name]);
        if (t)
            placement.push([name, t]);
    }
    const propNames = [...new Set(keys.flatMap((k) => Object.keys(k.values.props ?? {})))].sort();
    const props = [];
    if (propNames.length && !opts.animatable)
        problems.push({
            message: `Keys of a shot take x, y, scale, rotation and opacity, not props (${propNames.join(', ')}).`,
            key: authored(keys.findIndex((k) => k.values.props)),
            property: null
        });
    else
        for (const name of propNames) {
            const kind = Object.hasOwn(opts.animatable, name) ? opts.animatable[name] : undefined;
            if (!kind) {
                const declared = Object.keys(opts.animatable);
                problems.push({
                    message: `Prop "${name}" is not animatable${opts.block ? ` in ${opts.block}` : ''}. ` +
                        (declared.length
                            ? `Animatable: ${declared.join(', ')}.`
                            : `The block marks no props animatable (export const animatable = { ${name}: 'color' } in <script module>).`),
                    key: authored(keys.findIndex((k) => k.values.props?.[name] !== undefined)),
                    property: `props.${name}`
                });
                continue;
            }
            const t = track(kind, name, (k) => k.values.props?.[name], `props.${name}`);
            if (t)
                props.push([name, t]);
        }
    if (problems.length)
        return { tracks: NO_TRACKS, problems };
    const [width, height] = opts.size;
    return {
        problems,
        tracks: {
            placement: placement.length
                ? (f) => {
                    const out = { ...NO_PLACEMENT };
                    for (const [name, t] of placement) {
                        const v = t(f);
                        out[name] =
                            name === 'x'
                                ? fine(pixels(v, width))
                                : name === 'y'
                                    ? fine(pixels(v, height))
                                    : fine(v);
                    }
                    // An overshooting ease never mirrors the item or fades it past its ends.
                    out.scale = Math.max(0, out.scale);
                    out.opacity = Math.min(1, Math.max(0, out.opacity));
                    return out;
                }
                : null,
            props: props.length
                ? (f) => Object.fromEntries(props.map(([name, t]) => [name, t(f)]))
                : null,
            propNames
        }
    };
}
const NO_TRACKS = { placement: null, props: null, propNames: [] };
/** The tracks of one item's keys; throws the first problem (see `compileKeyTracks`). */
export function buildKeyTracks(keys, opts) {
    const { tracks, problems } = compileKeyTracks(keys, opts);
    if (problems.length)
        throw new Error(problems[0].message);
    return tracks;
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
    const whole = value.trim();
    return value.replace(BRAND_TOKEN, (token, name) => {
        const c = brand.colors;
        let found;
        if (name.startsWith('extra.')) {
            const extra = name.slice('extra.'.length);
            if (Object.hasOwn(c.extra, extra))
                found = c.extra[extra];
        }
        else if (ROLES.includes(name)) {
            found = c[name];
        }
        if (found !== undefined) {
            // A brand colour may be a gradient: fine as a whole value, not as a stop or shadow colour.
            if (/gradient\(/i.test(found) && whole !== token)
                throw new Error(`"${token}" is a gradient in this brand (${found}), so it cannot stand inside "${whole}". Use it as the whole value, or write the colours out.`);
            return found;
        }
        const extras = Object.keys(c.extra).map((e) => `brand.extra.${e}`);
        throw new Error(`Unknown brand colour "${token}". Use ${[...ROLES.map((r) => `brand.${r}`), ...extras].join(', ')}.`);
    });
}
