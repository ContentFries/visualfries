import type { MotionProject } from './project.js';
import {
	isCutBeat,
	isProgramProject,
	type Cut,
	type CutBeat,
	type SourceTime,
	type Transition
} from './timeline.js';
import type { MotionAnchor } from './project.js';
import type { MotionWord } from './transcript.js';
import { resolveAnchor, type AnchorContext, type BeatContext } from './anchors.js';
import type { MusicBeats } from './beat-grid.js';
import { placeMusic, type MusicTrack } from './music.js';
import type { ProjectFiles, ProjectLook } from './resolve.js';
import type { AnimatableKind } from './interpolate.js';

/** A word of the program transcript and where it came from. */
export type ProgramWord = MotionWord & {
	/** Footage the word was spoken in; null for a project-level transcript without footage. */
	source: string | null;
	/** Index in that source's transcript. */
	sourceIndex: number | null;
	/** Index of the cut that plays it. */
	cut: number | null;
	/** Source seconds. */
	sourceStart: number | null;
	sourceEnd: number | null;
};

export type ProgramDiagnostic = {
	level: 'error' | 'warning' | 'info';
	/** Cut, shot, transition, music or sfx id. */
	item?: string;
	/** Clip id, as in `ResolvedProject` diagnostics. */
	clip?: string;
	field: string;
	message: string;
};

/** What the node tooling probed about a footage file. */
export type SourceInfo = {
	/** Frames at the project frame rate. */
	frames: number;
	/** Seconds. */
	duration: number;
	width: number;
	height: number;
	/** The file's own frame rate. */
	fps: number;
	/** Whether it has a sound track. */
	audio: boolean;
	/**
	 * Seconds of sound: the length of the footage's `audio` file when it has one, else of the
	 * file's own sound track. Unknown: the picture's length.
	 */
	audioDuration?: number;
};

/** Seconds of sound a probed source has; Infinity when it was not probed. */
export const soundLength = (info: SourceInfo | undefined) =>
	info ? (info.audioDuration ?? info.duration) : Infinity;

export type ProgramInputs = {
	/** Project-level transcript, in program time. */
	words: MotionWord[] | null;
	/** Transcripts of single footage sources, in source time. */
	transcripts?: Record<string, MotionWord[]>;
	/** Probed footage; a source missing here could not be read. */
	sources?: Record<string, SourceInfo>;
	/**
	 * Music beats already in program time, for beat anchors. Ignored when `tracks` is given: the
	 * resolver then places the music itself.
	 */
	music?: MusicBeats[];
	/**
	 * Each music item's beats in seconds of its file (node tooling reads the beats files). The
	 * resolver places them in the program through the item's `from`, `in` and `until`.
	 */
	tracks?: MusicTrack[];
	/** Brand and style resolved from their files; neutral when absent. */
	look?: ProjectLook;
	/**
	 * Sound files named by sfx items, transitions and music items, by the name as written: the
	 * seconds into the file where its hit sits (0 unless a sound library's `sounds.json` says),
	 * or null when the file does not exist. Absent: not looked up.
	 */
	sounds?: Record<string, SoundInfo | null>;
	/**
	 * Why each block an excerpt's end card names cannot be bundled (null: it can), by the name as
	 * written. Absent: not checked.
	 */
	endBlocks?: Record<string, string | null>;
	/** Project files clip props name as `{ "file": … }` (see `ProjectFiles`). Absent: not checked. */
	files?: ProjectFiles['files'];
	/**
	 * What each block named by a clip marks animatable (`export const animatable` in its
	 * `<script module>`), by the name as written; `error` when the declaration cannot be read.
	 * Absent: not looked up, so keyed props are not checked against it.
	 */
	animatable?: Record<string, BlockAnimatable>;
	/**
	 * The events each block named by a clip declares (`export const events` in its `<script
	 * module>`), by the name as written, for `{ event, clip }` anchors. Absent: none read.
	 */
	blockEvents?: Record<string, BlockEvents>;
	/**
	 * The speech measured at the audio edit points (node tooling, from the decoded sound). Where
	 * an edge is measured, it decides whether a word is cut through; elsewhere the transcript does.
	 */
	speechEdges?: SpeechEdge[];
};

