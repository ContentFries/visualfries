import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveProgram, type ProgramInputs, type ProgramTransition } from '$lib/motion/program.js';
import { footageMap, transitionSidesAt } from '$lib/motion/footage-map.js';
import { clipShowRange } from '$lib/motion/segments.js';
import {
	frameAtProgress,
	screenDirection,
	TRANSITION_MODULES,
	transitionEvents,
	transitionProgress,
	wipeBarAt,
	wipeBox
} from '$lib/motion/transitions/index.js';
import { createTransitionPlayer } from '$lib/motion/transitions/player.js';

const DIR = path.join(__dirname, 'fixtures/program');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1920,
	height: 1080,
	fps: 30,
	audio: true
});
const inputs: ProgramInputs = {
	words: null,
	transcripts: { talk: parseTranscriptWords(read('take1.transcript.json')) },
	sources: { talk: source(400), broll: source(90) }
};
const program = (json: unknown, format?: string) =>
	resolveProgram(parseMotionProject(json), inputs, format ? { format } : {});

const transition = (t: Partial<ProgramTransition>): ProgramTransition => ({
	id: 'x.transition',
	owner: 'x',
	kind: 'cut',
	outgoing: 'w',
	type: 'push',
	startFrame: 10,
	frames: 14,
	cutFrame: 17,
	align: 'center',
	direction: 'left',
	ease: null,
	params: {},
	sound: null,
	native: null,
	held: { out: 0, in: 0 },
	...t
});

describe('transition progress and events', () => {
	it('runs strictly inside 0–1 over the window, rising every frame', () => {
		const t = transition({});
		const ps = [...Array(t.frames).keys()].map((k) => transitionProgress(t, t.startFrame + k));
		expect(ps[0]).toBeCloseTo(1 / 15, 12);
		expect(ps[ps.length - 1]).toBeCloseTo(14 / 15, 12);
		for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThan(ps[i - 1]);
		// The frames just outside are the plain sides.
		expect(transitionProgress(t, t.startFrame - 1)).toBe(0);
		expect(transitionProgress(t, t.startFrame + t.frames)).toBe(1);
	});

	it('puts a halfway event on the cut of a centred window, odd or even', () => {
		for (const frames of [12, 13, 14, 15]) {
			const t = transition({ frames, cutFrame: 10 + Math.floor(frames / 2) });
			expect(frameAtProgress(t, 0.5), `${frames} frames`).toBe(t.cutFrame);
			expect(transitionEvents(t)).toEqual([{ kind: 'transition', frame: t.cutFrame }]);
		}
		// A transition not drawn yet (a custom file) keeps one event on its cut.
		expect(
			transitionEvents(transition({ type: 'transitions/Fancy.svelte', cutFrame: 11 }))
		).toEqual([{ kind: 'transition', frame: 11 }]);
		// Events stay inside the window.
		const t = transition({});
		expect(frameAtProgress(t, 0)).toBe(t.startFrame);
		expect(frameAtProgress(t, 1)).toBe(t.startFrame + t.frames - 1);
	});

	it('maps forward and back per format class and keeps screen directions', () => {
		expect(screenDirection(null, 'landscape')).toBe('left');
		expect(screenDirection('forward', 'square')).toBe('left');
		expect(screenDirection('back', 'landscape')).toBe('right');
		expect(screenDirection('forward', 'portrait')).toBe('up');
		expect(screenDirection('back', 'portrait')).toBe('down');
		expect(screenDirection('right', 'portrait')).toBe('right');
	});

	it('sweeps the wipe bars in, covers the frame halfway and sweeps them out in reverse', () => {
		expect([0, 1, 2].map((i) => wipeBarAt(i, 3, 0))).toEqual([-130, -130, -130]);
		expect([0, 1, 2].map((i) => wipeBarAt(i, 3, 0.4999))).toEqual([0, 0, expect.any(Number)]);
		expect([0, 1, 2].map((i) => wipeBarAt(i, 3, 0.5))).toEqual([0, 0, 0]);
		expect([0, 1, 2].map((i) => wipeBarAt(i, 3, 1))).toEqual([130, 130, 130]);
		// The last bar in (on top) leaves first.
		expect(wipeBarAt(2, 3, 0.6)).toBeGreaterThan(wipeBarAt(0, 3, 0.6));
	});
});

