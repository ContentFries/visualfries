// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildKeyTracks, substituteBrand, KEY_EASE } from '$lib/motion/keys.js';
import { readAnimatable } from '$lib/motion/animatable.js';
import { formatColor, mixColors, parseColor } from '$lib/motion/color.js';
import { NEUTRAL_BRAND, resolveBrand } from '$lib/motion/brand.js';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveProgram, type ProgramInputs, type ResolvedKey } from '$lib/motion/program.js';
import { keyCamera, mixLayouts, shotLayoutAt, type ShotLayout } from '$lib/motion/shots/index.js';
import { edgeFrames } from '$lib/motion/segments.js';
import { NEUTRAL_STYLE } from '$lib/motion/style.js';

const key = (frame: number, values: ResolvedKey['values'], ease = 'none'): ResolvedKey => ({
	frame,
	values,
	ease,
	mix: 'oklch'
});
const SIZE: [number, number] = [1000, 500];

describe('key tracks', () => {
	it('moves placement between keys and holds before the first and after the last', () => {
		const { placement, props } = buildKeyTracks(
			[key(10, { x: 0, scale: 1 }), key(20, { x: 100, scale: 2 }), key(30, { opacity: 0 })],
			{ size: SIZE, animatable: {} }
		);
		expect(props).toBeNull();
		// Each property holds its own first key: opacity is keyed only at frame 30.
		expect(placement!(0)).toEqual({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 0 });
		expect(placement!(15)).toMatchObject({ x: 50, scale: 1.5 });
		expect(placement!(25)).toMatchObject({ x: 100, scale: 2, opacity: 0 });
		expect(placement!(40)).toMatchObject({ x: 100, scale: 2, opacity: 0 });
	});

	it('resolves "%" against the format frame (x: width, y: height)', () => {
		const { placement } = buildKeyTracks(
			[key(0, { x: '0%', y: '0%' }), key(10, { x: '10%', y: '50%' })],
			{
				size: SIZE
			}
		);
		expect(placement!(10)).toMatchObject({ x: 100, y: 250 });
		expect(placement!(5)).toMatchObject({ x: 50, y: 125 });
	});

	it('shapes the move arriving at a key with that key’s ease', () => {
		const { placement } = buildKeyTracks(
			[key(0, { x: 0 }), key(10, { x: 100 }, 'power1.in'), key(20, { x: 0 }, 'power1.out')],
			{ size: SIZE }
		);
		expect(placement!(5).x).toBeCloseTo(25, 6); // power1.in(0.5) = 0.25
		expect(placement!(15).x).toBeCloseTo(100 - 75, 6); // power1.out(0.5) = 0.75
	});

	it('interpolates props by the kind the block declares, colours in OKLCH by default', () => {
		const { props, propNames } = buildKeyTracks(
			[
				key(0, { props: { color: '#ff0000', size: 10 } }),
				key(10, { props: { color: '#0000ff', size: 30 } })
			],
			{ size: SIZE, animatable: { color: 'color', size: 'number' } }
		);
		expect(propNames).toEqual(['color', 'size']);
		expect(props!(5)).toEqual({
			color: formatColor(mixColors(parseColor('#ff0000'), parseColor('#0000ff'), 0.5, 'oklch')),
			size: 20
		});
		const oklab = buildKeyTracks(
			[
				key(0, { props: { color: 'red' } }),
				{ ...key(10, { props: { color: 'blue' } }), mix: 'oklab' }
			],
			{ size: SIZE, animatable: { color: 'color' } }
		);
		expect(oklab.props!(5).color).toBe(
			formatColor(mixColors(parseColor('red'), parseColor('blue'), 0.5, 'oklab'))
		);
	});

	it('refuses keys it cannot draw', () => {
		const build = (keys: ResolvedKey[], animatable?: Record<string, never> | object) => () =>
			buildKeyTracks(keys, { size: SIZE, animatable: animatable as never, block: 'B.svelte' });
		expect(build([key(0, { props: { title: 'x' } })], { color: 'color' })).toThrow(
			'Prop "title" is not animatable in B.svelte. Animatable: color.'
		);
		expect(build([key(0, { props: { color: 'red' } })], {})).toThrow(/marks no props animatable/);
		expect(build([key(0, { props: { color: 'red' } })])).toThrow(/Keys of a shot take x, y/);
		expect(build([key(0, { x: 10 }), key(5, { x: '10%' })])).toThrow(/same unit \(px or %\)/);
		expect(
			build(
				[
					key(0, { props: { bg: 'linear-gradient(red, blue)' } }),
					key(5, { props: { bg: 'radial-gradient(red, blue)' } })
				],
				{ bg: 'gradient' }
			)
		).toThrow(/linear-gradient into a radial-gradient/);
		expect(build([key(0, { x: 0 }, 'bouncy')])).toThrow(/Unknown ease "bouncy"/);
	});
});