/**
 * The voice at one edge of a cut's sound, measured on its source: `in` where the cut's sound
 * starts, `out` where it stops. `clean` when the voice does not run through the point; else
 * `move` is how far the point must go (seconds, later for `out`, earlier for `in`) to reach
 * quiet, null when that is more than a second away.
 */
export type SpeechEdge = {
	/** Index of the cut. */
	cut: number;
	side: 'in' | 'out';
	source: string;
	/** Source seconds of the point. */
	at: number;
	/** dBFS: the voice level around the point, and the quieter side right at it. */
	voice: number;
	level: number;
	clean: boolean;
	move: number | null;
};

/** A block's declared events (moments of its clip, or clip seconds), as read from its source. */
export type BlockEvents = { events: Record<string, string | number> } | { error: string };

/** A block's animatable props as `check` reads them from its source. */
export type BlockAnimatable = { props: Record<string, AnimatableKind> } | { error: string };

/**
 * `warning`: why the hit offset could not be read (it is then 0); `error`: the file has no
 * readable sound.
 */
export type SoundInfo = {
	hit: number;
	/** Seconds of sound in the file, when it was probed. */
	duration?: number;
	warning?: string;
	error?: string;
};

export type ResolvedCut = {
	id: string;
	index: number;
	source: string;
	/** Source frames (at the project frame rate) of the first and after the last frame. */
	srcIn: number;
	srcOut: number;
	/** Program frames, the hold included. */
	startFrame: number;
	frames: number;
	/** Program frames at the end of the cut that hold its last source frame, silent. */
	hold: number;
	/** Program seconds where this cut's sound starts (its first frame plus the J/L split). */
	edit: number;
	split: number;
	crossfade: number;
	/** dB. */
	gain: number;
	mute: boolean;
	transition: Transition | null;
	native: boolean | null;
	/** `in`/`out` given as source seconds or frames: they do not follow a retake. */
	numeric: ('in' | 'out')[];
};

export type CutList = {
	/** inserts: clips only, as before the cut list existed; program: the whole program. */
	mode: 'inserts' | 'program';
	cuts: ResolvedCut[];
	/** Program frames the cut list covers; null without cuts. */
	frames: number | null;
	/** Program transcript; null without any transcript. */
	words: ProgramWord[] | null;
	diagnostics: ProgramDiagnostic[];
};

/** Audio times are kept to the microsecond (a 48 kHz sample is ~21 µs): no float noise in files. */
export const micro = (seconds: number) => Math.round(seconds * 1e6) / 1e6;

/**
 * Seconds a word must reach past an edit point on both sides for the transcript's warning to
 * stand against a clean measurement (transcripts time edges up to about 0.08 s off).
 */
const INSIDE_WORD = 0.1;

/** Default anti-click crossfade at every audio edit point, seconds. */
export const DEFAULT_CROSSFADE = 0.01;

const cutName = (index: number) => `cut ${index + 1}`;
const defaultCutId = (index: number) => `cut${index + 1}`;

/** The cuts as written, or the one-range shorthand for a single footage. */
function cutsOf(project: MotionProject, diagnostics: ProgramDiagnostic[]): Cut[] {
	if (project.cuts?.length) return project.cuts;
	const names = Object.keys(project.footage ?? {});
	if (names.length > 1) {
		diagnostics.push({
			level: 'error',
			field: 'cuts',
			message: `Several footage (${names.join(', ')}) and no "cuts": list the ranges, e.g. "cuts": [{ "source": "${names[0]}" }, { "source": "${names[1]}", "in": "…" }].`
		});
		return [];
	}
	if (!names.length) return [];
	const name = names[0];
	const start = project.footage![name].start ?? 0;
	if (start > 0) {
		diagnostics.push({
			level: 'error',
			field: `footage.${name}.start`,
			message: `Footage "${name}" starts at ${start} s, but a program starts with its footage. Choose where it begins with "cuts": [{ "source": "${name}", "in": … }].`
		});
		return [];
	}
	return [{ source: name, in: Math.max(0, -start) }];
}

