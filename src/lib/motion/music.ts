import type { MotionAnchor, MotionMusic, MotionProject } from './project.js';
import { resolveAnchor, type AnchorContext } from './anchors.js';
import {
	NO_MUSIC_BEATS,
	correctBeats,
	shiftByBeats,
	type BeatsFile,
	type GridBeat,
	type MusicBeats
} from './beat-grid.js';
import type { MotionWord } from './transcript.js';
import type { ProgramDiagnostic, SoundInfo } from './cutlist.js';

/** Seconds kept to the microsecond, as every audio time in the program. */
const micro = (seconds: number) => Math.round(seconds * 1e6) / 1e6;

/**
 * A music item's beats as the node tooling reads them: corrected (`tempo`, `downbeat`,
 * `shift`) and in seconds of the music file. Placing them in the program is `placeMusic`'s job,
 * so a retake that moves the music moves its beats with it.
 */
export type MusicTrack = {
	/** Index of the music item in `project.music`. */
	item: number;
	grid: (GridBeat & { energy: number | null })[];
	/** Seconds of the music file. */
	duration: number;
};

/** The track of music item `item`: its beats file with the item's corrections applied. */
export function musicTrack(file: BeatsFile, music: MotionMusic, item: number): MusicTrack {
	return { item, grid: correctBeats(file, music), duration: file.source.duration };
}

/** The end of a bar in program seconds. */
export type BarEnd = { bar: number; time: number };

/** Where a music item sits in the program. */
export type PlacedMusic = {
	/** Index in `project.music`. */
	item: number;
	/** The id, or `music<n>`. */
	owner: string;
	/** Program seconds at which second `in` of the file plays (negative: before the program). */
	from: number;
	/** Seconds into the music file at `from`. */
	in: number;
	/** Program seconds of `until` as written; null: until the program end. */
	until: number | null;
	/** Program seconds at which the file runs out; null when its length is unknown. */
	fileEnd: number | null;
	/**
	 * Bar ends the music reaches, in program seconds (the next downbeat ends a bar; the last bar
	 * ends one bar after its downbeat, when the file lasts that long), and the length of the last
	 * bar to count on past the file. Null without beats or without downbeats.
	 */
	bars: { ends: BarEnd[]; next: number } | null;
	/**
	 * Every beat it plays, in program seconds: from file second `in` on (the part `in` skips is
	 * never heard, so its beats do not exist). Null without a beats file.
	 */
	grid: (GridBeat & { energy: number | null })[] | null;
	/** Its beats for beat anchors: `grid` up to `until`; null without a beats file. */
	beats: MusicBeats | null;
};

export type MusicPlacement = {
	/** By index in `project.music`; null where the item could not be placed (or waits for words). */
	placed: (PlacedMusic | null)[];
	/** Beats of every placed item with beats, in program seconds, in project order. */
	beats: MusicBeats[];
	/**
	 * Items with beats left for the program stage: their `from` is on a phrase, or on the beats of
	 * music that waits.
	 */
	deferred: string[];
	/** Items with beats whose place failed (see the diagnostics). */
	failed: string[];
	diagnostics: ProgramDiagnostic[];
};

/**
 * Whether an anchor needs the program words or the program length (a phrase, the program end,
 * an event of a clip, or one of those in its `at`).
 */
export function anchorUsesWords(anchor: MotionAnchor | undefined): boolean {
	if (anchor === undefined || typeof anchor === 'number') return false;
	if (typeof anchor === 'string') return true;
	if ('say' in anchor || 'program' in anchor || 'event' in anchor) return true;
	if ('at' in anchor) return anchorUsesWords(anchor.at);
	return false;
}

type AnchorObject = Exclude<MotionAnchor, number | string>;

/** Every music id an anchor names (also in its `at`). */
function namedMusic(anchor: MotionAnchor | undefined): string[] {
	if (anchor === undefined || typeof anchor !== 'object') return [];
	const own = 'music' in anchor && anchor.music !== undefined ? [anchor.music] : [];
	return [...own, ...('at' in anchor ? namedMusic(anchor.at) : [])];
}

/** Whether an anchor reads beats without naming the music (a beat anchor or a "-1b" offset). */
function unnamedBeats(anchor: MotionAnchor | undefined): boolean {
	if (anchor === undefined || typeof anchor !== 'object') return false;
	const a = anchor as AnchorObject & { music?: string; offset?: number | string };
	const beatLike = 'bar' in a || 'downbeat' in a || 'beat' in a || typeof a.offset === 'string';
	if (beatLike && a.music === undefined) return true;
	return 'at' in a ? unnamedBeats(a.at) : false;
}

