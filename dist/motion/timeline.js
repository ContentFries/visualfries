import { z } from 'zod';
import { MotionAnchorShape, MotionProjectShape, footageName } from './project.js';
// project.ts builds its project shape from these shapes and these read its anchor shape: the
// references go through z.lazy so either module may load first.
const anchor = z.lazy(() => MotionAnchorShape);
const footage = z.lazy(() => footageName);
const itemId = z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/, 'item id: letters, digits, dot, dash, underscore');
/**
 * A point in a source's own time (cut `in`/`out`, a shot's source `in`).
 * - number: seconds in the raw file
 * - "phrase": words of that source's transcript
 * - { say, edge?, occurrence?, offset? }: explicit phrase anchor
 * - { frame }: frame of the raw file at the project frame rate
 */
export const SourceTimeShape = z.union([
    z.number().min(0),
    z.string().min(1),
    z.object({
        say: z.string().min(1),
        edge: z.enum(['start', 'last', 'end']).optional(),
        occurrence: z.number().int().min(1).optional(),
        offset: z.number().optional()
    }),
    z.object({ frame: z.number().int().min(0), offset: z.number().optional() })
]);
const beatMusic = z.string().min(1).optional();
const beatOffset = z.union([
    z.number(),
    z.string().regex(/^[+-]?\d*\.?\d+b$/, 'offset: seconds as a number, or beats such as "-1b"')
]);
/**
 * A cut's `out` on the music, in program time: the cut ends (and the next one starts) on the
 * frame nearest that beat. `{ bar, beat? }` and `{ beat: n }` name a beat; `{ downbeat | beat:
 * "after" | "before", at }` take the nearest one to `at`, a point in the cut's own source.
 */
export const CutBeatShape = z.union([
    z
        .object({
        bar: z.number().int().min(0),
        beat: z.number().int().min(1).optional(),
        music: beatMusic,
        offset: beatOffset.optional()
    })
        .strict(),
    z
        .object({ beat: z.number().int().min(1), music: beatMusic, offset: beatOffset.optional() })
        .strict(),
    z
        .object({
        downbeat: z.enum(['after', 'before']),
        at: SourceTimeShape,
        music: beatMusic,
        offset: beatOffset.optional()
    })
        .strict(),
    z
        .object({
        beat: z.enum(['after', 'before']),
        at: SourceTimeShape,
        music: beatMusic,
        offset: beatOffset.optional()
    })
        .strict()
]);
/** A cut point: source time, or (for `out`) a beat of the music. One flat union for errors. */
const CutPointShape = z.union([...SourceTimeShape.options, ...CutBeatShape.options]);
/** A cut point on the music rather than in the source. */
export const isCutBeat = (point) => typeof point === 'object' && ('bar' in point || 'beat' in point || 'downbeat' in point);
/** A moment of the item itself ("start", "end", "mid", "2.5s", "f12", a cue of a clip). */
export const MomentAnchorShape = z.object({ moment: z.string().min(1) });
/**
 * Anchor inside an item (keys): numbers are item-local seconds, `{ frame }` an item-local frame,
 * phrases are searched inside the item, `{ moment }` uses the moment grammar.
 */
export const ItemAnchorShape = z.union([anchor, MomentAnchorShape]);
/** Built-in transitions; a path ("transitions/My.svelte") names a custom one. */
export const TRANSITIONS = [
    'wipe',
    'push',
    'zoom-through',
    'shape-mask',
    'blinds',
    'card'
];
/** Built-in shots; a path ("shots/My.ts") names a custom one. */
export const SHOTS = ['full', 'punch', 'strip', 'window', 'behind', 'whip'];
/**
 * The handoff into the item that carries it. A name ("push") or the full form. It never changes
 * program time and never touches audio.
 */
