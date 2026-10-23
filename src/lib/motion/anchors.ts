import { AMBIGUOUS_BAR_ANCHOR, type MotionAnchor } from './project.js';
import { describeWords, findPhrase, suggestPhrases, type MotionWord } from './transcript.js';
import {
	BEAT_OFFSET,
	findBarBeat,
	findBeat,
	nearBeat,
	pickMusic,
	shiftByBeats,
	type MusicBeats
} from './beat-grid.js';

export class AnchorError extends Error {}

export type Window = { from: number; to: number };

/** The music beat anchors may use, and the item's choice among several (a clip's `music`). */
export type BeatContext = { music: MusicBeats[]; clip: string | undefined };

/** No music: beat anchors and beat offsets fail with "add music". */
export const NO_BEATS: BeatContext = { music: [], clip: undefined };

/**
 * Where an anchor is resolved. Program contexts search program words; item-local contexts
 * (cues, keys) search inside the item window and read numbers relative to `localBase`; cut
 * points search the transcript of their source.
 */
export type AnchorContext = {
	words: MotionWord[] | null;
	fps: number;
	/** Phrases are searched only here; null: everywhere. */
	window: Window | null;
	/** Numbers and `{ frame }` are relative to this; null: absolute. */
	localBase: number | null;
	/** What the window is called in messages. Default "clip". */
	scope?: string;
	/** How to get a transcript when there is none. Default: set "transcript" in the project. */
	needs?: string;
	/** Music beats for beat anchors and `"-1b"` offsets (program time). Default: none. */
	beats?: BeatContext;
	/**
	 * The program end in seconds, for `"end"` and `{ program: "end" }`. Undefined: not a program
	 * context, so `"end"` is a phrase; null: a program whose length is not fixed yet.
	 */
	end?: number | null;
	/**
	 * Program seconds of an event a clip's block declares (`{ event, clip }`). Undefined: event
	 * anchors do not work here.
	 */
	event?: (name: string, clip: string) => number;
	/** How a phrase said more than once resolves here; absent: it is ambiguous (see `PhraseOrder`). */
	order?: PhraseOrder;
};

/**
 * Program order for a repeated phrase: items written one after another (shots, clips, sfx) are
 * read in program order, so a phrase said more than once resolves to its first occurrence that
 * starts at or after `after` (the previous item of the same kind, or the item's own start for
 * `until`) instead of being ambiguous. `what` names that point in messages; null `after`: there
 * is none (the first item), so the phrase stays ambiguous. `picked` gets a hint naming the other
 * occurrences, for `check`. An explicit `occurrence` always wins.
 */
export type PhraseOrder = {
	after: number | null;
	what: string;
	picked?: (hint: string) => void;
};

export type AnchorHit = { time: number; end: number; words: MotionWord[] };

/**
 * Where an item stands in program order, for the next item's `PhraseOrder.after`: where its
 * phrase is said, or its time when an offset puts it earlier (a phrase anchor with `"offset":
 * 0.5` still counts from the phrase, so the next item may use the same phrase).
 */
export function orderPoint(hit: AnchorHit): number {
	return hit.words.length ? Math.min(hit.time, hit.words[0].start) : hit.time;
}

/** Says why the program end cannot be read: it is not fixed before the program is resolved. */
export const OPEN_END =
	'The program end is not fixed yet: it needs "cuts" (or footage) or "duration".';

/** Where event anchors work, for anchors used anywhere else. */
export const EVENT_ELSEWHERE =
	'An event anchor ({ "event", "clip" }) works in sfx "at", shots and music keys, not here: the clip it names is placed first.';

/** Whether an anchor is the program end: `"end"` in a program context, or `{ program: "end" }`. */
export function isProgramEnd(anchor: MotionAnchor, ctx: Pick<AnchorContext, 'end'>): boolean {
	if (typeof anchor === 'string') return anchor === 'end' && ctx.end !== undefined;
	return typeof anchor === 'object' && 'program' in anchor;
}

export function resolvePhrase(
	say: string,
	ctx: AnchorContext,
	occurrence: number | undefined
): { start: number; end: number; words: MotionWord[] } {
	const { words, window } = ctx;
	const scope = ctx.scope ?? 'clip';
	if (!words)
		throw new AnchorError(
			`"${say}" needs a transcript; ${ctx.needs ?? 'set "transcript" in the project'}.`
		);
	const hits = findPhrase(words, say, window?.from, window?.to);
	if (!hits.length) {
		const anywhere = window ? findPhrase(words, say) : [];
		const similar = suggestPhrases(words, say, window?.from, window?.to);
		const hint = anywhere.length
			? ` It occurs outside this ${scope} at ${anywhere.map((h) => h.start.toFixed(2) + 's').join(', ')}.`
			: similar.length
				? ` Did you mean ${similar
						.map(
							(h) => `"${h.text}" at ${h.start.toFixed(2)}s (${describeWords(words, h.start, 2)})`
						)
						.join('; ')}?`
				: window
					? ` Words in the ${scope} start: ${describeWords(words, window.from, 6)}`
					: '';
		throw new AnchorError(
			`Phrase "${say}" not found${window ? ` inside the ${scope}` : ''}.${hint}`
		);
	}
	if (occurrence !== undefined) {
		const hit = hits[occurrence - 1];
		if (!hit)
			throw new AnchorError(
				`Phrase "${say}" has only ${hits.length} occurrence(s), asked for #${occurrence}.`
			);
		return hit;
	}
	if (hits.length > 1) {
		const describe = (h: (typeof hits)[number]) =>
			`#${hits.indexOf(h) + 1} at ${h.start.toFixed(2)}s (${describeWords(words, h.start, 2)})`;
		const pin = `{ "say": "${say}", "occurrence": n }`;
		const order = ctx.order;
		const after = order?.after ?? null;
		const hit = after === null ? undefined : hits.find((h) => h.start >= after - 1e-6);
		if (order && hit) {
			order.picked?.(
				`Phrase "${say}" occurs ${hits.length} times; program order picked #${hits.indexOf(hit) + 1} at ${hit.start.toFixed(2)}s, the first at or after ${order.what} (${after!.toFixed(2)}s). Other occurrences: ${hits
					.filter((h) => h !== hit)
					.map(describe)
					.join('; ')}. If that is the wrong one, pin it with ${pin}.`
			);
			return hit;
		}
		const rule = !order
			? ''
			: ` Repeated phrases here resolve to the first occurrence at or after ${order.what}, ${after === null ? 'but there is none' : `but every occurrence is before it (${after.toFixed(2)}s)`}.`;
		throw new AnchorError(
			`Phrase "${say}" is ambiguous: ${hits.map(describe).join('; ')}.${rule} Use a longer phrase or ${pin}.`
		);
	}
	return hits[0];
}

