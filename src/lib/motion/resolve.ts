import type { MotionAnchor, MotionClip, MotionProject, MotionWords } from './project.js';
import { describeWords, findPhrase, type MotionWord } from './transcript.js';

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
		const hint = anywhere.length
			? ` It occurs outside this clip at ${anywhere.map((h) => h.start.toFixed(2) + 's').join(', ')}.`
			: window
				? ` Words here: ${describeWords(words, window.from, 6)}`
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

/** Returns program seconds (or clip-local when `localBase` is given for numeric anchors). */
function resolveAnchor(
	anchor: MotionAnchor,
	words: MotionWord[] | null,
	fps: number,
	window: Window | null,
	defaultEdge: 'start' | 'last' | 'end',
	localBase: number | null
): { time: number; end: number; words: MotionWord[] } {
	if (typeof anchor === 'number') {
		const time = localBase === null ? anchor : localBase + anchor;
		return { time, end: time, words: [] };
	}
	if (typeof anchor === 'string') anchor = { say: anchor };
	if ('frame' in anchor) {
		const time = anchor.frame / fps + (anchor.offset ?? 0);
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
	const time = base + (anchor.offset ?? 0);
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
	clipStart: number
): MotionWord[] {
	if (!words)
		throw new AnchorError('Word bindings need a transcript; set "transcript" in the project.');
	if (spec === 'clip') return words.filter((w) => w.start >= window.from && w.start < window.to);
	if (typeof spec === 'string') return resolvePhrase(words, spec, window, undefined).words;
	const a = resolveAnchor(spec.from, words, fps, window, 'start', clipStart);
	const b = resolveAnchor(spec.until, words, fps, window, 'end', clipStart);
	return words.filter((w) => w.start >= a.time - 1e-6 && w.start < b.time);
}

export function resolveMotionClip(
	clip: MotionClip,
	project: Pick<MotionProject, 'fps' | 'size' | 'background'>,
	words: MotionWord[] | null,
	diagnostics: MotionDiagnostic[]
): ResolvedClip | null {
	const fps = project.fps;
	const fail = (field: string, error: unknown) => {
		diagnostics.push({ level: 'error', clip: clip.id, field, message: (error as Error).message });
	};
	let startSec: number;
	let endSec: number;
	try {
		startSec = resolveAnchor(clip.from, words, fps, null, 'start', null).time;
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
			null
		).time;
	} catch (error) {
		fail('until', error);
		return null;
	}
	endSec += clip.tail ?? 0;
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
			const hit = resolveAnchor(anchor, words, fps, window, 'start', start);
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
			bound[name] = resolveWords(spec, words, fps, window, start).map((w) => toRef(w, start));
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
		background: clip.alpha ? null : (clip.background ?? project.background ?? null)
	};
}

export function resolveMotionProject(
	project: MotionProject,
	words: MotionWord[] | null
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
		const resolved = resolveMotionClip(clip, project, words, diagnostics);
		if (resolved) clips.push(resolved);
	}
	return { fps: project.fps, size: project.size, clips, diagnostics };
}
