import type { MotionAnchor, MotionProject } from './project.js';
import {
	SHOTS,
	TRANSITIONS,
	type ItemAnchor,
	type Key,
	type Provenance,
	type SourceTime,
	type Transition
} from './timeline.js';
import { NO_BEATS, resolveAnchor, type AnchorContext, type BeatContext } from './anchors.js';
import { pickMusic, type GridBeat } from './beat-grid.js';
import { resolveFormat, type FormatClass, type ResolvedFormat } from './format.js';
import { resolveMoment } from './moment.js';
import { resolveMotionProject, type ResolvedClip } from './resolve.js';
import {
	micro,
	resolveCutList,
	type ProgramDiagnostic,
	type ProgramInputs,
	type ProgramWord,
	type ResolvedCut
} from './cutlist.js';
import { sha1 } from './sha1.js';
import type { MotionWord } from './transcript.js';
import { parseEase } from './ease.js';

export type { ProgramDiagnostic, ProgramInputs, ProgramWord, SourceInfo } from './cutlist.js';

/** Hashes the node tooling computes from files; they go into the program and its segments. */
export type ProgramHashes = {
	project?: string;
	transcript?: string | null;
	transcripts?: Record<string, string>;
	sources?: Record<string, string>;
	/** Blocks, custom shots and transitions, fonts and CSS files, by project-relative path. */
	assets?: Record<string, string>;
	/** Music beats and their corrections; null without beats. */
	music?: string | null;
	/** Brand values and the contents of its font and logo files; null without a brand. */
	brand?: string | null;
	/** The layered style; null without a style. */
	style?: string | null;
};

export type { FormatClass };

/**
 * The frame the program is resolved for ("1080x1920"): its class and the safe insets of the
 * project's `safeZone`, as blocks see them in `clip.format`.
 */
export type ProgramFormat = ResolvedFormat & { name: string; size: [number, number] };

/** A keyframe at a program frame; lengths stay as written (px or "%") until interpolation. */
export type ResolvedKey = {
	frame: number;
	values: Omit<Key, 'at' | 'ease' | 'mix'>;
	ease: string | null;
	mix: 'oklab' | 'oklch';
};

export type ProgramSource = {
	src: string;
	matte: string | null;
	/** Frames at the project rate; null when the file could not be probed. */
	frames: number | null;
	width: number | null;
	height: number | null;
	fps: number | null;
	/** File the source's sound comes from; null: no sound. */
	audio: string | null;
	provenance?: Provenance;
};

export type ProgramCut = {
	id: string;
	index: number;
	source: string;
	startFrame: number;
	frames: number;
	/** Source frames (project rate): first, and one after the last. */
	srcIn: number;
	srcOut: number;
	/** Source frames available before `srcIn` and after `srcOut`; null: source length unknown. */
	handles: { before: number; after: number | null };
	/** Id of the transition into this cut. */
	transition: string | null;
	audio: { edit: number; split: number; crossfade: number; gain: number; mute: boolean };
	native: boolean | null;
};

export type ProgramShot = {
	id: string;
	shot: string;
	/** A gap between written shots, framed `full`. */
	implicit: boolean;
	startFrame: number;
	frames: number;
	/** Footage framed instead of the cut list's, from source frame `srcIn` at the shot start. */
	source: { name: string; srcIn: number | null } | null;
	params: Record<string, unknown>;
	/** Frames the layout moves from the previous shot's, from the shot start; 0: hard. */
	morphFrames: number;
	/** Ease of that move. */
	morphEase: string;
	transition: string | null;
	keys: ResolvedKey[];
	native: boolean | null;
};

export type ProgramClip = ResolvedClip & {
	slot: string | null;
	layer: 'front' | 'behind';
	transition: string | null;
	keys: ResolvedKey[];
	/** Stacking order: project order. */
	z: number;
	native: boolean | null;
};

export type ProgramTransition = {
	id: string;
	/** The incoming item that carries it. */
	owner: string;
	kind: 'cut' | 'shot' | 'clip';
	/** The outgoing cut or shot; null for a clip (everything below it is outgoing). */
	outgoing: string | null;
	type: string;
	startFrame: number;
	frames: number;
	/** Program frame of the cut (the incoming item's first frame). */
	cutFrame: number;
	align: 'center' | 'start' | 'end';
	direction: string | null;
	ease: string | null;
	params: Record<string, unknown>;
	sound: string | false | null;
	native: boolean | null;
	/** Frames a side holds its edge frame for lack of handle. */
	held: { out: number; in: number };
};

export type ProgramEvent = { kind: string; frame: number; owner: string; strength?: number };

