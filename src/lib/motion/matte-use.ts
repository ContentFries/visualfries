import {
	footageAt,
	footageMap,
	mergeRanges,
	type FootageMap,
	type FrameRange
} from './footage-map.js';
import { programFraming } from './framing.js';
import type { ProgramShot, ResolvedProgram } from './program.js';
import type { FootageFrames, SubjectBox } from './resolve.js';
import { clipShowRange, segmentStage, wholeProgram } from './segments.js';
import { shotAt, shotModule, type ShotLayout } from './shots/index.js';
import { SUBJECT_SMOOTH } from './shots/layout.js';

/**
 * Where a program reads the mattes of its footage, so `visualfries matte <project>` mattes only
 * those frames and `check` and `render` refuse a partial matte that misses one. Pure: the program
 * and a few facts about its blocks decide it.
 *
 * A program reads a matte where it draws the subject's picture (a shot that needs a matte, a dim
 * or blurred room, a room cut away, a clip behind the speaker, a block that draws or measures the
 * subject) and where the subject decides the framing. The framing is not listed shot by shot: the
 * shot engine lays every frame out for a few made-up subjects, and a frame whose layout changes
 * with the subject reads the matte. A shot framed by the head reads it over the whole shot (its
 * one head size comes from all of its frames).
 */

export type MatteReadOptions = {
	/** Whether a clip's block draws or measures the subject (`<Subject>`, `subject()`, …). */
	readsSubject: (block: string) => boolean;
	/** Source frames around what a subject-reading clip shows (its `offset` reach), by source. */
	margins?: Record<string, number>;
};

type Program = Pick<
	ResolvedProgram,
	| 'fps'
	| 'frames'
	| 'format'
	| 'background'
	| 'sources'
	| 'cuts'
	| 'shots'
	| 'clips'
	| 'transitions'
	| 'excerpt'
>;

/** Made-up subjects the framing is laid out for: one left and small, one right and tall, none. */
const PROBES: (SubjectBox | null)[] = [
	{ x: 0.1, y: 0.1, width: 0.4, height: 0.9, headX: 0.3, headY: 0.1, headHeight: 0.2 },
	{ x: 0.45, y: 0.35, width: 0.5, height: 0.65, headX: 0.7, headY: 0.35, headHeight: 0.45 },
	null
];

/** Program frames as a sorted, merged list of ranges. */
class FrameSet {
	private frames = new Set<number>();
	add(first: number, last: number) {
		for (let f = first; f <= last; f++) this.frames.add(f);
	}
	has(f: number) {
		return this.frames.has(f);
	}
	list() {
		return [...this.frames].sort((a, b) => a - b);
	}
}

/** The footage of each source with a matte, every frame measuring `box`. */
function probeFootage(program: Program, box: SubjectBox | null): Record<string, FootageFrames> {
	const out: Record<string, FootageFrames> = {};
	for (const [name, s] of Object.entries(program.sources)) {
		if (!s.matte || !s.frames) continue;
		out[name] = {
			url: '',
			first: 0,
			last: s.frames - 1,
			total: s.frames,
			width: s.width ?? 1920,
			height: s.height ?? 1080,
			startFrame: 0,
			subject: true,
			boxes: new Array(s.frames).fill(box)
		};
	}
	return out;
}

const drawsSubject = (layout: ShotLayout) => !!layout.room || (layout.cutout ?? 0) > 0;

/**
 * Program frames whose picture reads the matte, and shots whose framing does (see the module
 * comment), found by laying the program out for each made-up subject.
 */
function framingReads(program: Program, map: FootageMap) {
	const seg = segmentStage(program, wholeProgram(program), { frames: {}, map });
	const probes = PROBES.map((box) =>
		programFraming({ ...seg, footage: probeFootage(program, box) })
	);
	const drawn = new FrameSet();
	const shots = new Set<string>();
	const byId = new Map(seg.shots.map((s) => [s.id, s]));
	for (let f = 0; f < program.frames; f++) {
		const views = footageAt(map, f);
		if (!views.length) continue;
		// The shot track, and each shot a shot transition on screen holds on one of its sides.
		const named = program.transitions
			.filter((t) => t.kind === 'shot' && f >= t.startFrame && f < t.startFrame + t.frames)
			.flatMap((t) => [t.owner, t.outgoing])
			.map((id) => (id === null ? undefined : byId.get(id)))
			.filter((s) => s !== undefined);
		const on = shotAt(seg.shots, f);
		// Each shot that decides the frame, alone: a morph mixes two layouts, and only the shot
		// whose own layout follows the subject reads it.
		const deciding = [on.shot, ...(on.prev ? [on.prev] : []), ...named];
		for (const view of views) {
			if (probes.some((p) => drawsSubject(p.layoutFor(f, view)))) drawn.add(f, f);
			for (const shot of deciding) {
				const layouts = probes.map((p) => p.layoutFor(f, view, shot));
				if (layouts.some(drawsSubject)) drawn.add(f, f);
				const first = JSON.stringify(layouts[0]);
				if (layouts.every((l) => JSON.stringify(l) === first)) continue;
				// This frame (a morph out of a shot lies past its end), and the whole shot: it frames
				// by one head size measured over all its frames.
				drawn.add(f, f);
				if (shot.id) shots.add(shot.id);
			}
		}
	}
	return { drawn, shots };
}