export const TransitionShape = z.union([
    z.string().min(1),
    z.object({
        /** Built-in name or "transitions/My.svelte". */
        type: z.string().min(1),
        /** Seconds. Default: the transition's own, then the style's energy. */
        duration: z.number().positive().optional(),
        /** Where the window sits on the cut. Default center. */
        align: z.enum(['center', 'start', 'end']).optional(),
        direction: z.enum(['forward', 'back', 'left', 'right', 'up', 'down']).optional(),
        ease: z.string().optional(),
        params: z.record(z.string(), z.unknown()).optional(),
        /** false: silent; a name: this sound instead of the style's. */
        sound: z.union([z.literal(false), z.string()]).optional(),
        native: z.boolean().optional()
    })
]);
/** Pixels of the format frame, or a percentage of it ("12.5%"). */
const Length = z.union([z.number(), z.string().regex(/^-?\d*\.?\d+%$/, 'length: number or "12%"')]);
/** A keyframe of an item's placement or of the props its block marks animatable. */
export const KeyShape = z.object({
    at: ItemAnchorShape,
    x: Length.optional(),
    y: Length.optional(),
    scale: z.number().positive().optional(),
    rotation: z.number().optional(),
    opacity: z.number().min(0).max(1).optional(),
    /** Only props the block marks animatable. */
    props: z.record(z.string(), z.unknown()).optional(),
    /** Ease of the segment arriving at this key. */
    ease: z.string().optional(),
    /** Colour space colours mix in. Default oklch (keeps the midpoint saturated). */
    mix: z.enum(['oklab', 'oklch']).optional()
});
/** One range of a raw source in the cut list. `in`/`out` are source time. */
export const CutShape = z.object({
    id: itemId.optional(),
    source: footage,
    /** Default 0; a phrase starts at its first word ("start"). A beat here is an error. */
    in: CutPointShape.optional(),
    /**
     * Default the end of the source; a phrase ends after its last word ("end"), searched from
     * `in`. A beat of the music (`{ "bar": 5 }`) ends the cut on that beat's frame.
     */
    out: CutPointShape.optional(),
    /**
     * Seconds the picture holds the cut's last frame after `out`, silent (rounded to frames).
     * Program time runs on; effects and music keep playing.
     */
    hold: z.number().min(0).max(60, 'hold: at most 60 seconds').optional(),
    transition: TransitionShape.optional(),
    audio: z
        .object({
        /** Seconds the audio edit point moves: negative is a J cut (audio leads), positive an L cut. */
        split: z.number().optional(),
        /** Anti-click crossfade in seconds, equal power. Default 0.01. */
        crossfade: z.number().min(0).max(0.5).optional(),
        /** dB. */
        gain: z.number().optional(),
        mute: z.boolean().optional()
    })
        .optional(),
    native: z.boolean().optional()
});
/** Seconds of a speaker's move off or onto the frame, or seconds with an ease. */
const AwayMoveShape = z.union([
    z.number().min(0).max(2, 'at most 2 seconds'),
    z
        .object({
        seconds: z.number().min(0).max(2, 'at most 2 seconds'),
        ease: z.string().min(1).optional()
    })
        .strict()
]);
/**
 * A stretch of a shot with the speaker off the frame: wholly gone from `from` (the exit ends
 * there) until `until` (the way back in starts there). Program time, like the shot's own range.
 */
const AwayShape = z
    .object({
    from: anchor,
    until: anchor,
    /** left | right | bottom. Default: the edge nearest to the speaker. */
    side: z.enum(['left', 'right', 'bottom']).optional(),
    /** Default 0.16 s, power2.in. */
    exit: AwayMoveShape.optional(),
    /** Default 0.22 s, expo.out. */
    enter: AwayMoveShape.optional()
})
    .strict();
/** How footage is framed from `from` until `until` (program time). */
export const ShotShape = z.object({
    id: itemId.optional(),
    /** full | punch | strip | window | behind | whip | "shots/My.ts" */
    shot: z.string().min(1),
    from: anchor,
    until: anchor,
    /** Footage to frame instead of what the cut list shows; `in` is its source time at `from`. */
    source: z
        .union([footage, z.object({ name: footage, in: SourceTimeShape.optional() })])
        .optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    /** Seconds the layout moves from the previous shot; 0 = hard. */
    morph: z.number().min(0).optional(),
    transition: TransitionShape.optional(),
    keys: z.array(KeyShape).optional(),
    /** Stretches with the speaker off the frame, in program order (shots that cut him out). */
    away: z.array(AwayShape).optional(),
    native: z.boolean().optional()
});
/** Where generated material came from (provider, model, prompt, seed …). */
export const ProvenanceShape = z.looseObject({
    provider: z.string().min(1),
    model: z.string().optional(),
    prompt: z.string().optional(),
    seed: z.union([z.number(), z.string()]).optional()
});
/**
 * A sound effect at a program moment. `sound` is a sound file relative to the project; when a
 * sound library's `sounds.json` lists it, its hit (not its first sample) lands on `at`.
 */