/** Most common number of beats in a bar of the grid (bars 1 and later). */
function beatsPerBar(grid: GridBeat[]): number {
	const counts = new Map<number, number>();
	for (const b of grid)
		if (b.bar !== null && b.bar > 0) counts.set(b.bar, (counts.get(b.bar) ?? 0) + 1);
	const whole = [...counts.entries()].slice(0, -1).map(([, n]) => n);
	const pool = whole.length ? whole : [...counts.values()];
	const freq = new Map<number, number>();
	for (const n of pool) freq.set(n, (freq.get(n) ?? 0) + 1);
	let best = pool[0] ?? 4;
	for (const [n, c] of freq)
		if (c > (freq.get(best) ?? 0) || (c === freq.get(best) && n < best)) best = n;
	return best;
}

/** Bar ends of a program-time grid, as far as `fileEnd` (seconds, null: no limit). */
function barEnds(grid: GridBeat[], fileEnd: number | null): PlacedMusic['bars'] {
	if (grid.length < 2 || grid[0].bar === null) return null;
	const downs = grid.filter((b) => b.beat === 1);
	if (!downs.length) return null;
	const ends: BarEnd[] = downs
		.filter((d) => d.bar! >= 2)
		.map((d) => ({ bar: d.bar! - 1, time: d.time }));
	const last = downs[downs.length - 1];
	const lastEnd = micro(shiftByBeats(grid, last.time, beatsPerBar(grid), 'music'));
	if (fileEnd === null || lastEnd <= fileEnd + 1e-3) ends.push({ bar: last.bar!, time: lastEnd });
	return { ends, next: lastEnd - last.time };
}

/** What to tell a project whose beat anchors found no music with beats. */
export function missingBeats(project: Pick<MotionProject, 'music'>): string | null {
	const without = (project.music ?? []).filter((m) => !m.beats);
	if (!without.length) return null;
	const m = without[0];
	const file = m.src.replace(/\.[^./\\]+$/, '') + '.beats.json';
	return `Music "${m.id ?? m.src}" has no beats file, so beat anchors and its bar-end snap have nothing to read. Run: visualfries beats ${m.src} --output ${file}, then add "beats": "${file}" to it.`;
}

/**
 * Places each music item in the program: `from` (any program anchor; a beat anchor reads music
 * placed before it), `in` (seconds into the file at `from`) and `until` (any anchor; beat
 * anchors read its own beats unless they name another music). Its beats move with it: a beat at
 * file second t plays at `from + t − in`. Beats in the part `in` skips are left out (`grid`),
 * and `beats` stops at `until`; `musicEnds` cuts them at the end the music really has.
 *
 * Stage `cuts` is for cut points on beats, before program words exist: an item whose `from` is
 * a phrase, or a beat of music that waits, waits too (`deferred`), and a phrase in `until` is
 * left for later. Stage `program` places everything against the program words; a `from` or
 * `until` that fails there is reported and the item plays from 0 (or to the end), so beats
 * anchored on it do not fail one by one. Without `tracks`, `given` (beats already in program
 * time) serves the anchors and no item has its own bars.
 */