/** Program seconds `at`, source seconds `srcIn`; `dur` null: to the end of the file or program. */
export type AudioPiece = {
	owner: string;
	file: string;
	srcIn: number;
	dur: number | null;
	at: number;
	fadeIn: number;
	fadeOut: number;
	/** dB. */
	gain: number;
	gainKeys?: { at: number; gain: number }[];
};

export type ProgramSegment = {
	id: string;
	startFrame: number;
	frames: number;
	/** Cuts, shots, clips and transitions on screen in the segment. */
	items: string[];
	hash: string;
};

export type ResolvedProgram = {
	version: 1;
	mode: 'inserts' | 'program';
	format: ProgramFormat;
	fps: number;
	frames: number;
	background: string | null;
	hashes: {
		project: string | null;
		transcript: string | null;
		transcripts: Record<string, string>;
		sources: Record<string, string>;
		assets: Record<string, string>;
		music: string | null;
		brand: string | null;
		style: string | null;
	};
	sources: Record<string, ProgramSource>;
	cuts: ProgramCut[];
	shots: ProgramShot[];
	clips: ProgramClip[];
	transitions: ProgramTransition[];
	words: ProgramWord[];
	events: ProgramEvent[];
	audio: {
		speech: AudioPiece[];
		sfx: AudioPiece[];
		music: AudioPiece[];
		master: { lufs: number; truePeak: number };
	};
	segments: ProgramSegment[];
	diagnostics: ProgramDiagnostic[];
};

/** Seconds a transition not drawn yet lasts when the project does not say. */
export const DEFAULT_TRANSITION_SECONDS = 0.5;
/** Loudness of finished videos. */
const MASTER = { lufs: -14, truePeak: -1 };

const isCustom = (name: string, ext: RegExp) => ext.test(name);
const CUSTOM_SHOT = /\.(ts|js)$/;
const CUSTOM_TRANSITION = /\.svelte$/;

/** The project's frame, or another size given as "1080x1350". */
export function programFormat(
	project: Pick<MotionProject, 'size' | 'safeZone'>,
	name?: string
): ProgramFormat {
	let size = project.size;
	if (name) {
		const m = /^(\d+)x(\d+)$/.exec(name);
		if (!m) throw new Error(`Unknown format "${name}". Use the project size or WIDTHxHEIGHT.`);
		size = [Number(m[1]), Number(m[2])];
	}
	return { name: `${size[0]}x${size[1]}`, size, ...resolveFormat(size, project.safeZone) };
}

/** The project's music beats for program-level anchors. */
const beatsOf = (inputs: ProgramInputs): BeatContext =>
	inputs.music?.length ? { music: inputs.music, clip: undefined } : NO_BEATS;

/** Beats in seconds from `start`, for `{ moment }` keys; undefined without music beats. */
function localGrid(beats: BeatContext, start: number): GridBeat[] | undefined {
	if (!beats.music.length) return undefined;
	try {
		return pickMusic(beats.music, beats.clip).grid.map((b) => ({ ...b, time: b.time - start }));
	} catch {
		return undefined;
	}
}

type Span = { startFrame: number; frames: number };
const endOf = (s: Span) => s.startFrame + s.frames;
const overlaps = (a: Span, b: Span) => a.startFrame < endOf(b) && b.startFrame < endOf(a);

/**
 * Resolves a project into its program for one format: cuts, shots (gaps framed `full`), clips,
 * transition windows with handles and held frames, keys, events, audio pieces and segments.
 * Pure: the same project and inputs give the same JSON, in Node and in the browser.
 */