function checkTranscripts(project: MotionProject, diagnostics: ProgramDiagnostic[]) {
	if (!project.transcript) return;
	const perSource = Object.entries(project.footage ?? {})
		.filter(([, f]) => f.transcript)
		.map(([name]) => name);
	const target = Object.keys(project.footage ?? {})[0] ?? '<name>';
	if (perSource.length)
		diagnostics.push({
			level: 'error',
			field: 'transcript',
			message: `"transcript" (program time) cannot be combined with "footage.${perSource[0]}.transcript" (source time). Move it to "footage.${target}.transcript".`
		});
	else if (project.cuts?.length)
		diagnostics.push({
			level: 'error',
			field: 'transcript',
			message: `"transcript" is program time, but the cut list changes program time. Move it to "footage.${target}.transcript"; the cut list maps it.`
		});
}

const isNumeric = (t: SourceTime | CutBeat | undefined) =>
	t !== undefined && (typeof t === 'number' || (typeof t === 'object' && 'frame' in t));

/**
 * Resolves the cut list: cut points in source time (phrases against the source's transcript,
 * `out` searched from `in`, frame-rounded), program positions, audio edit points and the program
 * transcript. Projects without `cuts` or `shots` stay in inserts mode: their transcript is
 * program time, untouched.
 */