export function placeMusic(
	project: MotionProject,
	opts: {
		tracks?: MusicTrack[];
		given?: MusicBeats[];
		words: MotionWord[] | null;
		sounds?: Record<string, SoundInfo | null>;
		stage: 'cuts' | 'program';
		/** The program end for `"end"` anchors (see `AnchorContext.end`); program stage only. */
		end?: number | null;
	}
): MusicPlacement {
	const fps = project.fps;
	const placed: (PlacedMusic | null)[] = [];
	const beats: MusicBeats[] = [];
	const deferred: string[] = [];
	const failed: string[] = [];
	const diagnostics: ProgramDiagnostic[] = [];
	const list = project.music ?? [];
	list.forEach((music, i) => {
		const owner = music.id ?? `music${i + 1}`;
		const error = (field: string, message: string) =>
			diagnostics.push({ level: 'error', item: owner, field: `music[${i}].${field}`, message });
		const track = opts.tracks?.find((t) => t.item === i) ?? null;
		// At the cut stage an item placed on a phrase waits for the program words, and so does one
		// placed on the beats of music that waits.
		const waits =
			anchorUsesWords(music.from) ||
			namedMusic(music.from).some((id) => deferred.includes(id)) ||
			(deferred.length > 0 && unnamedBeats(music.from));
		if (opts.stage === 'cuts' && waits) {
			if (track) deferred.push(owner);
			placed.push(null);
			return;
		}
		const ctx: AnchorContext = {
			words: opts.words,
			fps,
			window: null,
			localBase: null,
			scope: 'program',
			beats: { music: opts.tracks ? [...beats] : (opts.given ?? []), clip: undefined },
			end: opts.stage === 'program' ? opts.end : undefined
		};
		// A failed `from` or `until` is reported once; the item then plays from 0 (or to the end)
		// so that what is anchored on its beats still resolves instead of failing everywhere.
		let from = 0;
		const later = namedMusic(music.from).find((id) => list.slice(i + 1).some((m) => m.id === id));
		let why: string | null = null;
		if (music.id !== undefined && namedMusic(music.from).includes(music.id)) why = ownBeats(owner);
		else if (later)
			why = `Music "${owner}" starts on a beat of "${later}", which is listed after it. Music can start only on the beats of music listed before it; move "${later}" up.`;
		else if (track && !beats.length && unnamedBeats(music.from)) why = ownBeats(owner);
		else if (music.from !== undefined) {
			try {
				from = resolveAnchor(music.from, ctx, 'start').time;
			} catch (e) {
				why = (e as Error).message;
			}
		}
		if (why !== null) {
			error('from', why);
			// Cut points never read music whose place is unknown.
			if (opts.stage === 'cuts') {
				if (track) failed.push(owner);
				placed.push(null);
				return;
			}
		}
		const offset = music.in ?? 0;
		const duration = track?.duration ?? opts.sounds?.[music.src]?.duration ?? null;
		const first = offset + Math.max(0, -from);
		if (duration !== null && first >= duration) {
			error(
				music.in !== undefined ? 'in' : 'from',
				`Music "${owner}" would start ${first.toFixed(2)} s into "${music.src}", which is ${duration.toFixed(2)} s long.`
			);
			placed.push(null);
			return;
		}
		// File second t plays at `from + t − in`; with in = 0 that is `from + t`, as before `in`
		// existed. Beats in the part `in` skips are never heard, so they do not exist.
		const grid =
			track?.grid
				.filter((b) => offset === 0 || b.time >= offset - 1e-6)
				.map((b) => ({ ...b, time: micro(from + (b.time - offset)) })) ?? null;
		let until: number | null = null;
		// At the cut stage a phrase in `until` waits: cut points see the beats up to the file end.
		if (music.until !== undefined && !(opts.stage === 'cuts' && anchorUsesWords(music.until))) {
			const self: MusicBeats | null = grid
				? { id: owner, name: music.id ?? music.src, grid }
				: null;
			try {
				until = resolveAnchor(
					music.until,
					{
						...ctx,
						window: { from, to: Infinity },
						beats: self ? { music: [self, ...ctx.beats!.music], clip: owner } : ctx.beats
					},
					'end'
				).time;
				if (until <= Math.max(0, from)) {
					error(
						'until',
						`Music "${owner}" stops (${until.toFixed(2)} s) before it starts (${Math.max(0, from).toFixed(2)} s).`
					);
					until = null;
				}
			} catch (e) {
				error('until', (e as Error).message);
			}
		}
		const fileEnd = duration === null ? null : micro(from + duration - offset);
		const item: PlacedMusic = {
			item: i,
			owner,
			from,
			in: offset,
			until,
			fileEnd,
			bars: grid ? barEnds(grid, fileEnd) : null,
			grid,
			beats: grid ? musicBeats(music, grid, until) : null
		};
		placed.push(item);
		if (item.beats) beats.push(item.beats);
	});
	return { placed, beats, deferred, failed, diagnostics };
}

const ownBeats = (owner: string) =>
	`Music "${owner}" cannot start on its own beats: they move with it. Start it in seconds, on a phrase, or on a beat of music listed before it ({ "bar": 2, "music": "<id>" }).`;

/** A music item's beats for anchors: those it plays up to `end` (null: to the file end). */
export function musicBeats(
	music: Pick<MotionMusic, 'id' | 'src'>,
	grid: (GridBeat & { energy: number | null })[],
	end: number | null
): MusicBeats {
	return {
		id: music.id ?? null,
		name: music.id ?? music.src,
		grid: grid.filter((b) => end === null || b.time <= end + 1e-6)
	};
}

/** How a music item ends: where, and whether it snapped to a bar end. */
export type MusicEnd = {
	/** Program seconds at which the music has faded out. */
	end: number;
	/** The bar whose end it is; null: not snapped. */
	bar: number | null;
	/** Where it would end without the bar snap (`until` or the program end). */
	target: number;
	/** Program seconds up to which its beats exist: `end`, or the bar end it snapped to. */
	beatsUntil: number;
};

/**
 * The end of a placed music item in a program `programEnd` seconds long. It aims at `until`
 * (or the program end), never past the program end. With `snap` (default when the music has
 * downbeats) it takes the bar end nearest that aim, the earlier one on a tie, so a retake that
 * changes the program length re-snaps it. A bar end up to `slack` seconds (half a frame) after
 * the program end still counts: a cut on a beat rounds to the nearest frame, so the program may
 * end that much before the bar does; the music then ends with the program. A file that runs out
 * first ends the music there (on its last bar end when snapping), with a warning.
 */
