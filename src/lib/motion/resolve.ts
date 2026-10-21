import {
	AMBIGUOUS_BAR_ANCHOR,
	type MotionAnchor,
	type MotionClip,
	type MotionProject,
	type MotionWords
} from './project.js';
import { describeWords, findPhrase, suggestPhrases, type MotionWord } from './transcript.js';
import {
	BEAT_OFFSET,
	findBarBeat,
	findBeat,
	nearBeat,
	pickMusic,
	shiftByBeats,
	type MotionBeatRef,
	type MusicBeats
} from './beat-grid.js';

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
	/** Frames of the project's footage, filled in by the node tooling before a page loads. */
	footage?: Record<string, FootageFrames>;
};

/** Extracted frames of one footage, served to the page (see `<Footage>`). */
export type FootageFrames = {
	/** URL prefix; frames are `<url>plate/000123.jpg` and `<url>subject/000123.png`. */
	url: string;
	/** First and last extracted footage frame (inclusive). */
	first: number;
	last: number;
	/** Frames in the whole footage (at the project frame rate). */
	total: number;
	width: number;
	height: number;
	/** Program frame at which footage frame 0 plays. */
	startFrame: number;
	/** Whether a matte was given, so `subject` frames exist. */
	subject: boolean;
	/** Subject box of every extracted frame (`first`…`last`), measured on the matte. */
	boxes?: (SubjectBox | null)[];
};

/**
 * Where the subject is in a footage frame, from its matte. Coordinates are fractions of the
 * footage frame (0–1, origin top left). `headX`/`headY` is the top of the subject's head.
 */
export type SubjectBox = {
	x: number;
	y: number;
	width: number;
	height: number;
	headX: number;
	headY: number;
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

class AnchorError extends Error {}

type Window = { from: number; to: number };

function resolvePhrase(
	words: MotionWord[] | null,
	say: string,
	window: Window | null,
	occurrence: number | undefined
): { start: number; end: number; words: MotionWord[] } {
	if (!words)
		throw new AnchorError(`"${say}" needs a transcript; set "transcript" in the project.`);
	const hits = findPhrase(words, say, window?.from, window?.to);
	if (!hits.length) {
		const anywhere = window ? findPhrase(words, say) : [];
		const similar = suggestPhrases(words, say, window?.from, window?.to);
		const hint = anywhere.length
			? ` It occurs outside this clip at ${anywhere.map((h) => h.start.toFixed(2) + 's').join(', ')}.`
			: similar.length
				? ` Did you mean ${similar
						.map(
							(h) => `"${h.text}" at ${h.start.toFixed(2)}s (${describeWords(words, h.start, 2)})`
						)
						.join('; ')}?`
				: window
					? ` Words in the clip start: ${describeWords(words, window.from, 6)}`
					: '';
		throw new AnchorError(`Phrase "${say}" not found${window ? ' inside the clip' : ''}.${hint}`);
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
		const list = hits
			.map((h, i) => `#${i + 1} at ${h.start.toFixed(2)}s (${describeWords(words, h.start, 2)})`)
			.join('; ');
		throw new AnchorError(
			`Phrase "${say}" is ambiguous: ${list}. Use a longer phrase or { "say": "${say}", "occurrence": n }.`
		);
	}
	return hits[0];
}

/** The music beat anchors may use, and the clip's choice among several. */
type BeatContext = { music: MusicBeats[]; clip: string | undefined };

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

/** Returns program seconds (or clip-local when `localBase` is given for numeric anchors). */
function resolveAnchor(
	anchor: MotionAnchor,
	words: MotionWord[] | null,
	fps: number,
	window: Window | null,
	defaultEdge: 'start' | 'last' | 'end',
	localBase: number | null,
	beats: BeatContext
): { time: number; end: number; words: MotionWord[] } {
	if (typeof anchor === 'number') {
		const time = localBase === null ? anchor : localBase + anchor;
		return { time, end: time, words: [] };
	}
	if (typeof anchor === 'string') anchor = { say: anchor };
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
		// Beats are absolute: bar 5 is bar 5 wherever the clip is.
		const music = musicFor(beats, anchor.music);
		let base: number;
		if ('bar' in anchor)
			base = findBarBeat(music.grid, anchor.bar, anchor.beat ?? 1, music.name).time;
		else if ('downbeat' in anchor || typeof anchor.beat === 'string') {
			const direction =
				'downbeat' in anchor ? anchor.downbeat : (anchor.beat as 'after' | 'before');
			// `at` keeps the caller's edge: in `until` a phrase means its end, so the downbeat after
			// it never cuts the phrase short. `{ say, edge }` still picks another edge.
			const at = resolveAnchor(anchor.at, words, fps, window, defaultEdge, localBase, beats).time;
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
	const hit = resolvePhrase(words, anchor.say, window, anchor.occurrence);
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
	if (typeof spec === 'string') return resolvePhrase(words, spec, window, undefined).words;
	const a = resolveAnchor(spec.from, words, fps, window, 'start', clipStart, beats);
	const b = resolveAnchor(spec.until, words, fps, window, 'end', clipStart, beats);
	return words.filter((w) => w.start >= a.time - 1e-6 && w.start < b.time);
}

export function resolveMotionClip(
	clip: MotionClip,
	project: Pick<MotionProject, 'fps' | 'size' | 'background'>,
	words: MotionWord[] | null,
	diagnostics: MotionDiagnostic[],
	music: MusicBeats[] = []
): ResolvedClip | null {
	const fps = project.fps;
	const beats: BeatContext = { music, clip: clip.music };
	const fail = (field: string, error: unknown) => {
		diagnostics.push({ level: 'error', clip: clip.id, field, message: (error as Error).message });
	};
	let startSec: number;
	let endSec: number;
	try {
		startSec = resolveAnchor(clip.from, words, fps, null, 'start', null, beats).time;
	} catch (error) {
		fail('from', error);
		return null;
	}
	try {
		endSec = resolveAnchor(
			clip.until,
			words,
			fps,
			{ from: startSec, to: Infinity },
			'end',
			null,
			beats
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
			const hit = resolveAnchor(anchor, words, fps, window, 'start', start, beats);
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
				beats: musicFor(beats, undefined).grid.map(({ index, time, bar, beat }) => ({
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
		...musicFields
	};
}

/** `music`: beats of the project's music items, placed in the program (see `programBeats`). */
export function resolveMotionProject(
	project: MotionProject,
	words: MotionWord[] | null,
	music: MusicBeats[] = []
): ResolvedProject {
	const diagnostics: MotionDiagnostic[] = [];
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
		const resolved = resolveMotionClip(clip, project, words, diagnostics, music);
		if (resolved) clips.push(resolved);
	}
	return { fps: project.fps, size: project.size, clips, diagnostics };
}
