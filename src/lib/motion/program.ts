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
import {
	AnchorError,
	NO_BEATS,
	resolveAnchor,
	type AnchorContext,
	type BeatContext
} from './anchors.js';
import { NO_MUSIC_BEATS, pickMusic, type GridBeat } from './beat-grid.js';
import {
	missingBeats,
	musicEnd,
	musicEnds,
	placeMusic,
	type MusicEnd,
	type PlacedMusic
} from './music.js';
import { resolveFormat, type FormatClass, type ResolvedFormat } from './format.js';
import { resolveMoment } from './moment.js';
import { resolveMotionProject, type ResolvedClip } from './resolve.js';
import {
	micro,
	programEnd,
	resolveCutList,
	soundEnd,
	soundLength,
	type ProgramDiagnostic,
	type ProgramInputs,
	type ProgramWord,
	type ResolvedCut
} from './cutlist.js';
import { sha1 } from './sha1.js';
import {
	defaultMorph,
	SHOT_MODULES,
	shotAt,
	shotEvents,
	shotLayout,
	shotModule,
	shotsDuring
} from './shots/index.js';
import type { MotionWord } from './transcript.js';
import { parseEase } from './ease.js';
import { NEUTRAL_BRAND, type ResolvedBrand } from './brand.js';
import { clipEnergy, type Energy } from './energy.js';
import { compileKeyTracks, KEY_EASE, PLACEMENT, substituteBrand, type Animatable } from './keys.js';
import {
	screenDirection,
	transitionEvents,
	transitionHandles,
	transitionModule
} from './transitions/index.js';

export type {
	BlockAnimatable,
	ProgramDiagnostic,
	ProgramInputs,
	ProgramWord,
	SourceInfo
} from './cutlist.js';

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

/**
 * A keyframe at a program frame. Lengths stay as written (px or "%") until interpolation; brand
 * tokens in props (`"brand.primary"`) are already replaced by the brand's colours. `ease` shapes
 * the move arriving at this key: the key's own, else the energy's (see `KEY_EASE`).
 */
export type ResolvedKey = {
	frame: number;
	values: Omit<Key, 'at' | 'ease' | 'mix'>;
	ease: string;
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
	/**
	 * Program frames at the end of the cut (inside `frames`) that hold source frame `srcOut − 1`,
	 * without sound. Absent: no hold.
	 */
	hold?: number;
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
	/**
	 * Footage framed instead of the cut list's: source frame `srcIn` (0 unless the shot gives
	 * `in`) at the shot start.
	 */
	source: { name: string; srcIn: number } | null;
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
	/** Music only: the end of bar `bar`, the nearest to `target` (where it would end unsnapped). */
	snap?: { bar: number; target: number };
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
		/** dB of effects (their loudest 100 ms) and music under the speech loudness. */
		levels: { sfx: number; music: number };
		/** Integrated loudness (LUFS) and true-peak ceiling (dBTP) of the finished video. */
		master: { lufs: number; truePeak: number };
	};
	segments: ProgramSegment[];
	diagnostics: ProgramDiagnostic[];
};

/** Seconds a transition not drawn yet lasts when the project does not say. */
export const DEFAULT_TRANSITION_SECONDS = 0.5;
/**
 * Mix levels when the project does not set them: effects about 10 dB under the speech (issue
 * 07), music at one steady level under it (issue 17), finished videos at −14 LUFS integrated
 * with true peaks at or under −1 dBTP.
 */
export const MIX_DEFAULTS = { sfx: -10, music: -15, loudness: -14, truePeak: -1 } as const;
/** Default music fades: an anti-click fade-in and a one-second fade-out. */
export const MUSIC_FADE = { in: 0.01, out: 1 } as const;

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

/**
 * Orders text by UTF-16 code units, the same on every machine (`localeCompare` follows the
 * locale, which would make the order, and the mix, depend on where it runs).
 */
