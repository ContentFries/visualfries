import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram, type ProgramInputs, type ProgramTransition } from '$lib/motion/program.js';
import {
	blindsCount,
	blindsSlatAt,
	cardOutline,
	cardPose,
	shapeAt,
	shapePath,
	transitionEvents,
	transitionHandles,
	TRANSITION_MODULES
} from '$lib/motion/transitions/index.js';
import { createTransitionPlayer } from '$lib/motion/transitions/player.js';
import { zoomMask } from '$lib/motion/transitions/zoom-through.js';

/**
 * Zoom-through, shape mask, blinds and card: their numbers (pure), their handles and checks in
 * the resolved program, and what they set on the DOM. The stage side is in
 * `transitions-more-stage.test.ts`.
 */

const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1920,
	height: 1080,
	fps: 30,
	audio: true
});
const inputs: ProgramInputs = { words: null, transcripts: {}, sources: { a: source(180) } };

/** Cut 1 ends where the source ends, cut 2 starts at its first frame: no handle either side. */
function noHandles(transition: unknown, format?: string) {
	const json = {
		size: [1920, 1080],
		fps: 30,
		footage: { a: { src: 'a.mp4' } },
		cuts: [
			{ id: 'one', source: 'a', in: 4, out: 6 },
			{ id: 'two', source: 'a', in: 0, out: 2, transition }
		]
	};
	return resolveProgram(parseMotionProject(json), inputs, format ? { format } : {});
}

const transition = (t: Partial<ProgramTransition>): ProgramTransition => ({
	id: 'x.transition',
	owner: 'x',
	kind: 'cut',
	outgoing: 'w',
	type: 'zoom-through',
	startFrame: 10,
	frames: 18,
	cutFrame: 19,
	align: 'center',
	direction: null,
	ease: 'none',
	params: {},
	sound: null,
	native: null,
	held: { out: 0, in: 0 },
	...t
});

const NEW = ['zoom-through', 'shape-mask', 'blinds', 'card'];

