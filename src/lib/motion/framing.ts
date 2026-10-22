import { programFootageAt, type FootageMap, type FootageView } from './footage-map.js';
import { sourceSubjectBox } from './footage.js';
import type { FootageFrames, SubjectBox } from './resolve.js';
import type { ProgramTransition } from './program.js';
import { HEADROOM, SUBJECT_SMOOTH } from './shots/layout.js';
import { aspectParam } from './shots/window.js';
import {
	shotLayout,
	shotLayoutAt,
	type LayoutInput,
	type ShotLayout,
	type ShotSpan
} from './shots/index.js';
import type { StageSegment } from './segments.js';

/**
 * Framing a program's footage: what the shot engine gets at each frame (the subject, smoothed,
 * and each shot's one head size), shared by the stage that draws it and the `check` that warns
 * when a head is still cut. Pure: every number is a function of the program data and the frame.
 */

/** The share of a shot's frames whose head is no taller than the size the shot frames for. */
const HEAD_PERCENTILE = 0.85;
/**
 * The share of raw head tops around a frame that are higher than how high the head is taken to
 * get: a stray speck of matte in one frame does not count, a bob over several does.
 */
const PEAK_TOP = 0.1;

type Span = { startFrame: number; frames: number };

/**
 * The head's height a shot frames for (see `ShotInput.head`): a high percentile of the matte's
 * per-frame measure over every frame of the shot, so one tall frame (a lean, a hand) does not
 * shrink the whole shot and the shot does not breathe with every lean. Null without a matte
 * that measures heads.
 */
export function shotHead(
	shot: Span,
	map: FootageMap | null,
	footage: Record<string, FootageFrames>
): number | null {
	if (!map) return null;
	const heights: number[] = [];
	for (let f = shot.startFrame; f < shot.startFrame + shot.frames; f++) {
		const view = programFootageAt(map, f);
		const frames = view ? footage[view.source] : undefined;
		const box = frames && view ? sourceSubjectBox(frames, view.frame) : null;
		if (box?.headHeight !== undefined) heights.push(box.headHeight);
	}
	if (!heights.length) return null;
	heights.sort((a, b) => a - b);
	return heights[Math.min(heights.length - 1, Math.floor(heights.length * HEAD_PERCENTILE))];
}

export type FramingData = Pick<
	StageSegment,
	'fps' | 'size' | 'cls' | 'format' | 'footage' | 'footageMap' | 'shots'
>;

/**
 * The framing of a program (or a segment of it): the layout of a side showing `view` at
 * program frame `f`, from the shot track or from `shot` alone, and the smoothed subject of a
 * view. Head sizes are measured once per shot.
 */