export function resolveCutList(project: MotionProject, inputs: ProgramInputs): CutList {
	const diagnostics: ProgramDiagnostic[] = [];
	if (!isProgramProject(project))
		return {
			mode: 'inserts',
			cuts: [],
			frames: null,
			words: inputs.words?.map((w) => ({ ...w, ...NO_SOURCE })) ?? null,
			diagnostics
		};
	const fps = project.fps;
	checkTranscripts(project, diagnostics);
	const written = cutsOf(project, diagnostics);
	// Cut points on beats read the music placed without words (the cut list decides the words).
	let musicForCuts: { beats: BeatContext; deferred: string[]; failed: string[] } | null = null;
	const cutBeats = () =>
		(musicForCuts ??= inputs.tracks
			? (() => {
					const placed = placeMusic(project, {
						tracks: inputs.tracks,
						words: null,
						sounds: inputs.sounds,
						stage: 'cuts'
					});
					return {
						beats: { music: placed.beats, clip: undefined },
						deferred: placed.deferred,
						failed: placed.failed
					};
				})()
			: { beats: { music: inputs.music ?? [], clip: undefined }, deferred: [], failed: [] });
	/**
	 * The program frame of a beat a cut ends on. `at` is a point in the cut's own source, mapped
	 * to program time through where the cut starts (`start`, a program frame).
	 */
	const beatFrame = (
		point: CutBeat,
		ctx: AnchorContext,
		inSec: number,
		srcIn: number,
		start: number
	): number => {
		let anchor = point as MotionAnchor;
		if ('at' in point) {
			const src = resolveAnchor(
				point.at,
				{ ...ctx, window: { from: inSec, to: Infinity }, scope: 'cut' },
				'end'
			).time;
			anchor = { ...point, at: micro((start - srcIn) / fps + src) };
		}
		const { beats, deferred, failed } = cutBeats();
		// The music the anchor reads: the one it names, else the only one with beats.
		const named = (point as { music?: string }).music;
		if (named === undefined && deferred.length && beats.music.length)
			throw new Error(
				`Several music items have beats (${[...beats.music.map((m) => m.name), ...deferred].join(', ')}); say which with "music": "<id>".`
			);
		try {
			const time = resolveAnchor(
				anchor,
				{ words: null, fps, window: null, localBase: null, beats },
				'end'
			).time;
			return Math.round(time * fps);
		} catch (error) {
			if (named !== undefined && failed.includes(named))
				throw new Error(`Music "${named}" could not be placed; see its error.`);
			const waits =
				named === undefined ? !beats.music.length && deferred.length : deferred.includes(named);
			if (!waits) throw error;
			const which = named ?? deferred[0];
			throw new Error(
				onEnd(which)
					? `Music "${which}" starts relative to the program end, which the cut list decides, so cut points cannot read its beats. Start it in seconds or on the beats of other music, or end the cut on a phrase.`
					: `Music "${which}" is placed by a phrase (its own "from", or that of the music it starts on), and the cut list decides where phrases play, so cut points cannot read its beats. Start it in seconds or on the beats of other music, or end the cut on a phrase.`
			);
		}
	};
	/** Whether music `id` starts on the program end (`"end"`, `{ program: "end" }`). */
	const onEnd = (id: string) => {
		const m = (project.music ?? []).find((x, i) => (x.id ?? `music${i + 1}`) === id);
		const from = m?.from;
		return from === 'end' || (typeof from === 'object' && from !== null && 'program' in from);
	};
	const cuts: ResolvedCut[] = [];
	let at = 0;
	written.forEach((cut, index) => {
		const id = cut.id ?? defaultCutId(index);
		const fail = (field: string, message: string) =>
			diagnostics.push({ level: 'error', item: id, field: `cuts[${index}].${field}`, message });
		const footage = project.footage?.[cut.source];
		if (!footage) {
			fail(
				'source',
				`${cutName(index)}: unknown footage "${cut.source}". Footage: ${Object.keys(project.footage ?? {}).join(', ') || 'none'}`
			);
			return;
		}
		const info = inputs.sources?.[cut.source];
		const ctx: AnchorContext = {
			words: inputs.transcripts?.[cut.source] ?? null,
			fps,
			window: null,
			localBase: null,
			scope: 'source',
			needs: `set "transcript" on footage "${cut.source}"`
		};
		if (isCutBeat(cut.in)) {
			fail(
				'in',
				`${cutName(index)}: "in" is a point in the source; a cut starts where the one before it ends. Put the beat on the "out" of ${index ? cutName(index - 1) : 'the cut before'}.`
			);
			return;
		}
		let inSec: number;
		let outSec: number;
		try {
			inSec = resolveAnchor(cut.in ?? 0, ctx, 'start').time;
		} catch (error) {
			fail('in', `${cutName(index)}: ${(error as Error).message}`);
			return;
		}
		const srcIn = Math.round(inSec * fps);
		/** Source frame after the last, when the cut ends on a beat. */
		let beatOut: number | null = null;
		try {
			if (isCutBeat(cut.out)) {
				const frame = beatFrame(cut.out, ctx, inSec, srcIn, at);
				if (frame <= at) {
					fail(
						'out',
						`${cutName(index)}: "out" on the music lands at ${(frame / fps).toFixed(2)} s, not after the cut starts (${(at / fps).toFixed(2)} s).`
					);
					return;
				}
				beatOut = srcIn + frame - at;
				outSec = beatOut / fps;
			} else if (cut.out !== undefined)
				outSec = resolveAnchor(
					cut.out,
					{ ...ctx, window: { from: inSec, to: Infinity }, scope: 'cut' },
					'end'
				).time;
			else if (info) outSec = info.frames / fps;
			else {
				fail(
					'out',
					`${cutName(index)}: no "out" and the length of "${footage.src}" is unknown (file not found or not probed). Give "out".`
				);
				return;
			}
		} catch (error) {
			fail('out', `${cutName(index)}: ${(error as Error).message}`);
			return;
		}
		// The end edge rounds up, so the frame holding the last word's end stays in the cut; a
		// word ending inside the source's last frame keeps the source end. A beat is a frame.
		const srcOut =
			beatOut ??
			Math.min(
				Math.ceil(outSec * fps - 1e-6),
				Math.max(Math.round(outSec * fps), info?.frames ?? Infinity)
			);
		if (srcIn < 0) {
			fail('in', `${cutName(index)}: "in" lands before the source starts (${inSec.toFixed(2)} s).`);
			return;
		}
		if (info && srcOut > info.frames) {
			fail(
				'out',
				`${cutName(index)}: "out" (${outSec.toFixed(2)} s) is after the end of "${footage.src}" (${(info.frames / fps).toFixed(2)} s).`
			);
			return;
		}
		if (srcOut <= srcIn) {
			fail(
				'out',
				`${cutName(index)}: "out" (${outSec.toFixed(2)} s) is not after "in" (${inSec.toFixed(2)} s).`
			);
			return;
		}
		const split = cut.audio?.split ?? 0;
		if (split && !cuts.length)
			diagnostics.push({
				level: 'warning',
				item: id,
				field: `cuts[${index}].audio.split`,
				message: `${cutName(index)} is the first cut: there is no edit point to split, the split is ignored.`
			});
		const numeric = project.cuts?.length
			? (['in', 'out'] as const).filter((k) => isNumeric(cut[k]))
			: [];
		for (const k of numeric)
			diagnostics.push({
				level: 'info',
				item: id,
				field: `cuts[${index}].${k}`,
				message: `${cutName(index)}: "${k}" is ${((k === 'in' ? srcIn : srcOut) / fps).toFixed(2)} s of "${cut.source}"; it does not follow a retake.`
			});
		const hold = Math.round((cut.hold ?? 0) * fps);
		if (cut.hold && !hold)
			diagnostics.push({
				level: 'warning',
				item: id,
				field: `cuts[${index}].hold`,
				message: `${cutName(index)}: a hold of ${cut.hold} s is less than half a frame, so nothing holds.`
			});
		cuts.push({
			id,
			index: cuts.length,
			source: cut.source,
			srcIn,
			srcOut,
			startFrame: at,
			frames: srcOut - srcIn + hold,
			hold,
			edit: cuts.length ? micro(at / fps + split) : 0,
			split: cuts.length ? split : 0,
			crossfade: cut.audio?.crossfade ?? DEFAULT_CROSSFADE,
			gain: cut.audio?.gain ?? 0,
			mute: cut.audio?.mute ?? false,
			transition: cut.transition ?? null,
			native: cut.native ?? null,
			numeric
		});
		at += srcOut - srcIn + hold;
	});
	const end = at / fps;
	checkEdits(cuts, end, project, inputs, diagnostics);
	const heard = new Map<SpeechEdge, string[]>();
	const words = programWords(project, cuts, end, inputs, diagnostics, heard);
	speechEdgeWarnings(cuts, inputs, heard, diagnostics);
	return {
		mode: 'program',
		cuts,
		frames: written.length ? at : null,
		words,
		diagnostics
	};
}