function musicFor(beats: BeatContext, id: string | undefined): MusicBeats {
	return pickMusic(beats.music, id ?? beats.clip);
}

/** Adds seconds, or moves along the beat grid for `"-1b"`. */
function applyOffset(
	time: number,
	offset: number | string | undefined,
	beats: BeatContext,
	id?: string
): number {
	if (offset === undefined) return time;
	if (typeof offset === 'number') return time + offset;
	const m = BEAT_OFFSET.exec(offset);
	if (!m) throw new AnchorError(`Offset "${offset}" must be seconds (-0.2) or beats ("-1b").`);
	const music = musicFor(beats, id);
	return shiftByBeats(music.grid, time, Number(m[1]), music.name);
}

/** Returns seconds: absolute, or relative to `ctx.localBase` for numeric anchors when it is set. */
export function resolveAnchor(
	anchor: MotionAnchor,
	ctx: AnchorContext,
	defaultEdge: 'start' | 'last' | 'end'
): AnchorHit {
	const { fps, localBase } = ctx;
	const beats = ctx.beats ?? NO_BEATS;
	if (typeof anchor === 'number') {
		const time = localBase === null ? anchor : localBase + anchor;
		return { time, end: time, words: [] };
	}
	if (isProgramEnd(anchor, ctx)) {
		if (ctx.end === undefined || ctx.end === null)
			throw new AnchorError(
				ctx.end === null
					? OPEN_END
					: 'The program end ("end") is an anchor of a program (with "cuts" or "shots"): in "from" and "until" of clips, shots and music, in keys and in sfx "at".'
			);
		const offset = typeof anchor === 'object' && 'program' in anchor ? anchor.offset : undefined;
		const time = applyOffset(ctx.end, offset, beats);
		return { time, end: time, words: [] };
	}
	if (typeof anchor === 'string') anchor = { say: anchor };
	if ('event' in anchor) {
		if (!ctx.event) throw new AnchorError(EVENT_ELSEWHERE);
		const time = applyOffset(ctx.event(anchor.event, anchor.clip), anchor.offset, beats);
		return { time, end: time, words: [] };
	}
	if ('program' in anchor) throw new AnchorError(OPEN_END);
	if ('frame' in anchor) {
		// Program frame for clip ranges, clip-local frame for cues (like numbers).
		const time = applyOffset((localBase ?? 0) + anchor.frame / fps, anchor.offset, beats);
		return { time, end: time, words: [] };
	}
	if ('bar' in anchor || 'downbeat' in anchor || 'beat' in anchor) {
		if (
			'bar' in anchor &&
			('at' in anchor || 'downbeat' in anchor || typeof anchor.beat === 'string')
		)
			throw new AnchorError(AMBIGUOUS_BAR_ANCHOR);
		// Beats are absolute: bar 5 is bar 5 wherever the item is.
		const music = musicFor(beats, anchor.music);
		let base: number;
		if ('bar' in anchor)
			base = findBarBeat(music.grid, anchor.bar, anchor.beat ?? 1, music.name).time;
		else if ('downbeat' in anchor || typeof anchor.beat === 'string') {
			const direction =
				'downbeat' in anchor ? anchor.downbeat : (anchor.beat as 'after' | 'before');
			// `at` keeps the caller's edge: in `until` a phrase means its end, so the downbeat after
			// it never cuts the phrase short. `{ say, edge }` still picks another edge.
			const at = resolveAnchor(anchor.at, ctx, defaultEdge).time;
			base = nearBeat(
				music.grid,
				at,
				'downbeat' in anchor ? 'downbeat' : 'beat',
				direction,
				music.name
			).time;
		} else base = findBeat(music.grid, anchor.beat, music.name).time;
		const time = applyOffset(base, anchor.offset, beats, anchor.music);
		return { time, end: time, words: [] };
	}
	const hit = resolvePhrase(anchor.say, ctx, anchor.occurrence);
	const edge = anchor.edge ?? defaultEdge;
	const base =
		edge === 'start'
			? hit.start
			: edge === 'last'
				? hit.words[hit.words.length - 1].start
				: hit.end;
	const time = applyOffset(base, anchor.offset, beats);
	return { time, end: hit.end, words: hit.words };
}
