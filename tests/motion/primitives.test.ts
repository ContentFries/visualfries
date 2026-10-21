import { describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import {
	Clip,
	registerClipRoot,
	type ClipController
} from '../../src/lib/motion/runtime.svelte.js';
import { motion } from '../../src/lib/motion/motion.js';
import { ENERGY, planMotion, type MotionOptions } from '../../src/lib/motion/primitives.js';
import type { ResolvedClip } from '../../src/lib/motion/resolve.js';
import { clipEnergy } from '../../src/lib/motion/energy.js';
import MotionBlock from './fixtures/MotionBlock.svelte';

const FPS = 30;

function resolved(props: Record<string, unknown> = {}): ResolvedClip {
	const cue = (start: number, end = start + 0.4) => ({
		start,
		end,
		frame: Math.round(start * FPS),
		words: []
	});
	return {
		id: 'm',
		block: 'blocks/M.svelte',
		fps: FPS,
		size: [1080, 1920],
		start: 0,
		end: 4,
		startFrame: 0,
		frames: 4 * FPS,
		duration: 4,
		cues: { hit: cue(0.5), list: cue(1), stat: cue(1.5) },
		words: {},
		props,
		alpha: false,
		background: null,
		audio: null
	};
}

/** A clip root on the page with one element, the way the stage mounts a block. */
function stage(html: string, props: Record<string, unknown> = {}) {
	const root = document.createElement('div');
	root.className = 'vf-clip';
	root.innerHTML = html;
	document.body.appendChild(root);
	const c: ClipController = {
		clip: new Clip(resolved(props)),
		root,
		timelines: [],
		frameFns: [],
		ready: []
	};
	registerClipRoot(c);
	// What the stage does for each frame: set time, run frame callbacks.
	const seek = (t: number) => {
		c.clip.t = t;
		c.clip.frame = Math.round(t * FPS);
		for (const fn of c.frameFns) fn({ t, frame: c.clip.frame, clip: c.clip });
	};
	return { root, clip: c.clip, controller: c, seek, el: root.firstElementChild as HTMLElement };
}

/** Every inline style (in a stable order) and the text in the clip root: what the frame shows. */
const snapshot = (root: Element) =>
	[root, ...root.querySelectorAll('*')]
		.map((el) => {
			const style = (el as HTMLElement).style;
			const decls = Array.from(style, (p) => `${p}: ${style.getPropertyValue(p)}`).sort();
			return `${el.tagName}[${decls.join('; ')}]`;
		})
		.join('|') + `|${root.textContent}`;

const CASES: [string, string, MotionOptions][] = [
	[
		'pop, pulse, shake, fade out',
		'<h1>Hello</h1>',
		{
			enter: 'pop',
			at: 'hit',
			exit: 'fade',
			until: 'end-0.2',
			emphasis: ['pulse', { move: 'shake', at: 'stat' }]
		}
	],
	[
		'words rise with stagger, slide out',
		'<p>one <em>two</em> three four</p>',
		{ enter: 'rise', split: 'words', at: 'list', exit: 'slide', direction: 'right' }
	],
	['lines reveal', '<p>a line of text</p>', { enter: 'reveal', split: 'lines', exit: 'reveal' }],
	['chars spring', '<p>Spring!</p>', { enter: 'spring', split: 'chars', energy: 'punchy' }],
	['typewriter', '<p>typed out</p>', { enter: 'typewriter', at: 'hit', exit: 'typewriter' }],
	['blur-in, drop out', '<b>Focus</b>', { enter: 'blur-in', exit: 'drop', energy: 'calm' }],
	['scale, wiggle, glow', '<i>Look</i>', { enter: 'scale', emphasis: ['wiggle', 'glow'] }],
	[
		'highlight, underline, strike',
		'<span>marked</span>',
		{ emphasis: ['highlight', { move: 'underline', at: 'list' }, { move: 'strike', at: 'stat' }] }
	],
	[
		'marks that start late',
		'<span>marked</span>',
		{
			emphasis: [
				{ move: 'highlight', at: 'stat' },
				{ move: 'underline', at: 'list' },
				{ move: 'strike', at: 'end-0.5' }
			]
		}
	],
	['punch', '<span>Hit</span>', { emphasis: 'punch', at: 'hit', intensity: 1.5 }],
	[
		'draw and erase',
		'<svg><path d="M0 0 L100 100"/><circle cx="5" cy="5" r="4"/></svg>',
		{ enter: 'draw', at: 'hit', exit: 'draw' }
	],
	['count', '<span>0</span>', { count: { to: 12400 }, at: 'stat', enter: 'pop' }]
];

const times = [0, 0.4, 0.5, 0.52, 0.6, 0.9, 1, 1.13, 1.5, 1.6, 2.2, 3.1, 3.5, 3.7, 3.9, 4];

describe('use:motion determinism', () => {
	for (const [name, html, options] of CASES) {
		it(`${name}: the same frame in any seek order`, () => {
			// Ground truth: a fresh mount per frame, like `visualfries still`.
			const fresh = times.map((t) => {
				const s = stage(html);
				motion(s.el, options);
				s.seek(t);
				const snap = snapshot(s.root);
				s.root.remove();
				return snap;
			});
			const visit = (order: number[]) => {
				const s = stage(html);
				motion(s.el, options);
				const out = new Map<number, string>();
				for (const t of order) {
					s.seek(t);
					out.set(t, snapshot(s.root));
				}
				s.root.remove();
				return times.map((t) => out.get(t));
			};
			expect(visit(times)).toEqual(fresh);
			expect(visit([...times].reverse())).toEqual(fresh);
			const scrambled = [...times].sort((a, b) => ((a * 7919) % 1) - ((b * 7919) % 1));
			expect(visit([...scrambled, 0.6, 0, 3.5, 1])).toEqual(fresh);
			// Something visibly changes over the clip.
			expect(new Set(fresh).size).toBeGreaterThan(1);
		});
	}

	it('applies the first start state on mount, before any seek', () => {
		const s = stage('<h1>Hello</h1>');
		motion(s.el, { enter: 'pop', at: 'hit' });
		expect(s.el.style.opacity).toBe('0');
		const words = stage('<p>one two</p>');
		motion(words.el, { enter: 'fade', split: 'words' });
		const spans = words.el.querySelectorAll<HTMLElement>('.vf-word');
		expect([...spans].map((w) => w.style.opacity)).toEqual(['0', '0']);
	});

	it('never hides with visibility except for typed characters, and settles at rest', () => {
		const s = stage('<h1>Hello</h1>');
		motion(s.el, { enter: 'blur-in', emphasis: 'pulse' });
		for (const t of times) {
			s.seek(t);
			expect(s.el.style.visibility).toBe('');
		}
		s.seek(2);
		expect(s.el.style.transform).toBe('');
		expect(s.el.style.opacity).toBe('');
		expect(s.el.style.filter).toBe('');
	});

	it('keeps room for italic overhang in masks', () => {
		const s = stage('<em>some</em>');
		motion(s.el, { enter: 'reveal', at: 'hit' });
		s.seek(0.6);
		expect(s.el.style.clipPath).toContain('0.35em');
		s.seek(3);
		expect(s.el.style.clipPath).toBe('');
	});

	it('keeps the block’s own inline transform and opacity under the motion', () => {
		const s = stage('<div style="transform: rotate(-3deg); opacity: 0.5">card</div>');
		motion(s.el, { enter: 'slide', at: 'hit' });
		s.seek(0.55);
		expect(s.el.style.transform).toMatch(/^rotate\(-3deg\) translate\(/);
		s.seek(3);
		expect(s.el.style.transform).toBe('rotate(-3deg)');
		expect(s.el.style.opacity).toBe('0.5');
	});

	it('clears late marks when seeking back before them', () => {
		const s = stage('<span>marked</span>');
		motion(s.el, { emphasis: [{ move: 'highlight', at: 'stat' }, 'underline'], at: 'list' });
		s.seek(3);
		expect(s.el.style.backgroundImage).toContain('linear-gradient');
		s.seek(0.2);
		for (const p of [
			'background-image',
			'background-size',
			'background-position',
			'background-repeat',
			'box-decoration-break',
			'-webkit-box-decoration-break'
		])
			expect(s.el.style.getPropertyValue(p)).toBe('');
		s.seek(1.2);
		expect(s.el.style.backgroundImage.match(/linear-gradient/g)).toHaveLength(1);
		s.seek(3);
		expect(s.el.style.backgroundImage.match(/linear-gradient/g)).toHaveLength(2);
	});

	it('returns to the block’s own background when no mark is drawn', () => {
		const s = stage('<span style="background-image: linear-gradient(red, red)">x</span>');
		motion(s.el, { emphasis: 'highlight', at: 'stat' });
		s.seek(3);
		expect(s.el.style.backgroundImage).not.toContain('red');
		s.seek(0.2);
		expect(s.el.style.backgroundImage).toBe('linear-gradient(red, red)');
		expect(s.el.style.backgroundRepeat).toBe('');
	});

	it('restores the element when removed', () => {
		const html = '<p>one <em>two</em> three</p>';
		const s = stage(html);
		const action = motion(s.el, { enter: 'rise', split: 'chars', emphasis: 'highlight' });
		s.seek(0.3);
		expect(s.root.innerHTML).not.toBe(html);
		action?.destroy?.();
		expect(s.root.innerHTML).toBe(html);
		expect(s.controller.frameFns).toHaveLength(0);
		expect(s.clip.events()).toEqual([]);
	});
});

describe('use:motion action', () => {
	it('does not undo the old setup twice when an update fails', () => {
		const html = '<p>one <em>two</em> three</p>';
		const s = stage(html);
		const action = motion(s.el, { enter: 'rise', split: 'words' })!;
		expect(() => action.update!({ enter: 'zoom' as never, split: 'words' })).toThrow(
			/unknown entrance "zoom"/
		);
		expect(s.root.innerHTML).toBe(html);
		expect(() => action.destroy!()).not.toThrow();
		expect(s.root.innerHTML).toBe(html);
		expect(s.controller.frameFns).toHaveLength(0);
	});
});

describe('use:motion text splitting', () => {
	const split = (html: string, mode: 'words' | 'chars' = 'words') => {
		const s = stage(html);
		const action = motion(s.el, { enter: 'rise', split: mode })!;
		return { ...s, action };
	};
	const words = (el: Element) => [...el.querySelectorAll('.vf-word')].map((w) => w.textContent);

	it('keeps no-break spaces inside their word', () => {
		const s = split('<p>10&nbsp;km away</p>');
		expect(words(s.el)).toEqual(['10\u00a0km', 'away']);
		const c = split('<p>10&nbsp;km</p>', 'chars');
		expect(c.el.querySelectorAll('.vf-word')).toHaveLength(1);
		expect(c.el.querySelectorAll('.vf-char')).toHaveLength(5);
	});

	it('keeps a word split by inline markup on one line', () => {
		const html = '<p>say foo<em>bar</em>baz now</p>';
		const s = split(html);
		const glue = s.el.querySelectorAll<HTMLElement>('.vf-nowrap');
		expect(glue).toHaveLength(1);
		expect(glue[0].style.whiteSpace).toBe('nowrap');
		expect(words(glue[0])).toEqual(['foo', 'bar', 'baz']);
		expect(words(s.el)).toEqual(['say', 'foo', 'bar', 'baz', 'now']);
		s.action.destroy!();
		expect(s.root.innerHTML).toBe(html);
	});

	it('does not glue across spaces, breaks or markup holding a space', () => {
		for (const html of [
			'<p>foo <em>bar</em></p>',
			'<p>foo<br>bar</p>',
			'<p>fo<em>o b</em>ar</p>',
			'<p>foo<span style="display: block">bar</span></p>'
		]) {
			const s = split(html);
			expect(s.el.querySelector('.vf-nowrap'), html).toBeNull();
			s.action.destroy!();
			expect(s.root.innerHTML).toBe(html);
		}
	});

	it('gives screen readers the text once', () => {
		const s = split('<p>one <em>two</em>\n three</p>', 'chars');
		expect(s.el.getAttribute('aria-label')).toBe('one two three');
		const pieces = [...s.el.querySelectorAll('.vf-word')];
		expect(pieces.every((w) => w.getAttribute('aria-hidden') === 'true')).toBe(true);
		s.action.destroy!();
		expect(s.el.hasAttribute('aria-label')).toBe(false);
		const own = split('<p aria-label="Own">one two</p>');
		expect(own.el.getAttribute('aria-label')).toBe('Own');
		own.action.destroy!();
		expect(own.el.getAttribute('aria-label')).toBe('Own');
	});
});

describe('use:motion events', () => {
	it('emits one event per stagger item at its visual moment', () => {
		const s = stage('<p>one two three</p>');
		motion(s.el, { enter: 'pop', split: 'words', at: 'list', exit: 'fade' });
		const row = ENERGY.balanced;
		const pops = s.clip.events().filter((e) => e.phase === 'enter');
		expect(pops.map((e) => e.name)).toEqual(['pop', 'pop', 'pop']);
		expect(pops.map((e) => e.item)).toEqual([0, 1, 2]);
		pops.forEach((e, i) =>
			expect(e.t).toBeCloseTo(1 + i * row.stagger.words + row.duration * 0.35, 6)
		);
		const exits = s.clip.events().filter((e) => e.phase === 'exit');
		expect(exits).toHaveLength(3);
		expect(exits.every((e) => e.name === 'exit' && e.t <= 4)).toBe(true);
	});

	it('names events by what happens: slam on landing, whoosh, type, draw, tick', () => {
		const names = (html: string, o: MotionOptions) => {
			const s = stage(html);
			motion(s.el, o);
			return s.clip.events();
		};
		const slam = names('<b>DROP</b>', { enter: 'drop', at: 'hit' });
		expect(slam).toMatchObject([{ name: 'slam', move: 'drop', phase: 'enter' }]);
		expect(slam[0].t).toBeCloseTo(0.5 + ENERGY.balanced.duration, 6);
		expect(names('<b>go</b>', { enter: 'slide' })[0].name).toBe('whoosh');
		expect(names('<b>abc</b>', { enter: 'typewriter' }).map((e) => e.name)).toEqual([
			'type',
			'type',
			'type'
		]);
		expect(
			names('<svg><path d="M0 0 L9 9"/><line x1="0" y1="0" x2="5" y2="5"/></svg>', {
				enter: 'draw'
			}).map((e) => e.name)
		).toEqual(['draw', 'draw']);
		expect(names('<b>x</b>', { emphasis: 'punch', at: 'hit' })[0]).toMatchObject({
			name: 'slam',
			phase: 'emphasis'
		});
		const ticks = names('<b>0</b>', { count: 10, at: 'stat' });
		expect(ticks.length).toBe(10);
		expect(ticks.every((e) => e.name === 'tick' && e.t > 1.5)).toBe(true);
		expect(ticks.every((e) => Number.isInteger(e.frame))).toBe(true);
	});

	it('is a time-ordered list that custom code can add to', () => {
		const s = stage('<b>x</b>');
		motion(s.el, { enter: 'pop', at: 'stat' });
		const remove = s.clip.event('riser', 'hit', { intensity: 0.5 });
		expect(s.clip.events().map((e) => e.name)).toEqual(['riser', 'pop']);
		expect(s.clip.events()[0]).toMatchObject({ t: 0.5, frame: 15, intensity: 0.5 });
		remove();
		expect(s.clip.events().map((e) => e.name)).toEqual(['pop']);
	});
});

describe('motion energy', () => {
	const plan = (energy: string | undefined, o: MotionOptions = { enter: 'pop' }) => {
		const clip = new Clip(resolved(energy ? { energy } : {}));
		return planMotion(clip, o, 1);
	};

	it('reads the clip’s energy and scales durations and amplitudes', () => {
		expect(plan(undefined).energy).toBe('balanced');
		const calm = plan('calm');
		const punchy = plan('punchy');
		expect(calm.enter!.duration).toBeGreaterThan(punchy.enter!.duration);
		expect(punchy.amount).toBeGreaterThan(calm.amount);
		expect(plan('calm', { enter: 'pop', energy: 'punchy' }).energy).toBe('punchy');
		expect(plan(undefined, { enter: 'pop', intensity: 2 }).amount).toBe(2);
	});

	it('leaves other values of props.energy to the block', () => {
		expect(new Clip(resolved({ energy: 0.8 })).energy).toBe('balanced');
		expect(new Clip(resolved({ energy: 'loud' })).energy).toBe('balanced');
		expect(new Clip(resolved({ energy: 'punchy' })).energy).toBe('punchy');
		expect(clipEnergy({ props: { energy: 'calm' } })).toBe('calm');
		expect(clipEnergy({})).toBe('balanced');
	});

	it('rejects unknown names instead of guessing', () => {
		expect(() => plan(undefined, { enter: 'pop', energy: 'loud' as never })).toThrow(
			/unknown energy "loud"/
		);
		expect(() => plan(undefined, { enter: 'zoom' as never })).toThrow(/unknown entrance "zoom"/);
		expect(() => plan(undefined, { emphasis: 'bounce' as never })).toThrow(
			/unknown emphasis "bounce"/
		);
		expect(() => plan(undefined, { enter: 'pop', at: 'nope' })).toThrow(/unknown moment "nope"/);
	});
});

describe('use:motion in a Svelte block', () => {
	it('finds its clip through the block root and follows clip time', () => {
		const s = stage('');
		const instance = mount(MotionBlock, { target: s.root });
		flushSync();
		const h1 = s.root.querySelector('h1')!;
		expect(h1.style.opacity).toBe('0');
		expect(s.root.querySelectorAll('.vf-word')).toHaveLength(3);
		s.seek(1.5);
		expect(h1.style.opacity).toBe('');
		expect(s.clip.events().map((e) => e.name)).toContain('pop');
		unmount(instance);
		expect(s.clip.events()).toEqual([]);
	});

	it('explains where it can be used', () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		expect(() => motion(el, { enter: 'pop' })).toThrow(/inside a VisualFries motion block/);
	});
});