/**
 * The program end in seconds for `"end"` anchors: the cut list's length, else `duration`; null
 * when a program has neither (its length then comes from its clips), undefined in inserts mode.
 */
export function programEnd(
	project: Pick<MotionProject, 'duration' | 'fps'>,
	cutList: Pick<CutList, 'mode' | 'frames'>
): number | null | undefined {
	if (cutList.mode !== 'program') return undefined;
	const frames =
		cutList.frames ??
		(project.duration !== undefined ? Math.round(project.duration * project.fps) : null);
	return frames === null ? null : frames / project.fps;
}

/**
 * One warning per measured edge where the voice runs through the point, with how far to move
 * it and the transcript's words there. The field to change is the cut's `in`/`out`, or the
 * `audio.split` that put the point there.
 */
function speechEdgeWarnings(
	cuts: ResolvedCut[],
	inputs: ProgramInputs,
	heard: Map<SpeechEdge, string[]>,
	diagnostics: ProgramDiagnostic[]
) {
	const edges = (inputs.speechEdges ?? [])
		.filter((e) => !e.clean && cuts[e.cut]?.source === e.source)
		.sort((a, b) => a.cut - b.cut || (a.side === 'in' ? -1 : 1));
	for (const edge of edges) {
		const i = edge.cut;
		const cut = cuts[i];
		const split = edge.side === 'in' ? cut.split : (cuts[i + 1]?.split ?? 0);
		const held = edge.side === 'out' && cut.hold > 0;
		const field =
			split && !held
				? `cuts[${edge.side === 'in' ? i : i + 1}].audio.split`
				: `cuts[${i}].${edge.side}`;
		const which = field.endsWith('split') ? '"audio.split"' : `"${edge.side}"`;
		const words = [...new Set(heard.get(edge) ?? [])];
		const said = words.length ? ` in "${words.join(' ')}"` : '';
		const where = `${edge.at.toFixed(2)} s of "${edge.source}"`;
		const what =
			edge.side === 'out'
				? `the voice is still sounding where the cut's sound stops (${where})${said}`
				: `the voice has already started where the cut's sound starts (${where})${said}`;
		const fix =
			edge.move === null
				? `it goes on for more than a second: ${edge.side === 'out' ? 'end' : 'start'} the cut in a pause`
				: `move ${which} ${edge.move.toFixed(2)} s ${edge.side === 'out' ? 'later' : 'earlier'}`;
		diagnostics.push({
			level: 'warning',
			item: cut.id,
			field,
			message: `${cutName(i)}: ${what}; ${fix}.`
		});
	}
}

