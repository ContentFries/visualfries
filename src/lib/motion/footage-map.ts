import type { ResolvedProgram } from './program.js';

/**
 * Which source frame the program shows at each program frame. Pure and shared by the node
 * tooling (what to extract) and the page (what to draw), so both always agree.
 *
 * Inside a cut, program frame f shows source frame `srcIn + (f − startFrame)`. The same formula
 * runs on into the handles a transition window shows before and after the cut, and where the
 * source runs out its edge frame holds. A cut with a `hold` stops at its last source frame,
 * which holds through the hold and any handle after it. A shot with its own `source` frames that source instead
 * of the cut list's, from its `in` at the shot start.
 */

/** A program range where one source is the picture: a cut, or a shot with its own source. */
export type FootageSpan = {
	/** Cut or shot id. */
	owner: string;
	kind: 'cut' | 'shot';
	source: string;
	/** Program frames where it is the picture. */
	startFrame: number;
	frames: number;
	/** Source frame shown at `startFrame` (project rate). */
	srcIn: number;
	/**
	 * A cut with a hold: its last source frame, which holds from there on (also into the handle
	 * a transition out of it shows). Absent: the source runs on.
	 */
	last?: number;
};

/** A cut or shot transition: both sides are on screen from `startFrame` for `frames`. */
export type FootageWindow = {
	kind: 'cut' | 'shot';
	startFrame: number;
	frames: number;
	/** First frame of the incoming item. */
	cutFrame: number;
	/** Span owners of the two sides; null: whatever the cut list shows then. */
	out: string | null;
	in: string | null;
};

export type FootageMap = {
	/** Program frames; frames before 0 and after the end show the nearest program frame. */
	frames: number;
	/** Source lengths in frames at the project rate; null: unknown (no hold at the end). */
	totals: Record<string, number | null>;
	spans: FootageSpan[];
	windows: FootageWindow[];
};

/** One source frame on screen at a program frame. */
export type FootageView = {
	source: string;
	/** Source frame (project rate). */
	frame: number;
	/** Cut or shot that shows it. */
	owner: string;
	/** True when the source ran out and its edge frame holds. */
	held: boolean;
};

/** An inclusive range of source frames. */
export type FrameRange = { first: number; last: number };

type Span = { startFrame: number; frames: number };
const contains = (s: Span, f: number) => f >= s.startFrame && f < s.startFrame + s.frames;

/** The map of a resolved program; `totals` overrides the probed source lengths. */
export function footageMap(
	program: Pick<ResolvedProgram, 'frames' | 'sources' | 'cuts' | 'shots' | 'transitions'>,
	totals?: Record<string, number | null>
): FootageMap {
	const spans: FootageSpan[] = [
		...program.cuts.map((c) => ({
			owner: c.id,
			kind: 'cut' as const,
			source: c.source,
			startFrame: c.startFrame,
			frames: c.frames,
			srcIn: c.srcIn,
			...(c.hold ? { last: c.srcOut - 1 } : {})
		})),
		...program.shots.flatMap((s) =>
			s.source
				? [
						{
							owner: s.id,
							kind: 'shot' as const,
							source: s.source.name,
							startFrame: s.startFrame,
							frames: s.frames,
							srcIn: s.source.srcIn
						}
					]
				: []
		)
	];
	const owners = new Set(spans.map((s) => s.owner));
	const side = (id: string | null) => (id !== null && owners.has(id) ? id : null);
	const windows: FootageWindow[] = program.transitions
		.filter((t) => t.kind !== 'clip')
		.map((t) => ({
			kind: t.kind as 'cut' | 'shot',
			startFrame: t.startFrame,
			frames: t.frames,
			cutFrame: t.cutFrame,
			out: side(t.outgoing),
			in: side(t.owner)
		}));
	const lengths: Record<string, number | null> = {};
	for (const [name, source] of Object.entries(program.sources)) lengths[name] = source.frames;
	return { frames: program.frames, totals: { ...lengths, ...totals }, spans, windows };
}

function view(map: FootageMap, span: FootageSpan, f: number): FootageView {
	const wanted = span.srcIn + (f - span.startFrame);
	const total = map.totals[span.source];
	const last = Math.min(
		total === null || total === undefined ? Infinity : total - 1,
		span.last ?? Infinity
	);
	const frame = Math.max(0, Math.min(last, wanted));
	return { source: span.source, frame, owner: span.owner, held: frame !== wanted };
}

const clampProgram = (map: FootageMap, f: number) => Math.max(0, Math.min(map.frames - 1, f));

/**
 * Every source frame on screen at program frame `f`: the picture first, then the other side
 * of a transition window. A shot with its own source covers the cut list under it.
 */
export function footageAt(map: FootageMap, programFrame: number): FootageView[] {
	if (map.frames <= 0) return [];
	const f = clampProgram(map, programFrame);
	const shot = map.spans.find((s) => s.kind === 'shot' && contains(s, f));
	const cut = map.spans.find((s) => s.kind === 'cut' && contains(s, f));
	const byOwner = (id: string) => map.spans.find((s) => s.owner === id)!;
	const shown: FootageSpan[] = [];
	const add = (span: FootageSpan | undefined) => {
		if (span && !shown.includes(span)) shown.push(span);
	};
	add(shot ?? cut);
	for (const w of map.windows) {
		if (!contains(w, f)) continue;
		const other = f < w.cutFrame ? w.in : w.out;
		if (w.kind === 'cut') {
			// A shot that frames its own source hides the cut list, transitions included.
			if (!shot && other !== null) add(byOwner(other));
		} else add(other === null ? cut : byOwner(other));
	}
	return shown.map((span) => view(map, span, f));
}