export const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

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
	given: ProgramInputs & { hashes?: ProgramHashes },
	opts: { format?: string } = {}
): ResolvedProgram {
	const fps = project.fps;
	const format = programFormat(project, opts.format);
	const cutList = resolveCutList(project, given);
	const program = cutList.mode === 'program';
	const diagnostics: ProgramDiagnostic[] = [...cutList.diagnostics];
	const words = program ? cutList.words : given.words;
	// Music goes where its anchors put it (program words exist now), and its beats with it.
	// `"end"` anchors read the program end the cut list (or `duration`) fixes.
	const end = programEnd(project, cutList);
	const placement = placeMusic(project, {
		tracks: given.tracks,
		given: given.music,
		words,
		sounds: given.sounds,
		stage: 'program',
		end
	});
	diagnostics.push(...placement.diagnostics);
	// Where the cut list (or `duration`) fixes the program length, each music item's end is known
	// before anything reads its beats, so beat anchors exist exactly while the music plays. After a
	// broken cut list the length means nothing: no warnings about ends then.
	const fixedFrames = program
		? (cutList.frames ??
			(project.duration !== undefined ? Math.round(project.duration * fps) : null))
		: null;
	const cutsBroken = cutList.diagnostics.some((d) => d.level === 'error');
	const { ends, beats: playing } = musicEnds(
		project,
		placement.placed,
		fixedFrames === null ? null : fixedFrames / fps,
		cutsBroken ? [] : diagnostics
	);
	const inputs = given.tracks ? { ...given, music: playing } : given;
	if (!program) {
		const i = (project.music ?? []).findIndex((m) => m.snap !== undefined);
		if (i >= 0)
			diagnostics.push({
				level: 'warning',
				item: project.music![i].id ?? `music${i + 1}`,
				field: `music[${i}].snap`,
				message:
					'"snap" has no effect without "cuts" or "shots": music is mixed, and ends on a bar, only in a program.'
			});
	}
	const warn = (level: ProgramDiagnostic['level'], item: string, field: string, message: string) =>
		diagnostics.push({ level, item, field, message });

	// Clips resolve exactly as in `ResolvedProject`, against the program transcript.
	const beats = beatsOf(inputs);
	const resolved = resolveMotionProject(
		opts.format ? { ...project, size: format.size } : project,
		words,
		inputs.music ?? [],
		{ ...inputs.look, end }
	);
	diagnostics.push(...resolved.diagnostics);
	const anchorCtx: AnchorContext = {
		words,
		fps,
		window: null,
		localBase: null,
		beats,
		end,
		event: (name, clip) => clipEvent(resolved.clips, project, inputs, name, clip)
	};
	checkEvents(resolved.clips, inputs, end, diagnostics);
	const at = (anchor: MotionAnchor, from?: number) =>
		resolveAnchor(
			anchor,
			from === undefined ? anchorCtx : { ...anchorCtx, window: { from, to: Infinity } },
			from === undefined ? 'start' : 'end'
		).time;

	// Program length: the cut list, else `duration`, else the latest end of clips or music.
	const musicStops = placement.placed.flatMap((m) =>
		m?.until == null ? [] : [Math.round(m.until * fps)]
	);
	const frames =
		cutList.frames ??
		(project.duration !== undefined
			? Math.round(project.duration * fps)
			: Math.max(0, ...resolved.clips.map(endOf), ...musicStops));

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
		...(c.hold ? { hold: c.hold } : {}),
		transition: null,
		audio: { edit: c.edit, split: c.split, crossfade: c.crossfade, gain: c.gain, mute: c.mute },
		native: c.native
	}));

	const brand = inputs.look?.brand ?? NEUTRAL_BRAND;
	const shots = program
		? resolveShots(project, inputs, words, cuts, frames, at, diagnostics, format.size, end)
		: [];
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
				? resolveKeys(spec.keys, clip, 'clip', clip.id, {
						words,
						end,
						beats: { music: inputs.music ?? [], clip: spec.music },
						fps,
						diagnostics,
						brand,
						energy: clipEnergy(clip),
						size: format.size,
						block: clip.block,
						animatable: spec.keys?.some((k) => k.props)
							? blockAnimatable(inputs, clip.block, clip.id, diagnostics)
							: undefined
					})
				: [],
			z: project.clips.indexOf(spec),
			native: spec.native ?? null
		};
	});
	if (program) {
		checkBehind(clips, cuts, shots, project, diagnostics);
		checkSubjectLayers(clips, cuts, shots, project, diagnostics);
	}
	if (program) checkSlots(clips, shots, format, fps, diagnostics);
	const transitions = program
		? resolveTransitions(project, cutList.cuts, cuts, shots, clips, fps, format.class, warn)
		: [];
	if (program && cuts.length) checkHardCuts(shots, cutList.cuts, transitions, diagnostics);
	const events = resolveEvents(shots, transitions);
	if (program) checkShotOrder(shots, diagnostics);
	if (program) checkEventClash(events, shots, fps, diagnostics);
	const mix = project.mix ?? {};
	const audio = {
		speech: program ? speechPieces(project, cutList.cuts, sources, inputs, frames / fps) : [],
		sfx: resolveSfx(project, transitions, inputs, at, diagnostics),
		music: resolveMusic(
			project,
			placement.placed,
			ends,
			frames / fps,
			program,
			inputs,
			at,
			diagnostics
		),
		levels: { sfx: mix.sfx ?? MIX_DEFAULTS.sfx, music: mix.music ?? MIX_DEFAULTS.music },
		master: {
			lufs: mix.loudness ?? MIX_DEFAULTS.loudness,
			truePeak: mix.truePeak ?? MIX_DEFAULTS.truePeak
		}
	};
	// Clips, music and sfx share one id space only in a program (inserts mode keeps them apart).
	if (program) checkIds(project, cuts, shots, clips, diagnostics);
	checkMissingBeats(project, diagnostics);

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

/** Clip seconds of a declared event moment, read as the block reads it (`clip.at`). */
function eventMoment(clip: ResolvedClip, moment: string | number): number {
	return resolveMoment(moment, {
		id: clip.id,
		cues: clip.cues,
		duration: clip.duration,
		fps: clip.fps,
		beats: clip.beats?.map((b) => ({ index: b.index, time: b.local, bar: b.bar, beat: b.beat })),
		noBeats: clip.noBeats
	});
}

/**
 * Program seconds of event `name` that the block of clip `id` declares: the clip's start plus
 * the declared moment, read with the clip's cues, length and beats as the block reads it.
 */