const NO_SOURCE = {
	source: null,
	sourceIndex: null,
	cut: null,
	sourceStart: null,
	sourceEnd: null
};

/** Program seconds of the next audio edit point after cut `i` (the program end after the last). */
const editAfter = (cuts: ResolvedCut[], i: number, end: number) =>
	i + 1 < cuts.length ? cuts[i + 1].edit : end;

/**
 * Program seconds where cut `i`'s sound ends: the next edit point, or where its hold starts
 * when that comes first (a hold is silent).
 */
export const soundEnd = (cuts: ResolvedCut[], i: number, end: number, fps: number) => {
	const cut = cuts[i];
	const next = editAfter(cuts, i, end);
	return cut.hold ? Math.min(next, (cut.startFrame + cut.frames - cut.hold) / fps) : next;
};

/** J/L splits must keep edit points in order and stay inside the source's sound. */
function checkEdits(
	cuts: ResolvedCut[],
	end: number,
	project: MotionProject,
	inputs: ProgramInputs,
	diagnostics: ProgramDiagnostic[]
) {
	const fps = project.fps;
	cuts.forEach((cut, i) => {
		if (!cut.split) return;
		const field = `cuts[${i}].audio.split`;
		const prev = cuts[i - 1];
		if (cut.split > 0 && prev.hold)
			diagnostics.push({
				level: 'warning',
				item: cut.id,
				field,
				message: `${cutName(i)}: the cut before holds its picture without sound, so this L cut leaves ${cut.split.toFixed(2)} s of silence after it.`
			});
		if (cut.edit <= prev.edit || cut.edit >= editAfter(cuts, i, end)) {
			diagnostics.push({
				level: 'error',
				item: cut.id,
				field,
				message: `${cutName(i)}: a split of ${cut.split} s moves the edit point (${cut.edit.toFixed(2)} s) past a neighbouring one.`
			});
			return;
		}
		// J cut: this source plays before "in"; L cut: the previous source plays after its "out".
		const [source, need, have, side] =
			cut.split < 0
				? [cut.source, -cut.split, cut.srcIn / fps, 'before "in"']
				: [
						prev.source,
						cut.split,
						soundLength(inputs.sources?.[prev.source]) - prev.srcOut / fps,
						'after "out" of the previous cut'
					];
		if (need > have + 1e-9)
			diagnostics.push({
				level: 'error',
				item: cut.id,
				field,
				message: `${cutName(i)}: the ${cut.split < 0 ? 'J' : 'L'} cut needs ${need.toFixed(2)} s of "${source}" sound ${side}, ${Math.max(0, have).toFixed(2)} s available.`
			});
	});
}

/**
 * Source words land in the cut whose sound range [edit, next edit) holds their midpoint, at
 * `start − in + P`, clamped to that range: J and L cuts move words with the sound. A range used
 * twice gives its words twice.
 */