export function resolveProgram(
	project: MotionProject,
	inputs: ProgramInputs & { hashes?: ProgramHashes },
	opts: { format?: string } = {}
): ResolvedProgram {
	const fps = project.fps;
	const format = programFormat(project, opts.format);
	const cutList = resolveCutList(project, inputs);
	const program = cutList.mode === 'program';
	const diagnostics: ProgramDiagnostic[] = [...cutList.diagnostics];
	const words = program ? cutList.words : inputs.words;
	const warn = (level: ProgramDiagnostic['level'], item: string, field: string, message: string) =>
		diagnostics.push({ level, item, field, message });

	// Clips resolve exactly as in `ResolvedProject`, against the program transcript.
	const beats = beatsOf(inputs);
	const resolved = resolveMotionProject(
		opts.format ? { ...project, size: format.size } : project,
		words,
		inputs.music ?? [],
		inputs.look ?? {}
	);
	diagnostics.push(...resolved.diagnostics);
	const anchorCtx: AnchorContext = { words, fps, window: null, localBase: null, beats };
	const at = (anchor: MotionAnchor, from?: number) =>
		resolveAnchor(
			anchor,
			from === undefined ? anchorCtx : { ...anchorCtx, window: { from, to: Infinity } },
			from === undefined ? 'start' : 'end'
		).time;

	// Program length: the cut list, else `duration`, else the latest end of clips or music.
	const musicEnds = (project.music ?? []).flatMap((m) =>
		m.until === undefined ? [] : [Math.round(m.until * fps)]
	);
	const frames =
		cutList.frames ??
		(project.duration !== undefined
			? Math.round(project.duration * fps)
			: Math.max(0, ...resolved.clips.map(endOf), ...musicEnds));

	const sources = programSources(project, inputs);
	const cuts: ProgramCut[] = cutList.cuts.map((c) => ({
		id: c.id,
		index: c.index,
		source: c.source,
		startFrame: c.startFrame,
		frames: c.frames,
		srcIn: c.srcIn,
		srcOut: c.srcOut,
		handles: {
			before: c.srcIn,
			after: sources[c.source]?.frames == null ? null : sources[c.source].frames! - c.srcOut
		},
		transition: null,
		audio: { edit: c.edit, split: c.split, crossfade: c.crossfade, gain: c.gain, mute: c.mute },
		native: c.native
	}));

	const shots = program ? resolveShots(project, inputs, words, cuts, frames, at, diagnostics) : [];
	const clips: ProgramClip[] = resolved.clips.map((clip) => {
		const spec = project.clips.find((c) => c.id === clip.id)!;
		if (!program)
			for (const field of ['slot', 'transition', 'keys'] as const)
				if (spec[field] !== undefined)
					diagnostics.push({
						level: 'warning',
						clip: clip.id,
						field,
						message: `"${field}" has no effect without "cuts" or "shots" (inserts mode).`
					});
		return {
			...clip,
			slot: program ? (spec.slot ?? null) : null,
			layer: spec.layer ?? 'front',
			transition: null,
			keys: program
				? resolveKeys(
						spec.keys,
						clip,
						'clip',
						clip.id,
						{ words, beats: { music: inputs.music ?? [], clip: spec.music } },
						fps,
						diagnostics
					)
				: [],
			z: project.clips.indexOf(spec),
			native: spec.native ?? null
		};
	});
	if (program) checkBehind(clips, cuts, shots, project, diagnostics);
	if (program && cuts.length) checkHardCuts(shots, cutList.cuts, diagnostics);

	const transitions = program
		? resolveTransitions(project, cutList.cuts, cuts, shots, clips, fps, warn)
		: [];
	const events = resolveEvents(shots, transitions);
	const audio = {
		speech: program ? speechPieces(project, cutList.cuts, sources, frames / fps) : [],
		sfx: resolveSfx(project, at, diagnostics),
		music: resolveMusic(project, frames / fps),
		master: { ...MASTER }
	};
	checkIds(project, cuts, shots, clips, diagnostics);

	const hashes = {
		project: inputs.hashes?.project ?? null,
		transcript: inputs.hashes?.transcript ?? null,
		transcripts: inputs.hashes?.transcripts ?? {},
		sources: inputs.hashes?.sources ?? {},
		assets: inputs.hashes?.assets ?? {},
		music: inputs.hashes?.music ?? null,
		brand: inputs.hashes?.brand ?? null,
		style: inputs.hashes?.style ?? null
	};
	const base = {
		version: 1 as const,
		mode: cutList.mode,
		format,
		fps,
		frames,
		background: project.background ?? null,
		hashes,
		sources,
		cuts,
		shots,
		clips,
		transitions
	};
	return {
		...base,
		words: cutList.words ?? [],
		events,
		audio,
		segments: resolveSegments(base, project),
		diagnostics
	};
}

function programSources(
	project: MotionProject,
	inputs: ProgramInputs
): Record<string, ProgramSource> {
	const out: Record<string, ProgramSource> = {};
	for (const [name, f] of Object.entries(project.footage ?? {})) {
		const info = inputs.sources?.[name];
		out[name] = {
			src: f.src,
			matte: f.matte ?? null,
			frames: info?.frames ?? null,
			width: info?.width ?? null,
			height: info?.height ?? null,
			fps: info?.fps ?? null,
			audio:
				f.audio === false
					? null
					: typeof f.audio === 'string'
						? f.audio
						: info?.audio === false
							? null
							: f.src,
			...(f.provenance ? { provenance: f.provenance } : {})
		};
	}
	return out;
}