function clipEvent(
	clips: ResolvedClip[],
	project: MotionProject,
	inputs: ProgramInputs,
	name: string,
	id: string
): number {
	const clip = clips.find((c) => c.id === id);
	if (!clip)
		throw new AnchorError(
			project.clips.some((c) => c.id === id)
				? `Clip "${id}" did not resolve (see its error), so its events have no time.`
				: `Unknown clip "${id}". Clips: ${project.clips.map((c) => c.id).join(', ') || 'none'}.`
		);
	const declared = inputs.blockEvents?.[clip.block];
	if (declared && 'error' in declared) throw new AnchorError(declared.error);
	const events = declared?.events ?? {};
	if (!Object.hasOwn(events, name)) {
		const names = Object.keys(events);
		throw new AnchorError(
			`Block "${clip.block}" of clip "${id}" declares no event "${name}". ${
				names.length
					? `It declares: ${names.join(', ')}.`
					: `It declares none: add \`export const events = { ${/^[A-Za-z_$][\w$]*$/.test(name) ? name : `'${name}'`}: '<moment>' }\` to its <script module>.`
			}`
		);
	}
	try {
		return clip.start + eventMoment(clip, events[name]);
	} catch (error) {
		throw new AnchorError(
			`Event "${name}" of block "${clip.block}" (clip "${id}"): ${(error as Error).message}`
		);
	}
}

/**
 * The events each clip's block declares, whether or not anything anchors on them: a declaration
 * that cannot be read, a moment the clip does not have, or one outside the clip or after the
 * program end is a warning of the clip.
 */
function checkEvents(
	clips: ResolvedClip[],
	inputs: ProgramInputs,
	end: number | null | undefined,
	diagnostics: ProgramDiagnostic[]
) {
	const fps = clips[0]?.fps ?? 30;
	const seconds = (t: number) => `${t.toFixed(2)} s`;
	for (const clip of clips) {
		const declared = inputs.blockEvents?.[clip.block];
		if (!declared) continue;
		const warn = (message: string) =>
			diagnostics.push({ level: 'warning', clip: clip.id, field: 'block', message });
		if ('error' in declared) {
			warn(declared.error);
			continue;
		}
		for (const [name, moment] of Object.entries(declared.events)) {
			let local: number;
			try {
				local = eventMoment(clip, moment);
			} catch (error) {
				warn(`Event "${name}" of block "${clip.block}": ${(error as Error).message}`);
				continue;
			}
			const at = clip.start + local;
			if (local < -0.5 / fps || local > clip.duration + 0.5 / fps)
				warn(
					`Event "${name}" of block "${clip.block}" is at ${seconds(at)}, outside the clip (${clip.start.toFixed(2)}–${seconds(clip.end)}).`
				);
			else if (typeof end === 'number' && at > end + 0.5 / fps)
				warn(
					`Event "${name}" of block "${clip.block}" is at ${seconds(at)}, after the program end (${seconds(end)}).`
				);
		}
	}
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

type KeyContext = {
	words: MotionWord[] | null;
	/** The program end, for `"end"` keys. */
	end?: number | null;
	beats: BeatContext;
	fps: number;
	diagnostics: ProgramDiagnostic[];
	/** Replaces brand tokens in props. */
	brand: ResolvedBrand;
	/** Energy whose ease keys without `ease` take. */
	energy: Energy;
	/** Format frame, for "%" lengths. */
	size: [number, number];
	/** Clips: what the block marks animatable (undefined: not known); shots: null (no props). */
	animatable: Animatable | null | undefined;
	block?: string;
};

/**
 * Item-local keys: numbers and frames from the item start, phrases inside it, `{ moment }`.
 * Brand tokens in props become colours; keys without `ease` take the energy's. The keys are
 * then built into tracks exactly as the stage builds them, so whatever the stage could not draw
 * (a prop the block does not mark animatable, px against "%", a linear against a radial
 * gradient, an unknown ease) is an error here.
 */
function resolveKeys(
	keys: Key[] | undefined,
	item: Span,
	kind: 'clip' | 'shot',
	id: string,
	ctx: KeyContext
): ResolvedKey[] {
	const { words, beats, fps, diagnostics } = ctx;
	const start = item.startFrame / fps;
	const duration = item.frames / fps;
	const report = (level: 'error' | 'warning', field: string, message: string) =>
		diagnostics.push({
			level,
			...(kind === 'clip' ? { clip: id } : { item: id }),
			field,
			message
		});
	let broken = false;
	/** Resolved keys with their index as written. */
	const resolved: { key: ResolvedKey; at: number }[] = [];
	(keys ?? []).forEach((key, i) => {
		const field = `keys[${i}].at`;
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
						beats,
						end: ctx.end
					},
					'start'
				).time;
			}
		} catch (error) {
			report('error', field, (error as Error).message);
			broken = true;
			return;
		}
		const frame = Math.round(time * fps);
		if (frame < item.startFrame || frame > endOf(item))
			report(
				'warning',
				field,
				`Key at ${time.toFixed(2)} s is outside the ${kind} (${start.toFixed(2)}–${(start + duration).toFixed(2)} s).`
			);
		if (key.ease !== undefined && !parseEase(key.ease)) {
			report(
				'error',
				`keys[${i}].ease`,
				`Unknown ease "${key.ease}". Use a GSAP name such as "power2.out", "back.out(1.7)", "expo.inOut" or "none".`
			);
			broken = true;
			return;
		}
		const values = Object.fromEntries(
			Object.entries(key).filter(([k]) => k !== 'at' && k !== 'ease' && k !== 'mix')
		) as ResolvedKey['values'];
		if (values.props) {
			const props: Record<string, unknown> = {};
			for (const [name, value] of Object.entries(values.props)) {
				try {
					props[name] = substituteBrand(value, ctx.brand);
				} catch (error) {
					report('error', `keys[${i}].props.${name}`, (error as Error).message);
					broken = true;
				}
			}
			values.props = props;
		}
		resolved.push({
			key: { frame, values, ease: key.ease ?? KEY_EASE[ctx.energy], mix: key.mix ?? 'oklch' },
			at: i
		});
	});
	resolved.sort((a, b) => a.key.frame - b.key.frame);
	const out = resolved.map((r) => r.key);
	const authored = resolved.map((r) => r.at);
	if (!broken && out.length) {
		// Without the block's declaration only placement can be checked here; the stage checks props.
		const checked =
			ctx.animatable === undefined
				? out.map((k) => ({ ...k, values: { ...k.values, props: undefined } }))
				: out;
		const { problems } = compileKeyTracks(checked, {
			size: ctx.size,
			animatable: ctx.animatable ?? undefined,
			block: ctx.block,
			authored
		});
		for (const p of problems)
			report(
				'error',
				p.key === null ? 'keys' : `keys[${p.key}]${p.property ? `.${p.property}` : ''}`,
				p.message
			);
		if (!problems.length) warnLateFirstKeys(out, authored, kind, item, fps, report);
	}
	return out;
}

/**
 * A property first keyed after the item's first key holds that first value from the item's
 * start (a lone `opacity: 0` on the last key hides the item the whole time): a warning, naming
 * the key that sets it first.
 */
function warnLateFirstKeys(
	keys: ResolvedKey[],
	authored: number[],
	kind: 'clip' | 'shot',
	item: Span,
	fps: number,
	report: (level: 'warning', field: string, message: string) => void
) {
	if (keys.length < 2) return;
	const first = keys[0].frame;
	const seconds = (f: number) => `${(f / fps).toFixed(2)} s`;
	const names: [string, (k: ResolvedKey) => unknown][] = [
		...PLACEMENT.map((n): [string, (k: ResolvedKey) => unknown] => [n, (k) => k.values[n]]),
		...[...new Set(keys.flatMap((k) => Object.keys(k.values.props ?? {})))]
			.sort()
			.map((n): [string, (k: ResolvedKey) => unknown] => [`props.${n}`, (k) => k.values.props?.[n]])
	];
	for (const [name, pick] of names) {
		const i = keys.findIndex((k) => pick(k) !== undefined);
		if (i < 0 || keys[i].frame <= first) continue;
		report(
			'warning',
			`keys[${authored[i]}].${name}`,
			`"${name}" is first keyed at ${seconds(keys[i].frame)}, after the ${kind}'s first key (${seconds(first)}), so it is ${JSON.stringify(pick(keys[i]))} from the ${kind}'s start (${seconds(item.startFrame)}). Set "${name}" on the first key too.`
		);
	}
}

/**
 * What `block` marks animatable, from the node tooling's reading of its source: undefined when
 * it was not looked up; an unreadable declaration is an error of the clip.
 */
function blockAnimatable(
	inputs: ProgramInputs,
	block: string,
	clip: string,
	diagnostics: ProgramDiagnostic[]
): Animatable | undefined {
	const found = inputs.animatable?.[block];
	if (!found) return undefined;
	if ('error' in found) {
		diagnostics.push({ level: 'error', clip, field: 'block', message: found.error });
		return {};
	}
	return found.props;
}

function resolveShots(
	project: MotionProject,
	inputs: ProgramInputs,
	words: MotionWord[] | null,
	cuts: ProgramCut[],
	frames: number,
	at: (anchor: MotionAnchor, from?: number) => number,
	diagnostics: ProgramDiagnostic[],
	size: [number, number],
	programEndAt: number | null | undefined
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
		const module = shotModule(shot.shot);
		for (const message of module?.check?.(shot.params ?? {}) ?? []) fail('params', message);
		if (!module)
			diagnostics.push({
				level: 'warning',
				item: id,
				field: `shots[${i}].shot`,
				message: isCustom(shot.shot, CUSTOM_SHOT)
					? `Custom shot files are not drawn yet; "${shot.shot}" is framed full.`
					: `The "${shot.shot}" shot is not drawn yet; it is framed full.`
			});
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
		if (startFrame >= frames) {
			fail(
				'from',
				`Shot starts at ${start.toFixed(2)} s, after the program ends (${(frames / fps).toFixed(2)} s).`
			);
			return;
		}
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
			let srcIn = 0;
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
			keys: resolveKeys(shot.keys, span, 'shot', id, {
				words,
				end: programEndAt,
				beats: beatsOf(inputs),
				fps,
				diagnostics,
				brand: inputs.look?.brand ?? NEUTRAL_BRAND,
				energy: inputs.look?.style?.energy ?? 'balanced',
				size,
				animatable: null
			}),
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

/** The shot before shot `i`: the one ending where it starts, `full` across a gap, else null. */
function previousShot(shots: ProgramShot[], i: number): string | null {
	const before = shots[i - 1];
	if (before && endOf(before) === shots[i].startFrame) return before.shot;
	return shots[i].startFrame > 0 ? 'full' : null;
}

/**
 * Fills in each shot's morph from the shot before it (`full` across a gap): the project's
 * `morph`, else none under a shot transition, else the shots' defaults (see `defaultMorph`).
 * The first shot of the program has nothing to morph from. A morph never outlasts its shot.
 */
function morphs(
	shots: ProgramShot[],
	asked: Map<ProgramShot, { morph?: number; transition: boolean }>,
	fps: number
): ProgramShot[] {
	shots.forEach((shot, i) => {
		const prev = previousShot(shots, i);
		const morph = defaultMorph(prev ?? 'full', shot.shot)!;
		const wish = asked.get(shot);
		const seconds = wish?.morph ?? (prev === null || wish?.transition ? 0 : morph.seconds);
		shot.morphFrames = Math.min(shot.frames, Math.round(seconds * fps));
		shot.morphEase = shot.morphFrames > 0 ? morph.ease : 'none';
	});
	return shots;
}

/**
 * A clip behind the subject, and a shot that cuts the subject out (`behind`), need a matte on
 * every footage on screen with them.
 */
function checkBehind(
	clips: ProgramClip[],
	cuts: ProgramCut[],
	shots: ProgramShot[],
	project: MotionProject,
	diagnostics: ProgramDiagnostic[]
) {
	for (const shot of shots) {
		if (!shotModule(shot.shot)?.needsMatte) continue;
		// A cut transition at either edge of the shot (or inside it) shows the cut before it
		// under the shot's layout too.
		const handedOver = (c: ProgramCut) =>
			project.cuts?.[c.index]?.transition !== undefined &&
			c.startFrame >= shot.startFrame &&
			c.startFrame <= endOf(shot);
		const names = new Set(
			shot.source
				? [shot.source.name]
				: cuts.flatMap((c, i) => [
						...(overlaps(c, shot) ? [c.source] : []),
						...(handedOver(c) && cuts[i - 1] ? [cuts[i - 1].source, c.source] : [])
					])
		);
		const bare = [...names].filter((n) => !project.footage?.[n]?.matte);
		if (bare.length || !names.size)
			diagnostics.push({
				level: 'error',
				item: shot.id,
				field: 'shots',
				message: names.size
					? `The "${shot.shot}" shot needs a matte, but footage ${bare.map((n) => `"${n}"`).join(', ')} has none (visualfries matte).`
					: `The "${shot.shot}" shot needs footage with a matte on screen.`
			});
	}
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

/**
 * The built-in subject layer (`@visualfries/subject`) needs a matte on every footage on screen
 * with it, and while it leaves a hole (the default) a clean plate too. Blocks drawing
 * `<Subject>` report the same when their frames are drawn.
 */
function checkSubjectLayers(
	clips: ProgramClip[],
	cuts: ProgramCut[],
	shots: ProgramShot[],
	project: MotionProject,
	diagnostics: ProgramDiagnostic[]
) {
	for (const clip of clips) {
		if (clip.block !== '@visualfries/subject') continue;
		const props = clip.props as { footage?: unknown; hole?: unknown };
		const named = typeof props.footage === 'string' ? props.footage : null;
		const names = new Set(
			named
				? [named]
				: [
						...cuts.filter((c) => overlaps(c, clip)).map((c) => c.source),
						...shots.filter((s) => s.source && overlaps(s, clip)).map((s) => s.source!.name)
					]
		);
		const spec = (n: string) => project.footage?.[n];
		const unknown = [...names].filter((n) => !spec(n));
		const bare = [...names].filter((n) => spec(n) && !spec(n)!.matte);
		const unclean = [...names].filter((n) => spec(n)?.matte && spec(n)!.clean === undefined);
		const list = (n: string[]) => n.map((x) => `"${x}"`).join(', ');
		if (unknown.length)
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'props.footage',
				message: `Unknown footage ${list(unknown)}. Footage: ${Object.keys(project.footage ?? {}).join(', ') || 'none'}.`
			});
		else if (!names.size)
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'block',
				message: 'A subject layer needs footage with a matte on screen with the clip.'
			});
		else if (bare.length)
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'block',
				message: `A subject layer cuts the speaker out with the matte, but footage ${list(bare)} has none (visualfries matte).`
			});
		else if (props.hole !== false && unclean.length)
			diagnostics.push({
				level: 'error',
				clip: clip.id,
				field: 'block',
				message: `The subject layer leaves a hole in the speaker, and footage ${list(unclean)} has no clean plate to show there. Add "clean": true to the footage (or "hole": false to keep the speaker whole).`
			});
	}
}

/**
 * A slotted clip shows only while the shot on screen frees its slot (or a morph slides the slot
 * in or out); elsewhere it is hidden, which is worth a warning.
 */
function checkSlots(
	clips: ProgramClip[],
	shots: ProgramShot[],
	format: ProgramFormat,
	fps: number,
	diagnostics: ProgramDiagnostic[]
) {
	const names = new Map<string, Set<string>>();
	const slotsOf = (shot: Pick<ProgramShot, 'shot' | 'params'>) => {
		const key = JSON.stringify([shot.shot, shot.params]);
		let found = names.get(key);
		if (!found) {
			const input = { cls: format.class, size: format.size, footage: null, subject: null };
			found = new Set(Object.keys(shotLayout(shot, input).slots));
			names.set(key, found);
		}
		return found;
	};
	for (const clip of clips) {
		if (!clip.slot) continue;
		const hidden: number[] = [];
		for (let f = clip.startFrame; f < endOf(clip); f++) {
			const { shot, prev } = shotAt(shots, f);
			if (!slotsOf(shot).has(clip.slot) && !(prev && slotsOf(prev).has(clip.slot))) hidden.push(f);
		}
		if (!hidden.length) continue;
		const offering = Object.values(SHOT_MODULES)
			.filter((m) => slotsOf({ shot: m.name, params: {} }).has(clip.slot!))
			.map((m) => m.name);
		const from = (hidden[0] / fps).toFixed(2);
		diagnostics.push({
			level: 'warning',
			clip: clip.id,
			field: 'slot',
			message: `No shot frees the "${clip.slot}" slot for ${hidden.length} of the clip's ${clip.frames} frames (first at ${from} s); the clip is hidden there. ${offering.length ? `Shots with a "${clip.slot}" slot: ${offering.join(', ')}.` : `No built-in shot has a "${clip.slot}" slot.`}`
		});
	}
}

