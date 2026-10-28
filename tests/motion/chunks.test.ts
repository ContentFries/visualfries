// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { chunkSpans, keyStates } from '$lib/motion/chunks.js';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveProgram, type ProgramInputs, type ResolvedKey } from '$lib/motion/program.js';

const key = (frame: number, values: ResolvedKey['values'], ease = 'none'): ResolvedKey => ({
	frame,
	values,
	ease,
	mix: 'oklch'
});

describe('chunks of a segment', () => {
	it('splits on a grid of program frames, so an edit elsewhere keeps the grid', () => {
		expect(chunkSpans({ startFrame: 0, frames: 250 }, 25)).toEqual([
			{ startFrame: 0, frames: 100 },
			{ startFrame: 100, frames: 100 },
			{ startFrame: 200, frames: 50 }
		]);
		expect(chunkSpans({ startFrame: 130, frames: 120 }, 25)).toEqual([
			{ startFrame: 130, frames: 70 },
			{ startFrame: 200, frames: 50 }
		]);
	});

	it('leaves no sliver at a segment edge', () => {
		// 200 is 10 frames after the start and 290 sits 10 before the end: both merge.
		expect(chunkSpans({ startFrame: 190, frames: 110 }, 25)).toEqual([
			{ startFrame: 190, frames: 110 }
		]);
		expect(chunkSpans({ startFrame: 0, frames: 210 }, 25)).toEqual([
			{ startFrame: 0, frames: 100 },
			{ startFrame: 100, frames: 110 }
		]);
		expect(chunkSpans({ startFrame: 0, frames: 30 }, 30)).toEqual([{ startFrame: 0, frames: 30 }]);
	});
});

describe('key states', () => {
	const away = [
		key(0, { x: -250, scale: 0.78 }),
		key(140, { x: -250, scale: 0.8 }, 'sine.inOut'),
		key(144, { x: -1800, scale: 0.78 }, 'power2.in'),
		key(1070, { x: -1800, scale: 0.78 }),
		key(1076, { x: -250, scale: 0.78 }, 'expo.out')
	];
	const moved = away.map((k, i) => (i === 2 ? { ...k, frame: 147 } : k));

	it('are the same while the value holds, whatever the keys around it', () => {
		expect(keyStates(away, 400, 500)).toEqual(keyStates(moved, 400, 500));
		expect(keyStates(away, 400, 500)).toHaveLength(1);
	});

	it('differ where the drawn value may change', () => {
		expect(keyStates(away, 100, 200)).not.toEqual(keyStates(moved, 100, 200));
		// The scale eases towards key 140 from frame 0 on, so the frames before change too.
		expect(keyStates(away, 0, 100)).toEqual(keyStates(moved, 0, 100));
		expect(keyStates(away, 1000, 1100)).toEqual(keyStates(moved, 1000, 1100));
	});

	it('tell a value between keys from the same value held after the last key', () => {
		const red = (frame: number) => key(frame, { props: { color: '#ff0000' } });
		expect(keyStates([red(0), red(10)], 12, 13)).not.toEqual(keyStates([red(0), red(20)], 12, 13));
	});

	it('cover props by name', () => {
		const a = [key(0, { props: { glow: 0 } }), key(50, { props: { glow: 1 } })];
		const b = [key(0, { props: { glow: 0 } }), key(50, { props: { glow: 2 } })];
		expect(keyStates(a, 60, 70)).not.toEqual(keyStates(b, 60, 70));
		expect(keyStates(a, 0, 10)).not.toEqual(keyStates(b, 0, 10));
	});
});

