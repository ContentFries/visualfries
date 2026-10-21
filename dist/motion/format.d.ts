import { SAFE_ZONES, type SafeZoneName, type SafeZonePlatform, type ZoneInsets } from './safe-zones.js';
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
export declare function formatClass(width: number, height: number): FormatClass;
/** The reference aspect ratio a size takes its zone from: the nearest one of its class. */
export declare function referenceAspect(width: number, height: number): ReferenceAspect;
/** Merge platform zones: every side takes the largest inset, so the result is safe everywhere. */
export declare function mergeZones(zones: ZoneInsets[]): ZoneInsets;
/**
 * Format class and safe insets for a project size. Insets are scaled from the reference size
 * of the nearest aspect ratio (1080×1920 for 9:16, 1080×1350 for 4:5, 1080×1080 for 1:1,
 * 1920×1080 for 16:9), each axis by its own factor, and rounded to whole pixels.
 */
export declare function resolveFormat(size: [number, number], zone?: SafeZoneName): ResolvedFormat;
/** CSS custom properties for a format: `--safe-top` … in px. */
export declare function formatTokens(format: ResolvedFormat): Record<string, string>;
export declare function isSafeZoneName(value: string): value is SafeZoneName;
export type { SafeZoneName, SafeZonePlatform };