/**
 * A written shot whose move (its morph, keys that change, its transition window) is under way
 * on a hard cut carries the move on over different footage, which reads as a glitch. A shot
 * that only frames both sides the same way is the normal jump cut and says nothing.
 */
function checkHardCuts(
	shots: ProgramShot[],
	cuts: ResolvedCut[],
	transitions: ProgramTransition[],
	diagnostics: ProgramDiagnostic[]
) {
	const keysMove = (shot: ProgramShot, frame: number) =>
		shot.keys.some(
			(k, i) =>
				i + 1 < shot.keys.length &&
				k.frame < frame &&
				shot.keys[i + 1].frame > frame &&
				JSON.stringify(k.values) !== JSON.stringify(shot.keys[i + 1].values)
		);
	for (const shot of shots) {
		if (shot.implicit || shot.source) continue;
		const window = transitions.find((t) => t.id === shot.transition);
		const crossed = cuts.filter(
			(c) =>
				c.index > 0 && !c.transition && c.startFrame > shot.startFrame && c.startFrame < endOf(shot)
		);
		for (const cut of crossed) {
			const f = cut.startFrame;
			const moves = [
				...(f > shot.startFrame && f < shot.startFrame + shot.morphFrames ? ['morph'] : []),
				...(keysMove(shot, f) ? ['keys'] : []),
				...(window && f > window.startFrame && f < endOf(window) ? ['transition'] : [])
			];
			if (!moves.length) continue;
			diagnostics.push({
				level: 'warning',
				item: shot.id,
				field: 'shots',
				message: `Shot "${shot.id}" moves across the hard cut into ${cut.id} at frame ${f} (its ${moves.join(' and ')}): the move goes on over different footage. End the move before the cut, or put a transition on the cut.`
			});
		}
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
	cls: FormatClass,
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
		// Built-in modules give the defaults and check params, ease and direction; the rest cut.
		const module = transitionModule(t.type);
		if (!module)
			warn(
				'warning',
				owner,
				field,
				isCustom(t.type, CUSTOM_TRANSITION)
					? `Custom transition files are not drawn yet; "${t.type}" cuts on the cut.`
					: `The "${t.type}" transition is not drawn yet; it cuts on the cut.`
			);
		for (const message of module?.check?.(t.params ?? {}) ?? [])
			warn('error', owner, `${field}.params`, message);
		if (t.ease !== undefined && !parseEase(t.ease)) {
			warn(
				'error',
				owner,
				`${field}.ease`,
				`Unknown ease "${t.ease}". Use a GSAP ease such as "expo.inOut", "power3.out" or "none".`
			);
			return null;
		}
		const duration = t.duration ?? module?.defaultDuration ?? DEFAULT_TRANSITION_SECONDS;
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
			// Directional modules take a screen direction for this format's class.
			direction: module?.directional
				? screenDirection(t.direction ?? null, cls)
				: (t.direction ?? null),
			ease: t.ease ?? module?.ease ?? null,
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
		// its "out", as far as the transition shows them; without enough source the edge frame
		// holds.
		const { in: needIn, out: needOut } = transitionHandles(t);
		const haveIn = cuts[i].handles.before;
		// A held cut's last frame stays frozen as long as the transition shows it.
		const haveOut = cuts[i - 1].hold ? null : cuts[i - 1].handles.after;
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
		// A push slides everything below the clip off the frame (the footage plate, for a clip
		// behind the subject); `check` measures whether a front clip covers the frame.
		if (t.type === 'push' && (clip.layer === 'behind' || clip.slot))
			warn(
				'warning',
				clip.id,
				'transition',
				clip.layer === 'behind'
					? 'A push on a clip behind the subject slides the footage plate off the frame while the speaker stays: the empty stage shows around the speaker. Use wipe, or put the clip in front.'
					: `A push on a slotted clip slides everything below it off the frame, but the clip fills only its "${clip.slot}" slot: the empty stage shows around it. Use wipe, or a clip that covers the frame.`
			);
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

/** A shot that cannot be seen to move from the one before it (a whip after a whip). */
function checkShotOrder(shots: ProgramShot[], diagnostics: ProgramDiagnostic[]) {
	shots.forEach((shot, i) => {
		const prev = previousShot(shots, i);
		const message = prev ? shotModule(shot.shot)?.follows?.(prev) : null;
		if (message) diagnostics.push({ level: 'warning', item: shot.id, field: 'shots', message });
	});
}

/** Frames apart within which a whip and a transition sound like one hit. */
const CLASH = 3;

/**
 * A whip and a transition within a few frames of each other: two sounds on one visual hit
 * (a whip under a shot transition, a cut transition where a whip starts).
 */
function checkEventClash(
	events: ProgramEvent[],
	shots: ProgramShot[],
	fps: number,
	diagnostics: ProgramDiagnostic[]
) {
	const owner = new Map(shots.map((s) => [s.id, s]));
	for (const whip of events.filter((e) => e.kind === 'whip')) {
		const near = events.find(
			(e) => e.kind === 'transition' && Math.abs(e.frame - whip.frame) <= CLASH
		);
		if (!near) continue;
		diagnostics.push({
			level: 'warning',
			item: whip.owner,
			field: 'shots',
			message: `The whip of shot "${whip.owner}" (${(whip.frame / fps).toFixed(2)} s) and the transition "${near.owner}" (${(near.frame / fps).toFixed(2)} s) make two sounds on one move. Drop the transition${owner.get(whip.owner)?.transition ? ' (a whip moves on its own)' : ''}, or move one of them.`
		});
	}
}

function resolveEvents(shots: ProgramShot[], transitions: ProgramTransition[]): ProgramEvent[] {
	const events: ProgramEvent[] = [
		...shots.flatMap((s, i) =>
			shotEvents(s, previousShot(shots, i)).map((e) => ({ ...e, owner: s.id }))
		),
		...transitions.flatMap((t) => transitionEvents(t).map((e) => ({ ...e, owner: t.id })))
	];
	return events.sort((a, b) => a.frame - b.frame || compareText(a.owner, b.owner));
}

/**
 * One piece per cut over its sound range [edit, next edit], widened by half the crossfade on
 * each side so equal-power fades centre on the edit points. A piece never reads outside the
 * source's sound: where the widening would start before it or run past its end, the piece starts
 * (or ends) with the sound and that fade is shorter. Two cuts that continue the same take (same
 * sound, the second starting where the first ends in the source, same gain) meet without a fade:
 * the sound plays on unchanged, where a crossfade would swell by 3 dB. Transitions never touch it.
 */
function speechPieces(
	project: MotionProject,
	cuts: ResolvedCut[],
	sources: Record<string, ProgramSource>,
	inputs: ProgramInputs,
	end: number
): AudioPiece[] {
	const fps = project.fps;
	const pieces: AudioPiece[] = [];
	const file = (cut: ResolvedCut) => sources[cut.source]?.audio ?? null;
	const continues = (a: ResolvedCut | undefined, b: ResolvedCut | undefined) =>
		!!a &&
		!!b &&
		!a.mute &&
		!b.mute &&
		a.source === b.source &&
		file(a) === file(b) &&
		a.gain === b.gain &&
		!a.hold &&
		a.srcOut === b.srcIn;
	cuts.forEach((cut, i) => {
		if (!file(cut) || cut.mute) return;
		const next = cuts[i + 1];
		const xfIn = i && !continues(cuts[i - 1], cut) ? cut.crossfade : 0;
		// A hold is silent: the sound stops where it starts, with the cut's own anti-click fade,
		// unless the next cut's sound takes over first (a J cut into the hold's picture).
		const stop = soundEnd(cuts, i, end, fps);
		const held = cut.hold > 0 && (!next || stop < next.edit);
		const xfOut = held ? cut.crossfade : next && !continues(cut, next) ? next.crossfade : 0;
		let from = i ? Math.max(0, cut.edit - xfIn / 2) : 0;
		let to = held
			? Math.min(end, stop + xfOut / 2)
			: next
				? Math.min(end, next.edit + xfOut / 2)
				: end;
		let fadeIn = xfIn;
		let fadeOut = xfOut;
		// Source seconds = program seconds + shift.
		const shift = cut.srcIn / fps - cut.startFrame / fps;
		const before = -(from + shift);
		if (before > 0) {
			from += before;
			fadeIn = Math.max(0, fadeIn - before);
		}
		const after = to + shift - soundLength(inputs.sources?.[cut.source]);
		if (after > 0) {
			to -= after;
			fadeOut = Math.max(0, fadeOut - after);
		}
		pieces.push({
			owner: cut.id,
			file: file(cut)!,
			srcIn: micro(Math.max(0, from + shift)),
			dur: micro(Math.max(0, to - from)),
			at: micro(from),
			fadeIn: micro(fadeIn),
			fadeOut: micro(fadeOut),
			gain: cut.gain
		});
	});
	return pieces;
}

/**
 * Effects: each `sfx` item, and each transition that names a `sound` (its hit on the
 * transition's first event, the middle of the window for the built-ins). A sound's hit offset
 * comes from the sound library's metadata (`inputs.sounds`); the file then starts that much
 * before the moment, cut off at the program start. Sorted by program time.
 */
function resolveSfx(
	project: MotionProject,
	transitions: ProgramTransition[],
	inputs: ProgramInputs,
	at: (anchor: MotionAnchor) => number,
	diagnostics: ProgramDiagnostic[]
): AudioPiece[] {
	const fps = project.fps;
	const out: AudioPiece[] = [];
	const place = (owner: string, field: string, sound: string, moment: number, gain: number) => {
		const info = inputs.sounds?.[sound];
		if (info === null) {
			diagnostics.push({
				level: 'error',
				item: owner,
				field,
				message: `Sound file "${sound}" not found (paths are relative to the project).`
			});
			return;
		}
		if (info?.error) {
			diagnostics.push({ level: 'error', item: owner, field, message: info.error });
			return;
		}
		if (info?.warning)
			diagnostics.push({ level: 'warning', item: owner, field, message: info.warning });
		const hit = info?.hit ?? 0;
		out.push({
			owner,
			file: sound,
			srcIn: micro(Math.max(0, hit - moment)),
			dur: null,
			at: micro(Math.max(0, moment - hit)),
			fadeIn: 0,
			fadeOut: 0,
			gain
		});
	};
	(project.sfx ?? []).forEach((sfx, i) => {
		const id = sfx.id ?? `sfx${i + 1}`;
		let moment: number;
		try {
			moment = Math.round(at(sfx.at) * fps) / fps;
		} catch (error) {
			diagnostics.push({
				level: 'error',
				item: id,
				field: `sfx[${i}].at`,
				message: (error as Error).message
			});
			return;
		}
		place(id, `sfx[${i}].sound`, sfx.sound, moment, sfx.gain ?? 0);
	});
	for (const t of transitions) {
		if (typeof t.sound !== 'string') continue;
		const frame = transitionEvents(t)[0]?.frame ?? t.cutFrame;
		place(`${t.id}.sound`, 'transition.sound', t.sound, frame / fps, 0);
	}
	return out.sort((a, b) => a.at - b.at || compareText(a.owner, b.owner));
}

/**
 * Where each music item plays: from `from` (before 0: the file starts that much further in,
 * after `in`) until its end (see `musicEnd`: `until` or the program end, snapped to a bar end
 * when the music has bars, in a program), with its gain, fades (each at most the piece's length) and gain
 * keys in program seconds. Its level under the speech is the mixer's (`levels.music`).
 */
function resolveMusic(
	project: MotionProject,
	placed: (PlacedMusic | null)[],
	ends: (MusicEnd | null)[],
	end: number,
	program: boolean,
	inputs: ProgramInputs,
	at: (anchor: MotionAnchor) => number,
	diagnostics: ProgramDiagnostic[]
): AudioPiece[] {
	return (project.music ?? []).flatMap((music, i) => {
		const owner = music.id ?? `music${i + 1}`;
		if (inputs.sounds?.[music.src] === null)
			diagnostics.push({
				level: 'error',
				item: owner,
				field: `music[${i}].src`,
				message: `Music file "${music.src}" not found (paths are relative to the project).`
			});
		const error = inputs.sounds?.[music.src]?.error;
		if (error)
			diagnostics.push({ level: 'error', item: owner, field: `music[${i}].src`, message: error });
		const place = placed[i];
		if (!place) return [];
		const start = Math.max(0, place.from);
		// Only a program mixes music; inserts keep the plain end, as before bar snaps existed.
		const target = Math.min(place.until ?? end, end);
		const stop =
			ends[i] ??
			(program
				? musicEnd(music, place, end, 0.5 / project.fps, diagnostics)
				: { end: target, bar: null, target, beatsUntil: target });
		const dur = Math.max(0, stop.end - start);
		const gainKeys: { at: number; gain: number }[] = [];
		(music.keys ?? []).forEach((key, k) => {
			try {
				gainKeys.push({ at: micro(at(key.at)), gain: key.gain });
			} catch (error) {
				diagnostics.push({
					level: 'error',
					item: owner,
					field: `music[${i}].keys[${k}].at`,
					message: (error as Error).message
				});
			}
		});
		gainKeys.sort((a, b) => a.at - b.at);
		return [
			{
				owner,
				file: music.src,
				srcIn: micro(place.in + Math.max(0, -place.from)),
				dur: micro(dur),
				at: micro(start),
				fadeIn: micro(Math.min(dur, music.fade?.in ?? MUSIC_FADE.in)),
				fadeOut: micro(Math.min(dur, music.fade?.out ?? MUSIC_FADE.out)),
				gain: music.gain ?? 0,
				...(gainKeys.length ? { gainKeys } : {}),
				...(stop.bar !== null ? { snap: { bar: stop.bar, target: stop.target } } : {})
			}
		];
	});
}

/**
 * Beat anchors that found no music with beats while the project has music without a beats
 * file: one error on that music says how to make the file.
 */
function checkMissingBeats(project: MotionProject, diagnostics: ProgramDiagnostic[]) {
	const list = project.music ?? [];
	const advise = (i: number) =>
		diagnostics.push({
			level: 'error',
			item: list[i].id ?? `music${i + 1}`,
			field: `music[${i}].beats`,
			message: missingBeats({ music: [list[i]] })!
		});
	const said = diagnostics.map((d) => d.message);
	// An anchor that names music without a beats file.
	const named = list
		.map((m, i) => [m, i] as const)
		.filter(([m]) => !m.beats && m.id && said.some((t) => t.includes(`Unknown music "${m.id}"`)));
	named.forEach(([, i]) => advise(i));
	// Beat anchors found no music with beats: only when no music item has a beats file, since
	// otherwise the music with beats is the one to fix.
	if (!named.length && !list.some((m) => m.beats) && said.some((t) => t.includes(NO_MUSIC_BEATS))) {
		const i = list.findIndex((m) => !m.beats);
		if (i >= 0) advise(i);
	}
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

/** Strings in clip props that may name a project file (no URLs, data or colours). */
export function propFiles(props: (Record<string, unknown> | undefined)[]): string[] {
	const found = new Set<string>();
	const walk = (value: unknown) => {
		if (typeof value === 'string') {
			if (
				value.length < 512 &&
				/\.[a-z0-9]{1,5}$/i.test(value) &&
				!/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value)
			)
				found.add(value);
		} else if (Array.isArray(value)) value.forEach(walk);
		else if (value && typeof value === 'object') Object.values(value).forEach(walk);
	};
	props.forEach(walk);
	return [...found].sort();
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
				...(project.css ?? []),
				// Project files a clip names in its props (hashed when they exist).
				...propFiles(clips.map((c) => c.props)).filter((f) => f in program.hashes.assets)
			])
		];
		const hash = sha1(
			JSON.stringify({
				span,
				format: program.format,
				fps: program.fps,
				background: program.background,
				sources: sourceNames.map((n) => [
					n,
					picture(program.sources[n]),
					program.hashes.sources[n] ?? null
				]),
				assets: assets.map((a) => [a, program.hashes.assets[a] ?? null]),
				look: [program.hashes.brand, program.hashes.style],
				cuts: cuts.map(picture),
				// The shot a morph starts from shapes the first frames too.
				shots: shotsDuring(program.shots, span),
				clips,
				transitions: transitions.map(picture)
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

/**
 * An item without its sound (a cut's audio edit, gain and crossfade, a source's audio file, a
 * transition's sound): the final mix lays the sound fresh on every render, so a segment's
 * pictures do not depend on it.
 */
function picture<T extends object>(item: T): Omit<T, 'audio' | 'sound'> {
	const {
		audio: _audio,
		sound: _sound,
		...rest
	} = item as T & { audio?: unknown; sound?: unknown };
	return rest;
}