/** Item-local keys: numbers and frames from the item start, phrases inside it, `{ moment }`. */
function resolveKeys(
	keys: Key[] | undefined,
	item: Span,
	kind: 'clip' | 'shot',
	id: string,
	{ words, beats }: { words: MotionWord[] | null; beats: BeatContext },
	fps: number,
	diagnostics: ProgramDiagnostic[]
): ResolvedKey[] {
	const start = item.startFrame / fps;
	const duration = item.frames / fps;
	const out: ResolvedKey[] = [];
	(keys ?? []).forEach((key, i) => {
		const field = `keys[${i}].at`;
		const report = (level: 'error' | 'warning', message: string) =>
			diagnostics.push({
				level,
				...(kind === 'clip' ? { clip: id } : { item: id }),
				field,
				message
			});
		let time: number;
		try {
			const anchor = key.at as ItemAnchor;
			if (typeof anchor === 'object' && 'moment' in anchor) {
				const cues = kind === 'clip' ? (item as ResolvedClip).cues : {};
				time =
					start +
					resolveMoment(anchor.moment, { id, cues, duration, fps, beats: localGrid(beats, start) });
			} else {
				time = resolveAnchor(
					anchor,
					{
						words,
						fps,
						window: { from: start - 1e-6, to: start + duration },
						localBase: start,
						scope: kind,
						beats
					},
					'start'
				).time;
			}
		} catch (error) {
			report('error', (error as Error).message);
			return;
		}
		const frame = Math.round(time * fps);
		if (frame < item.startFrame || frame > endOf(item))
			report(
				'warning',
				`Key at ${time.toFixed(2)} s is outside the ${kind} (${start.toFixed(2)}–${(start + duration).toFixed(2)} s).`
			);
		const values = Object.fromEntries(
			Object.entries(key).filter(([k]) => k !== 'at' && k !== 'ease' && k !== 'mix')
		) as ResolvedKey['values'];
		out.push({ frame, values, ease: key.ease ?? null, mix: key.mix ?? 'oklch' });
	});
	return out.sort((a, b) => a.frame - b.frame);
}

function resolveShots(
	project: MotionProject,
	inputs: ProgramInputs,
	words: MotionWord[] | null,
	cuts: ProgramCut[],
	frames: number,
	at: (anchor: MotionAnchor, from?: number) => number,
	diagnostics: ProgramDiagnostic[]
): ProgramShot[] {
	const fps = project.fps;
	const written: ProgramShot[] = [];
	/** What each written shot says about its morph: seconds, and whether a transition replaces it. */
	const asked = new Map<ProgramShot, { morph?: number; transition: boolean }>();
	(project.shots ?? []).forEach((shot, i) => {
		const id = shot.id ?? `shot${i + 1}`;
		const fail = (field: string, message: string) =>
			diagnostics.push({ level: 'error', item: id, field: `shots[${i}].${field}`, message });
		if (!(SHOTS as readonly string[]).includes(shot.shot) && !isCustom(shot.shot, CUSTOM_SHOT)) {
			fail(
				'shot',
				`Unknown shot "${shot.shot}". Built in: ${SHOTS.join(', ')}; or a file such as "shots/My.ts".`
			);
			return;
		}
		let start: number;
		let end: number;
		try {
			start = at(shot.from);
		} catch (error) {
			fail('from', (error as Error).message);
			return;
		}
		try {
			end = at(shot.until, start);
		} catch (error) {
			fail('until', (error as Error).message);
			return;
		}
		const startFrame = Math.max(0, Math.round(start * fps));
		let endFrame = Math.round(end * fps);
		if (endFrame > frames) {
			diagnostics.push({
				level: 'warning',
				item: id,
				field: `shots[${i}].until`,
				message: `Shot ends at ${end.toFixed(2)} s, after the program (${(frames / fps).toFixed(2)} s); it is cut there.`
			});
			endFrame = frames;
		}
		if (endFrame <= startFrame) {
			fail('until', `Shot ends (${end.toFixed(2)} s) before it starts (${start.toFixed(2)} s).`);
			return;
		}
		let source: ProgramShot['source'] = null;
		if (shot.source !== undefined) {
			const name = typeof shot.source === 'string' ? shot.source : shot.source.name;
			const srcTime: SourceTime | undefined =
				typeof shot.source === 'string' ? undefined : shot.source.in;
			if (!project.footage?.[name]) {
				fail(
					'source',
					`Unknown footage "${name}". Footage: ${Object.keys(project.footage ?? {}).join(', ') || 'none'}`
				);
				return;
			}
			let srcIn: number | null = null;
			if (srcTime !== undefined) {
				try {
					srcIn = Math.round(
						resolveAnchor(
							srcTime,
							{
								words: inputs.transcripts?.[name] ?? null,
								fps,
								window: null,
								localBase: null,
								scope: 'source',
								needs: `set "transcript" on footage "${name}"`
							},
							'start'
						).time * fps
					);
				} catch (error) {
					fail('source.in', (error as Error).message);
					return;
				}
			}
			source = { name, srcIn };
		}
		const span = { startFrame, frames: endFrame - startFrame };
		const resolved: ProgramShot = {
			id,
			shot: shot.shot,
			implicit: false,
			...span,
			source,
			params: shot.params ?? {},
			morphFrames: 0,
			morphEase: 'none',
			transition: null,
			keys: resolveKeys(
				shot.keys,
				span,
				'shot',
				id,
				{ words, beats: beatsOf(inputs) },
				fps,
				diagnostics
			),
			native: shot.native ?? null
		};
		written.push(resolved);
		asked.set(resolved, { morph: shot.morph, transition: shot.transition !== undefined });
	});
	written.sort((a, b) => a.startFrame - b.startFrame);
	for (let i = 1; i < written.length; i++) {
		if (overlaps(written[i - 1], written[i]))
			diagnostics.push({
				level: 'error',
				item: written[i].id,
				field: 'shots',
				message: `Shot "${written[i].id}" (${(written[i].startFrame / fps).toFixed(2)} s) starts before shot "${written[i - 1].id}" ends (${(endOf(written[i - 1]) / fps).toFixed(2)} s).`
			});
	}
	if (!cuts.length) return morphs(written, asked, fps);
	// Gaps show the cut list as it is: an implicit full frame.
	const out: ProgramShot[] = [];
	let frame = 0;
	const gap = (until: number) => {
		if (until > frame)
			out.push({
				id: `full-${frame}`,
				shot: 'full',
				implicit: true,
				startFrame: frame,
				frames: until - frame,
				source: null,
				params: {},
				morphFrames: 0,
				morphEase: 'none',
				transition: null,
				keys: [],
				native: null
			});
	};
	for (const shot of written) {
		gap(shot.startFrame);
		out.push(shot);
		frame = Math.max(frame, endOf(shot));
	}
	gap(frames);
	return morphs(out, asked, fps);
}

