import { z } from 'zod';

/**
 * A point in the program timeline.
 * - number: absolute program seconds
 * - "phrase": transcript phrase, start of its first word
 * - { say, edge?, occurrence?, offset? }: explicit phrase anchor
 * - { frame }: absolute program frame
 */
export const MotionAnchorShape = z.union([
	z.number(),
	z.string().min(1),
	z.object({
		say: z.string().min(1),
		/** start: first word starts; last: last word starts; end: last word ends. */
		edge: z.enum(['start', 'last', 'end']).optional(),
		occurrence: z.number().int().min(1).optional(),
		offset: z.number().optional()
	}),
	z.object({ frame: z.number().int().min(0), offset: z.number().optional() })
]);
export type MotionAnchor = z.infer<typeof MotionAnchorShape>;

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
	start: z.number().optional()
});
export type MotionFootage = z.infer<typeof MotionFootageShape>;

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
				.regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'cue name: identifier')
				.refine((name) => name !== 'start' && name !== 'end', {
					message: 'cue names "start" and "end" are built in'
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
	audio: footageName.optional()
});
export type MotionClip = z.infer<typeof MotionClipShape>;

export const MotionProjectShape = z.object({
	size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
	fps: z.number().positive(),
	transcript: z.string().optional(),
	fonts: z.array(MotionFontShape).optional(),
	styles: z.array(z.string()).optional(),
	background: z.string().optional(),
	footage: z.record(footageName, MotionFootageShape).optional(),
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
