import { opaqueGradient } from './color.js';

/**
 * Flash frames: a few frames of footage between full-screen clips, or between a full-screen clip
 * and a cut, that the edit never meant to show (a card fading its own opacity at its end over the
 * camera, two cards that leave a gap, a card edge a few frames off a cut). `check` warns; the
 * engine moves nothing unless a clip or shot asks for `"snap": "cut"`. The page measures how much
 * of the frame each clip hides (see `covers` in `program-stage.ts`); the decisions live here.
 */

/** A clip whose cover reaches this hides the footage under it: it is full-screen there. */
export const FULL_COVER = 0.98;
/** Footage shown for less than this next to a full-screen clip reads as a flash. */
export const FLASH_SECONDS = 0.8;
/**
 * An edge this close to a cut (but not on it) is meant to be on it; also how far `"snap": "cut"`
 * reaches.
 */
export const SNAP_SECONDS = 0.4;

/** At one program frame, how much of the frame (0–1) each front clip on screen hides. */
export type CoverSample = { frame: number; clips: Record<string, number> };

type Span = { startFrame: number; frames: number };

/** What the flash check reads of a resolved program. */
export type FlashProgram = {
	fps: number;
	cuts: Span[];
	clips: (Span & { id: string; block: string })[];
	transitions: Span[];
};

export type FlashWarning = { frame: number; message: string };

/** What the page reads of an element that covers the whole frame. */
export type Plane = {
	/** Its effective opacity: its own times its ancestors'. */
	opacity: number;
	visible: boolean;
	/** A loaded image or a video. */
	media: boolean;
	/** The alpha of its background colour. */
	color: number;
	/** Its computed `background-image`. */
	image: string;
};

/** How much of the footage an element over the whole frame hides (0–1). */
export function planeCover(plane: Plane): number {
	if (!plane.visible) return 0;
	const fill = plane.media ? 1 : Math.max(plane.color, imageFill(plane.image));
	return plane.opacity * fill;
}

/** A background image hides what is under it when it is a picture or an opaque gradient. */
function imageFill(image: string): number {
	if (image === 'none' || !image) return 0;
	if (image.startsWith('url(')) return 1;
	return opaqueGradient(image, FULL_COVER) ? 1 : 0;
}

/** Whether a clip can hide the footage: in front of the speaker and not in a shot's slot. */
export function coverable(clip: { layer?: string | null; slot?: string | null }): boolean {
	return clip.layer !== 'behind' && !clip.slot;
}

/** Program frames where the footage changes: every cut's start, and the end of the last. */
export function cutEdges(cuts: Span[]): number[] {
	if (!cuts.length) return [];
	const last = cuts[cuts.length - 1];
	const all = [...cuts.map((c) => c.startFrame), last.startFrame + last.frames];
	return [...new Set(all)].sort((a, b) => a - b);
}

/** The cut an edge lands a few frames off (`off` frames, negative before it); null on or far. */
export function offCut(
	frame: number,
	edges: number[],
	fps: number
): { cut: number; off: number } | null {
	const reach = Math.round(SNAP_SECONDS * fps);
	let best: number | null = null;
	for (const e of edges)
		if (best === null || Math.abs(e - frame) < Math.abs(best - frame)) best = e;
	if (best === null) return null;
	const off = frame - best;
	return off === 0 || Math.abs(off) > reach ? null : { cut: best, off };
}

const sec = (frame: number, fps: number) => `${(frame / fps).toFixed(2)} s`;
const framesText = (n: number) => `${n} frame${n === 1 ? '' : 's'}`;

/** "3 frames (0.12 s) before the cut at 80.00 s". */
function offText(at: { cut: number; off: number }, fps: number): string {
	const n = Math.abs(at.off);
	return `${framesText(n)} (${(n / fps).toFixed(2)} s) ${at.off < 0 ? 'before' : 'after'} the cut at ${sec(at.cut, fps)}`;
}

/**
 * `check` warnings for shot edges a few frames off a cut: a shot change just beside a cut reads
 * as a second, tiny cut. An edge two shots share is told once, as the later shot's `from`.
 */
