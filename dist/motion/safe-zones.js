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
export const SAFE_ZONES_CHECKED = '2026-10-20';
export const SAFE_ZONE_PLATFORMS = ['tiktok', 'meta', 'youtube'];
export const SAFE_ZONES = {
    '9:16': {
        reference: [1080, 1920],
        platforms: {
            // https://ads.tiktok.com/help/article/video-ads-specifications (page "Last updated: June
            // 2026", read 2026-10-20), safe-zone ZIP: "In-Feed Standard Version LTR" PNG, file
            // 2025-04-15, measured; its 720×1280 labels 160 / 80 / 440 / 80, ×1.5.
            tiktok: {
                top: 240,
                right: 120,
                bottom: 660,
                left: 120,
                notch: { y: 840, right: 300 },
                source: 'TikTok Ads video specs, "In-Feed Standard" overlay (file 2025-04-15), measured'
            },
            // https://www.facebook.com/business/ads-guide/update/video/instagram-reels (no page
            // date, read 2026-10-20): "14% of the top, 35% of the bottom, and 6% on each side";
            // same wording on the Instagram and Facebook Stories pages.
            meta: {
                top: 269,
                right: 65,
                bottom: 672,
                left: 65,
                source: 'Meta Ads Guide, Instagram Reels and Stories: 14 % top, 35 % bottom, 6 % sides'
            },
            // https://services.google.com/fh/files/misc/youtubesafezoneoverlay_vertical_final.png,
            // linked from Google Ads Help 13547298 (no file date, read 2026-10-20), measured:
            // safe x 48–888, y 288–1248. Shorts and vertical ads.
            youtube: {
                top: 288,
                right: 192,
                bottom: 672,
                left: 48,
                source: 'Google Ads Help, vertical safe-zone overlay, measured'
            }
        },
        notMeasured: ['LinkedIn', 'X']
    },
    '4:5': {
        reference: [1080, 1350],
        platforms: {},
        // Not measured: no platform publishes a 4:5 zone (Meta Facebook Feed and LinkedIn
        // recommend 4:5 without one, read 2026-10-20). The sides reuse Meta's 6 % Reels figure;
        // 5 % top and bottom is a judgement for in-video controls in feed corners.
        all: {
            top: 68,
            right: 65,
            bottom: 68,
            left: 65,
            source: 'Not measured: no platform publishes one; 6 % sides (Meta Reels), about 5 % top and bottom'
        },
        notMeasured: ['Instagram and Facebook feed', 'LinkedIn feed', 'X timeline']
    },
    '1:1': {
        reference: [1080, 1080],
        platforms: {
            // TikTok Ads safe-zone ZIP "In-Feed with Anchor Standard LTR" (files 2021-04-12, read
            // 2026-10-20): labels on the 640×640 video, left 60, right 140, bottom 297 (4 caption
            // lines; 195 for one), ×1.6875.
            tiktok: {
                top: 0,
                right: 236,
                bottom: 501,
                left: 101,
                source: 'TikTok anchor overlays for square video, 4 caption lines (2021 files)'
            },
            // https://services.google.com/fh/files/misc/youtubesafezoneoverlay-square.png (no file
            // date, read 2026-10-20), measured: x 48–534 from y 48, x 48–979 from y 106, to y 690.
            youtube: {
                // The left half is safe from y 48; 106 keeps the whole width clear.
                top: 106,
                right: 101,
                bottom: 390,
                left: 48,
                source: 'Google Ads Help, square safe-zone overlay, measured'
            }
        },
        notMeasured: ['Instagram and Facebook feed', 'LinkedIn feed', 'X timeline']
    },
    '16:9': {
        reference: [1920, 1080],
        platforms: {
            // Landscape video letterboxed inside TikTok's vertical feed, with the feed's buttons
            // and caption over it: TikTok Ads safe-zone ZIP "In-Feed with Anchor Standard LTR"
            // (files 2021-04-12, read 2026-10-20), labels on the 960×540 video 100 / 212 / 179
            // (4 caption lines; 78 for one), ×2. Only with "safeZone": "tiktok"; not in `all`.
            tiktok: {
                top: 0,
                right: 424,
                bottom: 358,
                left: 200,
                source: 'TikTok anchor overlays for horizontal video in the vertical feed (2021 files)'
            },
            // The regular landscape player: https://services.google.com/fh/files/blogs/
            // ytsafezoneoverlay-horizontal.png, linked from Google Ads Help 13547298 (no file
            // date, read 2026-10-20), measured: x 38–1758 for y 184–694. An ad overlay; on organic
            // long-form the title bar and controls show only on hover or pause, so it is cautious.
            youtube: {
                top: 184,
                right: 162,
                bottom: 386,
                left: 38,
                source: 'Google Ads Help, horizontal safe-zone overlay, measured'
            }
        },
        // `all` is for landscape players. TikTok's 16:9 zone describes the video inside a
        // vertical feed, which would push the right inset to 424 px for every landscape video.
        allFrom: ['youtube'],
        // Not measured: none of these publishes a zone (read 2026-10-20); their controls sit
        // below the video or show only on hover.
        notMeasured: ['LinkedIn feed video', 'X timeline video', 'Facebook feed video']
    }
};
