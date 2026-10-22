import { type CutList, type ProgramInputs, type SpeechEdge } from './cutlist.js';
import type { MotionProject } from './project.js';
/**
 * Node side of the edit-point check: how loud the speech is at each audio edit point, measured
 * on the decoded source. Transcript times are often a few hundredths off (a word's ringing end,
 * an onset timed early), so the cut list's warning about a word cut through by an edit point
 * trusts the sound where it was measured (see `SpeechEdge`). `program`, `check` and `render`
 * measure (`loadMotionProject(file, { editPoints: true })`); results are cached per source file
 * and point in `.visualfries/edit-points.json`.
 */
/** Sample rate the speech is measured at: mono, plenty for its loudness. */
export declare const EDGE_RATE = 16000;
export type EdgeMeasure = Pick<SpeechEdge, 'voice' | 'level' | 'clean' | 'move'>;
/**
 * How the voice sounds at source second `t` of mono `samples` decoded from `start` at `rate`:
 * `out` is where a cut's sound stops, `in` where it starts.
 *
 * The voice level is the loudest 5 % of 20 ms windows in the stretch, the floor the quietest
 * 10 % (room noise, a music bed). Quiet is 24 dB under the voice, but never less than 6 dB over
 * the floor (nor under −55 dBFS). The voice runs through the point when the 10 ms on both sides
 * of it are louder than quiet; then `move` is how far the point must go (later for `out`,
 * earlier for `in`) to a point it does not run through, at least one frame, null when that is
 * not within the stretch. A point less than half a frame from such a point is clean: cut points
 * land on frames. Null when the voice cannot be told from the floor (12 dB or less apart, or no
 * speech at all): the transcript then decides.
 */
export declare function measureEdge(samples: Float32Array, start: number, t: number, side: 'in' | 'out', opts?: {
    rate?: number;
    fps?: number;
}): EdgeMeasure | null;
/**
 * Measures the speech at every audio edit point of the cut list: where each cut's sound starts
 * and stops, in its source. Points inside one continuous take (the next cut starts where this
 * one ends, same sound and gain) are no edit and are skipped, as are muted cuts and sources
 * without a readable sound file. Each source is decoded once per stretch of nearby points (one
 * ffmpeg run, mono 16 kHz); a stretch that cannot be decoded leaves its points to the
 * transcript. Results are cached by the sound file (path, size, time) and point.
 */
export declare function measureSpeechEdges(project: MotionProject, inputs: ProgramInputs, cutList: CutList, dir: string): Promise<SpeechEdge[]>;
