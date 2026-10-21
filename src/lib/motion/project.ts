import { z } from 'zod';

/** Seconds (`-0.1`) or beats of the music (`"-1b"`, `"0.5b"`) added to an anchor. */
const AnchorOffsetShape = z.union([
	z.number(),
	z.string().regex(/^[+-]?\d*\.?\d+b$/, 'offset: seconds as a number, or beats such as "-1b"')
]);

/** Which music item's beats an anchor uses; needed only when several music items have beats. */
const musicRef = z.string().min(1).optional();

/**
 * A point in the program timeline.
 * - number: absolute program seconds
 * - "phrase": transcript phrase, start of its first word
 * - { say, edge?, occurrence?, offset? }: explicit phrase anchor
 * - { frame }: absolute program frame
 * - { beat: 17 }: the 17th beat of the music; { bar: 5 } its downbeat, { bar: 5, beat: 3 }
 * - { downbeat: "after", at }, { beat: "before", at }: nearest (down)beat to another anchor
 * `offset` is seconds or beats ("-1b").
 */
export type MotionAnchor =
	| number
	| string
	| {
			say: string;
			edge?: 'start' | 'last' | 'end';
			occurrence?: number;
			offset?: number | string;
	  }
	| { frame: number; offset?: number | string }
	| { bar: number; beat?: number; music?: string; offset?: number | string }
	| { beat: number; music?: string; offset?: number | string }
	| {
			downbeat: 'after' | 'before';
			at: MotionAnchor;
			music?: string;
			offset?: number | string;
	  }
	| {
			beat: 'after' | 'before';
			at: MotionAnchor;
			music?: string;
			offset?: number | string;
	  };

/** `{ bar, beat: "after", at }` would silently lose `bar`; such anchors are refused. */
export const AMBIGUOUS_BAR_ANCHOR =
	'An anchor with "bar" cannot also have "at", "downbeat" or "beat": "after"/"before". Use { "bar": 5, "beat": 3 } for a beat in a bar, or { "beat": "after", "at": … } for the beat after a moment.';

const isAmbiguousBar = (value: unknown) =>
	typeof value === 'object' &&
	value !== null &&
	'bar' in value &&
	('at' in value || 'downbeat' in value || typeof (value as { beat?: unknown }).beat === 'string');

export const MotionAnchorShape: z.ZodType<MotionAnchor> = z.lazy(() =>
	z
		.unknown()
		.refine((value) => !isAmbiguousBar(value), { message: AMBIGUOUS_BAR_ANCHOR, abort: true })
		.pipe(
			z.union([
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
			])
		)
);

/** Words pulled from the transcript: a phrase, a range, or every word in the clip. */
export const MotionWordsShape = z.union([
	z.literal('clip'),
	z.string().min(1),
	z.object({ from: MotionAnchorShape, until: MotionAnchorShape })
]);
export type MotionWords = z.infer<typeof MotionWordsShape>;

export const MotionFontShape = z.object({
	family: z.string().min(1),
	src: z.string().min(1),
	weight: z.union([z.number(), z.string()]).optional(),
	style: z.enum(['normal', 'italic']).optional()
});
export type MotionFont = z.infer<typeof MotionFontShape>;

const footageName = z
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
	margin: z.union([z.number().min(0), z.literal('all')]).optional()
});
export type MotionFootage = z.infer<typeof MotionFootageShape>;

const musicId = z
	.string()
	.regex(/^[A-Za-z_][A-Za-z0-9_-]*$/, 'music id: letters, digits, dash, underscore');

/**
 * A music item. For now it only times things: beat anchors read its beats file (made by
 * `visualfries beats`); render does not mix it yet. Corrections fix what the analyzer got wrong
 * without touching the beats file, so re-analysis keeps them.
 */
export const MotionMusicShape = z.object({
	/** Name for beat anchors (`"music": "bed"`) when several music items have beats. */
	id: musicId.optional(),
	src: z.string().min(1),
	/** Beats file next to the music (`music.beats.json`), relative to the project. */
	beats: z.string().min(1).optional(),
	/** Program seconds at which the music file's first sample plays. Default 0. */
	from: z.number().optional(),
	/** Program seconds at which the music stops; beats after it do not exist. */
	until: z.number().optional(),
	/** Seconds added to every beat. */
	shift: z.number().optional(),
	/** Which beat of the bar is really beat 1 (counted after `tempo`). */
	downbeat: z.number().int().min(1).optional(),
	/** The analyzer found half (`double`) or twice (`half`) the real tempo. */
	tempo: z.enum(['double', 'half']).optional()
});
export type MotionMusic = z.infer<typeof MotionMusicShape>;

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
		.record(
			z
				.string()
				.regex(
					/^[\p{L}_][\p{L}\p{N}_ ]*$/u,
					'cue name: letters (any language), digits, _ and spaces, not starting with a digit — e.g. "nových odberateľov" or "extra_2"'
				)
				.refine((name) => name === name.trim(), {
					message: 'cue name: no leading or trailing spaces'
				})
				.refine((name) => name !== 'start' && name !== 'end', {
					message: 'cue names "start" and "end" are built in'
				})
				.refine((name) => !/^(beat|bar) +\d+$/.test(name), {
					message: 'cue names like "bar 5" or "beat 17" read as music beats'
				}),
			MotionAnchorShape
		)
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
	music: musicId.optional()
});
export type MotionClip = z.infer<typeof MotionClipShape>;

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
					.record(
						z
							.string()
							.regex(/^[a-z][a-z0-9-]*$/, 'extra colour name: lowercase letters, digits, dash'),
						colorValue
					)
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
export type Brand = z.infer<typeof BrandShape>;

export const ENERGIES = ['calm', 'balanced', 'punchy'] as const;
export type Energy = (typeof ENERGIES)[number];

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
export type Style = z.infer<typeof StyleShape>;

/** Where the project's safe insets come from: every platform at once, or one platform. */
export const SafeZoneShape = z.enum(['all', 'tiktok', 'meta', 'youtube']);

export const MotionProjectShape = z.object({
	size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
	fps: z.number().positive(),
	transcript: z.string().optional(),
	fonts: z.array(MotionFontShape).optional(),
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
	clips: z.array(MotionClipShape).min(1)
});
export type MotionProject = z.infer<typeof MotionProjectShape>;

export function isMotionProject(value: unknown): boolean {
	return (
		!!value &&
		typeof value === 'object' &&
		Array.isArray((value as { clips?: unknown }).clips) &&
		!('layers' in (value as object))
	);
}