/**
 * Fills in each shot's morph: the project's `morph` in frames, never longer than the shot. The
 * shot engine adds default morphs and their eases.
 */
function morphs(
	shots: ProgramShot[],
	asked: Map<ProgramShot, { morph?: number; transition: boolean }>,
	fps: number
): ProgramShot[] {
	for (const shot of shots) {
		shot.morphFrames = Math.min(shot.frames, Math.round((asked.get(shot)?.morph ?? 0) * fps));
		shot.morphEase = 'none';
	}
	return shots;
}

/** A clip behind the subject needs a matte on every footage on screen with it. */
function checkBehind(
	clips: ProgramClip[],
	cuts: ProgramCut[],
	shots: ProgramShot[],
	project: MotionProject,
	diagnostics: ProgramDiagnostic[]
) {
	for (const clip of clips) {
		if (clip.layer !== 'behind') continue;
		const names = new Set([
			...cuts.filter((c) => overlaps(c, clip)).map((c) => c.source),
			...shots.filter((s) => s.source && overlaps(s, clip)).map((s) => s.source!.name)
		]);
		const bare = [...names].filter((n) => !project.footage?.[n]?.matte);
		if (bare.length || !names.size)
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'layer',
				message: names.size
					? `"behind" needs a matte, but footage ${bare.map((n) => `"${n}"`).join(', ')} has none (visualfries matte).`
					: '"behind" needs footage with a matte on screen with the clip.'
			});
	}
}

/** A written shot that runs across a hard cut keeps framing new footage with the old layout. */
function checkHardCuts(
	shots: ProgramShot[],
	cuts: ResolvedCut[],
	diagnostics: ProgramDiagnostic[]
) {
	for (const shot of shots) {
		if (shot.implicit || shot.source) continue;
		const crossed = cuts.filter(
			(c) =>
				c.index > 0 && !c.transition && c.startFrame > shot.startFrame && c.startFrame < endOf(shot)
		);
		for (const cut of crossed)
			diagnostics.push({
				level: 'warning',
				item: shot.id,
				field: 'shots',
				message: `Shot "${shot.id}" runs across the hard cut into ${cut.id} at frame ${cut.startFrame}.`
			});
	}
}