export function shotsOffCut(
	shots: (Span & { id: string })[],
	edges: number[],
	fps: number
): { level: 'warning'; item: string; field: string; message: string }[] {
	const starts = new Set(shots.map((s) => s.startFrame));
	const out: { level: 'warning'; item: string; field: string; message: string }[] = [];
	const warn = (i: number, edge: 'from' | 'until', frame: number) => {
		const at = offCut(frame, edges, fps);
		if (!at) return;
		const verb = edge === 'from' ? 'starts' : 'ends';
		out.push({
			level: 'warning',
			item: shots[i].id,
			field: `shots[${i}].${edge}`,
			message: `Shot "${shots[i].id}" ${verb} ${offText(at, fps)}: a shot change just beside a cut reads as a second, tiny cut. Put the edge on the cut with "snap": "cut" on the shot, unless that is meant.`
		});
	};
	shots.forEach((s, i) => {
		warn(i, 'from', s.startFrame);
		const end = s.startFrame + s.frames;
		if (!starts.has(end)) warn(i, 'until', end);
	});
	return out;
}

/** `"snap": "cut"` on a clip or shot: both edges, or the ones named. */
export type CutSnap = 'cut' | { from?: 'cut'; until?: 'cut' };

/**
 * A span in seconds with the edges `snap` asks for moved onto the nearest cut edge within
 * `SNAP_SECONDS`. An edge with no cut that near stays, and `note` says so; without a cut list
 * (`edges` null or empty) nothing moves and `note` says why, once.
 */
export function snapSpan(
	snap: CutSnap | undefined,
	span: { start: number; end: number },
	edges: number[] | null,
	fps: number,
	note: (edge: 'from' | 'until', message: string) => void
): { start: number; end: number } {
	if (!snap) return span;
	if (!edges?.length) {
		note(
			snap === 'cut' || snap.from ? 'from' : 'until',
			'"snap": "cut" needs a cut list ("cuts") to snap to; the edges stay where they are.'
		);
		return span;
	}
	const asked =
		snap === 'cut' ? { from: true, until: true } : { from: !!snap.from, until: !!snap.until };
	const move = (edge: 'from' | 'until', time: number) =>
		asked[edge] ? snapTime(edge, time, edges, fps, note) : time;
	return { start: move('from', span.start), end: move('until', span.end) };
}

/** `time` on the nearest cut edge within reach, or as it is after a note. */
function snapTime(
	edge: 'from' | 'until',
	time: number,
	edges: number[],
	fps: number,
	note: (edge: 'from' | 'until', message: string) => void
): number {
	const frame = Math.round(time * fps);
	const nearest = edges.reduce((a, b) => (Math.abs(b - frame) < Math.abs(a - frame) ? b : a));
	if (Math.abs(nearest - frame) <= Math.round(SNAP_SECONDS * fps)) return nearest / fps;
	note(
		edge,
		`"snap": "cut" found no cut within ${SNAP_SECONDS} s of "${edge}" (${time.toFixed(2)} s); the nearest is at ${sec(nearest, fps)}. The edge stays where it is.`
	);
	return time;
}

/** One minus what shows through all the clips: covers of clips over each other add up. */
function combined(sample: CoverSample): number {
	let through = 1;
	for (const c of Object.values(sample.clips)) through *= 1 - Math.min(1, Math.max(0, c));
	return 1 - through;
}

