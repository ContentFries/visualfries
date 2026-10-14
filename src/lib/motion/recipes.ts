/**
 * Pure helpers behind the motion-recipe blocks (`@visualfries/kinetic`, `arrows`, `wall`,
 * `screen`, `zoom-through`). Kept free of Svelte so they are unit-tested and reusable in custom
 * blocks.
 */

export type Rect = [x: number, y: number, w: number, h: number];
export type Camera = { s: number; tx: number; ty: number };

/** Scale + translate that fits `rect` (source px) centred in a `viewW`×`viewH` view. */
export function fitRect(rect: Rect, viewW: number, viewH: number): { s: number; cx: number; cy: number } {
	const s = Math.min(viewW / rect[2], viewH / rect[3]);
	return { s, cx: rect[0] + rect[2] / 2, cy: rect[1] + rect[3] / 2 };
}

/**
 * Camera over a source of `srcW`×`srcH` shown in a `viewW`×`viewH` view, gliding through `stops`
 * (each with an eased progress 0–1 and a rect). Starts on the whole source. Apply as
 * `transform: translate(tx px, ty px) scale(s)` with `transform-origin: 0 0`.
 */
export function cameraAt(
	stops: { e: number; r: Rect }[],
	srcW: number,
	srcH: number,
	viewW: number,
	viewH: number
): Camera {
	let cur = fitRect([0, 0, srcW, srcH], viewW, viewH);
	for (const { e, r } of stops) {
		if (e <= 0) break;
		const n = fitRect(r, viewW, viewH);
		cur = { s: cur.s + (n.s - cur.s) * e, cx: cur.cx + (n.cx - cur.cx) * e, cy: cur.cy + (n.cy - cur.cy) * e };
	}
	return { s: cur.s, tx: viewW / 2 - cur.cx * cur.s, ty: viewH / 2 - cur.cy * cur.s };
}

/**
 * Quadratic arrow from `a` to `b`, bent sideways by `bend` (fraction of the length, + = left of
 * the direction of travel). Returns the SVG path, its approximate length (for a draw-on dash) and
 * the angle of the head in degrees.
 */
export function arrowPath(
	a: [number, number],
	b: [number, number],
	bend = 0.2
): { d: string; length: number; angle: number; control: [number, number] } {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const len = Math.hypot(dx, dy) || 1;
	const c: [number, number] = [a[0] + dx / 2 - (dy / len) * bend * len, a[1] + dy / 2 + (dx / len) * bend * len];
	// length of a quadratic Bézier, sampled
	let length = 0;
	let px = a[0];
	let py = a[1];
	for (let i = 1; i <= 24; i++) {
		const t = i / 24;
		const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0];
		const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
		length += Math.hypot(x - px, y - py);
		px = x;
		py = y;
	}
	const angle = (Math.atan2(b[1] - c[1], b[0] - c[0]) * 180) / Math.PI;
	return { d: `M ${a[0]} ${a[1]} Q ${c[0]} ${c[1]} ${b[0]} ${b[1]}`, length, angle, control: c };
}

/**
 * Splits bound words into phrases by word index ranges `[first, last]` (inclusive), counted from
 * the first word whose text starts with `first` (so the selection may include a word or two of
 * the clip's handle).
 */
export function phraseWords<W extends { text: string }>(words: W[], ranges: [number, number][], first?: string): W[][] {
	const i0 = first ? Math.max(0, words.findIndex((w) => w.text.replace(/^[^\p{L}\p{N}]+/u, '').startsWith(first))) : 0;
	return ranges.map(([a, b]) => words.slice(i0 + a, i0 + b + 1));
}

/** Extruded-letter look: stacked text shadows going down-right, darker with depth. */
export function extrude(color: string, depth = 7): string {
	const layers = Array.from({ length: depth }, (_, i) => `${i + 1}px ${i + 1}px 0 color-mix(in srgb, ${color} ${Math.round(82 - i * 8)}%, #000)`);
	return [...layers, `${depth + 3}px ${depth + 7}px 30px rgba(0,0,0,0.6)`].join(', ');
}

/** Slots of a 3×3 wall around the centre tile, side columns shifted for a masonry feel. */
export function wallSlots(w: number, h: number, gap: number, masonry = 0.32): { x: number; y: number }[] {
	const out: { x: number; y: number }[] = [];
	for (const [c, r] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) {
		out.push({ x: c * (w + gap), y: r * (h + gap) + (c === -1 ? masonry : c === 1 ? -masonry : 0) * (h + gap) });
	}
	return out;
}