describe('brand tokens in keys', () => {
	const brand = resolveBrand(
		{
			colors: {
				primary: '#6d28d9',
				accent: '#f59e0b',
				background: '#000000',
				surface: '#111111',
				text: '#ffffff',
				muted: '#999999',
				extra: { sky: '#38bdf8' }
			},
			fonts: {}
		} as never,
		(f) => f
	);

	it('replaces brand colours, also inside gradients and shadows', () => {
		expect(substituteBrand('brand.primary', brand)).toBe('#6d28d9');
		expect(
			substituteBrand('linear-gradient(90deg, brand.accent, brand.extra.sky 80%)', brand)
		).toBe('linear-gradient(90deg, #f59e0b, #38bdf8 80%)');
		expect(substituteBrand('0 0 20px brand.onPrimary', brand)).toBe(
			`0 0 20px ${brand.colors.onPrimary}`
		);
		expect(substituteBrand(12, brand)).toBe(12);
		expect(substituteBrand('#fff', NEUTRAL_BRAND)).toBe('#fff');
		expect(() => substituteBrand('brand.secondary', brand)).toThrow(
			/Unknown brand colour "brand.secondary". Use brand.primary, .* brand.extra.sky./
		);
	});
});

describe('shot keys on the camera', () => {
	const layout: ShotLayout = {
		camera: { x: 0, y: 0, width: 1000, height: 500 },
		clip: { x: 0, y: 0, width: 1000, height: 500 },
		radius: 0,
		slots: {},
		closed: {},
		fill: null
	};
	const subject = { x: 0.3, y: 0.1, width: 0.2, height: 0.9, headX: 0.4, headY: 0.2 };

	it('scales about the face, then moves; turns about the face', () => {
		const out = keyCamera(layout, { x: 50, y: -20, scale: 2, rotation: 5, opacity: 0.5 }, subject);
		// The face (0.4, 0.3 of the footage: head top + 0.1) stays put under the scale.
		const face = { x: 400, y: 150 };
		expect(out.camera).toEqual({
			x: face.x - 2 * face.x + 50,
			y: face.y - 2 * face.y - 20,
			width: 2000,
			height: 1000
		});
		expect(out.clip).toEqual(layout.clip);
		expect(out.turn).toEqual({ rotation: 5, pivot: { x: 450, y: 130 } });
		expect(out.opacity).toBe(0.5);
		// No movement: the layout as it was.
		expect(keyCamera(layout, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }, subject)).toEqual(
			layout
		);
	});

	it('blends turns and fades through a morph', () => {
		const turned = keyCamera(layout, { x: 0, y: 0, scale: 1, rotation: 10, opacity: 0 }, subject);
		const mid = mixLayouts(layout, turned, 0.5);
		expect(mid.turn).toEqual({ rotation: 5, pivot: turned.turn!.pivot });
		expect(mid.opacity).toBe(0.5);
		expect(mixLayouts(layout, layout, 0.5)).not.toHaveProperty('turn');
	});

	it('applies a shot’s keys at the frame on screen', () => {
		const shots = [
			{
				id: 's',
				shot: 'full',
				startFrame: 0,
				frames: 30,
				params: {},
				morphFrames: 0,
				morphEase: 'none',
				keys: [key(0, { scale: 1 }), key(20, { scale: 1.5 })]
			}
		];
		const input = {
			cls: 'landscape' as const,
			size: [1000, 500] as [number, number],
			footage: [1000, 500] as [number, number],
			subject: null
		};
		expect(shotLayoutAt(shots, 0, input).camera.width).toBe(1000);
		expect(shotLayoutAt(shots, 10, input).camera.width).toBe(1250);
		expect(shotLayoutAt(shots, 29, input).camera.width).toBe(1500);
	});
});

