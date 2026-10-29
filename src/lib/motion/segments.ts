import type { FootageFrames } from './resolve.js';
import { NEUTRAL_BRAND, type ResolvedBrand } from './brand.js';
import type { ResolvedFormat } from './format.js';
import type { FootageMap } from './footage-map.js';
import type {
	FormatClass,
	ProgramClip,
	ProgramSegment,
	ProgramTransition,
	ResolvedProgram
} from './program.js';
import { shotsDuring, type ShotSpan } from './shots/index.js';
import { transitionModule } from './transitions/index.js';

/**
 * What a page needs to draw a range of the program on one stage (`loadSegment`). Every pixel
 * of a frame is a function of its program frame alone, so the same frame drawn on the page of
 * its segment or on a page holding the whole program comes out the same.
 */

/** A clip as a segment page mounts it. */
export type StageClip = Omit<ProgramClip, 'footage' | 'footageMap'> & {
	/** Program frames the clip is on screen, holds included: `[from, until)`. */
	show: { from: number; until: number };
};

export type StageSegment = {
	id: string;
	/** First program frame and frame count; `frame(n)` takes program frames inside it. */
	startFrame: number;
	frames: number;
	fps: number;
	size: [number, number];
	/** Format class shots lay out for. */
	cls: FormatClass;
	/** Class and safe insets: `data-format` and `--safe-*` on the stage and every clip root. */
	format: ResolvedFormat;
	/** `--brand-*` tokens on the stage: fills, transition colours and every block read them. */
	brand: ResolvedBrand;
	background: string | null;
	/** Extracted frames per source (filled in by the node tooling). */
	footage: Record<string, FootageFrames>;
	/** Which source frame the program shows when; null without footage. */
	footageMap: FootageMap | null;
	/** Shots deciding the layout in the segment (see `shotsDuring`). */
	shots: ShotSpan[];
	/** Every clip on screen in the segment, in project order. */
	clips: StageClip[];
	/** Transition windows that touch the segment. */
	transitions: ProgramTransition[];
	/**
	 * An insert of the inserts export: the clips without the footage picture (no fill, plate or
	 * window look); with `holdout`, each frame then cuts the subject out of the alpha.
	 */
	insert?: { holdout: boolean };
	/**
	 * `check --format`: also warn about clips whose text lies outside the format's safe zone
	 * (see `frameFit` in `program-stage.ts`).
	 */
	checkSafe?: boolean;
	/**
	 * An excerpt's end card: from program frame `from` on, the footage, shots, transitions and
	 * every clip but `clips` show frame `from − 1`, held; `clips` (the card) play on.
	 */
	hold?: { from: number; clips: string[] };
	/**
	 * An excerpt's head sizes (see `shotHead`) of shots that run across its edges, by shot and
	 * source, measured over the whole shot in the whole program, so they frame as in the full
	 * video. Other shots measure their own frames.
	 */
	heads?: Record<string, Record<string, number | null>>;
};

type Span = { startFrame: number; frames: number };
const endOf = (s: Span) => s.startFrame + s.frames;

/**
 * Program frames a clip is on screen. Inside a transition window the outgoing clip holds its
 * last frame and the incoming its first: a clip's own transition, or a cut or shot transition
 * whose cut is the clip's first frame (incoming) or the frame after its last (outgoing). Only
 * drawn transitions count; one not drawn yet cuts on its cut.
 */
export function clipShowRange(
	clip: Span & { id: string },
	transitions: ProgramTransition[]
): { from: number; until: number } {
	let from = clip.startFrame;
	let until = endOf(clip);
	for (const t of transitions) {
		if (!transitionModule(t.type)) continue;
		const own = t.kind === 'clip' && t.owner === clip.id;
		const staged = t.kind !== 'clip';
		if (own || (staged && t.cutFrame === clip.startFrame)) from = Math.min(from, t.startFrame);
		if (staged && t.cutFrame === endOf(clip)) until = Math.max(until, endOf(t));
	}
	return { from, until };
}

/**
 * The shots that decide what a range shows: those `shotsDuring` gives, and both shots of every
 * shot transition whose window touches the range (in an excerpt, a window across an edge has a
 * side outside the range). In program order.
 */
export function stagedShots<T extends ShotSpan>(
	shots: readonly T[],
	transitions: readonly ProgramTransition[],
	span: Span
): T[] {
	const during = new Set(shotsDuring(shots, span));
	const named = new Set(
		transitions
			.filter((t) => t.kind === 'shot' && t.startFrame < endOf(span) && endOf(t) > span.startFrame)
			.flatMap((t) => [t.owner, t.outgoing])
	);
	return shots.filter((s) => during.has(s) || named.has(s.id));
}

/**
 * The cuts a range shows: those overlapping it, and both sides of every cut transition whose
 * window touches it (in an excerpt, a side may lie outside the range). In program order.
 */
export function stagedCuts<T extends Span & { id: string }>(
	cuts: readonly T[],
	transitions: readonly ProgramTransition[],
	span: Span
): T[] {
	const named = new Set(
		transitions
			.filter((t) => t.kind === 'cut' && t.startFrame < endOf(span) && endOf(t) > span.startFrame)
			.flatMap((t) => [t.owner, t.outgoing])
	);
	return cuts.filter(
		(c) => (c.startFrame < endOf(span) && span.startFrame < endOf(c)) || named.has(c.id)
	);
}

/** The clip frame shown at program frame `f`: held at its edges, null when not on screen. */
export function clipFrameAt(clip: StageClip, f: number): number | null {
	if (f < clip.show.from || f >= clip.show.until) return null;
	return Math.max(0, Math.min(clip.frames - 1, f - clip.startFrame));
}