export function programFraming(data: FramingData) {
	const heads = new Map<string, number | null>();
	const headOf = (shot: { id?: string }) => {
		const span = shot.id ? data.shots.find((s) => s.id === shot.id) : undefined;
		if (!span) return null;
		if (!heads.has(span.id)) heads.set(span.id, shotHead(span, data.footageMap, data.footage));
		return heads.get(span.id)!;
	};
	const framesOf = (view: FootageView | null) =>
		view ? (data.footage[view.source] ?? null) : null;
	// How high the head gets is only worth working out when a shot keeps the head in.
	const keepsHeads = data.shots.some((s) => typeof s.params.headroom === 'number');
	const raw = new Map<string, number | null>();
	const rawTop = (source: string, frames: FootageFrames, frame: number) => {
		const key = `${source}:${frame}`;
		if (!raw.has(key)) raw.set(key, sourceSubjectBox(frames, frame)?.headY ?? null);
		return raw.get(key)!;
	};
	const low = new Map<string, number | null>();
	/** A low percentile of the raw head tops within the smoothing window around `frame`. */
	const lowTop = (source: string, frames: FootageFrames, frame: number, w: number) => {
		const key = `${source}:${frame}`;
		if (!low.has(key)) {
			const tops: number[] = [];
			for (let k = frame - w; k <= frame + w; k++) {
				const top = rawTop(source, frames, k);
				if (top !== null) tops.push(top);
			}
			tops.sort((a, b) => a - b);
			low.set(key, tops.length ? tops[Math.floor(tops.length * PEAK_TOP)] : null);
		}
		return low.get(key)!;
	};
	/**
	 * How high the top of the head gets around a view (see `ShotInput.headTop`): a low percentile
	 * of the raw tops in the smoothing window of each frame, averaged over the same window, so it
	 * leads a bob as calmly as the subject follows it.
	 */
	function headTopOf(view: FootageView | null): number | null {
		const frames = framesOf(view);
		if (!keepsHeads || !frames || !view) return null;
		const w = Math.round(SUBJECT_SMOOTH * data.fps);
		let sum = 0;
		let n = 0;
		for (let g = view.frame - w; g <= view.frame + w; g++) {
			const top = lowTop(view.source, frames, g, w);
			if (top === null) continue;
			sum += top;
			n++;
		}
		return n ? sum / n : null;
	}
	/** The subject in a view, averaged over `SUBJECT_SMOOTH` seconds on each side. */
	function subjectOf(view: FootageView | null): SubjectBox | null {
		const frames = framesOf(view);
		return frames && view
			? sourceSubjectBox(frames, view.frame, Math.round(SUBJECT_SMOOTH * data.fps))
			: null;
	}
	function layoutFor(
		f: number,
		view: FootageView | null,
		shot?: Pick<ShotSpan, 'shot' | 'params' | 'keys'> & { id?: string }
	): ShotLayout {
		const frames = framesOf(view);
		const input: LayoutInput = {
			cls: data.cls,
			size: data.size,
			footage: frames ? [frames.width, frames.height] : null,
			safe: data.format.safe,
			subject: subjectOf(view),
			headTop: headTopOf(view),
			headOf
		};
		return shot ? shotLayout(shot, input, f) : shotLayoutAt(data.shots, f, input);
	}
	return { layoutFor, subjectOf, headOf };
}

/** Frames a head may be cut before `check` says so: a blink of a lean is not worth a warning. */
const CROP_FRAMES = 5;
/**
 * Room above the head, as a share of the camera window, below which `check` counts it as cut:
 * the matte's top sits a little above the hair, so less than this reads as touching the edge.
 */
const TOP_ROOM = 0.02;
/**
 * Share of the head (top to chin) below the camera window past which `check` counts the face as
 * cut: a little of the chin may go, the mouth may not.
 */
const FACE_CUT = 0.25;

export type HeadCrop = {
	shot: string;
	/** `top`: the top of the head is cut or touches the edge; `face`: the face is cut below. */
	edge: 'top' | 'face';
	/** Program frames, first and last cut. */
	from: number;
	to: number;
	/**
	 * The worst frame: pixels of the head past the window's edge (0 for a head touching the top
	 * edge), and as a share of the head (null: the matte gives no head size).
	 */
	pixels: number;
	share: number | null;
};

/**
 * Where a shot's camera window cuts the speaker's head for at least `CROP_FRAMES` frames in a
 * row, its keys included: the top of the head less than `TOP_ROOM` of the window below its top
 * edge (or past it), or more than `FACE_CUT` of the head below its bottom edge. The head is
 * where each frame's matte puts it (not smoothed: a lean that the calm framing lags behind
 * counts). Morphs and cut or shot transition windows are skipped (the head is in motion there).
 * `range` limits the frames looked at (a segment).
 */
