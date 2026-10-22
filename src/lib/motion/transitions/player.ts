import type { FormatClass, ProgramTransition } from '../program.js';
import { easeOf } from '../ease.js';
import type {
	ScreenDirection,
	TransitionFrame,
	TransitionModule,
	TransitionSides
} from './contract.js';
import { inWindow, transitionModule, transitionProgress } from './index.js';

/**
 * The stage side of the transition engine. Every drawn transition of a segment gets its own
 * overlay element (hidden outside its window) and `setup` once. On every seek all transitions
 * release what they touched on the previous seek, then those whose window holds the frame apply
 * from their progress: a frame never depends on the frames seeked before it.
 */

type Entry = {
	t: ProgramTransition;
	module: TransitionModule;
	overlay: HTMLElement;
	under: HTMLElement | null;
	direction: ScreenDirection | null;
	ease: (x: number) => number;
	/** Elements the last `apply` styled; null when released. */
	touched: TransitionSides | null;
};

export type TransitionPlayer = {
	/** Drawn transitions whose window holds program frame `f`. */
	at(f: number): ProgramTransition[];
	/** Releases every transition, then applies those on screen at `f` to the sides given. */
	seek(
		f: number,
		sides: (
			t: ProgramTransition
		) => Pick<TransitionSides, 'out' | 'in'> & Pick<TransitionFrame, 'focus'>
	): void;
};

/** Whether the stage draws `t` (a built-in module exists); others cut on their cut frame. */
export const isDrawn = (t: Pick<ProgramTransition, 'type'>) => transitionModule(t.type) !== null;

/** Players made on this page: ids of one never collide with another stage's. */
let players = 0;

/**
 * `layer` holds the transitions' overlays, above everything; `stage.under`, when the stage has
 * one, a layer above both sides and below the front clips.
 */
export function createTransitionPlayer(
	layer: HTMLElement,
	transitions: ProgramTransition[],
	stage: { size: [number, number]; cls: FormatClass; under?: HTMLElement }
): TransitionPlayer {
	const entries: Entry[] = [];
	const scope = ++players;
	const box = (parent: HTMLElement) => {
		const el = document.createElement('div');
		el.style.cssText = 'position:absolute;inset:0;overflow:hidden;display:none';
		parent.appendChild(el);
		return el;
	};
	transitions.forEach((t, i) => {
		const module = transitionModule(t.type);
		if (!module) return;
		const overlay = box(layer);
		// Filters and other ids a transition makes start with its overlay's id.
		overlay.id = `vf-transition-${scope}-${i}`;
		overlay.dataset.transition = t.id;
		const under = stage.under ? box(stage.under) : null;
		const direction = module.directional ? (t.direction as ScreenDirection | null) : null;
		module.setup(overlay, {
			size: stage.size,
			cls: stage.cls,
			direction,
			params: t.params,
			...(under ? { under } : {})
		});
		entries.push({
			t,
			module,
			overlay,
			under,
			direction,
			ease: easeOf(t.ease ?? module.ease),
			touched: null
		});
	});

	return {
		at: (f) => entries.filter((e) => inWindow(e.t, f)).map((e) => e.t),
		seek(f, sides) {
			for (const e of entries) {
				if (!e.touched) continue;
				e.module.release(e.touched);
				e.overlay.style.display = 'none';
				if (e.under) e.under.style.display = 'none';
				e.touched = null;
			}
			for (const e of entries) {
				if (!inWindow(e.t, f)) continue;
				const { out, in: incoming, focus } = sides(e.t);
				const touched: TransitionSides = {
					out,
					in: incoming,
					overlay: e.overlay,
					...(e.under ? { under: e.under } : {}),
					size: stage.size
				};
				e.overlay.style.display = '';
				if (e.under) e.under.style.display = '';
				const p = transitionProgress(e.t, f);
				e.module.apply({
					...touched,
					p,
					eased: e.ease(p),
					direction: e.direction,
					params: e.t.params,
					kind: e.t.kind,
					focus
				});
				e.touched = touched;
			}
		}
	};
}
