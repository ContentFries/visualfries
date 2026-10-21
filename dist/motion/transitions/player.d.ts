import type { FormatClass, ProgramTransition } from '../program.js';
import type { TransitionFrame, TransitionSides } from './contract.js';
export type TransitionPlayer = {
    /** Drawn transitions whose window holds program frame `f`. */
    at(f: number): ProgramTransition[];
    /** Releases every transition, then applies those on screen at `f` to the sides given. */
    seek(f: number, sides: (t: ProgramTransition) => Pick<TransitionSides, 'out' | 'in'> & Pick<TransitionFrame, 'focus'>): void;
};
/** Whether the stage draws `t` (a built-in module exists); others cut on their cut frame. */
export declare const isDrawn: (t: Pick<ProgramTransition, "type">) => boolean;
export declare function createTransitionPlayer(layer: HTMLElement, transitions: ProgramTransition[], stage: {
    size: [number, number];
    cls: FormatClass;
}): TransitionPlayer;
