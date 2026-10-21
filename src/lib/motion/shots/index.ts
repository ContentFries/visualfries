import type { ProgramShot } from '../program.js';
import { full } from './full.js';
import { punch } from './punch.js';
import { strip } from './strip.js';
import { easeOf } from '../ease.js';
import type { Morph, Rect, ShotEvent, ShotInput, ShotLayout, ShotModule } from './layout.js';

export type {
	Energy,
	FormatClass,
	Morph,
	Rect,
	ShotEvent,
	ShotInput,
	ShotLayout,
	ShotModule
} from './layout.js';
export { facePoint, frameOnHead } from './layout.js';
export { DEFAULT_PUNCH_SCALE, PUNCH_SCALE } from './punch.js';

/**
 * The shot engine: the registry of built-in shots and the layout on screen at any program frame,
 * morphing from the previous shot's layout over the shot's first `morphFrames` frames. Pure:
 * every frame is a function of the shot track, the frame and the subject at that frame.
 */

/** Built-in shots that are drawn. The other names `SHOTS` lists draw as `full` until built. */
export const SHOT_MODULES: Readonly<Record<string, ShotModule>> = { full, punch, strip };

/** The module drawing `name`; null for a shot not built yet or a custom file. */
export function shotModule(name: string): ShotModule | null {
	return Object.hasOwn(SHOT_MODULES, name) ? SHOT_MODULES[name] : null;
}

/** What the engine reads of a resolved shot. */
export type ShotSpan = Pick<
	ProgramShot,
	'id' | 'shot' | 'startFrame' | 'frames' | 'params' | 'morphFrames' | 'morphEase'
>;

/**
 * The morph into shot `next` when the project does not set one: the previous shot's `leave`
 * (a punch-in settles slower than it hits), else the next shot's `enter`. Null with nothing
 * before it.
 */
export function defaultMorph(prev: string | null, next: string): Morph | null {
	if (prev === null) return null;
	return shotModule(prev)?.leave ?? (shotModule(next) ?? full).enter;
}

/** Events of a shot in program frames (see `ShotModule.events`). */
export function shotEvents(shot: ShotSpan, prev: string | null): ShotEvent[] {
	const module = shotModule(shot.shot);
	const local = module
		? module.events({ prev, morphFrames: shot.morphFrames, frames: shot.frames })
		: [{ kind: shot.shot === 'whip' ? 'whip' : 'shot', frame: 0 }];
	return local.map((e) => ({ kind: e.kind, frame: shot.startFrame + e.frame }));
}

type Framed = Pick<ShotSpan, 'shot' | 'params'>;
const FULL: Framed = { shot: 'full', params: {} };
const endOf = (s: { startFrame: number; frames: number }) => s.startFrame + s.frames;

/**
 * The shot on screen at program frame `f`, the one it morphs from, and how far the morph has
 * gone (eased, 0–1). Frames outside every shot are framed `full`; a shot after a gap morphs
 * from `full`.
 */
export function shotAt(
	shots: readonly ShotSpan[],
	f: number
): { shot: Framed; prev: Framed | null; p: number } {
	const i = shots.findIndex((s) => f >= s.startFrame && f < endOf(s));
	if (i < 0) return { shot: FULL, prev: null, p: 1 };
	const shot = shots[i];
	const local = f - shot.startFrame;
	if (shot.morphFrames <= 0 || local >= shot.morphFrames) return { shot, prev: null, p: 1 };
	const before = shots[i - 1];
	const prev = before && endOf(before) === shot.startFrame ? before : FULL;
	return { shot, prev, p: easeOf(shot.morphEase)(local / shot.morphFrames) };
}

/**
 * The shots that decide the layout inside `span`: those overlapping it, and the shot the first
 * of them morphs from.
 */
export function shotsDuring<T extends ShotSpan>(
	shots: readonly T[],
	span: { startFrame: number; frames: number }
): T[] {
	const on = (s: T) => s.startFrame < endOf(span) && span.startFrame < endOf(s);
	return shots.filter((s, i) => on(s) || (i + 1 < shots.length && on(shots[i + 1])));
}

/** The layout of one shot, alone. Shots not built yet are framed `full`. */
export function shotLayout(shot: Framed, input: Omit<ShotInput, 'params'>): ShotLayout {
	return (shotModule(shot.shot) ?? full).layout({ ...input, params: shot.params });
}

/** The layout on screen at program frame `f` (see `shotAt`). */
export function shotLayoutAt(
	shots: readonly ShotSpan[],
	f: number,
	input: Omit<ShotInput, 'params'>
): ShotLayout {
	const { shot, prev, p } = shotAt(shots, f);
	const to = shotLayout(shot, input);
	return prev ? mixLayouts(shotLayout(prev, input), to, p) : to;
}

const mix = (a: number, b: number, t: number) => Math.round((a + (b - a) * t) * 100) / 100;
const mixRect = (a: Rect, b: Rect, t: number): Rect => ({
	x: mix(a.x, b.x, t),
	y: mix(a.y, b.y, t),
	width: mix(a.width, b.width, t),
	height: mix(a.height, b.height, t)
});

/**
 * The layout `t` of the way from `a` to `b`. Rectangles move straight, so the face moves in a
 * line between its two marks. A slot only one side frees slides between its open and closed
 * rectangles; the fill shows while either side has it.
 */
export function mixLayouts(a: ShotLayout, b: ShotLayout, t: number): ShotLayout {
	const slots: Record<string, Rect> = {};
	const closed: Record<string, Rect> = {};
	for (const name of new Set([...Object.keys(a.slots), ...Object.keys(b.slots)])) {
		const from = a.slots[name] ?? b.closed[name] ?? b.slots[name];
		const to = b.slots[name] ?? a.closed[name] ?? a.slots[name];
		slots[name] = mixRect(from, to, t);
		const shut = b.closed[name] ?? a.closed[name];
		if (shut) closed[name] = shut;
	}
	return {
		camera: mixRect(a.camera, b.camera, t),
		clip: mixRect(a.clip, b.clip, t),
		radius: mix(a.radius, b.radius, t),
		slots,
		closed,
		fill: a.fill ?? b.fill
	};
}