describe('transitions in the resolved program', () => {
	const json = () => {
		const j = read('handles.vf.json');
		j.cuts[1].transition = 'push';
		j.shots[1].transition = 'wipe';
		return j;
	};

	it('takes duration, ease and direction from the module, per format class', () => {
		const land = program(json());
		const push = land.transitions.find((t) => t.owner === 'broll')!;
		const wipe = land.transitions.find((t) => t.owner === 'whip')!;
		// 0.55 s and 0.8 s at 30 fps.
		expect(push).toMatchObject({ frames: 17, direction: 'left', ease: 'expo.inOut' });
		expect(wipe).toMatchObject({ frames: 24, direction: 'left', ease: 'none' });
		const tall = program(json(), '1080x1920');
		expect(tall.transitions.find((t) => t.owner === 'broll')!.direction).toBe('up');
		const back = json();
		back.cuts[1].transition = { type: 'push', direction: 'back', ease: 'power3.inOut' };
		expect(program(back, '1080x1920').transitions[0]).toMatchObject({
			direction: 'down',
			ease: 'power3.inOut'
		});
		// Every built-in is drawn: the card takes its module's direction and ease.
		const card = land.transitions.find((t) => t.type === 'card')!;
		expect(card).toMatchObject({ direction: 'left', ease: 'none', frames: 9 });
		expect(land.diagnostics.filter((d) => d.item === 'cut5')).toEqual([]);
		// A transition not drawn yet keeps what was written and says it cuts.
		const custom = json();
		custom.cuts[4].transition = { type: 'transitions/Fancy.svelte', align: 'end', duration: 0.3 };
		const fancy = program(custom).transitions.find((t) => t.owner === 'cut5')!;
		expect(fancy).toMatchObject({ direction: null, ease: null, frames: 9 });
		expect(program(custom).diagnostics).toContainEqual({
			level: 'warning',
			item: 'cut5',
			field: 'cuts[4].transition',
			message:
				'Custom transition files are not drawn yet; "transitions/Fancy.svelte" cuts on the cut.'
		});
	});

	it('emits the transition events of the modules', () => {
		const p = program(json());
		const events = p.events.filter((e) => e.kind === 'transition');
		// Every built-in's event is halfway: on the cut of a centred window.
		for (const t of p.transitions) {
			const frame = events.find((e) => e.owner === t.id)!.frame;
			expect(frame, t.id).toBe(frameAtProgress(t, 0.5));
			if (t.align === 'center') expect(frame, t.id).toBe(t.cutFrame);
		}
	});

	it('rejects unknown eases and params', () => {
		const bad = json();
		bad.cuts[1].transition = { type: 'push', ease: 'bouncy', params: { blurr: 3 } };
		bad.shots[1].transition = { type: 'wipe', params: { colors: 'red' } };
		const errors = program(bad).diagnostics.filter((d) => d.level === 'error');
		expect(errors.map((d) => [d.item, d.field, d.message])).toEqual([
			['broll', 'cuts[1].transition.params', 'Unknown param "blurr". Known: blur.'],
			[
				'broll',
				'cuts[1].transition.ease',
				'Unknown ease "bouncy". Use a GSAP ease such as "expo.inOut", "power3.out" or "none".'
			],
			['whip', 'shots[1].transition.params', '"colors" must be a list of CSS colours (got "red").']
		]);
	});

	it('warns about a push on a clip behind the subject or in a slot', () => {
		const json = read('retake.vf.json');
		json.clips[1].transition = 'push';
		const slotted = program(json).diagnostics.filter((d) => d.item === 'codec');
		expect(slotted).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				field: 'transition',
				message: expect.stringMatching(/^A push on a slotted clip .* "panel" slot/)
			})
		);
		const handles = read('handles.vf.json');
		handles.clips[0].transition = 'push';
		expect(program(handles).diagnostics).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				item: 'price',
				message: expect.stringMatching(/^A push on a clip behind the subject/)
			})
		);
	});

	it('holds no clip for a transition that is not drawn', () => {
		const clip = { id: 'c', startFrame: 20, frames: 10 };
		const fancy = transition({
			type: 'transitions/Fancy.svelte',
			startFrame: 16,
			frames: 8,
			cutFrame: 20
		});
		expect(clipShowRange(clip, [fancy])).toEqual({ from: 20, until: 30 });
		expect(clipShowRange(clip, [{ ...fancy, type: 'push' }])).toEqual({ from: 16, until: 30 });
	});

	it('gives each side its footage through the window, holding edge frames', () => {
		const p = program(json());
		const map = footageMap(p);
		const push = p.transitions.find((t) => t.owner === 'broll')!;
		const [cut1, broll] = p.cuts;
		for (let f = push.startFrame; f < push.startFrame + push.frames; f++) {
			const sides = transitionSidesAt(map, push, f)!;
			expect(sides.out).toMatchObject({ source: 'talk', frame: cut1.srcIn + f - cut1.startFrame });
			const wanted = broll.srcIn + f - broll.startFrame;
			expect(sides.in).toMatchObject({
				source: 'broll',
				frame: Math.max(0, wanted),
				held: wanted < 0
			});
		}
		// The held frames are the ones `check` reports.
		const held = [...Array(push.frames).keys()].filter(
			(k) => transitionSidesAt(map, push, push.startFrame + k)!.in!.held
		);
		expect(held.length).toBe(push.held.in);
		// A shot transition: both sides show the cut list under the shots.
		const wipe = p.transitions.find((t) => t.owner === 'whip')!;
		const sides = transitionSidesAt(map, wipe, wipe.startFrame)!;
		expect(sides.out).toEqual(sides.in);
	});
});

