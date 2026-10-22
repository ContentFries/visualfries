import { type CutList, type ProgramInputs, type SpeechEdge } from './cutlist.js';
import type { MotionProject } from './project.js';
/**
 * How the voice sounds at source second `t` of a stretch decoded from `start`: `out` is where a
 * cut's sound stops, `in` where it starts. The voice runs through the point when the 10 ms on
 * both sides of it stay within 24 dB of the voice level (its loudest 5 % in the stretch); then
 * `move` is how far the point must go (later for `out`, earlier for `in`, rounded up to a frame)
 * to a point it does not run through, null when that is not within the decoded stretch.
 */
export declare function measureEdge(samples: Float32Array, start: number, t: number, side: 'in' | 'out', fps?: number): Pick<SpeechEdge, 'voice' | 'level' | 'clean' | 'move'>;
/**
 * Measures the speech at every audio edit point of the cut list: where each cut's sound starts
 * and stops, in its source. Points inside one continuous take (the next cut starts where this
 * one ends, same sound and gain) are no edit and are skipped, as are muted cuts and sources
 * without a readable sound file. A source that cannot be decoded is left unmeasured; the mix
 * reports it.
 */
export declare function measureSpeechEdges(project: MotionProject, inputs: ProgramInputs, cutList: CutList, dir: string): Promise<SpeechEdge[]>;
