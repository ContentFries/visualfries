/**
 * Platform safe zones: where no platform UI (tabs, captions, buttons, progress bar) covers the
 * video. Pixels from each edge at the reference size of each aspect ratio.
 *
 * Only TikTok, Meta (Instagram and Facebook Reels and Stories) and YouTube publish safe zones,
 * and only for ads; organic UI sits in the same places. Figures were measured from the
 * platforms' own overlay files or taken from their ad specs, checked on SAFE_ZONES_CHECKED.
 * Platforms change their UI: update this table, not the code that reads it.
 */
export const SAFE_ZONES_CHECKED = '2026-10-20';
export const SAFE_ZONE_PLATFORMS = ['tiktok', 'meta', 'youtube'];
export const SAFE_ZONES = {
    '9:16': {
        reference: [1080, 1920],
        platforms: {
            tiktok: {
                top: 240,
                right: 120,
                bottom: 660,
                left: 120,
                notch: { y: 840, right: 300 },
                source: 'TikTok Ads video specs, "In-Feed Standard" overlay (file 2025-04-15), measured'
            },
            meta: {
                top: 269,
                right: 65,
                bottom: 672,
                left: 65,
                source: 'Meta Ads Guide, Instagram Reels and Stories: 14 % top, 35 % bottom, 6 % sides'
            },
            youtube: {
                top: 288,
                right: 192,
                bottom: 672,
                left: 48,
                source: 'Google Ads Help, vertical safe-zone overlay, measured'
            }
        }
    },
    '4:5': {
        reference: [1080, 1350],
        platforms: {},
        all: {
            top: 68,
            right: 65,
            bottom: 68,
            left: 65,
            source: 'No platform publishes one; 6 % sides (Meta Reels) and about 5 % top and bottom'
        }
    },
    '1:1': {
        reference: [1080, 1080],
        platforms: {
            tiktok: {
                top: 0,
                right: 236,
                bottom: 501,
                left: 101,
                source: 'TikTok anchor overlays for square video, 4 caption lines (2021 files)'
            },
            youtube: {
                // The left half is safe from y 48; 106 keeps the whole width clear.
                top: 106,
                right: 101,
                bottom: 390,
                left: 48,
                source: 'Google Ads Help, square safe-zone overlay, measured'
            }
        }
    },
    '16:9': {
        reference: [1920, 1080],
        platforms: {
            tiktok: {
                top: 0,
                right: 424,
                bottom: 358,
                left: 200,
                source: 'TikTok anchor overlays for horizontal video in the vertical feed (2021 files)'
            },
            youtube: {
                top: 184,
                right: 162,
                bottom: 386,
                left: 38,
                source: 'Google Ads Help, horizontal safe-zone overlay, measured'
            }
        }
    }
};