function programWords(
	project: MotionProject,
	cuts: ResolvedCut[],
	end: number,
	inputs: ProgramInputs,
	diagnostics: ProgramDiagnostic[],
	/** Words the transcript puts across each measured edge where the voice runs through it. */
	heard: Map<SpeechEdge, string[]>
): ProgramWord[] | null {
	const fps = project.fps;
	const edgeOf = (cut: number, side: SpeechEdge['side']) =>
		inputs.speechEdges?.find((e) => e.cut === cut && e.side === side);
	if (inputs.words) {
		// A project-level transcript is already program time (footage shorthand).
		const only = cuts.length === 1 ? cuts[0] : null;
		return inputs.words.map((w) =>
			only
				? {
						...w,
						source: only.source,
						sourceIndex: w.index,
						cut: 0,
						sourceStart: w.start + only.srcIn / fps,
						sourceEnd: w.end + only.srcIn / fps
					}
				: { ...w, ...NO_SOURCE }
		);
	}
	if (!cuts.some((c) => inputs.transcripts?.[c.source])) return null;
	const out: ProgramWord[] = [];
	// Frame-rounded cut points may clip a word by up to half a frame; that is not worth a warning.
	const slack = 0.5 / fps + 1e-6;
	/** Warns that the edge of cut `i`'s sound range at `at` cuts through a word. */
	const cutThrough = (
		i: number,
		side: 'start' | 'end',
		at: number,
		w: MotionWord,
		shift: number,
		dropped: boolean
	) => {
		// Where the sound was measured it decides (a warning of its own, with the word), unless the
		// point lies well inside the word: a quiet stop consonant mid-word measures clean.
		const measured = edgeOf(i, side === 'start' ? 'in' : 'out');
		if (measured) {
			if (!measured.clean) {
				(heard.get(measured) ?? heard.set(measured, []).get(measured)!).push(w.text);
				return;
			}
			if (!(w.start + shift < at - INSIDE_WORD && w.end + shift > at + INSIDE_WORD)) return;
		}
		const edit = side === 'start' ? i : i + 1;
		const edge =
			edit === 0
				? `"in" of ${cutName(0)}`
				: edit === cuts.length
					? `"out" of ${cutName(cuts.length - 1)}`
					: `the audio edit point at ${at.toFixed(2)} s`;
		const owner = Math.min(edit, cuts.length - 1);
		diagnostics.push({
			level: 'warning',
			item: cuts[owner].id,
			field: `cuts[${owner}]`,
			message: `${cutName(owner)}: ${edge} cuts through "${w.text}" (${(w.start + shift).toFixed(2)}–${(w.end + shift).toFixed(2)} s)${dropped ? '; only part of it is heard, and it is left out of the program transcript' : ''}.`
		});
	};
	cuts.forEach((cut, i) => {
		const words = inputs.transcripts?.[cut.source];
		if (!words) return;
		const shift = cut.startFrame / fps - cut.srcIn / fps;
		const from = cut.edit;
		const to = soundEnd(cuts, i, end, fps);
		for (const w of words) {
			const wStart = w.start + shift;
			const wEnd = w.end + shift;
			const mid = (wStart + wEnd) / 2;
			if (mid < from || mid >= to) {
				// Mostly outside this cut's sound, but a part longer than the slack is heard.
				if (Math.min(wEnd, to) - Math.max(wStart, from) > slack)
					cutThrough(i, mid < from ? 'start' : 'end', mid < from ? from : to, w, shift, true);
				continue;
			}
			if (wStart < from - slack) cutThrough(i, 'start', from, w, shift, false);
			if (wEnd > to + slack) cutThrough(i, 'end', to, w, shift, false);
			out.push({
				...w,
				id: `w${out.length}`,
				index: out.length,
				start: Math.min(to, Math.max(from, wStart)),
				end: Math.min(to, Math.max(from, wEnd)),
				source: cut.source,
				sourceIndex: w.index,
				cut: i,
				sourceStart: w.start,
				sourceEnd: w.end
			});
		}
	});
	return out;
}
