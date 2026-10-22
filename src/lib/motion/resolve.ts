import type { MotionClip, MotionProject, MotionWords } from './project.js';
import type { MotionWord } from './transcript.js';
import { pickMusic, type MotionBeatRef, type MusicBeats } from './beat-grid.js';
import {
	AnchorError,
	resolveAnchor,
	resolvePhrase,
	type AnchorContext,
	type BeatContext,
	type Window
} from './anchors.js';
import type { FootageMap } from './footage-map.js';
import { NEUTRAL_BRAND, type ResolvedBrand } from './brand.js';
import { NEUTRAL_STYLE, type ResolvedStyle } from './style.js';
import { resolveFormat, type ResolvedFormat } from './format.js';

export type MotionWordRef = MotionWord & {
	/** Seconds relative to the clip start. */
	localStart: number;
	localEnd: number;
};

export type ResolvedCue = {
	/** Clip-local seconds. */
	start: number;
	end: number;
	/** Clip-local frame of `start`. */
	frame: number;
	words: MotionWordRef[];
};

export type ResolvedClip = {
	id: string;
	block: string;
	fps: number;
	size: [number, number];
	/** Program seconds, frame-aligned. */
	start: number;
	end: number;
	startFrame: number;
	frames: number;
	duration: number;
	cues: Record<string, ResolvedCue>;
	words: Record<string, MotionWordRef[]>;
	props: Record<string, unknown>;
	alpha: boolean;
	background: string | null;
	/** Footage whose sound the render muxes into this clip. */
	audio: string | null;
	/**
	 * Every beat of the clip's music (also those outside the clip), for beat moments,
	 * `clip.beats` and `clip.pulse()`. Absent when the project has no music with beats, so
	 * such projects resolve exactly as before; `noBeats` says why a clip with music has none.
	 */
	beats?: MotionBeatRef[];
	noBeats?: string;
	/** The project's brand (the neutral brand when it names none). */
	brand: ResolvedBrand;
	/** The project's style after layering. */
	style: ResolvedStyle;
	/** Format class and safe insets of the project size. */
	format: ResolvedFormat;
	/** Frames of the project's footage, filled in by the node tooling before a page loads. */
	footage?: Record<string, FootageFrames>;
	/** Program mode: which source frame the program shows when (filled in with `footage`). */
	footageMap?: FootageMap;
	/** Program mode: the area of the frame the clip fills (see `ProgramClip`). */
	slot?: string | null;
};

/** One extracted range of footage frames, in its own folder. */
export type FootageRange = {
	/** URL prefix; frames are `<url>plate/000123.jpg` and `<url>subject/000123.png`. */
	url: string;
	/** First and last extracted footage frame (inclusive). */
	first: number;
	last: number;
	/** Subject box of every frame of the range (`first`…`last`), measured on the matte. */
	boxes?: (SubjectBox | null)[];
};

/** Extracted frames of one footage, served to the page (see `<Footage>`). */
export type FootageFrames = {
	/** URL prefix of the first range (see `ranges`). */
	url: string;
	/** First and last frame of the first range (see `ranges`). */
	first: number;
	last: number;
	/**
	 * Every extracted range, in order. Inserts mode extracts one; program mode one per stretch of
	 * the source the program shows (none for a source it never shows). Without it the one range
	 * is `url`, `first`, `last` and `boxes`.
	 */
	ranges?: FootageRange[];
	/** Frames in the whole footage (at the project frame rate). */
	total: number;
	width: number;
	height: number;
	/** Program frame at which footage frame 0 plays. */
	startFrame: number;
	/** Whether a matte was given, so `subject` frames exist. */
	subject: boolean;
	/** Subject boxes of the first range (see `ranges`). */
	boxes?: (SubjectBox | null)[];
};

/**
 * Where the subject is in a footage frame, from its matte. Coordinates are fractions of the
 * footage frame (0–1, origin top left). `headX`/`headY` is the top of the subject's head,
 * `headHeight` how far down from there the chin is, in fractions of the footage height
 * (estimated from the head's width; absent in boxes measured before it existed).
 */