export const SfxShape = z.object({
    id: itemId.optional(),
    at: anchor,
    sound: z.string().min(1),
    /** dB on top of the global SFX level. */
    gain: z.number().optional()
});
/**
 * A range of the program rendered as a video of its own (a teaser), in its own format, with an
 * optional end card after it. `from` and `until` are program anchors, resolved in the whole
 * program; the excerpt is that program sliced (see `excerpt.ts`).
 */
export const ExcerptShape = z
    .object({
    id: itemId,
    from: anchor,
    until: anchor,
    /** Frame size, "1080x1920"; default the project size. `--format` overrides it. */
    format: z
        .string()
        .regex(/^\d+x\d+$/, 'format: WIDTHxHEIGHT, e.g. "1080x1920"')
        .optional(),
    /** A card after the slice, over its held last frame. */
    end: z
        .object({
        /** Seconds. */
        duration: z.number().positive().max(30, 'end.duration: at most 30 seconds'),
        /** Default "@visualfries/end-card". */
        block: z.string().min(1).optional(),
        props: z.record(z.string(), z.unknown()).optional(),
        /** A sound effect on the card's first frame (relative to the project). */
        sound: z.string().min(1).optional(),
        /** dB on top of the global SFX level. */
        gain: z.number().optional()
    })
        .strict()
        .optional()
})
    // Unknown fields are errors: a typo ("untill") must not pass silently.
    .strict();
/**
 * Levels of the program mix. Effects and music sit at a steady level relative to the speech
 * (its integrated loudness as cut); the finished video is then brought to `loudness` with its
 * true peak at or under `truePeak`.
 */
export const MixShape = z
    .object({
    /** dB of each effect's loudest 100 ms under the speech loudness. Default -10. */
    sfx: z.number().optional(),
    /** dB of each music item's integrated loudness under the speech loudness. Default -15. */
    music: z.number().optional(),
    /** Integrated loudness of the finished video, LUFS. Default -14. */
    loudness: z.number().max(0).optional(),
    /** True-peak ceiling of the finished video, dBTP. Default -1. */
    truePeak: z.number().max(0).optional()
})
    .strict();
/** Program mode: the project describes the whole program (a cut list or a shots track). */
export function isProgramProject(project) {
    return !!(project.cuts?.length || project.shots?.length);
}
function issuePath(base, path) {
    return [...base, ...path]
        .map((p, i) => (typeof p === 'number' ? `[${p}]` : i ? `.${String(p)}` : String(p)))
        .join('');
}
/**
 * One line per problem. For alternatives (an anchor is a number, a phrase, `{ say }` or
 * `{ frame }`) the alternative that got furthest is reported, not every alternative's complaint.
 */
function describeIssues(issues, base = []) {
    const lines = [];
    for (const issue of issues) {
        const at = [...base, ...issue.path];
        if (issue.code === 'invalid_union' && issue.errors.length) {
            const depth = (branch) => Math.max(...branch.map((i) => i.path.length));
            const deep = issue.errors.filter((branch) => depth(branch) > 0);
            if (deep.length) {
                const best = [...deep].sort((a, b) => depth(b) - depth(a) || a.length - b.length)[0];
                lines.push(...describeIssues(best, at));
            }
            else {
                const expected = [
                    ...new Set(issue.errors.flatMap((branch) => branch.map((i) => (i.code === 'invalid_type' ? i.expected : i.message))))
                ];
                const list = expected.length > 1
                    ? `${expected.slice(0, -1).join(', ')} or ${expected[expected.length - 1]}`
                    : expected[0];
                lines.push(`${issuePath(at, []) || '(project)'}: expected ${list}.`);
            }
            continue;
        }
        if ((issue.code === 'invalid_key' || issue.code === 'invalid_element') && issue.issues.length) {
            // A record key that breaks the key's rule (e.g. a footage name with a space).
            for (const line of describeIssues(issue.issues))
                lines.push(`${issuePath(at, []) || '(project)'}: ${line.replace(/^\(project\): /, '')}`);
            continue;
        }
        lines.push(`${issuePath(at, []) || '(project)'}: ${issue.message}`);
    }
    return lines;
}
/** Parses a project file's JSON, with one readable line per problem instead of zod's dump. */
export function parseMotionProject(value, file = 'Project') {
    const parsed = MotionProjectShape.safeParse(value);
    if (parsed.success)
        return parsed.data;
    throw new Error(`${file} is not a valid motion project:\n` +
        [...new Set(describeIssues(parsed.error.issues))].map((l) => `  ${l}`).join('\n'));
}