export function musicEnd(
	music: MotionMusic,
	placed: PlacedMusic,
	programEnd: number,
	slack: number,
	diagnostics: ProgramDiagnostic[]
): MusicEnd {
	const field = `music[${placed.item}]`;
	const say = (level: ProgramDiagnostic['level'], at: string, message: string) =>
		diagnostics.push({ level, item: placed.owner, field: `${field}${at}`, message });
	const start = Math.max(0, placed.from);
	const target = micro(Math.min(placed.until ?? programEnd, programEnd));
	const aim = placed.until !== null && placed.until < programEnd ? '"until"' : 'the program end';
	const fileEnd = placed.fileEnd;
	const short = (end: number, how: string) =>
		say(
			'warning',
			'.src',
			`Music "${placed.owner}" runs out at ${fileEnd!.toFixed(2)} s, ${(target - fileEnd!).toFixed(2)} s before ${aim} (${target.toFixed(2)} s); it ends at ${end.toFixed(2)} s${how}. Use a longer track or end it earlier with "until".`
		);
	const wanted = music.snap ?? (placed.bars ? 'bar' : false);
	if (wanted === 'bar' && !placed.bars) {
		say(
			'error',
			'.snap',
			placed.beats
				? `Music "${placed.owner}" has no downbeats, so it has no bars to end on. Re-analyse with a tool that finds downbeats, or set "snap": false.`
				: music.beats
					? `Music "${placed.owner}": "snap": "bar" needs its beats in seconds of the music file (inputs.tracks, as the node tooling reads them); beats already placed in the program (inputs.music) have no bars to end on.`
					: (missingBeats({ music: [music] }) ?? NO_MUSIC_BEATS)
		);
	}
	if (wanted !== 'bar' || !placed.bars) {
		if (fileEnd !== null && fileEnd < target - 0.05) {
			short(fileEnd, '');
			const end = micro(Math.max(start, fileEnd));
			return { end, bar: null, target, beatsUntil: end };
		}
		return { end: target, bar: null, target, beatsUntil: target };
	}
	const { ends, next } = placed.bars;
	const eps = 1e-6;
	const inside = (t: number) => t > start + eps && t <= programEnd + slack + eps;
	const nearest = (list: BarEnd[]) =>
		list
			.filter((b) => inside(b.time))
			.reduce<BarEnd | null>(
				(best, b) =>
					!best || Math.abs(b.time - target) < Math.abs(best.time - target) - eps ? b : best,
				null
			);
	// Bar ends past the file, counted on with the last bar's length: where it should end.
	const beyond: BarEnd[] = [];
	const last = ends[ends.length - 1] ?? null;
	if (last && next > 0)
		for (let k = 1; last.time + k * next <= programEnd + slack + eps; k++) {
			const time = micro(last.time + k * next);
			if (fileEnd === null || time > fileEnd + 1e-3) beyond.push({ bar: last.bar + k, time });
		}
	const best = nearest([...ends, ...beyond]);
	const real = nearest(ends);
	if (!real) {
		const end = fileEnd !== null ? Math.min(target, fileEnd) : target;
		say(
			'warning',
			'.snap',
			`Music "${placed.owner}" cannot end on a bar end: none falls between its start (${start.toFixed(2)} s) and ${fileEnd !== null && fileEnd < programEnd ? 'the end of the file' : 'the program end'} (${Math.min(programEnd, fileEnd ?? Infinity).toFixed(2)} s). It ends at ${end.toFixed(2)} s; "snap": false keeps that without this warning.`
		);
		const stop = micro(Math.max(start, end));
		return { end: stop, bar: null, target, beatsUntil: stop };
	}
	if (best && best !== real && !ends.includes(best))
		short(real.time, ` on the end of bar ${real.bar}`);
	return {
		end: micro(Math.min(real.time, programEnd)),
		bar: real.bar,
		target,
		beatsUntil: real.time
	};
}

/**
 * Each placed item's end in a program `programEnd` seconds long (null: not known yet, nothing
 * ends), and the beats anchors may use: those the music plays, up to that end (else `until`).
 */
export function musicEnds(
	project: MotionProject,
	placed: (PlacedMusic | null)[],
	programEnd: number | null,
	diagnostics: ProgramDiagnostic[]
): { ends: (MusicEnd | null)[]; beats: MusicBeats[]; byItem: (MusicBeats | null)[] } {
	const list = project.music ?? [];
	const ends = list.map((music, i) =>
		placed[i] && programEnd !== null
			? musicEnd(music, placed[i]!, programEnd, 0.5 / project.fps, diagnostics)
			: null
	);
	const byItem = list.map((music, i) => {
		const place = placed[i];
		if (!place?.grid) return null;
		return ends[i] ? musicBeats(music, place.grid, ends[i]!.beatsUntil) : place.beats;
	});
	return { ends, beats: byItem.filter((b): b is MusicBeats => !!b), byItem };
}