export type SubjectBox = {
	x: number;
	y: number;
	width: number;
	height: number;
	headX: number;
	headY: number;
	headHeight?: number;
};

export type MotionDiagnostic = {
	level: 'error' | 'warning';
	clip?: string;
	field: string;
	message: string;
};

export type ResolvedProject = {
	fps: number;
	size: [number, number];
	clips: ResolvedClip[];
	diagnostics: MotionDiagnostic[];
};

function toRef(word: MotionWord, clipStart: number): MotionWordRef {
	return { ...word, localStart: word.start - clipStart, localEnd: word.end - clipStart };
}

function resolveWords(
	spec: MotionWords,
	words: MotionWord[] | null,
	fps: number,
	window: Window,
	clipStart: number,
	beats: BeatContext
): MotionWord[] {
	if (!words)
		throw new AnchorError('Word bindings need a transcript; set "transcript" in the project.');
	if (spec === 'clip') return words.filter((w) => w.start >= window.from && w.start < window.to);
	const ctx: AnchorContext = { words, fps, window, localBase: clipStart, beats };
	if (typeof spec === 'string') return resolvePhrase(spec, ctx, undefined).words;
	const a = resolveAnchor(spec.from, ctx, 'start');
	const b = resolveAnchor(spec.until, ctx, 'end');
	return words.filter((w) => w.start >= a.time - 1e-6 && w.start < b.time);
}

/** Brand and style resolved from their files (node side); neutral when the project names none. */
export type ProjectLook = { brand?: ResolvedBrand; style?: ResolvedStyle };