const normalizeTransition = (t: Transition) => (typeof t === 'string' ? { type: t } : t);

function resolveTransitions(
	project: MotionProject,
	resolvedCuts: ResolvedCut[],
	cuts: ProgramCut[],
	shots: ProgramShot[],
	clips: ProgramClip[],
	fps: number,
	warn: (level: ProgramDiagnostic['level'], item: string, field: string, message: string) => void
): ProgramTransition[] {
	const out: ProgramTransition[] = [];
	const window = (
		owner: string,
		kind: ProgramTransition['kind'],
		field: string,
		spec: Transition,
		cutFrame: number,
		outgoing: string | null
	): ProgramTransition | null => {
		const t = normalizeTransition(spec);
		if (
			!(TRANSITIONS as readonly string[]).includes(t.type) &&
			!isCustom(t.type, CUSTOM_TRANSITION)
		) {
			warn(
				'error',
				owner,
				field,
				`Unknown transition "${t.type}". Built in: ${TRANSITIONS.join(', ')}; or a file such as "transitions/My.svelte".`
			);
			return null;
		}
		if (t.ease !== undefined && !parseEase(t.ease)) {
			warn(
				'error',
				owner,
				`${field}.ease`,
				`Unknown ease "${t.ease}". Use a GSAP ease such as "expo.inOut", "power3.out" or "none".`
			);
			return null;
		}
		const duration = t.duration ?? DEFAULT_TRANSITION_SECONDS;
		const frames = Math.max(1, Math.round(duration * fps));
		const align = t.align ?? 'center';
		const before = align === 'center' ? Math.floor(frames / 2) : align === 'start' ? 0 : frames;
		return {
			id: `${owner}.transition`,
			owner,
			kind,
			outgoing,
			type: t.type,
			startFrame: cutFrame - before,
			frames,
			cutFrame,
			align,
			direction: t.direction ?? null,
			ease: t.ease ?? null,
			params: t.params ?? {},
			sound: t.sound ?? null,
			native: t.native ?? null,
			held: { out: 0, in: 0 }
		};
	};
	const seconds = (n: number) => (n / fps).toFixed(2);
	const fits = (t: ProgramTransition, prev: Span, next: Span, field: string, name: string) => {
		if (t.startFrame >= prev.startFrame && endOf(t) <= endOf(next)) return true;
		warn(
			'error',
			t.owner,
			field,
			`${name}: the ${t.type} window (${t.frames} frames, ${seconds(t.cutFrame - t.startFrame)} s before the cut, ${seconds(endOf(t) - t.cutFrame)} s after) is longer than a neighbouring range (${prev.frames} and ${next.frames} frames).`
		);
		return false;
	};

	resolvedCuts.forEach((cut, i) => {
		if (!cut.transition) return;
		const field = `cuts[${i}].transition`;
		const name = `cut ${i + 1}`;
		if (i === 0) {
			warn(
				'error',
				cut.id,
				field,
				`${name} is the first cut: there is nothing to transition from.`
			);
			return;
		}
		const t = window(cut.id, 'cut', field, cut.transition, cut.startFrame, cuts[i - 1].id);
		if (!t || !fits(t, cuts[i - 1], cuts[i], field, name)) return;
		// The incoming side starts early (handle before its "in"), the outgoing side runs on past
		// its "out"; without enough source the edge frame holds.
		const needIn = t.cutFrame - t.startFrame;
		const needOut = endOf(t) - t.cutFrame;
		const haveIn = cuts[i].handles.before;
		const haveOut = cuts[i - 1].handles.after;
		t.held.in = Math.max(0, needIn - haveIn);
		t.held.out = haveOut === null ? 0 : Math.max(0, needOut - haveOut);
		if (t.held.in)
			warn(
				'warning',
				cut.id,
				field,
				`${name}: ${t.type} needs ${seconds(needIn)} s of incoming handle, ${seconds(haveIn)} s available; the first frame holds ${t.held.in} frames.`
			);
		if (t.held.out)
			warn(
				'warning',
				cut.id,
				field,
				`${name}: ${t.type} needs ${seconds(needOut)} s of outgoing handle, ${seconds(haveOut!)} s available; the last frame holds ${t.held.out} frames.`
			);
		cuts[i].transition = t.id;
		out.push(t);
	});

	const written = project.shots ?? [];
	shots.forEach((shot, i) => {
		if (shot.implicit) return;
		const index = written.findIndex((s, k) => (s.id ?? `shot${k + 1}`) === shot.id);
		const spec = written[index]?.transition;
		if (!spec) return;
		const field = `shots[${index}].transition`;
		const prev = shots[i - 1];
		if (!prev || endOf(prev) !== shot.startFrame) {
			warn(
				'error',
				shot.id,
				field,
				`Shot "${shot.id}" has no shot right before it to transition from.`
			);
			return;
		}
		const t = window(shot.id, 'shot', field, spec, shot.startFrame, prev.id);
		if (!t || !fits(t, prev, shot, field, `shot "${shot.id}"`)) return;
		shot.transition = t.id;
		out.push(t);
	});

	for (const clip of clips) {
		const spec = project.clips.find((c) => c.id === clip.id)?.transition;
		if (!spec) continue;
		const t = window(clip.id, 'clip', 'transition', spec, clip.startFrame, null);
		if (!t) continue;
		if (t.startFrame < 0) {
			warn('error', clip.id, 'transition', `The ${t.type} window starts before the program.`);
			continue;
		}
		// Before its first frame the clip holds that frame.
		t.held.in = t.cutFrame - t.startFrame;
		clip.transition = t.id;
		out.push(t);
	}

	// Cut and shot transitions share the two sides of the stage: one at a time.
	const staged = out.filter((t) => t.kind !== 'clip').sort((a, b) => a.startFrame - b.startFrame);
	for (let i = 1; i < staged.length; i++)
		if (overlaps(staged[i - 1], staged[i]))
			warn(
				'error',
				staged[i].owner,
				'transition',
				`The ${staged[i].type} window into ${staged[i].owner} overlaps the ${staged[i - 1].type} window into ${staged[i - 1].owner}.`
			);
	return out.sort((a, b) => a.startFrame - b.startFrame || a.cutFrame - b.cutFrame);
}

