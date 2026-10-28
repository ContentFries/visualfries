import type { ResolvedKey } from './program.js';

/**
 * Chunks: the pieces a render draws and caches on their own. A segment is the range one page
 * draws; a long one (a block across the whole program) is cut into chunks, each hashed by what
 * its page sets up for the segment and by the key states of the frames it draws, so moving keys
 * draws again only the chunks they change.
 */

type Span = { startFrame: number; frames: number };

/** Seconds of a chunk: long enough that opening a page is a small share of drawing it. */
export const CHUNK_SECONDS = 4;

/**
 * The chunks of `span`: cut at every multiple of `CHUNK_SECONDS` in program frames, so the grid
 * stays put when the segment's edges move. A piece shorter than half a chunk at either edge
 * joins its neighbour.
 */
export function chunkSpans(span: Span, fps: number): Span[] {
	const size = Math.max(1, Math.round(CHUNK_SECONDS * fps));
	const from = span.startFrame;
	const to = span.startFrame + span.frames;
	const edges = [from];
	for (let f = Math.ceil((from + 1) / size) * size; f < to; f += size)
		if (f - from >= size / 2 && to - f >= size / 2) edges.push(f);
	edges.push(to);
	return edges.slice(0, -1).map((f, i) => ({ startFrame: f, frames: edges[i + 1] - f }));
}

/**
 * What keys make of program frames `[from, to)`, as runs of equal states: per keyed property,
 * the value held before the first key or after the last, the one value two equal keys mix to,
 * or the two keys around the frame and the frame itself. Equal states draw equal values (the
 * same as `createTrack` interpolates), so keys moved elsewhere leave the states of these frames
 * alone.
 */
export function keyStates(keys: readonly ResolvedKey[], from: number, to: number): unknown[] {
	const tracks = new Map<string, { frame: number; value: unknown; ease: string; mix: string }[]>();
	const add = (name: string, k: ResolvedKey, value: unknown) => {
		if (value === undefined) return;
		if (!tracks.has(name)) tracks.set(name, []);
		tracks.get(name)!.push({ frame: k.frame, value, ease: k.ease, mix: k.mix });
	};
	for (const k of keys) {
		const { props, ...placement } = k.values as Record<string, unknown> & {
			props?: Record<string, unknown>;
		};
		for (const [name, value] of Object.entries(placement)) add(name, k, value);
		for (const [name, value] of Object.entries(props ?? {})) add(`props.${name}`, k, value);
	}
	const names = [...tracks.keys()].sort();
	for (const name of names) tracks.get(name)!.sort((a, b) => a.frame - b.frame);
	const state = (f: number) =>
		names.map((name) => {
			const own = tracks.get(name)!;
			if (f < own[0].frame) return [name, 'hold', own[0].value];
			let i = own.length - 1;
			while (own[i].frame > f) i--;
			if (i === own.length - 1) return [name, 'hold', own[i].value];
			const [a, b] = [own[i], own[i + 1]];
			if (same(a.value, b.value)) return [name, 'mix', a.value, b.mix];
			return [name, 'between', a.frame, a.value, b.frame, b.value, b.ease, b.mix, f];
		});
	const runs: [number, string][] = [];
	for (let f = from; f < to; f++) {
		const s = JSON.stringify(state(f));
		const last = runs[runs.length - 1];
		if (last && last[1] === s) last[0]++;
		else runs.push([1, s]);
	}
	return runs;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
