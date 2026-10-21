import { gsap } from 'gsap';
import { TRANSPARENT, formatColor, formatNumber, gamutMapToSrgb, mixColors, parseAngle, parseColor, shortestArc, splitTopLevel, srgbToOklab, tryParseColor } from './color.js';
/** Ease used for a key without `ease` when the track sets none. */
export const DEFAULT_EASE = 'power2.inOut';
const lerp = (a, b, t) => a + (b - a) * t;
// Eases
const easeCache = new Map();
/** A GSAP ease by name (`power2.out`, `back.out(1.7)`, `none`); throws for unknown names. */
export function resolveEase(name) {
    let fn = easeCache.get(name);
    if (!fn) {
        const parsed = gsap.parseEase(name);
        if (typeof parsed !== 'function') {
            throw new Error(`Unknown ease "${name}". Use a GSAP name such as "power2.out", "back.out(1.7)", "expo.inOut" or "none".`);
        }
        fn = parsed;
        easeCache.set(name, fn);
    }
    return fn;
}
const LENGTH = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(px|%)?$/i;
/** A length: a number (px), `"12px"` or `"50%"`. A unitless string is only allowed for 0. */
export function parseLength(input) {
    if (typeof input === 'number') {
        if (!Number.isFinite(input))
            throw new Error(`Length must be a finite number, got ${input}.`);
        return { value: input, unit: 'px' };
    }
    const m = LENGTH.exec(String(input).trim());
    if (!m || (!m[2] && Number(m[1]) !== 0)) {
        throw new Error(`Unknown length "${input}". Use a number of pixels, "12px" or "50%".`);
    }
    return { value: Number(m[1]), unit: m[2]?.toLowerCase() ?? 'px' };
}
export function formatLength({ value, unit }) {
    return `${formatNumber(value, 4)}${unit}`;
}
/** Both lengths in one unit; zero adopts the other side's unit (0px and 0% are the same). */
function alignUnits(a, b) {
    if (a.unit === b.unit)
        return [a, b];
    if (a.value === 0)
        return [{ value: 0, unit: b.unit }, b];
    if (b.value === 0)
        return [a, { value: 0, unit: a.unit }];
    throw new Error(`Cannot interpolate ${formatLength(a)} to ${formatLength(b)}: use the same unit (px or %) at both keys.`);
}
function lengthMixer(a, b) {
    const [x, y] = alignUnits(a, b);
    return (t) => ({ value: lerp(x.value, y.value, t), unit: x.unit });
}
const SIDE_ANGLES = { top: 0, right: 90, bottom: 180, left: 270 };
const SIZE_KEYWORDS = ['closest-side', 'closest-corner', 'farthest-side', 'farthest-corner'];
const POSITION_KEYWORDS = {
    left: 0,
    top: 0,
    center: 50,
    right: 100,
    bottom: 100
};
/** True for text that looks like a gradient function (any kind, supported or not). */
export function isGradient(input) {
    return /^[a-z-]*gradient\(/i.test(input.trim());
}
/**
 * Parse `linear-gradient()` (angle or `to` side/corner) or `radial-gradient()` (shape, size,
 * `at` position) with colour stops that have zero, one or two positions in px or %.
 * Missing positions are filled in the way CSS does.
 */
export function parseGradient(input) {
    const m = /^\s*(linear|radial)-gradient\((.*)\)\s*$/is.exec(input);
    if (!m) {
        throw new Error(`Unsupported gradient "${input}". Use linear-gradient() or radial-gradient(); repeating and conic gradients cannot be keyframed.`);
    }
    const type = m[1].toLowerCase();
    const args = splitTopLevel(m[2], ',');
    const first = splitTopLevel(args[0] ?? '', ' ');
    const prelude = first.length && !tryParseColor(first[0]) ? args.shift() : undefined;
    if (prelude && /(^|\s)in\s/i.test(` ${prelude} `)) {
        throw new Error(`Gradient "${input}": an interpolation colour space ("in ...") is not supported.`);
    }
    const stops = fixStopPositions(args.flatMap((arg) => parseStop(arg, input)), input);
    if (!stops.length)
        throw new Error(`Gradient "${input}" has no colour stops.`);
    if (type === 'linear')
        return { type, direction: parseDirection(prelude, input), stops };
    return { type, ...parseRadialPrelude(prelude, input), stops };
}
function parseStop(arg, gradient) {
    const tokens = splitTopLevel(arg, ' ');
    const color = tryParseColor(tokens[0] ?? '');
    if (!color || tokens.length > 3) {
        throw new Error(`Gradient "${gradient}": "${arg}" is not a colour stop. Write a colour with up to two positions; colour hints are not supported.`);
    }
    const positions = tokens.slice(1).map(parseLength);
    if (!positions.length)
        return [{ color }];
    return positions.map((position) => ({ color, position }));
}
/** CSS colour stop fix-up: ends default to 0% and 100%, positions never go backwards, gaps spread evenly. */
function fixStopPositions(raw, gradient) {
    if (!raw.length)
        return [];
    const stops = raw.map((s) => ({ ...s }));
    stops[0].position ??= { value: 0, unit: '%' };
    if (stops.length > 1)
        stops[stops.length - 1].position ??= { value: 100, unit: '%' };
    const mixed = () => new Error(`Gradient "${gradient}" mixes px and % stop positions; use one unit.`);
    let max = stops[0].position;
    for (const stop of stops) {
        if (!stop.position)
            continue;
        const [m, p] = alignOrThrow(max, stop.position, mixed);
        stop.position = p.value < m.value ? m : p;
        max = stop.position;
    }
    for (let i = 1; i < stops.length; i++) {
        if (stops[i].position)
            continue;
        let j = i;
        while (!stops[j].position)
            j++;
        const [from, to] = alignOrThrow(stops[i - 1].position, stops[j].position, mixed);
        for (let k = i; k < j; k++) {
            stops[k].position = {
                value: lerp(from.value, to.value, (k - i + 1) / (j - i + 1)),
                unit: to.unit
            };
        }
    }
    return stops;
}
function alignOrThrow(a, b, error) {
    try {
        return alignUnits(a, b);
    }
    catch {
        throw error();
    }
}
function parseDirection(prelude, gradient) {
    if (!prelude)
        return { to: 'bottom' };
    const tokens = splitTopLevel(prelude.toLowerCase(), ' ');
    if (tokens[0] === 'to') {
        const sides = tokens.slice(1);
        const vertical = sides.filter((s) => s === 'top' || s === 'bottom');
        const horizontal = sides.filter((s) => s === 'left' || s === 'right');
        if (sides.length && sides.length <= 2 && vertical.length <= 1 && horizontal.length <= 1) {
            if (vertical.length + horizontal.length === sides.length) {
                return { to: [...vertical, ...horizontal].join(' ') };
            }
        }
    }
    else if (tokens.length === 1) {
        // CSS only allows a unitless gradient angle when it is 0
        const angle = /^[+-]?[\d.]+(?:e[+-]?\d+)?$/i.test(tokens[0]) && Number(tokens[0]) !== 0
            ? undefined
            : parseAngle(tokens[0]);
        if (angle !== undefined)
            return { angle };
    }
    throw new Error(`Gradient "${gradient}": unknown direction "${prelude}". Use an angle (45deg, 0.25turn) or "to" with a side or corner (to top right).`);
}
function directionDegrees(direction, box) {
    if ('angle' in direction)
        return direction.angle;
    if (direction.to in SIDE_ANGLES)
        return SIDE_ANGLES[direction.to];
    if (!box || !(box.width > 0 && box.height > 0)) {
        throw new Error(`Gradient direction "to ${direction.to}" points at a corner, so its angle depends on the box it is drawn in. Pass box: { width, height }, or use an angle at both keys.`);
    }
    const corner = (Math.atan2(box.height, box.width) * 180) / Math.PI;
    const [v, h] = direction.to.split(' ');
    if (v === 'top')
        return h === 'right' ? corner : 360 - corner;
    return h === 'right' ? 180 - corner : 180 + corner;
}
function parseRadialPrelude(prelude, gradient) {
    const tokens = prelude ? splitTopLevel(prelude.toLowerCase(), ' ') : [];
    const at = tokens.indexOf('at');
    const ending = at < 0 ? tokens : tokens.slice(0, at);
    const place = at < 0 ? [] : tokens.slice(at + 1);
    const fail = (why) => new Error(`Gradient "${gradient}": ${why}. Use e.g. "circle farthest-corner at 50% 50%".`);
    let shape;
    let keyword;
    const lengths = [];
    for (const token of ending) {
        if (token === 'circle' || token === 'ellipse') {
            if (shape)
                throw fail('the shape is given twice');
            shape = token;
        }
        else if (SIZE_KEYWORDS.includes(token)) {
            if (keyword)
                throw fail('the size is given twice');
            keyword = token;
        }
        else {
            try {
                lengths.push(parseLength(token));
            }
            catch {
                throw fail(`unknown radial gradient term "${token}"`);
            }
        }
    }
    if (keyword && lengths.length)
        throw fail('size is either a keyword or lengths');
    if (lengths.length > 2)
        throw fail('a radial size has at most two lengths');
    shape ??= lengths.length === 1 ? 'circle' : 'ellipse';
    if (shape === 'circle' && lengths.length > 1)
        throw fail('a circle takes one radius');
    if (shape === 'ellipse' && lengths.length === 1)
        throw fail('an ellipse takes two radii');
    if (shape === 'circle' && lengths[0]?.unit === '%')
        throw fail('a circle radius cannot be a percentage');
    const size = lengths.length
        ? { lengths }
        : { keyword: (keyword ?? 'farthest-corner') };
    if (at >= 0 && (place.length < 1 || place.length > 2))
        throw fail('"at" takes one or two values');
    const value = (token) => {
        if (token in POSITION_KEYWORDS)
            return { value: POSITION_KEYWORDS[token], unit: '%' };
        try {
            return parseLength(token);
        }
        catch {
            throw fail(`unknown position "${token}"`);
        }
    };
    const isY = (t) => t === 'top' || t === 'bottom';
    const isX = (t) => t === 'left' || t === 'right';
    let [x = 'center', y = 'center'] = place;
    if (place.length === 1 && isY(x))
        [x, y] = ['center', x];
    else if (isY(x) || isX(y))
        [x, y] = [y, x];
    return { shape, size, position: [value(x), value(y)] };
}
/** CSS text for a gradient, colours as `rgb(r g b / a)` and every stop position written out. */
export function formatGradient(gradient) {
    const stops = gradient.stops
        .map((s) => `${formatColor(s.color)} ${formatLength(s.position)}`)
        .join(', ');
    if (gradient.type === 'linear') {
        const d = gradient.direction;
        const direction = 'angle' in d ? `${formatNumber(d.angle, 4)}deg` : `to ${d.to}`;
        return `linear-gradient(${direction}, ${stops})`;
    }
    const size = 'keyword' in gradient.size
        ? gradient.size.keyword
        : gradient.size.lengths.map(formatLength).join(' ');
    const [x, y] = gradient.position.map(formatLength);
    return `radial-gradient(${gradient.shape} ${size} at ${x} ${y}, ${stops})`;
}
/**
 * The colour a browser draws at `position` of a gradient written by `formatGradient` (right-hand
 * limit at a hard stop). Its stops are `rgb()` colours, so CSS blends them in gamma-encoded sRGB
 * with premultiplied alpha, not in OKLab; a stop added there with this colour changes no pixel.
 */
function colorAt(stops, position) {
    let i = -1;
    while (i + 1 < stops.length && stops[i + 1].position.value <= position)
        i++;
    if (i < 0)
        return stops[0].color;
    if (i === stops.length - 1 || stops[i].position.value === position)
        return stops[i].color;
    const a = stops[i];
    const b = stops[i + 1];
    const t = (position - a.position.value) / (b.position.value - a.position.value);
    const x = gamutMapToSrgb(a.color);
    const y = gamutMapToSrgb(b.color);
    const alpha = lerp(x.alpha, y.alpha, t);
    const mix = (p, q) => alpha > 0 ? lerp(p * x.alpha, q * y.alpha, t) / alpha : lerp(p, q, t);
    return srgbToOklab({ r: mix(x.r, y.r), g: mix(x.g, y.g), b: mix(x.b, y.b), alpha });
}
/**
 * Pair the stops of two gradients. Equal counts pair in order and positions move. Otherwise each
 * gradient gets a stop at every position only the other one has, coloured with what the browser
 * draws there (`colorAt`), so both keep their exact look at the keys.
 */
function pairStops(a, b) {
    if (a.length === b.length) {
        return a.map((s, i) => ({
            from: s.color,
            to: b[i].color,
            position: lengthMixer(s.position, b[i].position)
        }));
    }
    const units = new Set([...a, ...b].filter((s) => s.position.value !== 0).map((s) => s.position.unit));
    if (units.size > 1) {
        throw new Error('Cannot align gradients whose stop positions use different units; use % (or px) in both.');
    }
    const unit = units.values().next().value ?? '%';
    const pairs = [];
    const at = (value) => () => ({ value, unit });
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
        const pa = i < a.length ? a[i].position.value : Infinity;
        const pb = j < b.length ? b[j].position.value : Infinity;
        if (pa === pb)
            pairs.push({ from: a[i++].color, to: b[j++].color, position: at(pa) });
        else if (pa < pb)
            pairs.push({ from: a[i++].color, to: colorAt(b, pa), position: at(pa) });
        else
            pairs.push({ from: colorAt(a, pb), to: b[j++].color, position: at(pb) });
    }
    return pairs;
}
const isGradientPaint = (p) => 'stops' in p;
/** A solid colour as a gradient shaped like `like`, with that colour at every stop. */
function solidAs(color, like) {
    return { ...like, stops: like.stops.map((s) => ({ color, position: s.position })) };
}
function gradientMixer(from, to, options) {
    const space = options.space ?? 'oklab';
    if (!isGradientPaint(from) && !isGradientPaint(to)) {
        return (t) => formatColor(mixColors(from, to, t, space));
    }
    const a = isGradientPaint(from) ? from : solidAs(from, to);
    const b = isGradientPaint(to) ? to : solidAs(to, a);
    if (a.type !== b.type) {
        throw new Error(`Cannot interpolate a ${a.type}-gradient into a ${b.type}-gradient; use the same gradient type at both keys.`);
    }
    const pairs = pairStops(a.stops, b.stops);
    const stopsAt = (t) => pairs.map((p) => ({ color: mixColors(p.from, p.to, t, space), position: p.position(t) }));
    if (a.type === 'linear' && b.type === 'linear') {
        const same = JSON.stringify(a.direction) === JSON.stringify(b.direction);
        const start = same ? 0 : directionDegrees(a.direction, options.box);
        const arc = same ? 0 : shortestArc(start, directionDegrees(b.direction, options.box));
        return (t) => formatGradient({
            type: 'linear',
            direction: same ? a.direction : { angle: (((start + arc * t) % 360) + 360) % 360 },
            stops: stopsAt(t)
        });
    }
    const ra = a;
    const rb = b;
    if (ra.shape !== rb.shape) {
        throw new Error(`Cannot interpolate a ${ra.shape} radial gradient into a ${rb.shape}; use the same shape at both keys.`);
    }
    const size = radialSizeMixer(ra.size, rb.size);
    const x = lengthMixer(ra.position[0], rb.position[0]);
    const y = lengthMixer(ra.position[1], rb.position[1]);
    return (t) => formatGradient({
        type: 'radial',
        shape: ra.shape,
        size: size(t),
        position: [x(t), y(t)],
        stops: stopsAt(t)
    });
}
function radialSizeMixer(a, b) {
    if ('keyword' in a && 'keyword' in b && a.keyword === b.keyword)
        return () => a;
    if ('lengths' in a && 'lengths' in b) {
        const mixers = a.lengths.map((l, i) => lengthMixer(l, b.lengths[i]));
        return (t) => ({ lengths: mixers.map((m) => m(t)) });
    }
    const text = (s) => 'keyword' in s ? s.keyword : s.lengths.map(formatLength).join(' ');
    throw new Error(`Cannot interpolate radial size "${text(a)}" to "${text(b)}"; use the same size keyword, or lengths, at both keys.`);
}
/**
 * Parse a `box-shadow` or `text-shadow` list: per shadow optional `inset`, two to four px lengths
 * (x, y, blur, spread; blur not negative) and a colour. `none` is the empty list.
 */