describe('animatable declarations', () => {
	it('reads a literal object from the module script', async () => {
		expect(
			await readAnimatable(
				`<script module lang="ts">export const animatable = { color: 'color', 'bg': 'gradient', glow: 'shadow', size: 'number' } as const;</script><div></div>`,
				'B.svelte'
			)
		).toEqual({ props: { color: 'color', bg: 'gradient', glow: 'shadow', size: 'number' } });
		expect(await readAnimatable(`<script>let x = 1;</script><p>{x}</p>`, 'B.svelte')).toEqual({
			props: {}
		});
		expect(
			await readAnimatable(
				`<script module>export const animatable = { size: 'big' };</script>`,
				'B.svelte'
			)
		).toEqual({
			error: expect.stringContaining('"size" has unknown kind "big"')
		});
		expect(
			await readAnimatable(
				`<script module>const a = {}; export const animatable = a;</script>`,
				'B.svelte'
			)
		).toEqual({ error: expect.stringContaining('must be a literal object') });
	});

	it('marks the built-in blocks’ backgrounds animatable', async () => {
		for (const file of ['Captions.svelte', 'SpeakerDepth.svelte']) {
			const abs = path.join(__dirname, '../../src/lib/motion/blocks', file);
			expect(await readAnimatable(fs.readFileSync(abs, 'utf8'), abs)).toEqual({
				props: { background: 'gradient' }
			});
		}
	});
});

