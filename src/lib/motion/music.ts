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
	/** Its beats in program seconds, for beat anchors; null without a beats file. */
	beats: MusicBeats | null;
};

export type MusicPlacement = {
	/** By index in `project.music`; null where the item could not be placed (or waits for words). */
	placed: (PlacedMusic | null)[];
	/** Beats of every placed item with beats, in program seconds, in project order. */
	beats: MusicBeats[];
	/** Items left for the program stage because a phrase places them. */
	deferred: string[];
	diagnostics: ProgramDiagnostic[];
};

/** Whether an anchor needs a transcript (a phrase, or a phrase in its `at`). */
export function anchorUsesWords(anchor: MotionAnchor | undefined): boolean {
	if (anchor === undefined || typeof anchor === 'number') return false;
	if (typeof anchor === 'string') return true;
	if ('say' in anchor) return true;
	if ('at' in anchor) return anchorUsesWords(anchor.at);
	return false;
}

const ownBeat = (anchor: MotionAnchor | undefined, owner: string | undefined): boolean => {
	if (anchor === undefined || typeof anchor !== 'object') return false;
	if ('music' in anchor && anchor.music !== undefined && anchor.music === owner) return true;
	return 'at' in anchor ? ownBeat(anchor.at, owner) : false;
};

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
	if (!grid.length || grid[0].bar === null) return null;
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
 * file second t plays at `from + t − in`; beats after `until` do not exist.
 *
 * Stage `cuts` is for cut points on beats, before program words exist: an item that a phrase
 * places waits (`deferred`). Stage `program` places everything against the program words.
 * Without `tracks`, `given` (beats already in program time) serves the anchors and no item has
 * its own bars.
 */
export function placeMusic(
	project: MotionProject,
	opts: {
		tracks?: MusicTrack[];
		given?: MusicBeats[];
		words: MotionWord[] | null;
		sounds?: Record<string, SoundInfo | null>;
		stage: 'cuts' | 'program';
	}
): MusicPlacement {
	const fps = project.fps;
	const placed: (PlacedMusic | null)[] = [];
	const beats: MusicBeats[] = [];
	const deferred: string[] = [];
	const diagnostics: ProgramDiagnostic[] = [];
	(project.music ?? []).forEach((music, i) => {
		const owner = music.id ?? `music${i + 1}`;
		const fail = (field: string, message: string) => {
			diagnostics.push({ level: 'error', item: owner, field: `music[${i}].${field}`, message });
			placed.push(null);
		};
		if (opts.stage === 'cuts' && (anchorUsesWords(music.from) || anchorUsesWords(music.until))) {
			deferred.push(owner);
			placed.push(null);
			return;
		}
		const track = opts.tracks?.find((t) => t.item === i) ?? null;
		const ctx: AnchorContext = {
			words: opts.words,
			fps,
			window: null,
			localBase: null,
			scope: 'program',
			beats: { music: opts.tracks ? [...beats] : (opts.given ?? []), clip: undefined }
		};
		if (ownBeat(music.from, music.id)) {
			fail('from', `Music "${owner}" cannot start on its own beats; they move with it.`);
			return;
		}
		let from: number;
		try {
			from = music.from === undefined ? 0 : resolveAnchor(music.from, ctx, 'start').time;
		} catch (error) {
			fail('from', (error as Error).message);
			return;
		}
		const offset = music.in ?? 0;
		const duration = track?.duration ?? opts.sounds?.[music.src]?.duration ?? null;
		if (duration !== null && offset >= duration) {
			fail(
				'in',
				`"in" (${offset} s) is not inside "${music.src}" (${duration.toFixed(2)} s long).`
			);
			return;
		}
		// With in = 0 this is `from + time`, exactly as before `in` existed.
		const grid = track?.grid.map((b) => ({ ...b, time: micro(from + (b.time - offset)) })) ?? null;
		let until: number | null = null;
		if (music.until !== undefined) {
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
			} catch (error) {
				fail('until', (error as Error).message);
				return;
			}
			if (until <= Math.max(0, from)) {
				fail(
					'until',
					`Music "${owner}" stops (${until.toFixed(2)} s) before it starts (${Math.max(0, from).toFixed(2)} s).`
				);
				return;
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
			beats: grid
				? {
						id: music.id ?? null,
						name: music.id ?? music.src,
						grid: grid.filter((b) => until === null || b.time <= until + 1e-6)
					}
				: null
		};
		placed.push(item);
		if (item.beats) beats.push(item.beats);
	});
	return { placed, beats, deferred, diagnostics };
}

/** How a music item ends: where, and whether it snapped to a bar end. */
export type MusicEnd = {
	/** Program seconds at which the music has faded out. */
	end: number;
	/** The bar whose end it is; null: not snapped. */
	bar: number | null;
	/** Where it would end without the bar snap (`until` or the program end). */
	target: number;
};

/**
 * The end of a placed music item in a program `programEnd` seconds long. It aims at `until`
 * (or the program end), never past the program end. With `snap` (default when the music has
 * downbeats) it takes the bar end nearest that aim, the earlier one on a tie, so a retake that
 * changes the program length re-snaps it. A file that runs out first ends the music there (on its
 * last bar end when snapping), with a warning.
 */
export function musicEnd(
	music: MotionMusic,
	placed: PlacedMusic,
	programEnd: number,
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
				: (missingBeats({ music: [music] }) ?? NO_MUSIC_BEATS)
		);
	}
	if (wanted !== 'bar' || !placed.bars) {
		if (fileEnd !== null && fileEnd < target - 0.05) {
			short(fileEnd, '');
			return { end: micro(Math.max(start, fileEnd)), bar: null, target };
		}
		return { end: target, bar: null, target };
	}
	const { ends, next } = placed.bars;
	const eps = 1e-6;
	const inside = (t: number) => t > start + eps && t <= programEnd + eps;
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
		for (let k = 1; last.time + k * next <= programEnd + eps; k++) {
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
		return { end: micro(Math.max(start, end)), bar: null, target };
	}
	if (best && best !== real && !ends.includes(best))
		short(real.time, ` on the end of bar ${real.bar}`);
	return { end: real.time, bar: real.bar, target };
}