export function parseShadows(input) {
    const text = input.trim();
    if (text.toLowerCase() === 'none')
        return [];
    return splitTopLevel(text, ',').map((part) => {
        let inset = false;
        let color;
        const lengths = [];
        for (const token of splitTopLevel(part, ' ')) {
            if (token.toLowerCase() === 'inset' && !inset) {
                inset = true;
                continue;
            }
            const c = color ? undefined : tryParseColor(token);
            if (c) {
                color = c;
                continue;
            }
            let length;
            try {
                length = parseLength(token);
            }
            catch {
                length = undefined;
            }
            if (!length || length.unit !== 'px') {
                throw new Error(`Shadow "${part}": unknown term "${token}". Lengths are px.`);
            }
            lengths.push(length);
        }
        if (lengths.length < 2 || lengths.length > 4) {
            throw new Error(`Shadow "${part}" needs two to four lengths (x y blur spread).`);
        }
        if (!color) {
            throw new Error(`Shadow "${part}" needs a colour so it can be keyframed.`);
        }
        const [x, y, blur = { value: 0, unit: 'px' }, spread] = lengths;
        if (blur.value < 0) {
            throw new Error(`Shadow "${part}": the blur radius cannot be negative.`);
        }
        return { inset, x, y, blur, spread, color };
    });
}
export function formatShadows(shadows) {
    if (!shadows.length)
        return 'none';
    return shadows
        .map((s) => [
        s.inset ? 'inset' : '',
        formatLength(s.x),
        formatLength(s.y),
        formatLength(s.blur),
        s.spread ? formatLength(s.spread) : '',
        formatColor(s.color)
    ]
        .filter(Boolean)
        .join(' '))
        .join(', ');
}
const ZERO_PX = { value: 0, unit: 'px' };
/** A shadow that draws nothing, shaped like `like` so the two can pair. */
const emptyShadowLike = (like) => ({
    inset: like.inset,
    x: ZERO_PX,
    y: ZERO_PX,
    blur: ZERO_PX,
    spread: like.spread ? ZERO_PX : undefined,
    color: { ...TRANSPARENT }
});
function shadowMixer(from, to, options) {
    const space = options.space ?? 'oklab';
    const count = Math.max(from.length, to.length);
    const pairs = Array.from({ length: count }, (_, i) => {
        const a = from[i] ?? emptyShadowLike(to[i]);
        const b = to[i] ?? emptyShadowLike(from[i]);
        if (a.inset !== b.inset) {
            throw new Error(`Cannot interpolate shadow ${i + 1}: one end is inset and the other is not; pad with a transparent shadow of the same kind.`);
        }
        const spread = a.spread || b.spread ? lengthMixer(a.spread ?? ZERO_PX, b.spread ?? ZERO_PX) : undefined;
        return {
            inset: a.inset,
            x: lengthMixer(a.x, b.x),
            y: lengthMixer(a.y, b.y),
            blur: lengthMixer(a.blur, b.blur),
            spread,
            from: a.color,
            to: b.color
        };
    });
    return (t) => formatShadows(pairs.map((p) => {
        const blur = p.blur(t);
        return {
            inset: p.inset,
            x: p.x(t),
            y: p.y(t),
            blur: { ...blur, value: Math.max(0, blur.value) },
            spread: p.spread?.(t),
            color: mixColors(p.from, p.to, t, space)
        };
    }));
}
const expectString = (value, what) => {
    if (typeof value !== 'string')
        throw new Error(`Expected ${what} as a string, got ${JSON.stringify(value)}.`);
    return value;
};
const codecs = {
    number: {
        parse(value) {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new Error(`Expected a finite number, got ${JSON.stringify(value)}.`);
            }
            return value;
        },
        format: (n) => n,
        prepare: (a, b) => (t) => lerp(a, b, t)
    },
    length: {
        parse(value) {
            if (typeof value !== 'number' && typeof value !== 'string') {
                throw new Error(`Expected a length (number, "12px" or "50%"), got ${JSON.stringify(value)}.`);
            }
            return { length: parseLength(value), numeric: typeof value === 'number' };
        },
        format: (p) => {
            const { length, numeric } = p;
            return numeric && length.unit === 'px' ? length.value : formatLength(length);
        },
        prepare(a, b) {
            const x = a;
            const y = b;
            const mix = lengthMixer(x.length, y.length);
            return (t) => {
                const length = mix(t);
                return x.numeric && y.numeric ? length.value : formatLength(length);
            };
        }
    },
    color: {
        parse: (value) => parseColor(expectString(value, 'a colour')),
        format: (c) => formatColor(c),
        prepare: (a, b, options) => (t) => formatColor(mixColors(a, b, t, options.space))
    },
    gradient: {
        parse(value) {
            const text = expectString(value, 'a gradient or colour');
            return isGradient(text) ? parseGradient(text) : parseColor(text);
        },
        format: (p) => isGradientPaint(p) ? formatGradient(p) : formatColor(p),
        prepare: (a, b, options) => gradientMixer(a, b, options)
    },
    shadow: {
        parse: (value) => parseShadows(expectString(value, 'a shadow list')),
        format: (s) => formatShadows(s),
        prepare: (a, b, options) => shadowMixer(a, b, options)
    }
};
function codec(kind) {
    const c = codecs[kind];
    if (!c) {
        throw new Error(`Unknown animatable kind "${kind}". Use number, length, color, gradient or shadow.`);
    }
    return c;
}
/**
 * Align two values of one kind once and return the mixer for progress `t` (0 = `from`,
 * 1 = `to`). Throws when the ends cannot be aligned (units, gradient types, inset shadows).
 */