describe('transition modules on the DOM', () => {
	const size: [number, number] = [640, 360];

	function stage() {
		const root = document.createElement('div');
		const els = ['a', 'b', 'clipA', 'clipB'].map((name) => {
			const el = document.createElement('div');
			el.dataset.name = name;
			root.appendChild(el);
			return el;
		});
		const layer = document.createElement('div');
		root.appendChild(layer);
		return { root, els, layer };
	}

	for (const [name, module] of Object.entries(TRANSITION_MODULES))
		for (const kind of ['cut', 'clip'] as const)
			it(`${name} (${kind}): applies from progress alone and releases every style it set`, () => {
				const { els, layer } = stage();
				const t = transition({ type: name, kind, direction: 'up', ease: module.ease });
				const player = createTransitionPlayer(layer, [t], { size, cls: 'landscape' });
				const sides = () => ({ out: [els[0], els[2]], in: [els[1], els[3]] });
				const styleAt = (f: number) => {
					player.seek(f, sides);
					return [...els, ...layer.querySelectorAll<HTMLElement>('*')].map(
						(el) => el.getAttribute('style') ?? ''
					);
				};
				const frames = [...Array(t.frames).keys()].map((k) => t.startFrame + k);
				const forward = frames.map(styleAt);
				// Backward and jumping around: the same styles at the same frames.
				expect([...frames].reverse().map(styleAt).reverse()).toEqual(forward);
				expect(
					frames.map((f, i) => (i % 2 ? styleAt(f) : styleAt(frames[frames.length - 1 - i])))
				).toEqual(frames.map((f, i) => forward[i % 2 ? i : frames.length - 1 - i]));
				// Something moves inside the window.
				expect(new Set(forward.map((s) => JSON.stringify(s))).size).toBeGreaterThan(3);
				// Outside it nothing is left on the sides and the overlay is hidden.
				for (const f of [t.startFrame - 1, t.startFrame + t.frames]) {
					player.seek(f, sides);
					for (const el of els)
						expect(el.getAttribute('style') ?? '', `${name} frame ${f}`).toBe('');
					expect((layer.firstElementChild as HTMLElement).style.display).toBe('none');
				}
			});

	it('push moves both sides together by the eased travel', () => {
		const { els, layer } = stage();
		const t = transition({ direction: 'left', ease: 'none', params: { blur: 0 } });
		const player = createTransitionPlayer(layer, [t], { size, cls: 'landscape' });
		player.seek(t.startFrame + 2, () => ({ out: [els[0]], in: [els[1]] }));
		// p = 3/15: the outgoing side 128 px to the left, the incoming 512 px to its right.
		expect(els[0].style.transform).toBe('translate(-128px, 0px)');
		expect(els[1].style.transform).toBe('translate(512px, 0px)');
		expect(els[0].style.filter).toBe('');
	});

	it('wipe bars overhang the slant in every format, across the travel too', () => {
		const slant = (cross: number) => Math.tan((12 * Math.PI) / 180) * 0.6 * cross;
		const overhang = (box: string) => -Number(/(?:left|top):(-?[\d.]+)px/.exec(box)![1]);
		// Along the long side the old 15 % is enough; across it the slant needs more.
		expect(wipeBox([1920, 1080], true)).toBe('top:-10%;height:120%;left:-288px;width:2496px');
		for (const [size, across] of [
			[[1080, 1920], true],
			[[1920, 1080], false],
			[[1080, 1080], true],
			[[1080, 1920], false]
		] as [[number, number], boolean][]) {
			const cross = across ? size[1] : size[0];
			expect(overhang(wipeBox(size, across)), `${size} ${across}`).toBeGreaterThanOrEqual(
				slant(cross)
			);
		}
	});

	it('wipe sets bar colours as colour values, never as more CSS or an image', () => {
		const bars = (colors: unknown) => {
			const { layer } = stage();
			const t = transition({ type: 'wipe', params: { colors } });
			createTransitionPlayer(layer, [t], { size, cls: 'landscape' });
			return [...layer.firstElementChild!.children] as HTMLElement[];
		};
		const good = bars(['red', '#00ff00']);
		expect(good[1].style.backgroundColor).toMatch(/^(#00ff00|rgb\(0, 255, 0\))$/);
		expect(good[1].style.backgroundImage).toBe('');
		// A list with more CSS or an image in it is rejected: the brand's bars instead.
		for (const bad of [['red; display: none', '#00ff00'], ['url(https://example.com/x.png)']]) {
			const list = bars(bad);
			expect(list).toHaveLength(3);
			for (const bar of list) expect(bar.getAttribute('style')).not.toMatch(/url|display/);
		}
		expect(TRANSITION_MODULES.wipe.check!({ colors: ['url(x.png)'] })).toEqual([
			'"colors" must be a list of CSS colours (got ["url(x.png)"]).'
		]);
	});

	it('push blurs a solid side inside its box and keeps its edge opaque', () => {
		const { els, layer } = stage();
		els[0].dataset.solid = '';
		const t = transition({ ease: 'none' });
		const player = createTransitionPlayer(layer, [t], { size, cls: 'landscape' });
		const solid = layer.querySelector<SVGFilterElement>('filter[id$="-solid"]')!;
		expect(['x', 'y', 'width', 'height'].map((a) => solid.getAttribute(a))).toEqual([
			'0',
			'0',
			'100%',
			'100%'
		]);
		expect(solid.querySelector('feFuncA')!.getAttribute('tableValues')).toBe('0 1');
		player.seek(t.cutFrame, () => ({ out: [els[0]], in: [els[2]] }));
		expect(els[0].style.filter).toContain(`#${solid.id}`);

		expect(els[2].style.filter).toMatch(/-blur\b/);
	});

	it('wipe hides the incoming side until halfway, then the outgoing one', () => {
		const { els, layer } = stage();
		const t = transition({ type: 'wipe', ease: 'none' });
		const player = createTransitionPlayer(layer, [t], { size, cls: 'landscape' });
		const at = (f: number) => {
			player.seek(f, () => ({ out: [els[0]], in: [els[1]] }));
			return [els[0].style.visibility, els[1].style.visibility];
		};
		expect(at(t.startFrame)).toEqual(['', 'hidden']);
		expect(at(t.cutFrame)).toEqual(['hidden', '']);
		expect(at(t.startFrame + t.frames - 1)).toEqual(['hidden', '']);
		expect(at(t.startFrame + t.frames)).toEqual(['', '']);
	});
});