/** A `shot` (or `whip`) event where each written shot starts, a `transition` on each cut. */
function resolveEvents(shots: ProgramShot[], transitions: ProgramTransition[]): ProgramEvent[] {
	const events: ProgramEvent[] = [
		...shots
			.filter((s) => !s.implicit)
			.map((s) => ({
				kind: s.shot === 'whip' ? 'whip' : 'shot',
				frame: s.startFrame,
				owner: s.id
			})),
		...transitions.map((t) => ({ kind: 'transition', frame: t.cutFrame, owner: t.id }))
	];
	return events.sort((a, b) => a.frame - b.frame || a.owner.localeCompare(b.owner));
}

/**
 * One piece per cut over its sound range [edit, next edit], widened by half the crossfade on
 * each side so equal-power fades centre on the edit points. Transitions never touch it.
 */
function speechPieces(
	project: MotionProject,
	cuts: ResolvedCut[],
	sources: Record<string, ProgramSource>,
	end: number
): AudioPiece[] {
	const fps = project.fps;
	const pieces: AudioPiece[] = [];
	cuts.forEach((cut, i) => {
		const file = sources[cut.source]?.audio;
		if (!file || cut.mute) return;
		const next = cuts[i + 1];
		const from = i ? Math.max(0, cut.edit - cut.crossfade / 2) : 0;
		const to = next ? Math.min(end, next.edit + next.crossfade / 2) : end;
		pieces.push({
			owner: cut.id,
			file,
			srcIn: micro(cut.srcIn / fps + (from - cut.startFrame / fps)),
			dur: micro(to - from),
			at: micro(from),
			fadeIn: i ? cut.crossfade : 0,
			fadeOut: next ? next.crossfade : 0,
			gain: cut.gain
		});
	});
	return pieces;
}

function resolveSfx(
	project: MotionProject,
	at: (anchor: MotionAnchor) => number,
	diagnostics: ProgramDiagnostic[]
): AudioPiece[] {
	const out: AudioPiece[] = [];
	(project.sfx ?? []).forEach((sfx, i) => {
		const id = sfx.id ?? `sfx${i + 1}`;
		try {
			out.push({
				owner: id,
				file: sfx.sound,
				srcIn: 0,
				dur: null,
				at: micro(Math.round(at(sfx.at) * project.fps) / project.fps),
				fadeIn: 0,
				fadeOut: 0,
				gain: sfx.gain ?? 0
			});
		} catch (error) {
			diagnostics.push({
				level: 'error',
				item: id,
				field: `sfx[${i}].at`,
				message: (error as Error).message
			});
		}
	});
	return out.sort((a, b) => a.at - b.at);
}

/**
 * Where each music item plays: its first sample at `from` (cut off before the program start)
 * until `until` or the program end. Gain, fades and gain keys come with the mixer (T9).
 */
