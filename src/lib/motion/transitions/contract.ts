import type { FormatClass } from '../program.js';

export type { FormatClass };

/**
 * The contract of a transition: a two-sided handoff drawn from its progress alone. The engine
 * gives a module the elements of both sides and an overlay of its own; `apply` sets every style
 * the module owns from `p` on every frame of the window, `release` clears them outside it. So the
 * start state holds on the first frame of the window and both sides are free after the last, in
 * any seek order, by construction. Nothing here reads the clock or keeps state between frames.
 *
 * Progress runs strictly inside 0–1 over the window: frame k of n has p = (k + 1) / (n + 1), so
 * the frame before the window is the plain outgoing picture (p = 0) and the frame after it the
 * plain incoming one (p = 1), and the first and last frames of the window show both sides.
 */

/** Which way a directional transition travels, on screen. */
export type ScreenDirection = 'left' | 'right' | 'up' | 'down';

/** A moment of the transition a sound can land on, at progress `at`. */
export type TransitionEvent = { kind: string; at: number };

/** What a transition hands off between. */
export type TransitionSides = {
	/**
	 * What leaves: the outgoing side of a cut or shot transition (and the clips that end on its
	 * cut), or every layer below the clip of a clip transition. Elements marked `data-solid`
	 * (a side, its fill and its footage window) paint their whole box: a filter may treat their
	 * edge as the end of the picture rather than as transparency.
	 */
	out: HTMLElement[];
	/** What arrives: the incoming side (and the clips that start on its cut), or the clip root. */
	in: HTMLElement[];
	/** The transition's own element above everything on the stage; built by `setup`. */
	overlay: HTMLElement;
	/** Format frame in pixels. */
	size: [number, number];
};

export type TransitionSetup = {
	size: [number, number];
	cls: FormatClass;
	/** Resolved screen direction; null for a transition without one. */
	direction: ScreenDirection | null;
	params: Record<string, unknown>;
};

/** Stage pixels, origin top left. */
export type Point = { x: number; y: number };

export type TransitionFrame = TransitionSides & {
	/** Linear progress through the window, strictly between 0 and 1. */
	p: number;
	/** `p` through the transition's ease. */
	eased: number;
	direction: ScreenDirection | null;
	params: Record<string, unknown>;
	/** What carries the transition: a cut, a shot or a clip. */
	kind: 'cut' | 'shot' | 'clip';
	/**
	 * Where the speaker's eyes are on screen on each side (from the matte, smoothed), for
	 * transitions that centre on them; null where a side has no footage. A clip transition gives
	 * the eyes under the clip on both.
	 */
	focus?: { out: Point | null; in: Point | null };
};

export type TransitionModule = {
	name: string;
	/** Seconds when the project does not set `duration`. */
	defaultDuration: number;
	/** Ease when the project does not set `ease`. */
	ease: string;
	/** Takes `direction` (`forward`/`back` mapped per format class). */
	directional: boolean;
	events: TransitionEvent[];
	/**
	 * Eased progress after which the outgoing side no longer shows (`out`) and before which the
	 * incoming side does not show yet (`in`): what decides the handles a cut needs. Without it
	 * both sides show through the whole window.
	 */
	shows?(params: Record<string, unknown>): { out: number; in: number };
	/** Problems with `params`, as messages. */
	check?(params: Record<string, unknown>): string[];
	/** Builds the overlay's elements once, when the segment loads. `overlay.id` is unique. */
	setup(overlay: HTMLElement, ctx: TransitionSetup): void;
	/** Sets every style the transition owns on both sides and its overlay, from `p` alone. */
	apply(frame: TransitionFrame): void;
	/** Clears every style `apply` sets. */
	release(sides: TransitionSides): void;
};