/**
 * The footage on each side of a cut or shot transition at program frame `f` (inside or outside
 * its window): the outgoing cut run on into its handle and the incoming cut started early from
 * its handle, edge frames held where the source runs out; for a shot transition, the footage of
 * the shot before and the shot itself (the cut list when a shot has no source of its own). Null
 * when a shot with its own source covers a cut transition: nothing of it is on screen.
 */
export function transitionSidesAt(
	map: FootageMap,
	t: { kind: 'cut' | 'shot' | 'clip'; outgoing: string | null; owner: string },
	programFrame: number
): { out: FootageView | null; in: FootageView | null } | null {
	if (map.frames <= 0 || t.kind === 'clip') return null;
	const f = clampProgram(map, programFrame);
	const span = (id: string | null) =>
		id === null ? undefined : map.spans.find((s) => s.owner === id);
	const cut = map.spans.find((s) => s.kind === 'cut' && contains(s, f));
	if (t.kind === 'cut') {
		if (map.spans.some((s) => s.kind === 'shot' && contains(s, f))) return null;
		const out = span(t.outgoing);
		const incoming = span(t.owner);
		return {
			out: out ? view(map, out, f) : null,
			in: incoming ? view(map, incoming, f) : null
		};
	}
	const out = span(t.outgoing) ?? cut;
	const incoming = span(t.owner) ?? cut;
	return {
		out: out ? view(map, out, f) : null,
		in: incoming ? view(map, incoming, f) : null
	};
}

/** The picture at program frame `f`: what `<Footage program>` draws. Null with no footage. */
export function programFootageAt(map: FootageMap, programFrame: number): FootageView | null {
	return footageAt(map, programFrame)[0] ?? null;
}

/** The frame of source `name` on screen at program frame `f`; null when it is not on screen. */
export function sourceFrameAt(
	map: FootageMap,
	name: string,
	programFrame: number
): FootageView | null {
	return footageAt(map, programFrame).find((v) => v.source === name) ?? null;
}

/**
 * Source frames to extract, per source, as sorted inclusive ranges: every frame the program
 * shows (cuts, the handles their transitions need, shots with a source, held edge frames) and,
 * around every source frame a clip window shows, `margins[source]` frames on each side (for
 * `offset`). Ranges closer than `gap` frames are merged.
 */
export function footageRanges(
	map: FootageMap,
	clips: Span[],
	margins: Record<string, number> = {},
	gap = 0
): Record<string, FrameRange[]> {
	const found: Record<string, FrameRange[]> = {};
	const add = (source: string, first: number, last: number) => {
		const total = map.totals[source];
		const end = total === null || total === undefined ? Infinity : total - 1;
		const range = { first: Math.max(0, first), last: Math.min(end, last) };
		if (range.last >= range.first) (found[source] ??= []).push(range);
	};
	for (let f = 0; f < map.frames; f++)
		for (const v of footageAt(map, f)) add(v.source, v.frame, v.frame);
	for (const clip of clips) {
		const from = Math.max(0, clip.startFrame);
		const to = Math.min(map.frames, clip.startFrame + clip.frames);
		for (let f = from; f < to; f++)
			for (const v of footageAt(map, f)) {
				const margin = margins[v.source] ?? 0;
				add(v.source, v.frame - margin, v.frame + margin);
			}
	}
	return mergeRanges(found, gap);
}

/**
 * Source frames program frames `[from, to)` show, per source, as sorted inclusive ranges
 * (frames outside the program are skipped). Ranges closer than `gap` frames are merged.
 */
export function shownRanges(
	map: FootageMap,
	from: number,
	to: number,
	gap = 0
): Record<string, FrameRange[]> {
	const found: Record<string, FrameRange[]> = {};
	for (let f = Math.max(0, from); f < Math.min(map.frames, to); f++)
		for (const v of footageAt(map, f))
			(found[v.source] ??= []).push({ first: v.frame, last: v.frame });
	return mergeRanges(found, gap);
}

/** Ranges per source, sorted, with those closer than `gap` frames (or overlapping) merged. */
export function mergeRanges(
	found: Record<string, FrameRange[]>,
	gap = 0
): Record<string, FrameRange[]> {
	const out: Record<string, FrameRange[]> = {};
	for (const name of Object.keys(found).sort()) {
		if (!found[name].length) continue;
		const sorted = [...found[name]].sort((a, b) => a.first - b.first);
		const merged: FrameRange[] = [{ ...sorted[0] }];
		for (const r of sorted.slice(1)) {
			const last = merged[merged.length - 1];
			if (r.first - last.last - 1 <= gap) last.last = Math.max(last.last, r.last);
			else merged.push({ ...r });
		}
		out[name] = merged;
	}
	return out;
}
