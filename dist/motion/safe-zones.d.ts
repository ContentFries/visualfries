/**
 * Platform safe zones: where no platform UI (tabs, captions, buttons, progress bar) covers the
 * video. Pixels from each edge at the reference size of each aspect ratio.
 *
 * Only TikTok, Meta (Instagram and Facebook Reels and Stories) and YouTube publish safe zones,
 * and only for ads; organic UI sits in the same places. LinkedIn and X publish none, and Meta
 * none for feed video. Figures were measured from the platforms' own overlay files or taken
 * from their ad specs, all read on SAFE_ZONES_CHECKED (2026-10-20); a figure no platform
 * publishes is marked "not measured". Platforms change their UI: update this table, not the
 * code that reads it.
 */
export declare const SAFE_ZONES_CHECKED = "2026-10-20";
export declare const SAFE_ZONE_PLATFORMS: readonly ["tiktok", "meta", "youtube"];
export type SafeZonePlatform = (typeof SAFE_ZONE_PLATFORMS)[number];
export type SafeZoneName = 'all' | SafeZonePlatform;
/**
 * Insets in pixels at the reference size. `notch`: from `y` down, the right inset grows to
 * `right` (TikTok's button column); above it `right` of the zone applies.
 */
export type ZoneInsets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
    notch?: {
        y: number;
        right: number;
    };
    source: string;
};
export type AspectZones = {
    reference: [number, number];
    platforms: Partial<Record<SafeZonePlatform, ZoneInsets>>;
    /**
     * The platforms whose zone makes up `all` (default: every platform listed). A platform can
     * have a zone for this ratio that does not belong in `all`, e.g. a landscape video shown
     * inside a vertical feed.
     */
    allFrom?: SafeZonePlatform[];
    /** Set when no platform publishes a zone for this ratio; otherwise `all` is computed. */
    all?: ZoneInsets;
    /** Players this ratio plays in that publish no figure, so `all` cannot include them. */
    notMeasured?: string[];
};
export declare const SAFE_ZONES: Record<'9:16' | '4:5' | '1:1' | '16:9', AspectZones>;