describe('the new transitions in the resolved program', () => {
	it('take their duration, ease and direction from the module, per format class', () => {
		const got = (type: string, format?: string) => {
			const t = noHandles(type, format).transitions[0];
			return [t.frames, t.ease, t.direction];
		};
		expect(NEW.map((type) => got(type))).toEqual([
			[18, 'none', null],
			[21, 'power3.inOut', null],
			[24, 'none', 'left'],
			[27, 'none', 'left']
		]);
		expect(NEW.map((type) => got(type, '1080x1920')[2])).toEqual([null, null, 'up', 'up']);
		expect(got('blinds', '1080x1080')[2]).toBe('left');
	});

	it('need handles only for the frames each side shows', () => {
		// Zoom-through shows both sides only in its short crossfade, blinds hide the change under
		// the slats; shape mask and card show both sides through the whole window.
		const need = NEW.map((type) => transitionHandles(noHandles(type).transitions[0]));
		expect(need).toEqual([
			{ in: 1, out: 1 },
			{ in: 10, out: 11 },
			{ in: 0, out: 0 },
			{ in: 13, out: 14 }
		]);
		// Push and wipe keep the whole window.
		expect(transitionHandles(noHandles('push').transitions[0])).toEqual({ in: 8, out: 9 });
		expect(transitionHandles(noHandles('wipe').transitions[0])).toEqual({ in: 12, out: 12 });
	});

	it('report a missing handle with the numbers, and hold the edge frames', () => {
		const warnings = (type: string) =>
			noHandles(type)
				.diagnostics.filter((d) => d.level === 'warning')
				.map((d) => d.message);
		expect(warnings('zoom-through')).toEqual([
			'cut 2: zoom-through needs 0.03 s of incoming handle, 0.00 s available; the first frame holds 1 frames.',
			'cut 2: zoom-through needs 0.03 s of outgoing handle, 0.00 s available; the last frame holds 1 frames.'
		]);
		expect(warnings('shape-mask')).toEqual([
			'cut 2: shape-mask needs 0.33 s of incoming handle, 0.00 s available; the first frame holds 10 frames.',
			'cut 2: shape-mask needs 0.37 s of outgoing handle, 0.00 s available; the last frame holds 11 frames.'
		]);
		expect(warnings('blinds')).toEqual([]);
		expect(warnings('card')).toEqual([
			'cut 2: card needs 0.43 s of incoming handle, 0.00 s available; the first frame holds 13 frames.',
			'cut 2: card needs 0.47 s of outgoing handle, 0.00 s available; the last frame holds 14 frames.'
		]);
		expect(noHandles('card').transitions[0].held).toEqual({ in: 13, out: 14 });
		// With the source to spare, nothing is held and nothing is said.
		const json = {
			size: [1920, 1080],
			fps: 30,
			footage: { a: { src: 'a.mp4' } },
			cuts: [
				{ source: 'a', in: 0, out: 2 },
				{ source: 'a', in: 3, out: 5, transition: 'card' }
			]
		};
		const roomy = resolveProgram(parseMotionProject(json), inputs);
		expect(roomy.transitions[0].held).toEqual({ in: 0, out: 0 });
		expect(roomy.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
	});

	it('play their sound on the event halfway through, on the cut of a centred window', () => {
		for (const type of NEW) {
			const p = noHandles({ type, sound: 'sfx/hit.wav' });
			const t = p.transitions[0];
			expect(transitionEvents(t), type).toEqual([{ kind: 'transition', frame: t.cutFrame }]);
			expect(p.events.find((e) => e.owner === t.id)!.frame).toBe(t.cutFrame);
			expect(p.audio.sfx[0], type).toMatchObject({ owner: `${t.id}.sound`, at: t.cutFrame / 30 });
		}
	});

	it('never change the program sound', () => {
		const json = (transitions: boolean) => ({
			size: [1920, 1080],
			fps: 30,
			footage: { a: { src: 'a.mp4' } },
			cuts: [0, 1, 2, 3, 4].map((i) => ({
				source: 'a',
				in: i,
				out: i + 0.9,
				...(i && transitions ? { transition: NEW[i - 1] } : {})
			})),
			music: [{ src: 'bed.mp3' }]
		});
		const a = resolveProgram(parseMotionProject(json(true)), inputs);
		const b = resolveProgram(parseMotionProject(json(false)), inputs);
		expect(a.transitions).toHaveLength(4);
		expect(a.audio).toEqual(b.audio);
	});

	it('reject params they do not take or cannot use', () => {
		const errors = (type: string, params: Record<string, unknown>) =>
			noHandles({ type, params })
				.diagnostics.filter((d) => d.level === 'error')
				.map((d) => d.message);
		expect(errors('zoom-through', { at: 'nose', zoom: 20, flash: 2, colour: 'red' })).toEqual([
			'Unknown param "colour". Known: at, zoom, blur, flash, color.',
			'"at" must be "face", "center" or [x, y] in fractions of the frame (got "nose").',
			'"zoom" must be a number from 1.1 to 8 (got 20).',
			'"flash" must be a number from 0 to 1 (got 2).'
		]);
		expect(errors('shape-mask', { shape: 'star', at: [0.5, 2], ring: -1, color: 3 })).toEqual([
			'"shape" must be "circle" or "rect" (got "star").',
			'"at" must be "face", "center" or [x, y] in fractions of the frame (got [0.5,2]).',
			'"ring" must be a number from 0 to 80 (got -1).',
			'"color" must be a CSS colour (got 3).'
		]);
		expect(errors('zoom-through', { color: 'url(https://example.com/x.png)' })).toEqual([
			'"color" must be a CSS colour (got "url(https://example.com/x.png)").'
		]);
		expect(errors('blinds', { colors: ['#fff', 'url(x.png)'] })).toEqual([
			'"colors" must be a list of CSS colours (got ["#fff","url(x.png)"]).'
		]);
		expect(errors('blinds', { count: 1, colors: '#fff', stagger: 1 })).toEqual([
			'"count" must be a number from 2 to 40 (got 1).',
			'"stagger" must be a number from 0 to 0.9 (got 1).',
			'"colors" must be a list of CSS colours (got "#fff").'
		]);
		expect(errors('card', { side: 'both', motion: 'spin', scale: 1 })).toEqual([
			'"side" must be "in" or "out" (got "both").',
			'"motion" must be "slide" or "flip" (got "spin").',
			'"scale" must be a number from 0.2 to 0.95 (got 1).'
		]);
		for (const type of NEW) expect(errors(type, {}), type).toEqual([]);
	});
});

describe('the numbers behind the new transitions', () => {
	const size: [number, number] = [1920, 1080];
	const corners = (w: number, h: number) => [
		[0, 0],
		[w, 0],
		[0, h],
		[w, h]
	];

	it('grow the shape mask from nothing to past every corner, wherever it starts', () => {
		for (const [w, h] of [size, [1080, 1920] as [number, number], [1080, 1080] as [number, number]])
			for (const c of [
				{ x: w / 2, y: h * 0.3 },
				{ x: 0, y: 0 },
				{ x: w, y: h * 0.9 }
			]) {
				const start = shapeAt('circle', c, 0, [w, h], 12, 64);
				expect(start).toMatchObject({ kind: 'circle', r: 0 });
				const end = shapeAt('circle', c, 1, [w, h], 12, 64);
				if (end.kind !== 'circle') throw new Error('circle');
				for (const [x, y] of corners(w, h))
					expect(Math.hypot(x - c.x, y - c.y) + 12).toBeLessThanOrEqual(end.r + 1e-9);
				const rect = shapeAt('rect', c, 1, [w, h], 12, 64);
				if (rect.kind !== 'rect') throw new Error('rect');
				// Square corners at the end, reaching past every frame edge by the margin.
				expect(rect.r).toBe(0);
				expect(c.x - rect.hw).toBeLessThanOrEqual(-12);
				expect(c.x + rect.hw).toBeGreaterThanOrEqual(w + 12);
				expect(c.y - rect.hh).toBeLessThanOrEqual(-12);
				expect(c.y + rect.hh).toBeGreaterThanOrEqual(h + 12);
			}
		expect(shapePath({ kind: 'circle', c: { x: 100, y: 50 }, r: 10 })).toBe(
			'M90 50A10 10 0 1 0 110 50A10 10 0 1 0 90 50Z'
		);
		// In an element's own box (a slot at 40, 20).
		expect(shapePath({ kind: 'circle', c: { x: 100, y: 50 }, r: 10 }, { x: 40, y: 20 })).toBe(
			'M50 30A10 10 0 1 0 70 30A10 10 0 1 0 50 30Z'
		);
	});

	it('close every slat by halfway and open them again by the end, in travel order', () => {
		for (const n of [2, 6, 8]) {
			const at = (e: number) => [...Array(n).keys()].map((j) => blindsSlatAt(j, n, e).cover);
			expect(at(0)).toEqual(Array(n).fill(0));
			expect(at(0.5)).toEqual(Array(n).fill(1));
			// Closed a little before halfway and until a little after: the frames either side of
			// the change are covered whole.
			expect(at(0.445)).toEqual(Array(n).fill(1));
			expect(at(0.555)).toEqual(Array(n).fill(1));
			expect(at(0.43).some((c) => c < 1)).toBe(true);
			expect(at(0.57).some((c) => c < 1)).toBe(true);
			expect(at(1)).toEqual(Array(n).fill(0));
			// Halfway in, the first slat is further along than the last.
			const quarter = at(0.3);
			for (let j = 1; j < n; j++) expect(quarter[j]).toBeLessThanOrEqual(quarter[j - 1]);
			expect(quarter[0]).toBeGreaterThan(quarter[n - 1]);
		}
		expect(blindsSlatAt(0, 8, 0.2).from).toBe('start');
		expect(blindsSlatAt(0, 8, 0.7).from).toBe('end');
		expect(['landscape', 'square', 'portrait'].map((cls) => blindsCount({}, cls as never))).toEqual(
			[8, 6, 7]
		);
		expect(blindsCount({ count: 12 }, 'portrait')).toBe(12);
	});

	it('bring the card from off the frame to its middle, then to the full frame', () => {
		for (const [size, direction] of [
			[[1920, 1080], 'left'],
			[[1920, 1080], 'right'],
			[[1080, 1920], 'up'],
			[[1080, 1920], 'down']
		] as const) {
			const o = {
				motion: 'slide' as const,
				direction,
				size: [...size] as [number, number],
				scale: 0.62,
				radius: 44
			};
			const box = (e: number) => {
				const xs = cardOutline(cardPose(e, o), direction, o.size, 1).map(([x]) => x);
				const ys = cardOutline(cardPose(e, o), direction, o.size, 1).map(([, y]) => y);
				return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
			};
			const [w, h] = size;
			// Off the frame, on the side the travel comes from.
			const [x0, y0, x1, y1] = box(0);
			expect(x1 <= 0 || x0 >= w || y1 <= 0 || y0 >= h, `${direction} away`).toBe(true);
			if (direction === 'left') expect(x0).toBeGreaterThanOrEqual(w);
			if (direction === 'up') expect(y0).toBeGreaterThanOrEqual(h);
			// Landed: centred at its size.
			expect(cardPose(0.5, o)).toMatchObject({ x: 0, y: 0, scale: 0.62, radius: 44, lift: 1 });
			// Full frame, square corners, no shadow.
			expect(cardPose(1, o)).toMatchObject({ x: 0, y: 0, scale: 1, radius: 0, lift: 0 });
			expect(box(1)).toEqual([0, 0, w, h]);
		}
		// Flip: edge on at the start, a trapezoid on the way (the far edge shorter), square at 1.
		const flip = {
			motion: 'flip' as const,
			direction: 'left' as const,
			size: [1920, 1080] as [number, number],
			scale: 0.62,
			radius: 44
		};
		expect(cardPose(0, flip).turn).toBe(-90);
		const turning = cardOutline({ ...cardPose(0.2, flip) }, 'left', [1920, 1080], 1);
		const left = turning.filter(([x]) => x < 960).map(([, y]) => y);
		const right = turning.filter(([x]) => x > 960).map(([, y]) => y);
		const span = (ys: number[]) => Math.max(...ys) - Math.min(...ys);
		expect(span(left)).not.toBeCloseTo(span(right), 0);
	});

	it('mixes the zoom blur from sharp at the point to fully blurred at the edge of its mask', () => {
		const bmp = Buffer.from(zoomMask().split(',')[1], 'base64');
		expect(bmp.subarray(0, 2).toString()).toBe('BM');
		const n = 64;
		const at = (x: number, y: number) => {
			const i = 54 + (n - 1 - y) * n * 3 + x * 3;
			return { red: bmp[i + 2], green: bmp[i + 1] };
		};
		// Near the centre: sharp. At the middle of an edge: all one axis. Never more than all.
		expect(at(32, 32)).toEqual({ red: 0, green: 0 });
		expect(at(0, 32).red).toBeGreaterThan(240);
		expect(at(0, 32).green).toBeLessThan(10);
		expect(at(32, 0).green).toBeGreaterThan(240);
		for (let y = 0; y < n; y++)
			for (let x = 0; x < n; x++) expect(at(x, y).red + at(x, y).green).toBeLessThanOrEqual(256);
	});
});

describe('the new transitions on the DOM', () => {
	const size: [number, number] = [640, 360];

	function stage() {
		const root = document.createElement('div');
		const make = (solid: boolean) => {
			const el = document.createElement('div');
			if (solid) el.dataset.solid = '';
			root.appendChild(el);
			return el;
		};
		const els = { a: make(true), b: make(true), riderA: make(false), riderB: make(false) };
		const layer = document.createElement('div');
		root.appendChild(layer);
		return { els, layer };
	}

	function player(
		type: string,
		t: Partial<ProgramTransition> = {},
		cls = 'landscape' as const,
		under?: HTMLElement
	) {
		const { els, layer } = stage();
		const module = TRANSITION_MODULES[type];
		const tr = transition({
			type,
			ease: module.ease,
			direction: module.directional ? 'left' : null,
			...t
		});
		const p = createTransitionPlayer(layer, [tr], { size, cls, under });
		const seek = (f: number) =>
			p.seek(f, () => ({
				out: [els.a, els.riderA],
				in: [els.b, els.riderB],
				focus: { out: { x: 320, y: 120 }, in: { x: 300, y: 140 } }
			}));
		return { els, layer, t: tr, seek };
	}
	const frames = (t: ProgramTransition) => [...Array(t.frames).keys()].map((k) => t.startFrame + k);
	const scaleOf = (el: HTMLElement) =>
		Number(/scale\(([\d.]+)\)/.exec(el.style.transform)?.[1] ?? 1);

	it('zoom-through only scales up, about the faces, and swaps the sides around halfway', () => {
		const { els, t, seek } = player('zoom-through');
		const shown: string[] = [];
		for (const f of frames(t)) {
			seek(f);
			// Never smaller than the frame: no stage shows around a side.
			for (const el of [els.a, els.b]) expect(scaleOf(el)).toBeGreaterThanOrEqual(1);
			shown.push(
				`${els.a.style.visibility === 'hidden' ? '-' : 'a'}${els.b.style.opacity !== '' && Number(els.b.style.opacity) === 0 ? '-' : 'b'}`
			);
		}
		seek(t.startFrame);
		expect(els.a.style.transformOrigin).toBe('320px 120px');
		seek(t.startFrame + t.frames - 1);
		expect(els.b.style.transformOrigin).toBe('300px 140px');
		// Outgoing alone, both for the crossfade on the cut, then incoming alone.
		expect(shown.join(' ')).toBe('a- a- a- a- a- a- a- a- ab ab -b -b -b -b -b -b -b -b');
	});

	it('zoom-through centres on a point of the frame when asked, and blurs the streaks', () => {
		const { els, layer, t, seek } = player('zoom-through', { params: { at: [0.25, 0.75] } });
		seek(t.startFrame + 7);
		expect(els.a.style.transformOrigin).toBe('160px 270px');
		const id = layer.firstElementChild!.id;
		expect(id).toMatch(/^vf-transition-\d+-0$/);
		expect(els.a.style.filter).toMatch(new RegExp(`^url\\("?#${id}-zoom-out-solid"?\\)$`));
		expect(els.riderA.style.filter).toMatch(new RegExp(`^url\\("?#${id}-zoom-out"?\\)$`));
		const mask = layer.querySelector(`#${id}-zoom-out-solid [data-mask]`)!;
		// The mask centred on the point, divided by the side's scale.
		const x = Number(mask.getAttribute('x'));
		const w = Number(mask.getAttribute('width'));
		expect(x + w / 2).toBeCloseTo(160, 1);
	});

	it('scopes its ids per stage: two stages on one page never share a filter', () => {
		const one = player('zoom-through').layer.firstElementChild!.id;
		const two = player('zoom-through').layer.firstElementChild!.id;
		expect(one).not.toBe(two);
	});

	it('zoom-through moves the flash from the outgoing point to the incoming one, never jumping', () => {
		const { layer, t, seek } = player('zoom-through');
		const flash = layer.querySelector<HTMLElement>('[data-flash]')!;
		const xs = frames(t).map((f) => {
			seek(f);
			return Number(/circle at ([\d.]+)px/.exec(flash.style.background)![1]);
		});
		expect(xs[0]).toBe(320);
		expect(xs[xs.length - 1]).toBe(300);
		for (let i = 1; i < xs.length; i++) expect(Math.abs(xs[i] - xs[i - 1])).toBeLessThan(10);
	});

	it('zoom-through sets the flash colour as a value, never as more CSS', () => {
		const { layer } = player('zoom-through', { params: { color: 'red; display: none' } });
		const flash = layer.querySelector<HTMLElement>('[data-flash]')!;
		expect(flash.style.display).toBe('');
		expect(flash.style.color).toMatch(/^(#ffffff|rgb\(255, 255, 255\))$/);
	});

	it('shape mask rings the shape in the brand accent unless told otherwise', () => {
		const ring = (params: Record<string, unknown>) =>
			player('shape-mask', { params }).layer.querySelector<SVGPathElement>('[data-ring]')!;
		expect(ring({}).style.stroke).toBe('var(--brand-accent, #fbc42d)');
		expect(ring({ color: '#00ff00' }).style.stroke).toMatch(/^(#00ff00|rgb\(0, 255, 0\))$/);
		expect(ring({ color: 'red; display: none' }).style.display).toBe('');
		// A colour that could load an image is no colour.
		expect(ring({ color: 'url(https://example.com/x.svg#p)' }).style.stroke).toBe(
			'var(--brand-accent, #fbc42d)'
		);
	});

	it('shape mask cuts the shape out of the clips leaving with the outgoing side', () => {
		const { els, t, seek } = player('shape-mask');
		seek(t.cutFrame);
		// The incoming side and its clips show inside the shape; the outgoing side's clips
		// everywhere but inside it (its own picture lies under the incoming side anyway).
		expect(els.b.style.clipPath).toMatch(/^path\('M/);
		expect(els.riderB.style.clipPath).toBe(els.b.style.clipPath);
		expect(els.riderA.style.clipPath).toMatch(/^path\(evenodd, 'M0 0H640V360H0Z.+'\)$/);
		expect(els.a.style.clipPath).toBe('');
	});

	it('shape mask leaves the layers below a clip alone', () => {
		const { els, t, seek } = player('shape-mask', { kind: 'clip' });
		for (const f of frames(t)) {
			seek(f);
			expect(els.a.getAttribute('style') ?? '').toBe('');
			expect(scaleOf(els.b)).toBeGreaterThanOrEqual(1);
		}
	});

	it('blinds hide the incoming side until halfway, then the outgoing one', () => {
		const { els, layer, t, seek } = player('blinds');
		const at = (f: number) => {
			seek(f);
			return [els.a.style.visibility, els.b.style.visibility];
		};
		expect(at(t.startFrame)).toEqual(['', 'hidden']);
		expect(at(t.cutFrame)).toEqual(['hidden', '']);
		expect(at(t.startFrame + t.frames - 1)).toEqual(['hidden', '']);
		// Two-tone slats in the brand's primary.
		const slats = [...layer.querySelectorAll<HTMLElement>('[data-slat]')];
		expect(slats).toHaveLength(8);
		expect(slats[0].getAttribute('style')).toContain('var(--brand-primary, #f43f5e)');
		// Columns across a horizontal travel, overlapping and past the frame edges.
		const box = (el: HTMLElement) => [parseFloat(el.style.left), parseFloat(el.style.width)];
		expect(box(slats[0])).toEqual([-2, 83]);
		expect(box(slats[7])[0] + box(slats[7])[1]).toBeGreaterThanOrEqual(642);
		for (let i = 1; i < 8; i++)
			expect(box(slats[i])[0]).toBeLessThan(box(slats[i - 1])[0] + box(slats[i - 1])[1]);
	});

	it('blinds set slat colours as values, never as more CSS', () => {
		const { layer } = player('blinds', { params: { colors: ['red', '#00ff00'] } });
		const slats = [...layer.querySelectorAll<HTMLElement>('[data-slat]')];
		expect(slats[1].style.backgroundColor).toMatch(/^(#00ff00|rgb\(0, 255, 0\))$/);
		expect(slats[1].style.backgroundImage).toBe('');
		// More CSS, or anything that loads an image, is no colour: the brand's slats instead.
		for (const bad of ['red; display: none', 'url(https://example.com/x.png)', 'image(x.png)']) {
			const slat = player('blinds', { params: { colors: [bad] } }).layer.querySelector<HTMLElement>(
				'[data-slat]'
			)!;
			expect(slat.getAttribute('style'), bad).not.toMatch(/url|image\(|display/);
			expect(slat.style.backgroundColor).toBe('var(--brand-primary, #f43f5e)');
		}
	});

	it('card brings the incoming side in on top, dims the outgoing one, and cleans up', () => {
		const { els, t, seek } = player('card');
		seek(t.cutFrame);
		expect(scaleOf(els.b)).toBeCloseTo(0.62, 2);
		expect(els.b.style.borderRadius).not.toBe('');
		expect(els.b.style.boxShadow).toMatch(/rgba\(0, 0, 0/);
		expect(els.a.style.filter).toMatch(/^brightness\(0\.5/);
		// A rider of the incoming side moves with the card; one of the outgoing side stays put.
		expect(els.riderB.style.transform).toBe(els.b.style.transform);
		expect(els.riderA.style.transform).toBe('');
		seek(t.startFrame + t.frames);
		for (const el of Object.values(els)) expect(el.getAttribute('style') ?? '').toBe('');
	});

	/** Pretends `el` sits at (x, y) on the stage, as a slotted clip root does. */
	const slot = (el: HTMLElement, x: number, y: number) => {
		Object.defineProperty(el, 'offsetLeft', { value: x });
		Object.defineProperty(el, 'offsetTop', { value: y });
	};

	it('card moves a slotted clip with the card, about the frame centre, in and out', () => {
		for (const side of ['in', 'out'] as const)
			for (const motion of ['slide', 'flip'] as const) {
				const { els, t, seek } = player('card', { params: { side, motion } });
				const rider = side === 'in' ? els.riderB : els.riderA;
				const card = side === 'in' ? els.b : els.a;
				slot(rider, 400, 30);
				seek(t.cutFrame + 3);
				expect(rider.style.transform, `${side} ${motion}`).toBe(card.style.transform);
				// The frame's centre in the side's box and in the slot's.
				expect(card.style.transformOrigin).toBe('320px 180px');
				expect(rider.style.transformOrigin).toBe('-80px 150px');
				expect(rider.style.backfaceVisibility).toBe('hidden');
				// Cut to the card's rounded corners, in the slot's own box.
				expect(rider.style.clipPath).toMatch(/^path\('M-[\d.]+ -30H/);
				seek(t.startFrame + t.frames);
				expect(rider.getAttribute('style') ?? '', 'released').toBe('');
			}
	});

	it('card cuts the clips riding under it where the card is', () => {
		const { els, t, seek } = player('card');
		seek(t.cutFrame);
		// Forward: the outgoing side's clips sit above the card, so the card is cut out of them.
		expect(els.riderA.style.clipPath).toMatch(/^path\(evenodd, 'M0 0H640V360H0Z/);
		const back = player('card', { params: { side: 'out' } });
		back.seek(back.t.cutFrame);
		expect(back.els.riderB.style.clipPath).toMatch(/^path\(evenodd, 'M0 0H640V360H0Z/);
		expect(back.els.b.style.clipPath).toBe(back.els.riderB.style.clipPath);
	});

	it('card gives a clip transition the card look: corners, and a shadow that follows it', () => {
		const { els, t, seek } = player('card', { kind: 'clip' });
		seek(t.cutFrame);
		expect(els.riderB.style.borderRadius).not.toBe('0px');
		expect(els.riderB.style.overflow).toBe('hidden');
		expect(els.riderB.style.filter).toMatch(/^drop-shadow\(/);
		// The layers below the clip stay as they are.
		expect(els.a.getAttribute('style') ?? '').toBe('');
	});

	it('card never turns past edge on, whatever the ease', () => {
		const flip = {
			motion: 'flip' as const,
			direction: 'left' as const,
			size: [1920, 1080] as [number, number],
			scale: 0.62,
			radius: 44
		};
		// back.inOut(2) runs to about −0.1 and 1.1.
		expect(Math.abs(cardPose(-0.1, flip).turn)).toBeLessThanOrEqual(90);
		expect(cardPose(1.1, flip)).toMatchObject({ scale: 1, radius: 0, turn: 0 });
		const { els, t, seek } = player('card', {
			params: { motion: 'flip' },
			ease: 'back.inOut(2)'
		});
		for (const f of frames(t)) {
			seek(f);
			const turn = Number(/rotateY\((-?[\d.]+)deg\)/.exec(els.b.style.transform)?.[1] ?? 0);
			expect(Math.abs(turn)).toBeLessThanOrEqual(90);
		}
	});

	it('card backwards lays its shadow under the front clips, at the size of the hole', () => {
		const under = document.createElement('div');
		const { layer, t, seek } = player('card', { params: { side: 'out' } }, 'landscape', under);
		expect(layer.querySelector('[data-shadow]')).toBeNull();
		const shadow = under.querySelector<HTMLElement>('[data-shadow]')!;
		seek(t.cutFrame);
		expect((shadow.parentElement as HTMLElement).style.display).toBe('');
		// A pixel inside the card's edge on screen: 1 / 0.62 px before the scale.
		expect(parseFloat(shadow.style.left)).toBeCloseTo(1 / 0.62, 1);
		expect(parseFloat(shadow.style.width)).toBeCloseTo(640 - 2 / 0.62, 1);
		expect(shadow.style.boxShadow).toMatch(/rgba\(0, 0, 0/);
		seek(t.startFrame + t.frames);
		expect((shadow.parentElement as HTMLElement).style.display).toBe('none');
	});

	it('card backwards shrinks the outgoing side into the card and leaves along the travel', () => {
		// The card's own duration: 27 frames.
		const { els, layer, t, seek } = player('card', {
			params: { side: 'out' },
			frames: 27,
			cutFrame: 23
		});
		const xOf = (el: HTMLElement) => Number(/translate\((-?[\d.]+)px/.exec(el.style.transform)![1]);
		seek(t.cutFrame);
		expect(scaleOf(els.a)).toBeCloseTo(0.62, 2);
		expect(els.b.style.transform).toBe('');
		seek(t.startFrame + t.frames - 1);
		// Travelling left: the card leaves to the left, at most a sliver of it still on the frame
		// on the last frame of the window.
		const right = 320 + xOf(els.a) + (640 * 0.62) / 2;
		expect(right).toBeGreaterThan(0);
		expect(right).toBeLessThan(0.15 * 640 * 0.62);
		// The shadow lies in the overlay, with the card.
		expect(layer.querySelector<HTMLElement>('[data-shadow]')!.style.transform).toBe(
			els.a.style.transform
		);
	});
});