describe('chunk hashes of a program', () => {
	const DIR = path.join(__dirname, 'fixtures/program');
	const words = parseTranscriptWords(
		JSON.parse(fs.readFileSync(path.join(DIR, 'take1.transcript.json'), 'utf8'))
	);
	const inputs: ProgramInputs & { hashes: object } = {
		words: null,
		transcripts: { talk: words },
		sources: {
			talk: { frames: 400, duration: 400 / 30, width: 1920, height: 1080, fps: 30, audio: true }
		},
		hashes: {
			project: 'p',
			transcripts: { talk: 't' },
			sources: { talk: 's' },
			assets: { 'blocks/World.svelte': 'world-block' }
		}
	};
	/** One cut, one long shot that leaves at `out` seconds, a world clip across the program. */
	const json = (out: number, props = {}) => ({
		size: [1080, 1920],
		fps: 30,
		footage: { talk: { src: 'talk.mp4' } },
		cuts: [{ id: 'a', source: 'talk', in: 0, out: 13 }],
		shots: [
			{
				id: 'speaker',
				shot: 'full',
				from: 0,
				until: 'end',
				keys: [
					{ at: 0, x: 0 },
					{ at: out, x: 0 },
					{ at: out + 0.2, x: -1800, ease: 'power2.in' }
				]
			}
		],
		clips: [
			{ id: 'world', block: 'blocks/World.svelte', from: 0, until: 'end', layer: 'behind', props }
		]
	});
	const resolve = (j: object) => resolveProgram(parseMotionProject(j), inputs);
	const hashes = (j: object) => resolve(j).segments.flatMap((s) => s.chunks.map((c) => c.hash));

	it('cut every segment into chunks that cover it', () => {
		const p = resolve(json(5));
		expect(p.segments).toHaveLength(1);
		const chunks = p.segments[0].chunks;
		expect(chunks.map((c) => [c.id, c.startFrame, c.frames])).toEqual([
			['seg1.1', 0, 120],
			['seg1.2', 120, 120],
			['seg1.3', 240, 150]
		]);
	});

	it('change only where a moved key changes the picture', () => {
		const a = hashes(json(5));
		const b = hashes(json(5.5));
		// The exit moves from 5–5.2 s to 5.5–5.7 s: frames 150–171 change, inside chunk 2 only.
		expect(b.map((h, i) => h === a[i])).toEqual([true, false, true]);
	});

	it('all change with the props of a clip on screen in all of them', () => {
		const a = hashes(json(5));
		const b = hashes(json(5, { tint: 'red' }));
		expect(b.map((h, i) => h === a[i])).toEqual([false, false, false]);
	});

	/** `json(5)` with one more clip: `label` from 0 to 2 s, on screen in the first chunk only. */
	const withLabel = (label: object) => {
		const j = json(5);
		return {
			...j,
			clips: [
				...j.clips,
				{ id: 'label', block: 'blocks/Label.svelte', from: 0, until: 2, ...label }
			]
		};
	};
	const labelled = (label: object, assets = {}) =>
		resolveProgram(parseMotionProject(withLabel(label)), {
			...inputs,
			hashes: {
				...inputs.hashes,
				assets: { ...inputs.hashes.assets, 'blocks/Label.svelte': 'label-block', ...assets }
			}
		}).segments.flatMap((s) => s.chunks.map((c) => c.hash));

	it('all change with the props or code of a clip mounted in the segment', () => {
		// A page mounts every clip of its segment for every chunk it draws: a block off screen in
		// a chunk still runs there (global styles, fonts, what it does to the document).
		const a = labelled({ props: { text: 'ONE' } });
		const b = labelled({ props: { text: 'TWO' } });
		expect(b.map((h, i) => h === a[i])).toEqual([false, false, false]);
		const c = labelled({ props: { text: 'ONE' } }, { 'blocks/Label.svelte': 'label-block-2' });
		expect(c.map((h, i) => h === a[i])).toEqual([false, false, false]);
	});

	it('all change with the value a keyed prop mounts with', () => {
		// A block mounts with its keyed props at the clip's first frame: one that reads them only
		// then shows that value in every chunk.
		const keys = (glow: number) => ({
			props: { text: 'ONE' },
			keys: [
				{ at: 0.5, props: { glow } },
				{ at: 1, props: { glow: 1 } }
			]
		});
		const a = labelled(keys(0));
		const b = labelled(keys(0.5));
		expect(b.map((h, i) => h === a[i])).toEqual([false, false, false]);
	});

	it('change only where a moved placement key of a mounted clip draws', () => {
		const keys = (at: number) => ({
			props: { text: 'ONE' },
			keys: [
				{ at: 0, x: 0 },
				{ at, x: 0 },
				{ at: 1.9, x: 100 }
			]
		});
		const a = labelled(keys(1));
		const b = labelled(keys(1.5));
		expect(b.map((h, i) => h === a[i])).toEqual([false, true, true]);
	});

	it('cover what a clip held at its last frame shows inside a transition window', () => {
		// Cut a ends at 237 with a 0.4 s push: the window runs 231–243, so chunk 3 (from 240)
		// shows the title held at its last frame, 236, where the keys from 7.2 s fade it.
		const pushed = (fade: number) => ({
			size: [1080, 1920],
			fps: 30,
			footage: { talk: { src: 'talk.mp4' } },
			cuts: [
				{ id: 'a', source: 'talk', in: 0, out: 7.9 },
				{ id: 'b', source: 'talk', in: 8, out: 13, transition: { type: 'push', duration: 0.4 } }
			],
			clips: [
				{
					id: 'title',
					block: 'blocks/World.svelte',
					from: 0,
					until: 7.9,
					keys: [
						{ at: 0, opacity: 1 },
						{ at: fade, opacity: 1 },
						{ at: 7.9, opacity: 0 }
					]
				}
			]
		});
		const p = resolve(pushed(7.2));
		expect(p.transitions.map((t) => [t.startFrame, t.frames])).toEqual([[231, 12]]);
		expect(p.segments[0].chunks.map((c) => c.startFrame)).toEqual([0, 120, 240]);
		const a = hashes(pushed(7.2));
		const b = hashes(pushed(7.5));
		expect(b.map((h, i) => h === a[i])).toEqual([true, false, false]);
	});
});