export function resolveMotionClip(
	clip: MotionClip,
	project: Pick<MotionProject, 'fps' | 'size' | 'background' | 'safeZone'>,
	words: MotionWord[] | null,
	diagnostics: MotionDiagnostic[],
	music: MusicBeats[] = [],
	look: ProjectLook & { format?: ResolvedFormat } = {}
): ResolvedClip | null {
	const fps = project.fps;
	const beats: BeatContext = { music, clip: clip.music };
	const fail = (field: string, error: unknown) => {
		diagnostics.push({ level: 'error', clip: clip.id, field, message: (error as Error).message });
	};
	let startSec: number;
	let endSec: number;
	try {
		startSec = resolveAnchor(
			clip.from,
			{ words, fps, window: null, localBase: null, beats },
			'start'
		).time;
	} catch (error) {
		fail('from', error);
		return null;
	}
	try {
		endSec = resolveAnchor(
			clip.until,
			{ words, fps, window: { from: startSec, to: Infinity }, localBase: null, beats },
			'end'
		).time;
	} catch (error) {
		fail('until', error);
		return null;
	}
	endSec += clip.tail ?? 0;
	for (const field of ['from', 'until'] as const) {
		const anchor = clip[field];
		const say =
			typeof anchor === 'string'
				? anchor
				: typeof anchor === 'object' && 'say' in anchor
					? anchor.say
					: null;
		if (say && say.trim().split(/\s+/).length === 1) {
			diagnostics.push({
				level: 'warning',
				clip: clip.id,
				field,
				message: `One-word anchor "${say}" is searched ${field === 'until' ? 'from the clip start onward' : 'in the whole transcript'} and easily becomes ambiguous after a re-take. Use 2–3 words.`
			});
		}
	}
	const startFrame = Math.round(startSec * fps);
	const endFrame = Math.round(endSec * fps);
	if (endFrame <= startFrame) {
		fail(
			'until',
			new Error(`Clip ends (${endSec.toFixed(2)}s) before it starts (${startSec.toFixed(2)}s).`)
		);
		return null;
	}
	const start = startFrame / fps;
	const end = endFrame / fps;
	// Search with the unrounded anchors too: a word at 1.02 s must not fall out of a clip
	// whose first frame lands at 1.0333 s.
	const window = { from: Math.min(start, startSec) - 1e-6, to: Math.max(end, endSec) };

	const cues: Record<string, ResolvedCue> = {};
	for (const [name, anchor] of Object.entries(clip.cues ?? {})) {
		try {
			const hit = resolveAnchor(anchor, { words, fps, window, localBase: start, beats }, 'start');
			const local = hit.time - start;
			if (local < -1 / fps || local >= end - start) {
				diagnostics.push({
					level: 'warning',
					clip: clip.id,
					field: `cues.${name}`,
					message: `Cue at ${hit.time.toFixed(2)}s is never shown: the clip covers ${start.toFixed(2)}–${end.toFixed(2)}s (end exclusive).`
				});
			}
			cues[name] = {
				start: local,
				end: hit.end - start,
				frame: Math.round(local * fps),
				words: hit.words.map((w) => toRef(w, start))
			};
		} catch (error) {
			fail(`cues.${name}`, error);
		}
	}

	const bound: Record<string, MotionWordRef[]> = {};
	for (const [name, spec] of Object.entries(clip.words ?? {})) {
		try {
			bound[name] = resolveWords(spec, words, fps, window, start, beats).map((w) =>
				toRef(w, start)
			);
			if (!bound[name].length) {
				diagnostics.push({
					level: 'warning',
					clip: clip.id,
					field: `words.${name}`,
					message: 'No words matched.'
				});
			}
		} catch (error) {
			fail(`words.${name}`, error);
		}
	}

	// Without music the clip gets no beat fields at all, so it resolves exactly as before.
	let musicFields: { beats: MotionBeatRef[] } | { noBeats: string } | null = null;
	if (music.length) {
		try {
			musicFields = {
				beats: pickMusic(beats.music, beats.clip).grid.map(({ index, time, bar, beat }) => ({
					index,
					time,
					local: time - start,
					bar,
					beat
				}))
			};
		} catch (error) {
			musicFields = { noBeats: (error as Error).message };
		}
	}

	return {
		id: clip.id,
		block: clip.block,
		fps,
		size: project.size,
		start,
		end,
		startFrame,
		frames: endFrame - startFrame,
		duration: end - start,
		cues,
		words: bound,
		props: clip.props ?? {},
		alpha: clip.alpha ?? false,
		background: clip.alpha ? null : (clip.background ?? project.background ?? null),
		audio: clip.audio ?? null,
		...musicFields,
		brand: look.brand ?? NEUTRAL_BRAND,
		style: look.style ?? NEUTRAL_STYLE,
		format: look.format ?? resolveFormat(project.size, project.safeZone)
	};
}

/** `music`: beats of the project's music items, placed in the program (see `programBeats`). */
export function resolveMotionProject(
	project: MotionProject,
	words: MotionWord[] | null,
	music: MusicBeats[] = [],
	look: ProjectLook = {}
): ResolvedProject {
	const diagnostics: MotionDiagnostic[] = [];
	const format = resolveFormat(project.size, project.safeZone);
	// A project-wide setting: one warning for the project, not one per clip.
	if (format.fallback)
		diagnostics.push({ level: 'warning', field: 'safeZone', message: format.fallback });
	const ids = new Set<string>();
	const clips: ResolvedClip[] = [];
	for (const clip of project.clips) {
		if (ids.has(clip.id)) {
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'id',
				message: 'Duplicate clip id.'
			});
			continue;
		}
		ids.add(clip.id);
		if (clip.audio && !project.footage?.[clip.audio]) {
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'audio',
				message: `Unknown footage "${clip.audio}". Footage: ${Object.keys(project.footage ?? {}).join(', ') || 'none'}`
			});
		}
		if (clip.music && !music.some((m) => m.id === clip.music)) {
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'music',
				message: `Unknown music "${clip.music}". Music with beats: ${music.map((m) => m.id ?? m.name).join(', ') || 'none'}`
			});
		}
		const resolved = resolveMotionClip(clip, project, words, diagnostics, music, {
			...look,
			format
		});
		if (resolved) clips.push(resolved);
	}
	return { fps: project.fps, size: project.size, clips, diagnostics };
}
