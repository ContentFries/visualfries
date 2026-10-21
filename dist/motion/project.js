import { z } from 'zod';
import { ENERGIES } from './energy.js';
import { CutShape, KeyShape, MixShape, ProvenanceShape, SfxShape, ShotShape, TransitionShape } from './timeline.js';
// timeline.ts reads this file's anchor shape, so its shapes are read through z.lazy here.
const timeline = (shape) => z.lazy(shape);
/** Seconds (`-0.1`) or beats of the music (`"-1b"`, `"0.5b"`) added to an anchor. */
const AnchorOffsetShape = z.union([
    z.number(),
    z.string().regex(/^[+-]?\d*\.?\d+b$/, 'offset: seconds as a number, or beats such as "-1b"')
]);
/** Which music item's beats an anchor uses; needed only when several music items have beats. */
const musicRef = z.string().min(1).optional();
/** `{ bar, beat: "after", at }` would silently lose `bar`; such anchors are refused. */
export const AMBIGUOUS_BAR_ANCHOR = 'An anchor with "bar" cannot also have "at", "downbeat" or "beat": "after"/"before". Use { "bar": 5, "beat": 3 } for a beat in a bar, or { "beat": "after", "at": … } for the beat after a moment.';
const isAmbiguousBar = (value) => typeof value === 'object' &&
    value !== null &&
    'bar' in value &&
    ('at' in value || 'downbeat' in value || typeof value.beat === 'string');
export const MotionAnchorShape = z.lazy(() => z
    .unknown()
    .refine((value) => !isAmbiguousBar(value), { message: AMBIGUOUS_BAR_ANCHOR, abort: true })
    .pipe(z.union([
    z.number(),
    z.string().min(1),
    z.object({
        say: z.string().min(1),
        /** start: first word starts; last: last word starts; end: last word ends. */
        edge: z.enum(['start', 'last', 'end']).optional(),
        occurrence: z.number().int().min(1).optional(),
        offset: AnchorOffsetShape.optional()
    }),
    z.object({ frame: z.number().int().min(0), offset: AnchorOffsetShape.optional() }),
    z.object({
        bar: z.number().int().min(0),
        /** Beat inside the bar; default 1 (the downbeat). */
        beat: z.number().int().min(1).optional(),
        music: musicRef,
        offset: AnchorOffsetShape.optional()
    }),
    z.object({
        beat: z.number().int().min(1),
        music: musicRef,
        offset: AnchorOffsetShape.optional()
    }),
    z.object({
        downbeat: z.enum(['after', 'before']),
        at: MotionAnchorShape,
        music: musicRef,
        offset: AnchorOffsetShape.optional()
    }),
    z.object({
        beat: z.enum(['after', 'before']),
        at: MotionAnchorShape,
        music: musicRef,
        offset: AnchorOffsetShape.optional()
    })
])));
/** Words pulled from the transcript: a phrase, a range, or every word in the clip. */
export const MotionWordsShape = z.union([
    z.literal('clip'),
    z.string().min(1),
    z.object({ from: MotionAnchorShape, until: MotionAnchorShape })
]);
export const MotionFontShape = z.object({
    family: z.string().min(1),
    src: z.string().min(1),
    weight: z.union([z.number(), z.string()]).optional(),
    style: z.enum(['normal', 'italic']).optional()
});
export const footageName = z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_-]*$/, 'footage name: letters, digits, dash, underscore');
/**
 * A video the blocks draw frame by frame, e.g. the talking head the transcript belongs to.
 * `matte` is a greyscale video of the same footage (white = subject); with it, blocks can draw
 * the subject alone in front of anything (`visualfries matte` makes one).
 */
export const MotionFootageShape = z.object({
    src: z.string().min(1),
    matte: z.string().min(1).optional(),
    /** Program seconds at which the footage's first frame plays. Default 0. */
    start: z.number().optional(),
    /**
     * Seconds extracted before and after the clips that use the footage. Default 2. Raise it for
     * `<Footage offset>` larger than that, or use "all" for blocks that jump around in it.
     */
    margin: z.union([z.number().min(0), z.literal('all')]).optional(),
    /** This source's own transcript (source time); the cut list maps it to program time. */
    transcript: z.string().optional(),
    /** Where generated footage came from. */
    provenance: timeline(() => ProvenanceShape).optional(),
    /** A separate sound file for this source (e.g. the microphone), or false: no sound. */
    audio: z.union([z.string().min(1), z.literal(false)]).optional()
});
const musicId = z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_-]*$/, 'music id: letters, digits, dash, underscore');
/**
 * A music item. Beat anchors read its beats file (made by `visualfries beats`); a program render
 * mixes it at one steady level under the speech (`mix.music`), with its own gain, fades and gain
 * keys on top. Corrections fix what the analyzer got wrong without touching the beats file, so
 * re-analysis keeps them.
 */