describe('chunk hashes under an end card', () => {
	const DIR = path.join(__dirname, 'fixtures/program');
	const words = parseTranscriptWords(
		JSON.parse(fs.readFileSync(path.join(DIR, 'take1.transcript.json'), 'utf8'))
	);
	const inputs = (source = 's') => ({
		words: null,
		transcripts: { talk: words },
		sources: {
			talk: { frames: 400, duration: 400 / 30, width: 1920, height: 1080, fps: 30, audio: true }
		},
		hashes: {
			project: 'p',
			transcripts: { talk: 't' },
			sources: { talk: source },
			assets: { 'blocks/Title.svelte': 'title-block' }
		}
	});
	/**
	 * The excerpt of 0–6 s with a 4 s end card: chunks 0–119, 120–239 and 240–299, the last all
	 * under the card, which holds frame 179 (the title's last).
	 */
	const json = (o: { shot?: string; key?: number; text?: string } = {}) => ({
		size: [1080, 1920],
		fps: 30,
		footage: { talk: { src: 'talk.mp4' } },
		cuts: [{ id: 'a', source: 'talk', in: 0, out: 13 }],
		shots: [{ id: 'speaker', shot: o.shot ?? 'full', from: 0, until: 6 }],
		clips: [
			{
				id: 'title',
				block: 'blocks/Title.svelte',
				from: 0,
				until: 6,
				props: { text: o.text ?? 'ONE' },
				keys: [
					{ at: 0, x: 0 },
					{ at: o.key ?? 5, x: 0 },
					{ at: 6, x: 100 }
				]
			}
		],
		excerpts: [{ id: 'x', from: 0, until: 6, end: { duration: 4 } }]
	});
	const resolve = (j: object, source?: string) =>
		resolveProgram(parseMotionProject(j), inputs(source), { excerpt: 'x' });
	const hashes = (j: object, source?: string) =>
		resolve(j, source).segments.flatMap((s) => s.chunks.map((c) => c.hash));

	it('are cut as the excerpt runs', () => {
		const p = resolve(json());
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(p.segments.flatMap((s) => s.chunks.map((c) => [c.startFrame, c.frames]))).toEqual([
			[0, 120],
			[120, 120],
			[240, 60]
		]);
	});

	it('cover the held frame: its keys, shot and footage', () => {
		const a = hashes(json());
		// The title's key moves from 5 s to 5.5 s: the held frame 179 moves differently.
		expect(hashes(json({ key: 5.5 })).map((h, i) => h === a[i])).toEqual([true, false, false]);
		expect(hashes(json({ shot: 'punch' }))[2]).not.toBe(a[2]);
		expect(hashes(json(), 's2')[2]).not.toBe(a[2]);
		expect(hashes(json({ text: 'TWO' }))[2]).not.toBe(a[2]);
	});
});