function resolveMusic(project: MotionProject, end: number): AudioPiece[] {
	return (project.music ?? []).map((music, i) => {
		const from = music.from ?? 0;
		const until = music.until ?? end;
		return {
			owner: music.id ?? `music${i + 1}`,
			file: music.src,
			srcIn: micro(Math.max(0, -from)),
			dur: micro(Math.max(0, until - Math.max(0, from))),
			at: micro(Math.max(0, from)),
			fadeIn: 0,
			fadeOut: 0,
			gain: 0
		};
	});
}

function checkIds(
	project: MotionProject,
	cuts: ProgramCut[],
	shots: ProgramShot[],
	clips: ProgramClip[],
	diagnostics: ProgramDiagnostic[]
) {
	const seen = new Map<string, string>();
	const items: [string, string][] = [
		...cuts.map((c) => [c.id, 'cut'] as [string, string]),
		...shots.filter((s) => !s.implicit).map((s) => [s.id, 'shot'] as [string, string]),
		...clips.map((c) => [c.id, 'clip'] as [string, string]),
		...(project.music ?? []).map((m, i) => [m.id ?? `music${i + 1}`, 'music'] as [string, string]),
		...(project.sfx ?? []).map((s, i) => [s.id ?? `sfx${i + 1}`, 'sfx'] as [string, string])
	];
	for (const [id, kind] of items) {
		const other = seen.get(id);
		if (other)
			diagnostics.push({
				level: 'error',
				item: id,
				field: 'id',
				message: `The ${kind} id "${id}" is also used by a ${other}; item ids must be unique.`
			});
		else seen.set(id, kind);
	}
}

/**
 * Segments split the program at cuts without a transition, never inside a transition window.
 * A segment's hash covers what is on screen in it (resolved data, source files, blocks, custom
 * shots and transitions, fonts, styles), so it changes exactly when its pixels may.
 */
function resolveSegments(
	program: Pick<
		ResolvedProgram,
		| 'format'
		| 'fps'
		| 'frames'
		| 'background'
		| 'hashes'
		| 'sources'
		| 'cuts'
		| 'shots'
		| 'clips'
		| 'transitions'
	>,
	project: MotionProject
): ProgramSegment[] {
	const inWindow = (frame: number) =>
		program.transitions.some((t) => t.startFrame < frame && frame < endOf(t));
	const bounds = program.cuts
		.filter((c) => c.index > 0 && !c.transition && !inWindow(c.startFrame))
		.map((c) => c.startFrame);
	const edges = [0, ...bounds, program.frames];
	const segments: ProgramSegment[] = [];
	for (let i = 0; i + 1 < edges.length; i++) {
		const span = { startFrame: edges[i], frames: edges[i + 1] - edges[i] };
		if (span.frames <= 0) continue;
		const on = <T extends Span>(list: T[]) => list.filter((x) => overlaps(x, span));
		const cuts = on(program.cuts);
		const shots = on(program.shots);
		const clips = on(program.clips);
		const transitions = on(program.transitions);
		const sourceNames = [
			...new Set([
				...cuts.map((c) => c.source),
				...shots.flatMap((s) => (s.source ? [s.source.name] : []))
			])
		].sort();
		const assets = [
			...new Set([
				...clips.map((c) => c.block),
				...shots.map((s) => s.shot).filter((s) => isCustom(s, CUSTOM_SHOT)),
				...transitions.map((t) => t.type).filter((t) => isCustom(t, CUSTOM_TRANSITION)),
				...(project.fonts ?? []).map((f) => f.src),
				...(project.css ?? [])
			])
		];
		const hash = sha1(
			JSON.stringify({
				span,
				format: program.format,
				fps: program.fps,
				background: program.background,
				sources: sourceNames.map((n) => [n, program.sources[n], program.hashes.sources[n] ?? null]),
				assets: assets.map((a) => [a, program.hashes.assets[a] ?? null]),
				look: [program.hashes.brand, program.hashes.style],
				cuts,
				// The shot a morph starts from shapes the first frames too.
				shots: shotsDuring(program.shots, span),
				clips,
				transitions
			})
		);
		segments.push({
			id: `seg${segments.length + 1}`,
			...span,
			items: [...cuts, ...shots, ...clips, ...transitions].map((x) => x.id),
			hash
		});
	}
	return segments;
}

/** The shots overlapping `span`, and the shot the first of them morphs from. */
function shotsDuring<T extends Span>(shots: readonly T[], span: Span): T[] {
	const on = (s: T) => s.startFrame < endOf(span) && span.startFrame < endOf(s);
	return shots.filter((s, i) => on(s) || (i + 1 < shots.length && on(shots[i + 1])));
}