/** Program frames a clip is on screen, transitions included. */
function shownFrames(clip: { id: string; startFrame: number; frames: number }, program: Program) {
	const show = clipShowRange(clip, program.transitions);
	return { first: Math.max(0, show.from), last: Math.min(program.frames, show.until) - 1 };
}

/**
 * Source frames each matte is read at, by footage name (only footage with a matte), as sorted
 * inclusive ranges in source frames at the project rate. Frames around each read that the
 * subject's smoothing reaches are included.
 */
export function matteReads(program: Program, opts: MatteReadOptions): Record<string, FrameRange[]> {
	const matted = Object.entries(program.sources)
		.filter(([, s]) => s.matte && s.frames)
		.map(([name]) => name);
	if (!matted.length) return {};
	const totals = Object.fromEntries(matted.map((n) => [n, program.sources[n].frames!]));
	const map = footageMap(program, totals);
	const smooth = Math.round(SUBJECT_SMOOTH * program.fps);
	const { drawn, shots } = framingReads(program, map);
	const byShot = (s: Pick<ProgramShot, 'startFrame' | 'frames'>) =>
		drawn.add(Math.max(0, s.startFrame), Math.min(program.frames, s.startFrame + s.frames) - 1);
	for (const s of program.shots) if (shots.has(s.id) || shotModule(s.shot)?.needsMatte) byShot(s);
	for (const clip of program.clips)
		if (clip.layer === 'behind') {
			const { first, last } = shownFrames(clip, program);
			drawn.add(first, last);
		}
	const found: Record<string, FrameRange[]> = {};
	const add = (source: string, first: number, last: number) => {
		if (!(source in totals)) return;
		const range = { first: Math.max(0, first), last: Math.min(totals[source] - 1, last) };
		if (range.last >= range.first) (found[source] ??= []).push(range);
	};
	for (const f of drawn.list())
		for (const v of footageAt(map, f)) add(v.source, v.frame - smooth, v.frame + smooth);
	for (const clip of program.clips) {
		if (!opts.readsSubject(clip.block)) continue;
		const { first, last } = shownFrames(clip, program);
		for (let f = first; f <= last; f++)
			for (const v of footageAt(map, f)) {
				const margin = Math.max(smooth, opts.margins?.[v.source] ?? 0);
				add(v.source, v.frame - margin, v.frame + margin);
			}
	}
	for (const s of program.shots)
		for (const away of s.away ?? [])
			for (const look of [away.looks?.exit, away.looks?.enter])
				if (look) add(look.source, look.first - smooth, look.last + smooth);
	addExcerptReads(program, drawn, add);
	return mergeRanges(found);
}

/**
 * An excerpt's framing also reads the whole program's footage around its edges and over the
 * whole of each shot that runs across them (see `ExcerptFootage`); counted when the excerpt reads
 * a matte at all.
 */
function addExcerptReads(
	program: Program,
	drawn: FrameSet,
	add: (source: string, first: number, last: number) => void
) {
	const footage = program.excerpt?.footage;
	if (!footage || !drawn.list().length) return;
	for (const [source, ranges] of Object.entries(footage.around))
		for (const r of ranges) add(source, r.first, r.last);
	for (const runs of Object.values(footage.heads))
		for (const run of runs)
			add(run.source, run.frame, run.held ? run.frame : run.frame + run.frames - 1);
}

// ---------------------------------------------------------------- planning the matte

/** A word of the footage's transcript, in seconds of the footage. */
type Word = { start: number; end: number };

export type MattePlanOptions = {
	/** Frames of the matte video (the footage's own frames). */
	total: number;
	/** The footage's own frame rate. */
	fps: number;
	/** Seconds kept on each side of every read. Default 1. */
	margin?: number;
	/** Ranges closer than this many seconds are matted as one. Default 3. */
	gap?: number;
	/** The footage's transcript: bounds move out of words into the pause before or after. */
	words?: readonly Word[] | null;
};

/** Default seconds kept around every read, merged across, and matted before a range to warm up. */
export const MATTE_PLAN = { margin: 1, gap: 3, warmup: 1 } as const;

/**
 * Converts source frames at the project rate to frames of a footage at its own rate, rounding
 * outward so every frame the conversion may pick is inside.
 */
export function toFootageFrames(
	ranges: readonly FrameRange[],
	projectFps: number,
	fps: number,
	total: number
): FrameRange[] {
	if (Math.abs(projectFps - fps) < 0.01) return ranges.map((r) => ({ ...r }));
	return ranges.map((r) => ({
		first: Math.max(0, Math.floor((r.first / projectFps) * fps) - 1),
		last: Math.min(total - 1, Math.ceil(((r.last + 1) / projectFps) * fps) + 1)
	}));
}

