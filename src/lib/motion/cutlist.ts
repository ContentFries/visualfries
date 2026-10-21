import type { MotionProject } from './project.js';
import { isProgramProject, type Cut, type SourceTime, type Transition } from './timeline.js';
import type { MotionWord } from './transcript.js';
import { resolveAnchor, type AnchorContext } from './anchors.js';
import type { MusicBeats } from './beat-grid.js';
import type { ProjectLook } from './resolve.js';

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
	/** Music beats in program time (node tooling reads the beats files), for beat anchors. */
	music?: MusicBeats[];
	/** Brand and style resolved from their files; neutral when absent. */
	look?: ProjectLook;
};

export type ResolvedCut = {
	id: string;
	index: number;
	source: string;
	/** Source frames (at the project frame rate) of the first and after the last frame. */
	srcIn: number;
	srcOut: number;
	/** Program frames. */
	startFrame: number;
	frames: number;
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

const isNumeric = (t: SourceTime | undefined) =>
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
		let inSec: number;
		let outSec: number;
		try {
			inSec = resolveAnchor(cut.in ?? 0, ctx, 'start').time;
		} catch (error) {
			fail('in', `${cutName(index)}: ${(error as Error).message}`);
			return;
		}
		try {
			if (cut.out !== undefined)
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
		const srcIn = Math.round(inSec * fps);
		// The end edge rounds up, so the frame holding the last word's end stays in the cut; a
		// word ending inside the source's last frame keeps the source end.
		const srcOut = Math.min(
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
		cuts.push({
			id,
			index: cuts.length,
			source: cut.source,
			srcIn,
			srcOut,
			startFrame: at,
			frames: srcOut - srcIn,
			edit: cuts.length ? micro(at / fps + split) : 0,
			split: cuts.length ? split : 0,
			crossfade: cut.audio?.crossfade ?? DEFAULT_CROSSFADE,
			gain: cut.audio?.gain ?? 0,
			mute: cut.audio?.mute ?? false,
			transition: cut.transition ?? null,
			native: cut.native ?? null,
			numeric
		});
		at += srcOut - srcIn;
	});
	const end = at / fps;
	checkEdits(cuts, end, project, inputs, diagnostics);
	return {
		mode: 'program',
		cuts,
		frames: written.length ? at : null,
		words: programWords(project, cuts, end, inputs, diagnostics),
		diagnostics
	};
}

const NO_SOURCE = {
	source: null,
	sourceIndex: null,
	cut: null,
	sourceStart: null,
	sourceEnd: null
};

/** Program seconds where cut `i`'s sound ends. */
const editAfter = (cuts: ResolvedCut[], i: number, end: number) =>
	i + 1 < cuts.length ? cuts[i + 1].edit : end;

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
	diagnostics: ProgramDiagnostic[]
): ProgramWord[] | null {
	const fps = project.fps;
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
		const to = editAfter(cuts, i, end);
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