export const MotionMusicShape = z
    .object({
    /** Name for beat anchors (`"music": "bed"`) when several music items have beats. */
    id: musicId.optional(),
    src: z.string().min(1),
    /** Beats file next to the music (`music.beats.json`), relative to the project. */
    beats: z.string().min(1).optional(),
    /**
     * Where the music starts in the program: seconds, a frame, a phrase or a beat of another
     * music item. Default 0. A negative number starts inside the file.
     */
    from: MotionAnchorShape.optional(),
    /** Seconds into the music file that play at `from`. Default 0. */
    in: z.number().min(0).optional(),
    /**
     * Where the music stops (any anchor; its own beats by default); later beats do not exist.
     * Default: the program end. The end then snaps to a bar end (see `snap`).
     */
    until: MotionAnchorShape.optional(),
    /**
     * `"bar"`: the music ends (its fade-out done) on the bar end nearest to `until` or the
     * program end, never after the program end. Default when its beats have downbeats; `false`
     * keeps the exact end.
     */
    snap: z.union([z.literal('bar'), z.literal(false)]).optional(),
    /** Seconds added to every beat. */
    shift: z.number().optional(),
    /** Which beat of the bar is really beat 1 (counted after `tempo`). */
    downbeat: z.number().int().min(1).optional(),
    /** The analyzer found half (`double`) or twice (`half`) the real tempo. */
    tempo: z.enum(['double', 'half']).optional(),
    /** dB on top of the project's music level (`mix.music`). */
    gain: z.number().optional(),
    /** Seconds the music fades in at its start and out at its end. Default 0.01 and 1. */
    fade: z
        .object({ in: z.number().min(0).optional(), out: z.number().min(0).optional() })
        .strict()
        .optional(),
    /**
     * Explicit level changes, dB on top of `gain` (a music-only intro, say): the level moves in a
     * straight line (in dB) from key to key and holds before the first and after the last.
     */
    keys: z.array(z.object({ at: MotionAnchorShape, gain: z.number() }).strict()).optional(),
    /** Where generated music came from. */
    provenance: timeline(() => ProvenanceShape).optional()
})
    // Unknown fields are errors: a typo ("gian") must not pass silently.
    .strict();
export const MotionClipShape = z.object({
    id: z.string().regex(/^[A-Za-z0-9._-]+$/, 'clip id: letters, digits, dot, dash, underscore'),
    block: z.string().min(1),
    from: MotionAnchorShape,
    until: MotionAnchorShape,
    /** Seconds added after `until` (negative trims). */
    tail: z.number().optional(),
    /**
     * Phrases are searched inside the clip. Numbers are clip-local seconds and `{ frame }` is a
     * clip-local frame. "start" and "end" are built in.
     */
    cues: z
        .record(z
        .string()
        .regex(/^[\p{L}_][\p{L}\p{N}_ ]*$/u, 'cue name: letters (any language), digits, _ and spaces, not starting with a digit — e.g. "nových odberateľov" or "extra_2"')
        .refine((name) => name === name.trim(), {
        message: 'cue name: no leading or trailing spaces'
    })
        .refine((name) => name !== 'start' && name !== 'end', {
        message: 'cue names "start" and "end" are built in'
    })
        .refine((name) => !/^(beat|bar) +\d+$/.test(name), {
        message: 'cue names like "bar 5" or "beat 17" read as music beats'
    }), MotionAnchorShape)
        .optional(),
    words: z.record(z.string(), MotionWordsShape).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    /** Transparent background; rendered as ProRes 4444 .mov. */
    alpha: z.boolean().optional(),
    background: z.string().optional(),
    /** Name of a footage whose sound is muxed into the rendered clip. */
    audio: footageName.optional(),
    /**
     * Id of the music whose beats this clip's anchors, moments, `clip.beats` and `clip.pulse()`
     * use. Needed only when several music items have beats.
     */
    music: musicId.optional(),
    /** Program mode: the area a shot frees that this clip fills (e.g. "panel"). */
    slot: z.string().min(1).optional(),
    /** "behind": between the footage and the subject cut out by its matte. Default front. */
    layer: z.enum(['front', 'behind']).optional(),
    /** Handoff from every layer below into this clip. */
    transition: timeline(() => TransitionShape).optional(),
    keys: timeline(() => z.array(KeyShape)).optional(),
    /** false: always rendered to pixels in editor packages. */
    native: z.boolean().optional()
});
// ---------------------------------------------------------------- brand and style
const colorValue = z.string().min(1);
const logoVariants = z
    .object({
    /** The logo for light backgrounds. */
    light: z.string().min(1).optional(),
    /** The logo for dark backgrounds. */
    dark: z.string().min(1).optional()
})
    .strict();
/**
 * A creator's identity: colours in fixed roles, fonts, logo, corner radius. Blocks read it as
 * `--brand-*` CSS custom properties and as `clip.brand`. Any colour may be a CSS gradient. File
 * paths are relative to the brand file (or to the project for an inline brand).
 */