/** The frame of the pause before the word holding frame `f`; `f` when no word holds it. */
function pauseBefore(f: number, fps: number, words: readonly Word[]): number {
	const t = (f + 0.5) / fps;
	const i = words.findIndex((w) => w.start < t && t < w.end);
	if (i < 0) return f;
	const before = i > 0 ? words[i - 1].end : 0;
	return Math.min(f, Math.floor(((before + words[i].start) / 2) * fps));
}

/** The frame of the pause after the word holding frame `f`; `f` when no word holds it. */
function pauseAfter(f: number, fps: number, words: readonly Word[]): number {
	const t = (f + 0.5) / fps;
	const i = words.findIndex((w) => w.start < t && t < w.end);
	if (i < 0) return f;
	const after = i + 1 < words.length ? words[i + 1].start : words[i].end + 1;
	return Math.max(f, Math.ceil(((words[i].end + after) / 2) * fps));
}

/**
 * The ranges to matte for the reads of one footage (in its own frames): each widened by
 * `margin` seconds, its bounds moved out of any word into the pause next to it, ranges closer
 * than `gap` seconds joined, all inside the footage.
 */
export function planMatteRanges(
	reads: readonly FrameRange[],
	opts: MattePlanOptions
): FrameRange[] {
	const margin = Math.round((opts.margin ?? MATTE_PLAN.margin) * opts.fps);
	const gap = Math.round((opts.gap ?? MATTE_PLAN.gap) * opts.fps);
	const words = [...(opts.words ?? [])].sort((a, b) => a.start - b.start);
	const clamp = (f: number) => Math.max(0, Math.min(opts.total - 1, f));
	let ranges = reads.map((r) => ({ first: r.first - margin, last: r.last + margin }));
	// Joining can move a bound into a word again (never): bounds move out of words after it.
	ranges = mergeRanges({ x: ranges }, gap).x ?? [];
	ranges = ranges.map((r) => ({
		first: clamp(pauseBefore(clamp(r.first), opts.fps, words)),
		last: clamp(pauseAfter(clamp(r.last), opts.fps, words))
	}));
	return mergeRanges({ x: ranges }, gap).x ?? [];
}

/** The parts of `needed` outside `covered` (both sorted inclusive ranges). */
export function uncovered(
	needed: readonly FrameRange[],
	covered: readonly FrameRange[]
): FrameRange[] {
	const out: FrameRange[] = [];
	for (const r of needed) {
		let from = r.first;
		for (const c of covered) {
			if (c.last < from || c.first > r.last) continue;
			if (c.first > from) out.push({ first: from, last: c.first - 1 });
			from = Math.max(from, c.last + 1);
			if (from > r.last) break;
		}
		if (from <= r.last) out.push({ first: from, last: r.last });
	}
	return out;
}

// ---------------------------------------------------------------- the ranges file

/**
 * What `visualfries matte <project>` writes next to a matte it made for part of a footage
 * (`<matte>.ranges.json`): the footage it was made from and the frames it covers. Outside them
 * the matte is black. A matte without this file covers the whole footage.
 */
export type MatteRangesFile = {
	version: 1;
	/** The footage file (its name), its size in bytes, frame count and frame rate. */
	source: { file: string; size: number; frames: number; fps: number };
	/** Size in bytes of the matte this file describes: another size means the matte changed. */
	matte: { size: number };
	/** Frames of the footage (its own rate) the matte covers, as inclusive `[first, last]`. */
	ranges: [number, number][];
	provider: string;
	/** Hash of everything that made the matte: the same key writes the same matte. */
	key: string;
};

export const rangesFileOf = (matte: string) => `${matte}.ranges.json`;

/** Checks a parsed ranges file; returns the problem, or null when it can be used. */
export function rangesFileProblem(
	file: unknown,
	now: { source: { size: number; frames: number }; matte: { size: number } }
): string | null {
	const f = file as Partial<MatteRangesFile> | null;
	if (!f || f.version !== 1 || !Array.isArray(f.ranges) || !f.source || !f.matte)
		return 'it is not a ranges file this version of VisualFries reads';
	if (f.matte.size !== now.matte.size)
		return 'the matte changed after it was written (another size)';
	if (f.source.size !== now.source.size || f.source.frames !== now.source.frames)
		return `it was made from another video (${f.source.frames} frames, ${f.source.size} bytes; this one has ${now.source.frames} frames, ${now.source.size} bytes)`;
	return null;
}

/** Inclusive frame ranges as readable seconds, "12.40–13.10 s, 20.00–21.00 s". */
export function rangeSeconds(ranges: readonly FrameRange[], fps: number): string {
	const s = (f: number) => (f / fps).toFixed(2);
	return ranges.map((r) => `${s(r.first)}–${s(r.last + 1)} s`).join(', ');
}