/** The clip that hides most at a sample. */
function top(sample: CoverSample): string {
	return Object.entries(sample.clips).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/** Samples in frame order, one per frame, without those inside a transition window. */
function usable(program: FlashProgram, samples: CoverSample[]): CoverSample[] {
	const inWindow = (f: number) =>
		program.transitions.some((t) => f >= t.startFrame && f < t.startFrame + t.frames);
	const byFrame = new Map(samples.map((s) => [s.frame, s]));
	return [...byFrame.values()].filter((s) => !inWindow(s.frame)).sort((a, b) => a.frame - b.frame);
}

/** Clips that hide the whole footage at some sample. */
function fullScreen(samples: CoverSample[]): Set<string> {
	const out = new Set<string>();
	for (const s of samples)
		for (const [id, c] of Object.entries(s.clips)) if (c >= FULL_COVER) out.add(id);
	return out;
}

type Bound = { frame: number; clip: string | null; cut: number | null };

/** A stretch of footage between two bounds, with the samples that showed it. */
type Run = { left: Bound; right: Bound; shown: CoverSample[] };

/** The piece of footage (between two cut edges) a frame is in. */
const pieceOf = (frame: number, edges: number[]) => edges.filter((e) => e <= frame).length;

/**
 * Stretches where the footage shows, each inside one piece of footage, bounded on both sides by
 * a sample where clips hide it (the bound is the frame after it, or the frame of it on the right)
 * or by a cut edge.
 */
function footageRuns(samples: CoverSample[], edges: number[]): Run[] {
	const runs: Run[] = [];
	const covered = (s: CoverSample) => combined(s) >= FULL_COVER;
	let i = 0;
	while (i < samples.length) {
		if (covered(samples[i])) {
			i++;
			continue;
		}
		const piece = pieceOf(samples[i].frame, edges);
		let j = i;
		while (
			j + 1 < samples.length &&
			!covered(samples[j + 1]) &&
			pieceOf(samples[j + 1].frame, edges) === piece
		)
			j++;
		const same = (s: CoverSample | undefined) => !!s && pieceOf(s.frame, edges) === piece;
		const left = bound(samples[i - 1], same(samples[i - 1]), edges[piece - 1], 1);
		const right = bound(samples[j + 1], same(samples[j + 1]), edges[piece], 0);
		if (left && right) runs.push({ left, right, shown: samples.slice(i, j + 1) });
		i = j + 1;
	}
	return runs;
}

/**
 * The bound a neighbouring sample makes: the clip hiding the footage there when it is in the
 * same piece (`after` frames past it), else the cut edge between (`edge`); null at the end of the
 * samples.
 */
function bound(
	next: CoverSample | undefined,
	same: boolean,
	edge: number | undefined,
	after: number
): Bound | null {
	if (!next) return null;
	if (same && combined(next) >= FULL_COVER)
		return { frame: next.frame + after, clip: top(next), cut: null };
	return edge === undefined ? null : { frame: edge, clip: null, cut: edge };
}

/**
 * `check` warnings for flash frames, from cover samples of the page in program frames (any
 * order, any segments; frames inside transition windows are left out: a declared transition is
 * meant):
 * - a full-screen clip edge a few frames off a cut (see `offCut`);
 * - footage that shows for less than `FLASH_SECONDS` between full-screen clips, or between a
 *   full-screen clip and a cut, naming the clip that fades its own opacity when one does.
 * Footage beside one full-screen clip that stays on screen longer (a card fading out over the
 * camera that goes on) is a dissolve and passes.
 */
export function flashFrames(program: FlashProgram, samples: CoverSample[]): FlashWarning[] {
	const list = usable(program, samples);
	const full = fullScreen(list);
	const edges = cutEdges(program.cuts);
	const told = new Set<string>();
	const out = clipsOffCut(program, full, edges, told);
	const limit = FLASH_SECONDS * program.fps;
	for (const run of footageRuns(list, edges)) {
		const length = run.right.frame - run.left.frame;
		if (length >= limit || (run.left.clip === null && run.right.clip === null)) continue;
		if (toldAtCut(run, told)) continue;
		out.push({ frame: run.left.frame, message: runMessage(program, run, full) });
	}
	return out.sort((a, b) => a.frame - b.frame);
}

/** Whether an off-cut warning already names the clip and cut that bound a run. */
function toldAtCut(run: Run, told: Set<string>): boolean {
	const cut = run.left.cut ?? run.right.cut;
	const clip = run.left.clip ?? run.right.clip;
	return cut !== null && told.has(`${clip}\u0000${cut}`);
}

/** Warnings for full-screen clip edges a few frames off a cut; `told` gets clip and cut. */
function clipsOffCut(
	program: FlashProgram,
	full: Set<string>,
	edges: number[],
	told: Set<string>
): FlashWarning[] {
	const out: FlashWarning[] = [];
	for (const clip of program.clips.filter((c) => full.has(c.id)))
		for (const [verb, frame] of [
			['starts', clip.startFrame],
			['ends', clip.startFrame + clip.frames]
		] as const) {
			const at = offCut(frame, edges, program.fps);
			if (!at) continue;
			told.add(`${clip.id}\u0000${at.cut}`);
			out.push({ frame, message: offCutMessage(clip, verb, at, program.fps) });
		}
	return out;
}

function offCutMessage(
	clip: { id: string; block: string },
	verb: 'starts' | 'ends',
	at: { cut: number; off: number },
	fps: number
): string {
	const n = framesText(Math.abs(at.off));
	// Starting after a cut or ending before it shows the footage; the other way covers the cut.
	const shows = (verb === 'starts') === at.off > 0;
	const what = shows
		? `the footage under it shows for ${n} there: a flash of the shot.`
		: `it covers the cut by ${n}, so the cut happens under it.`;
	return `Clip "${clip.id}" (${clip.block}) is full-screen and ${verb} ${offText(at, fps)}: ${what} Put the edge on the cut with "snap": "cut" on the clip (or { "${verb === 'starts' ? 'from' : 'until'}": "cut" } for this edge alone), unless that is meant.`;
}

/** A full-screen clip partly see-through in a run: it fades its own opacity there. */
function fading(run: Run, full: Set<string>): { id: string; cover: number; frame: number } | null {
	for (const s of run.shown)
		for (const [id, cover] of Object.entries(s.clips))
			if (full.has(id) && cover > 0.02 && cover < FULL_COVER) return { id, cover, frame: s.frame };
	return null;
}

/** What bounds a run on one side, in words. */
function boundText(b: Bound, fps: number): string {
	return b.clip !== null ? `"${b.clip}"` : `the cut at ${sec(b.cut!, fps)}`;
}

function runMessage(program: FlashProgram, run: Run, full: Set<string>): string {
	const { fps } = program;
	const { left, right } = run;
	const n = framesText(right.frame - left.frame);
	const span = `${sec(left.frame, fps).slice(0, -2)}–${sec(right.frame, fps)}`;
	const fade = fading(run, full);
	if (fade) {
		const clip = program.clips.find((c) => c.id === fade.id);
		const other = left.clip === fade.id ? right : left;
		const edge = left.clip === fade.id ? 'last' : 'first';
		return `Clip "${fade.id}" (${clip?.block ?? 'block'}) is full-screen but ${Math.round(fade.cover * 100)} % opaque at ${sec(fade.frame, fps)} (program frame ${fade.frame}), next to ${boundText(other, fps)}: the footage under it shows through for up to ${n} (${span}), a flash of the shot. Full-screen clips hand over with a hard cut: keep its opacity at 1 to its ${edge} frame, or give the handover a transition.`;
	}
	const between =
		left.clip !== null && right.clip !== null
			? `full-screen clips "${left.clip}" and "${right.clip}"`
			: `full-screen clip ${boundText(left.clip !== null ? left : right, fps)} and ${boundText(left.clip !== null ? right : left, fps)}`;
	return `The footage shows for ${n} (${span}, program frames ${left.frame}–${right.frame - 1}) between ${between}: a flash of the shot underneath. Make the clips meet (one starts where the other ends, or both on the cut with "snap": "cut"), or keep the footage on screen for ${FLASH_SECONDS} s or more.`;
}

/** Where an element sits in nested CSS 3D, found by the page. */
export type Nested3d = { clip: string; block: string; path: string };

/** A `check` warning for nested `transform-style: preserve-3d` in HTML-in-Canvas capture. */
export function nested3dMessage(found: Nested3d): string {
	return `Clip "${found.clip}" (${found.block}): nested CSS 3D (transform-style: preserve-3d inside preserve-3d, at ${found.path}) can draw flattened or mirrored in HTML-in-Canvas capture. Look at a still; if it is wrong, keep one 3D level (2D flips for the inner parts) or draw the 3D with WebGL (Three.js).`;
}
