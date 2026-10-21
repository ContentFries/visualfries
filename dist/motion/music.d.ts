import type { MotionAnchor, MotionMusic, MotionProject } from './project.js';
import { type BeatsFile, type GridBeat, type MusicBeats } from './beat-grid.js';
import type { MotionWord } from './transcript.js';
import type { ProgramDiagnostic, SoundInfo } from './cutlist.js';
/**
 * A music item's beats as the node tooling reads them: corrected (`tempo`, `downbeat`,
 * `shift`) and in seconds of the music file. Placing them in the program is `placeMusic`'s job,
 * so a retake that moves the music moves its beats with it.
 */
export type MusicTrack = {
    /** Index of the music item in `project.music`. */
    item: number;
    grid: (GridBeat & {
        energy: number | null;
    })[];
    /** Seconds of the music file. */
    duration: number;
};
/** The track of music item `item`: its beats file with the item's corrections applied. */
export declare function musicTrack(file: BeatsFile, music: MotionMusic, item: number): MusicTrack;
/** The end of a bar in program seconds. */
export type BarEnd = {
    bar: number;
    time: number;
};
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
    bars: {
        ends: BarEnd[];
        next: number;
    } | null;
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
export declare function anchorUsesWords(anchor: MotionAnchor | undefined): boolean;
/** What to tell a project whose beat anchors found no music with beats. */
export declare function missingBeats(project: Pick<MotionProject, 'music'>): string | null;
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
export declare function placeMusic(project: MotionProject, opts: {
    tracks?: MusicTrack[];
    given?: MusicBeats[];
    words: MotionWord[] | null;
    sounds?: Record<string, SoundInfo | null>;
    stage: 'cuts' | 'program';
}): MusicPlacement;
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
export declare function musicEnd(music: MotionMusic, placed: PlacedMusic, programEnd: number, diagnostics: ProgramDiagnostic[]): MusicEnd;
