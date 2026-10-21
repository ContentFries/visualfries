import { SAFE_ZONE_PLATFORMS, SAFE_ZONES } from './safe-zones.js';
/** Within this ratio of 1:1 a frame counts as square. */
const SQUARE_TOLERANCE = 1.1;
export function formatClass(width, height) {
    const ratio = width / height;
    if (ratio >= SQUARE_TOLERANCE)
        return 'landscape';
    if (ratio <= 1 / SQUARE_TOLERANCE)
        return 'portrait';
    return 'square';
}
/** The reference aspect ratio a size takes its zone from: the nearest one of its class. */
export function referenceAspect(width, height) {
    const cls = formatClass(width, height);
    if (cls === 'landscape')
        return '16:9';
    if (cls === 'square')
        return '1:1';
    const ratio = Math.log(width / height);
    const distance = (a) => {
        const [w, h] = SAFE_ZONES[a].reference;
        return Math.abs(ratio - Math.log(w / h));
    };
    return distance('9:16') <= distance('4:5') ? '9:16' : '4:5';
}
/** Merge platform zones: every side takes the largest inset, so the result is safe everywhere. */
export function mergeZones(zones) {
    const notches = zones.filter((z) => z.notch);
    const merged = {
        top: Math.max(...zones.map((z) => z.top)),
        right: Math.max(...zones.map((z) => z.right)),
        bottom: Math.max(...zones.map((z) => z.bottom)),
        left: Math.max(...zones.map((z) => z.left)),
        source: 'largest inset of: ' + zones.map((z) => z.source).join('; ')
    };
    if (notches.length) {
        merged.notch = {
            y: Math.min(...notches.map((z) => z.notch.y)),
            right: Math.max(...zones.map((z) => z.notch?.right ?? z.right))
        };
    }
    return merged;
}
function zoneAt(aspect, zone) {
    const table = SAFE_ZONES[aspect];
    const all = () => table.all ?? mergeZones(Object.values(table.platforms));
    if (zone === 'all')
        return { insets: all() };
    const own = table.platforms[zone];
    if (own)
        return { insets: own };
    return {
        insets: all(),
        fallback: `${zone} publishes no safe zone for ${aspect}; the all-platform zone is used.`
    };
}
/**
 * Format class and safe insets for a project size. Insets are scaled from the reference size
 * of the nearest aspect ratio (1080×1920 for 9:16, 1080×1350 for 4:5, 1080×1080 for 1:1,
 * 1920×1080 for 16:9), each axis by its own factor, and rounded to whole pixels.
 */
export function resolveFormat(size, zone = 'all') {
    const [width, height] = size;
    const aspect = referenceAspect(width, height);
    const [refW, refH] = SAFE_ZONES[aspect].reference;
    const { insets, fallback } = zoneAt(aspect, zone);
    const x = (v) => Math.round((v * width) / refW);
    const y = (v) => Math.round((v * height) / refH);
    const top = y(insets.top);
    const bottom = y(insets.bottom);
    const rightUpper = x(insets.right);
    const right = insets.notch ? Math.max(rightUpper, x(insets.notch.right)) : rightUpper;
    const safe = {
        top,
        right,
        bottom,
        left: x(insets.left),
        notchY: insets.notch ? y(insets.notch.y) : height - bottom,
        rightUpper
    };
    return {
        class: formatClass(width, height),
        aspect,
        width,
        height,
        zone,
        safe,
        ...(fallback ? { fallback } : {})
    };
}
/** CSS custom properties for a format: `--safe-top` … in px. */
export function formatTokens(format) {
    const { safe } = format;
    return {
        '--safe-top': `${safe.top}px`,
        '--safe-right': `${safe.right}px`,
        '--safe-bottom': `${safe.bottom}px`,
        '--safe-left': `${safe.left}px`,
        '--safe-right-upper': `${safe.rightUpper}px`,
        '--safe-notch-y': `${safe.notchY}px`
    };
}
export function isSafeZoneName(value) {
    return value === 'all' || SAFE_ZONE_PLATFORMS.includes(value);
}