describe('keys in the program', () => {
	const DIR = path.join(__dirname, 'fixtures/program');
	const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
	const take1 = parseTranscriptWords(read('take1.transcript.json'));
	const source = {
		frames: 400,
		duration: 400 / 30,
		width: 1920,
		height: 1080,
		fps: 30,
		audio: true
	};
	const inputs: ProgramInputs = {
		words: null,
		transcripts: { talk: take1 },
		sources: { talk: source },
		animatable: { 'blocks/Card.svelte': { props: { color: 'color', bg: 'gradient' } } }
	};
	/** One cut over the whole take, one clip with `keys`. */
	const project = (keys: unknown[], extra: object = {}) =>
		parseMotionProject({
			size: [1920, 1080],
			fps: 30,
			footage: { talk: { src: 'talk.mp4', transcript: 'take1.transcript.json' } },
			cuts: [{ source: 'talk' }],
			clips: [
				{ id: 'card', block: 'blocks/Card.svelte', from: 2, until: 6, cues: { fix: 'fix' }, keys }
			],
			...extra
		});
	const resolve = (keys: unknown[], extra: object = {}, more: Partial<ProgramInputs> = {}) =>
		resolveProgram(project(keys, extra), { ...inputs, ...more });
	const keysOf = (p: ReturnType<typeof resolve>) => p.clips[0].keys;
	const problems = (p: ReturnType<typeof resolve>) =>
		p.diagnostics.filter((d) => d.level !== 'info').map((d) => [d.level, d.field, d.message]);

	it('anchors keys inside the item: seconds, frames, moments, cues and phrases', () => {
		const fix = take1.find((w) => w.text.toLowerCase().startsWith('fix'))!;
		const p = resolve([
			{ at: 0, x: 0 },
			{ at: { frame: 15 }, x: 10 },
			{ at: { moment: 'mid' }, x: 20 },
			{ at: { moment: 'end-0.5' }, x: 30 },
			{ at: { moment: 'fix' }, x: 40 },
			{ at: 'fix', x: 50 }
		]);
		expect(problems(p)).toEqual([]);
		const frames = keysOf(p).map((k) => [k.frame, k.values.x]);
		expect(frames).toContainEqual([60, 0]);
		expect(frames).toContainEqual([75, 10]);
		expect(frames).toContainEqual([120, 20]);
		expect(frames).toContainEqual([165, 30]);
		expect(frames).toContainEqual([Math.round(fix.start * 30), 40]);
		expect(frames).toContainEqual([Math.round(fix.start * 30), 50]);
	});

	it('takes brand colours into the program and the energy’s ease by default', () => {
		const brand = resolveBrand(
			{
				colors: {
					primary: '#6d28d9',
					accent: '#f59e0b',
					background: '#000000',
					surface: '#111111',
					text: '#ffffff',
					muted: '#999999'
				},
				fonts: {}
			} as never,
			(f) => f
		);
		const p = resolve(
			[
				{ at: 0, props: { color: 'brand.primary' } },
				{ at: 2, props: { color: 'brand.accent' }, ease: 'sine.out' }
			],
			{},
			{ look: { brand, style: { ...NEUTRAL_STYLE, energy: 'punchy' } } }
		);
		expect(problems(p)).toEqual([]);
		expect(keysOf(p)).toEqual([
			{ frame: 60, values: { props: { color: '#6d28d9' } }, ease: KEY_EASE.punchy, mix: 'oklch' },
			{ frame: 120, values: { props: { color: '#f59e0b' } }, ease: 'sine.out', mix: 'oklch' }
		]);
		// Without a brand the neutral brand's colours; without a style the balanced ease.
		const neutral = resolve([{ at: 0, props: { color: 'brand.accent' } }], {}, {});
		expect(keysOf(neutral)[0]).toMatchObject({
			values: { props: { color: NEUTRAL_BRAND.colors.accent } },
			ease: KEY_EASE.balanced
		});
	});

	it('reports keys on props the block does not mark animatable', () => {
		expect(problems(resolve([{ at: 0, props: { title: 'Hi' } }]))).toEqual([
			[
				'error',
				'keys',
				'Prop "title" is not animatable in blocks/Card.svelte. Animatable: color, bg.'
			]
		]);
		// A block whose declaration cannot be read.
		expect(
			problems(
				resolve(
					[{ at: 0, props: { color: 'red' } }],
					{},
					{
						animatable: { 'blocks/Card.svelte': { error: 'Card.svelte: bad animatable' } }
					}
				)
			)
		).toContainEqual(['error', 'block', 'Card.svelte: bad animatable']);
		// Shots take placement only.
		const shot = resolveProgram(
			parseMotionProject({
				size: [1920, 1080],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', transcript: 'take1.transcript.json' } },
				cuts: [{ source: 'talk' }],
				shots: [
					{ id: 'p', shot: 'punch', from: 1, until: 3, keys: [{ at: 0, props: { color: 'red' } }] }
				],
				clips: []
			}),
			inputs
		);
		expect(problems(shot)).toContainEqual([
			'error',
			'keys',
			'Keys of a shot take x, y, scale, rotation and opacity, not props (color).'
		]);
	});

	it('reports a gradient type mismatch, mixed units, unknown eases and brand colours', () => {
		expect(
			problems(
				resolve([
					{ at: 0, props: { bg: 'linear-gradient(red, blue)' } },
					{ at: 1, props: { bg: 'radial-gradient(red, blue)' } }
				])
			)
		).toEqual([
			[
				'error',
				'keys',
				'Keys of "bg": key 1 to 2: Cannot interpolate a linear-gradient into a radial-gradient; use the same gradient type at both keys.'
			]
		]);
		expect(
			problems(
				resolve([
					{ at: 0, x: 10 },
					{ at: 1, x: '5%' }
				])
			)[0][2]
		).toMatch(/same unit \(px or %\)/);
		expect(problems(resolve([{ at: 0, x: 10, ease: 'wobble' }]))).toEqual([
			['error', 'keys[0].ease', expect.stringContaining('Unknown ease "wobble"')]
		]);
		expect(problems(resolve([{ at: 0, props: { color: 'brand.nope' } }]))[0]).toEqual([
			'error',
			'keys[0].props.color',
			expect.stringContaining('Unknown brand colour "brand.nope"')
		]);
	});

	it('warns about a key outside its item and checks nothing in inserts mode', () => {
		expect(
			problems(
				resolve([
					{ at: 0, x: 0 },
					{ at: 7, x: 10 }
				])
			)
		).toEqual([['warning', 'keys[1].at', 'Key at 9.00 s is outside the clip (2.00–6.00 s).']]);
		const inserts = resolveProgram(
			parseMotionProject({
				size: [1920, 1080],
				fps: 30,
				clips: [
					{
						id: 'card',
						block: 'blocks/Card.svelte',
						from: 2,
						until: 6,
						keys: [{ at: 0, props: { title: 1 } }]
					}
				]
			}),
			{ words: null }
		);
		expect(inserts.clips[0].keys).toEqual([]);
		expect(inserts.diagnostics.map((d) => d.message)).toEqual([
			'"keys" has no effect without "cuts" or "shots" (inserts mode).'
		]);
	});

	it('changes the hash of the segment a key is on screen in, and samples around keys', () => {
		const a = resolve([
			{ at: 0, x: 0 },
			{ at: 2, x: 100 }
		]);
		const b = resolve([
			{ at: 0, x: 0 },
			{ at: 2, x: 120 }
		]);
		expect(a.segments).toHaveLength(1);
		expect(b.segments[0].hash).not.toBe(a.segments[0].hash);
		const edges = edgeFrames(a);
		for (const f of [59, 60, 89, 90, 119, 120]) expect(edges).toContain(f);
	});
});