export function headCrops(
	data: FramingData & { transitions: readonly ProgramTransition[] },
	range: Span = { startFrame: 0, frames: Infinity }
): HeadCrop[] {
	const map = data.footageMap;
	if (!map) return [];
	const framing = programFraming(data);
	const out: HeadCrop[] = [];
	const inWindow = (f: number) =>
		data.transitions.some(
			(t) => t.kind !== 'clip' && f >= t.startFrame && f < t.startFrame + t.frames
		);
	for (const shot of data.shots) {
		const from = Math.max(shot.startFrame + shot.morphFrames, range.startFrame);
		const to = Math.min(shot.startFrame + shot.frames, range.startFrame + range.frames);
		const runs: Record<HeadCrop['edge'], HeadCrop | null> = { top: null, face: null };
		const close = (edge: HeadCrop['edge']) => {
			const run = runs[edge];
			if (run && run.to - run.from + 1 >= CROP_FRAMES) out.push(run);
			runs[edge] = null;
		};
		const mark = (edge: HeadCrop['edge'], f: number, pixels: number, share: number | null) => {
			const run = runs[edge];
			if (!run) runs[edge] = { shot: shot.id, edge, from: f, to: f, pixels, share };
			else {
				run.to = f;
				if (pixels > run.pixels || (share ?? 0) > (run.share ?? 0))
					Object.assign(run, { pixels, share });
			}
		};
		for (let f = from; f < to; f++) {
			const view = programFootageAt(map, f);
			const frames = view && !inWindow(f) ? data.footage[view.source] : undefined;
			const box = frames && view ? sourceSubjectBox(frames, view.frame) : null;
			if (!box) {
				close('top');
				close('face');
				continue;
			}
			const { camera, clip } = framing.layoutFor(f, view);
			const top = camera.y + box.headY * camera.height;
			// The shot's head size, not the frame's: one odd matte frame would make odd numbers.
			const size = framing.headOf(shot) ?? box.headHeight;
			const head = size ? size * camera.height : null;
			const share = (v: number) => (head ? Math.round((v / head) * 100) / 100 : null);
			if (top - clip.y < TOP_ROOM * clip.height) {
				const cut = Math.max(0, clip.y - top);
				mark('top', f, Math.round(cut), share(cut));
			} else close('top');
			const below = head === null ? 0 : top + head - (clip.y + clip.height);
			if (head !== null && below > FACE_CUT * head)
				mark('face', f, Math.round(below), share(below));
			else close('face');
		}
		close('top');
		close('face');
	}
	return out.sort((a, b) => a.from - b.from);
}

/**
 * A `check` warning for a head crop, worded so an agent knows what it can change. It stays a
 * warning: a tight crop can be the creator's choice, so the agent looks at a still and decides.
 */
export function headCropMessage(
	crop: HeadCrop,
	shot: Pick<ShotSpan, 'shot' | 'params' | 'keys'>,
	fps: number
): string {
	const s = (f: number) => `${(f / fps).toFixed(2)} s`;
	const keyed = (k: string) => shot.keys?.some((key) => k in key.values) ?? false;
	const tries: string[] = [];
	if (typeof shot.params.headroom !== 'number')
		tries.push(
			`set "headroom": ${HEADROOM} (keeps the whole head in, backing off over a blurred copy when it must)`
		);
	if (shot.shot === 'window') {
		const aspect = aspectParam(shot.params.aspect);
		if (aspect === null || aspect > 0.8) tries.push('a taller "aspect" such as "4:5"');
		tries.push('a lower "zoom"');
	}
	if (shot.shot === 'strip') tries.push('a larger "size"');
	if (shot.shot === 'punch' || shot.shot === 'behind') tries.push('a lower "scale"');
	if (keyed('scale')) tries.push('a lower "scale" key');
	if (keyed('y'))
		tries.push(
			crop.edge === 'top' ? 'a "y" key further down (a larger number)' : 'a "y" key closer to 0'
		);
	const share = crop.share === null ? '' : `, ${Math.round(crop.share * 100)} % of the head`;
	const what =
		crop.edge === 'face'
			? `cuts the speaker's face off at the bottom (up to ${crop.pixels} px of the head below the window${share})`
			: crop.pixels > 0
				? `cuts off the top of the speaker's head (by up to ${crop.pixels} px${share})`
				: "leaves no room above the speaker's head (it touches the window's top edge)";
	return `Shot "${crop.shot}" (${shot.shot}) ${what} from ${s(crop.from)} to ${s(crop.to + 1)}, its keys included. If the crop is not meant, try: ${tries.join('; ')}. Look at a still of the shot before deciding.`;
}