/** The whole program as one segment (a page that can draw any frame). */
export function wholeProgram(program: Pick<ResolvedProgram, 'frames'>): ProgramSegment {
	const span = { startFrame: 0, frames: program.frames };
	return {
		id: 'program',
		...span,
		items: [],
		hash: '',
		chunks: [{ id: 'program', ...span, hash: '' }]
	};
}

/** The segment holding program frame `f`. */
export function segmentAt(
	program: Pick<ResolvedProgram, 'segments'>,
	f: number
): ProgramSegment | null {
	return program.segments.find((s) => f >= s.startFrame && f < endOf(s)) ?? null;
}

/** The page data of one segment (or of `wholeProgram`): clips and transitions on screen in it. */
export function segmentStage(
	program: Pick<
		ResolvedProgram,
		'fps' | 'format' | 'background' | 'shots' | 'clips' | 'transitions' | 'excerpt'
	>,
	segment: Span & { id: string },
	footage: {
		frames: Record<string, FootageFrames>;
		map: FootageMap | null;
		heads?: StageSegment['heads'];
	},
	brand: ResolvedBrand = NEUTRAL_BRAND
): StageSegment {
	const from = segment.startFrame;
	const to = endOf(segment);
	const clips: StageClip[] = [];
	for (const clip of [...program.clips].sort((a, b) => a.z - b.z)) {
		const show = clipShowRange(clip, program.transitions);
		if (show.from >= to || show.until <= from) continue;
		// Footage goes to the page once, with the segment, not with every clip.
		const data: StageClip & Partial<Pick<ProgramClip, 'footage' | 'footageMap'>> = {
			...clip,
			show
		};
		delete data.footage;
		delete data.footageMap;
		clips.push(data);
	}
	return {
		id: segment.id,
		startFrame: from,
		frames: segment.frames,
		fps: program.fps,
		size: program.format.size,
		cls: program.format.class,
		format: program.format,
		brand,
		background: program.background,
		footage: footage.frames,
		footageMap: footage.map,
		shots: stagedShots(program.shots, program.transitions, segment).map((s) => ({
			id: s.id,
			shot: s.shot,
			startFrame: s.startFrame,
			frames: s.frames,
			params: s.params,
			morphFrames: s.morphFrames,
			morphEase: s.morphEase,
			keys: s.keys,
			...(s.away ? { away: s.away } : {})
		})),
		clips,
		transitions: program.transitions.filter((t) => t.startFrame < to && endOf(t) > from),
		...(program.excerpt?.end
			? { hold: { from: program.excerpt.frames, clips: [program.excerpt.end.clip] } }
			: {}),
		...(footage.heads ? { heads: footage.heads } : {})
	};
}

/**
 * Frames worth running in a segment: every `every`th frame, the frames around each cut, shot
 * and morph edge, clip edge, cue and transition window edge, and the last frame.
 */
export function segmentCheckFrames(
	program: Pick<ResolvedProgram, 'cuts' | 'shots' | 'clips' | 'transitions'>,
	segment: Span,
	every = 5
): number[] {
	const from = segment.startFrame;
	const to = endOf(segment);
	const frames = new Set<number>();
	for (let f = from; f < to; f += every) frames.add(f);
	frames.add(to - 1);
	for (const f of edgeFrames(program)) frames.add(f);
	for (const clip of program.clips)
		for (const cue of Object.values(clip.cues))
			for (const d of [-1, 0, 1, 18]) frames.add(clip.startFrame + cue.frame + d);
	return [...frames].filter((f) => f >= from && f < to).sort((a, b) => a - b);
}

/**
 * Frames on both sides of every change: cuts, holds, shot starts, morph middles and ends, clip edges,
 * transition window edges, keys and the middle between two keys.
 */
export function edgeFrames(
	program: Pick<ResolvedProgram, 'cuts' | 'shots' | 'clips' | 'transitions'>
): number[] {
	const keyFrames = [...program.shots, ...program.clips].flatMap((item) =>
		item.keys.flatMap((k, i) =>
			i ? [k.frame, Math.floor((item.keys[i - 1].frame + k.frame) / 2)] : [k.frame]
		)
	);
	const edges = [
		...keyFrames,
		...program.cuts.flatMap((c) => (c.hold ? [c.startFrame, endOf(c) - c.hold] : [c.startFrame])),
		...program.shots.flatMap((s) => [
			s.startFrame,
			s.startFrame + Math.floor(s.morphFrames / 2),
			s.startFrame + s.morphFrames
		]),
		// The speaker leaving and coming back: where each move starts and lands.
		...program.shots.flatMap((s) =>
			(s.away ?? []).flatMap((r) => [
				r.from - r.exit.frames,
				r.from,
				...(r.until === null ? [] : [r.until, r.until + r.enter.frames])
			])
		),
		...program.clips.flatMap((c) => [c.startFrame, endOf(c)]),
		...program.transitions.flatMap((t) => [t.startFrame, t.cutFrame, endOf(t)])
	];
	return [...new Set(edges.flatMap((e) => [e - 1, e]))].sort((a, b) => a - b);
}

/**
 * A fixed shuffle of `frames` (no randomness: the same list always gives the same order), so a
 * determinism check also seeks in an order that is neither forward nor backward.
 */
export function scrambled<T>(frames: T[]): T[] {
	const n = frames.length;
	if (n < 3) return [...frames].reverse();
	// A stride coprime with n visits every index once, jumping across the list.
	let stride = Math.max(2, Math.floor(n * 0.618));
	while (gcd(stride, n) !== 1) stride++;
	return frames.map((_, i) => frames[(i * stride + 1) % n]);
}

function gcd(a: number, b: number): number {
	return b ? gcd(b, a % b) : a;
}
