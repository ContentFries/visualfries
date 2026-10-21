import { easeOf } from '../ease.js';
import { checkKnown } from '../shots/layout.js';
import type { ScreenDirection, TransitionModule } from './contract.js';

/**
 * Wipe: slanted bars in the brand colours sweep across one after another; while the last one
 * covers the frame (halfway) the picture changes, then they sweep on out in reverse order.
 * `params.colors` replaces the bar colours (CSS colours, first bar first).
 *
 * In a cut or shot transition the outgoing side hides from halfway; a clip transition leaves the
 * layers below the clip alone, so a clip that does not cover the frame still sits on its picture.
 */

/** The brand's primary and accent (neutral brand: rose and yellow), then a third bar. */
const COLORS = [
	'var(--brand-primary, #f43f5e)',
	'var(--brand-accent, #fbc42d)',
	'var(--brand-extra-tertiary, #5b8cff)'
];
/** Progress one bar takes to cross into place, and the delay between bars. */
const TRAVEL = 0.55 / 1.42;
const STAGGER = 0.08 / 1.42;
/** The bars cover the frame, and the picture changes, halfway. */
const MID = 0.5;
/** How far off the frame a bar starts and ends, in its own length. */
const AWAY = 130;
const SLANT = 12;

const barIn = easeOf('power3.in');
const barOut = easeOf('power3.out');
const horizontal = (d: ScreenDirection | null) => d === 'left' || d === 'right' || d === null;
/** +1 when the bars travel right or down. */
const sign = (d: ScreenDirection | null) => (d === 'right' || d === 'down' ? 1 : -1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function colors(params: Record<string, unknown>): string[] {
	const c = params.colors;
	return Array.isArray(c) && c.length && c.every((x) => typeof x === 'string') ? c : COLORS;
}

function bars(overlay: HTMLElement): HTMLElement[] {
	return [...overlay.children] as HTMLElement[];
}

/** Where bar `i` of `n` is at progress `p`, in percent of its own length (0 = covering). */
export function wipeBarAt(i: number, n: number, p: number): number {
	if (p < MID) return AWAY * (barIn(clamp01((p - i * STAGGER) / TRAVEL)) - 1);
	const j = n - 1 - i;
	return AWAY * barOut(clamp01((p - MID - j * STAGGER) / TRAVEL));
}

export const wipe: TransitionModule = {
	name: 'wipe',
	defaultDuration: 0.8,
	ease: 'none',
	directional: true,
	events: [{ kind: 'transition', at: MID }],
	check(params) {
		const out = checkKnown(params, ['colors']);
		const c = params.colors;
		if (c !== undefined && !(Array.isArray(c) && c.length && c.every((x) => typeof x === 'string')))
			out.push(`"colors" must be a list of CSS colours (got ${JSON.stringify(c)}).`);
		return out;
	},
	setup(overlay, { direction, params }) {
		const across = horizontal(direction);
		// Longer than the frame along the travel, wider across it, so the slant never shows an edge.
		const box = across
			? 'top:-10%;height:120%;left:-15%;width:130%'
			: 'left:-10%;width:120%;top:-15%;height:130%';
		for (const color of colors(params)) {
			const bar = document.createElement('div');
			bar.style.cssText = `position:absolute;${box};background:${color}`;
			overlay.appendChild(bar);
		}
	},
	apply({ eased, direction, out, in: incoming, overlay, kind }) {
		const s = sign(direction);
		const list = bars(overlay);
		list.forEach((bar, i) => {
			const at = Math.round(s * wipeBarAt(i, list.length, eased) * 100) / 100;
			bar.style.transform = horizontal(direction)
				? `translate(${at}%, 0%) skewX(${-s * SLANT}deg)`
				: `translate(0%, ${at}%) skewY(${-s * SLANT}deg)`;
		});
		const changed = eased >= MID;
		for (const el of incoming) el.style.visibility = changed ? '' : 'hidden';
		if (kind !== 'clip') for (const el of out) el.style.visibility = changed ? 'hidden' : '';
	},
	release({ out, in: incoming }) {
		for (const el of [...out, ...incoming]) el.style.visibility = '';
	}
};
