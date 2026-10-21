import {
	SAFE_ZONE_PLATFORMS,
	SAFE_ZONES,
	type SafeZoneName,
	type SafeZonePlatform,
	type ZoneInsets
} from './safe-zones.js';

export type FormatClass = 'landscape' | 'square' | 'portrait';
export type ReferenceAspect = keyof typeof SAFE_ZONES;

/**
 * Safe insets in pixels for the project size. `top`/`right`/`bottom`/`left` bound a rectangle
 * that is safe on every row. Above `notchY` the right inset is only `rightUpper` (on 9:16,
 * TikTok's button column starts at y 840), so faces and titles in the upper band may use more
 * width. Without a notch, `rightUpper` equals `right` and `notchY` is the rectangle's bottom.
 */
export type SafeInsets = {
	top: number;
	right: number;
	bottom: number;
	left: number;
	notchY: number;
	rightUpper: number;
};

export type ResolvedFormat = {
	/** Layout class: 4:5 and 3:4 are portrait, 1:1 is square, 16:9 and 4:3 are landscape. */
	class: FormatClass;
	/** Reference aspect ratio whose zone was scaled to the project size. */
	aspect: ReferenceAspect;
	width: number;
	height: number;
	/** The zone in use: `all` (safe on every platform) or one platform. */
	zone: SafeZoneName;
	safe: SafeInsets;
	/** Set when the platform publishes no zone for this aspect ratio and `all` was used. */
	fallback?: string;
};

/** Within this ratio of 1:1 a frame counts as square. */
const SQUARE_TOLERANCE = 1.1;

export function formatClass(width: number, height: number): FormatClass {
	const ratio = width / height;
	if (ratio >= SQUARE_TOLERANCE) return 'landscape';
	if (ratio <= 1 / SQUARE_TOLERANCE) return 'portrait';
	return 'square';
}

/** The reference aspect ratio a size takes its zone from: the nearest one of its class. */
export function referenceAspect(width: number, height: number): ReferenceAspect {
	const cls = formatClass(width, height);
	if (cls === 'landscape') return '16:9';
	if (cls === 'square') return '1:1';
	const ratio = Math.log(width / height);
	const distance = (a: ReferenceAspect) => {
		const [w, h] = SAFE_ZONES[a].reference;
		return Math.abs(ratio - Math.log(w / h));
	};
	return distance('9:16') <= distance('4:5') ? '9:16' : '4:5';
}

/** Merge platform zones: every side takes the largest inset, so the result is safe everywhere. */
export function mergeZones(zones: ZoneInsets[]): ZoneInsets {
	const notches = zones.filter((z) => z.notch);
	const merged: ZoneInsets = {
		top: Math.max(...zones.map((z) => z.top)),
		right: Math.max(...zones.map((z) => z.right)),
		bottom: Math.max(...zones.map((z) => z.bottom)),
		left: Math.max(...zones.map((z) => z.left)),
		source: 'largest inset of: ' + zones.map((z) => z.source).join('; ')
	};
	if (notches.length) {
		merged.notch = {
			y: Math.min(...notches.map((z) => z.notch!.y)),
			right: Math.max(...zones.map((z) => z.notch?.right ?? z.right))
		};
	}
	return merged;
}

function zoneAt(
	aspect: ReferenceAspect,
	zone: SafeZoneName
): { insets: ZoneInsets; fallback?: string } {
	const table = SAFE_ZONES[aspect];
	const all = () => table.all ?? mergeZones(Object.values(table.platforms));
	if (zone === 'all') return { insets: all() };
	const own = table.platforms[zone];
	if (own) return { insets: own };
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
export function resolveFormat(size: [number, number], zone: SafeZoneName = 'all'): ResolvedFormat {
	const [width, height] = size;
	const aspect = referenceAspect(width, height);
	const [refW, refH] = SAFE_ZONES[aspect].reference;
	const { insets, fallback } = zoneAt(aspect, zone);
	const x = (v: number) => Math.round((v * width) / refW);
	const y = (v: number) => Math.round((v * height) / refH);
	const top = y(insets.top);
	const bottom = y(insets.bottom);
	const rightUpper = x(insets.right);
	const right = insets.notch ? Math.max(rightUpper, x(insets.notch.right)) : rightUpper;
	const safe: SafeInsets = {
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
export function formatTokens(format: ResolvedFormat): Record<string, string> {
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

export function isSafeZoneName(value: string): value is SafeZoneName {
	return value === 'all' || (SAFE_ZONE_PLATFORMS as readonly string[]).includes(value);
}

export type { SafeZoneName, SafeZonePlatform };