export function interpolator(kind, from, to, options = {}) {
    const c = codec(kind);
    return c.prepare(c.parse(from), c.parse(to), options);
}
/** One-off `interpolator(kind, from, to, options)(t)`. */
export function interpolate(kind, from, to, t, options = {}) {
    return interpolator(kind, from, to, options)(t);
}
/**
 * A keyframe track for one property: returns the value at any frame (fractional frames work).
 * Before the first key the first value holds, after the last the last. Keys sharing a frame make
 * a jump: from that frame on the later key applies. Every key is parsed and every segment
 * aligned when the track is built, so invalid keys throw here, not mid-render.
 */
export function createTrack(kind, keys, options = {}) {
    const c = codec(kind);
    const label = options.name ? `Keys of "${options.name}"` : 'Keys';
    if (!keys.length)
        throw new Error(`${label}: a track needs at least one key.`);
    const sorted = keys
        .map((key, index) => ({ key, index }))
        .sort((p, q) => p.key.frame - q.key.frame);
    const parsed = sorted.map(({ key, index }) => {
        if (!Number.isFinite(key.frame))
            throw new Error(`${label}: key ${index + 1} has no valid frame.`);
        try {
            return c.parse(key.value);
        }
        catch (error) {
            throw new Error(`${label}: key ${index + 1}: ${error.message}`);
        }
    });
    const segments = sorted.slice(1).map(({ key, index }, i) => {
        try {
            const ease = resolveEase(key.ease ?? options.ease ?? DEFAULT_EASE);
            const from = sorted[i].key.frame;
            // A jump (two keys on one frame) never mixes, so its ends need not be compatible.
            const mix = from === key.frame
                ? () => c.format(parsed[i + 1])
                : c.prepare(parsed[i], parsed[i + 1], { ...options, space: key.space ?? options.space });
            return { from, to: key.frame, ease, mix };
        }
        catch (error) {
            throw new Error(`${label}: key ${sorted[i].index + 1} to ${index + 1}: ${error.message}`);
        }
    });
    const first = c.format(parsed[0]);
    const last = c.format(parsed[parsed.length - 1]);
    return (frame) => {
        if (!(frame >= sorted[0].key.frame))
            return first;
        let i = segments.length - 1;
        while (i >= 0 && segments[i].from > frame)
            i--;
        const segment = segments[i];
        if (!segment || frame >= segment.to)
            return last;
        const p = (frame - segment.from) / (segment.to - segment.from);
        return segment.mix(segment.ease(p));
    };
}