export const BrandShape = z
    .object({
    name: z.string().optional(),
    colors: z
        .object({
        primary: colorValue,
        accent: colorValue,
        background: colorValue,
        surface: colorValue,
        text: colorValue,
        muted: colorValue,
        /** Readable text on `primary`; derived from the brand when left out. */
        onPrimary: colorValue.optional(),
        /** Readable text on `accent`; derived from the brand when left out. */
        onAccent: colorValue.optional(),
        extra: z
            .record(z
            .string()
            .regex(/^[a-z][a-z0-9-]*$/, 'extra colour name: lowercase letters, digits, dash'), colorValue)
            .optional()
    })
        .strict(),
    fonts: z
        .object({
        heading: MotionFontShape,
        body: MotionFontShape,
        mono: MotionFontShape.optional()
    })
        .strict(),
    logo: z
        .object({ full: logoVariants.optional(), mark: logoVariants.optional() })
        .strict()
        .optional(),
    /** Corner radius: px as a number, or any CSS length. */
    radius: z.union([z.number().min(0), z.string().min(1)]).optional()
})
    .strict();
/**
 * A creator's editing grammar. `extends` names a built-in style or a style file (relative to
 * the file that names it); this layer then changes only what differs. Later layers win; arrays
 * replace whole, objects merge key by key. Only `energy` is read today; the other sections are
 * reserved so style files can already carry them.
 */
export const StyleShape = z
    .object({
    name: z.string().optional(),
    extends: z.string().min(1).optional(),
    /** Durations, eases, overshoot and stagger of built-in motion. */
    energy: z.enum(ENERGIES).optional(),
    transitions: z.unknown().optional(),
    shots: z.unknown().optional(),
    captions: z.unknown().optional(),
    sounds: z.unknown().optional(),
    emphasis: z.unknown().optional(),
    overlays: z.unknown().optional()
})
    .strict();
/** Where the project's safe insets come from: every platform at once, or one platform. */
export const SafeZoneShape = z.enum(['all', 'tiktok', 'meta', 'youtube']);
const MotionProjectFields = z.object({
    size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
    fps: z.number().positive(),
    transcript: z.string().optional(),
    fonts: z.array(MotionFontShape).optional(),
    /** Global CSS files loaded into every block (themes, shared classes). */
    css: z.array(z.string()).optional(),
    /** Deprecated name of `css`; parsed into `css`. */
    styles: z.array(z.string()).optional(),
    background: z.string().optional(),
    footage: z.record(footageName, MotionFootageShape).optional(),
    music: z.array(MotionMusicShape).optional(),
    /** A brand file (path relative to the project) or an inline brand. */
    brand: z.union([z.string().min(1), BrandShape]).optional(),
    /**
     * A built-in style name, a style file, or an inline style; inline, it is the project's own
     * layer on top of what it `extends`.
     */
    style: z.union([z.string().min(1), StyleShape]).optional(),
    /** Safe insets for blocks: `all` (default) or one platform. */
    safeZone: SafeZoneShape.optional(),
    /** May be empty when `cuts` or `shots` describe the program. */
    clips: z.array(MotionClipShape).default([]),
    /** The cut list: ranges of raw sources that make up the program's footage. */
    cuts: timeline(() => z.array(CutShape)).optional(),
    shots: timeline(() => z.array(ShotShape)).optional(),
    sfx: timeline(() => z.array(SfxShape)).optional(),
    /** Levels of the program mix and the loudness of the finished video. */
    mix: timeline(() => MixShape).optional(),
    /** Program seconds when there is no cut list. Default: the latest end of clips or music. */
    duration: z.number().positive().optional()
});
/**
 * The project file: clips (inserts mode), or a whole program described by a cut list or a shots
 * track. `styles` (the CSS list's old name) is still read and becomes `css`, so nothing after
 * parsing sees it; `style` is the video style.
 */
export const MotionProjectShape = MotionProjectFields.superRefine((p, ctx) => {
    if (!p.clips.length && !p.cuts?.length && !p.shots?.length)
        ctx.addIssue({
            code: 'custom',
            path: ['clips'],
            message: 'Add at least one clip, or "cuts" or "shots" for a whole program.'
        });
    if (p.css !== undefined && p.styles !== undefined)
        ctx.addIssue({
            code: 'custom',
            path: ['styles'],
            message: '"styles" is the old name of "css" (the CSS files); the project has both. Move the files to "css" and remove "styles".'
        });
}).transform(({ styles, ...project }) => styles !== undefined ? { ...project, css: styles } : project);
export function isMotionProject(value) {
    return (!!value &&
        typeof value === 'object' &&
        ['clips', 'cuts', 'shots'].some((key) => Array.isArray(value[key])) &&
        !('layers' in value));
}
