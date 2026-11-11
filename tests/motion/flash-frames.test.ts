import { describe, expect, it } from 'vitest';
import {
	FULL_COVER,
	coverable,
	cutEdges,
	flashFrames,
	nested3dClip,
	nested3dMessage,
	alphaReader,
	offCut,
	opaquePixels,
	planeCover,
	shotsOffCut,
	snapSpan,
	type CoverSample,
	type FlashProgram
} from '$lib/motion/flash-frames.js';

const FPS = 25;

/** Samples at `frames`, each with the covers `at(frame)` gives. */
const sample = (frames: number[], at: (f: number) => Record<string, number>): CoverSample[] =>
	frames.map((frame) => ({ frame, clips: at(frame) }));
/** Every frame from `from` to `to` (exclusive). */
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

/**
 * CF053 at 39 s: "ring" (full-screen) runs to frame 996 and fades its own opacity over its last
 * 6 frames; "nastroj" (full-screen) starts at 996. The camera under them flashes in between.
 */
const RING: FlashProgram = {
	fps: FPS,
	cuts: [
		{ startFrame: 0, frames: 2000 },
		{ startFrame: 2000, frames: 500 }
	],
	clips: [
		{ id: 'ring', block: 'blocks/Ring.svelte', startFrame: 900, frames: 96 },
		{ id: 'nastroj', block: 'blocks/Term.svelte', startFrame: 996, frames: 136 }
	],
	transitions: []
};
const ringCovers = (fade: boolean) => (f: number) => ({
	...(f >= 900 && f < 996 ? { ring: fade && f >= 990 ? (995 - f) / 6 : 1 } : {}),
	...(f >= 996 && f < 1132 ? { nastroj: 1 } : {})
});

describe('flashFrames', () => {
	it('names a full-screen clip that fades its own opacity next to another full-screen clip', () => {
		const found = flashFrames(RING, sample(range(880, 1140), ringCovers(true)));
		expect(found).toHaveLength(1);
		expect(found[0].frame).toBe(990);
		expect(found[0].message).toMatch(
			/^Clip "ring" \(blocks\/Ring\.svelte\) is full-screen but \d+ % opaque at 39\.60 s \(program frame 990\)/
		);
		expect(found[0].message).toContain('"nastroj"');
		expect(found[0].message).toContain('6 frames');
	});

	it('passes the fixed program: the clip stays opaque to its last frame', () => {
		expect(flashFrames(RING, sample(range(880, 1140), ringCovers(false)))).toEqual([]);
	});

	it('works from sparse samples: every 5th frame plus both sides of every clip edge', () => {
		const frames = [
			...new Set([...range(0, 400).map((i) => i * 5), 899, 900, 995, 996, 1131, 1132])
		]
			.filter((f) => f < 2500)
			.sort((a, b) => a - b);
		const found = flashFrames(RING, sample(frames, ringCovers(true)));
		expect(found).toHaveLength(1);
		expect(found[0].message).toMatch(/^Clip "ring"/);
		expect(flashFrames(RING, sample(frames, ringCovers(false)))).toEqual([]);
	});

	it('warns about a short gap between two full-screen clips, naming both', () => {
		const program: FlashProgram = {
			...RING,
			clips: [
				{ id: 'a', block: 'A.svelte', startFrame: 100, frames: 50 },
				{ id: 'b', block: 'B.svelte', startFrame: 154, frames: 50 }
			]
		};
		const covers = (f: number) => ({
			...(f >= 100 && f < 150 ? { a: 1 } : {}),
			...(f >= 154 && f < 204 ? { b: 1 } : {})
		});
		const found = flashFrames(program, sample(range(0, 300), covers));
		expect(found).toHaveLength(1);
		expect(found[0].frame).toBe(150);
		expect(found[0].message).toMatch(
			/^The footage shows for 4 frames \(6\.00–6\.16 s, program frames 150–153\) between full-screen clips "a" and "b"/
		);
	});

	it('leaves footage that stays on screen long enough, and a fade over footage that goes on', () => {
		const program: FlashProgram = {
			...RING,
			clips: [
				{ id: 'a', block: 'A.svelte', startFrame: 100, frames: 50 },
				{ id: 'b', block: 'B.svelte', startFrame: 170, frames: 50 },
				{ id: 'c', block: 'C.svelte', startFrame: 400, frames: 50 }
			]
		};
		const covers = (f: number) => ({
			...(f >= 100 && f < 150 ? { a: 1 } : {}),
			...(f >= 170 && f < 220 ? { b: 1 } : {}),
			// c fades out over its last 10 frames; the camera goes on after it for seconds.
			...(f >= 400 && f < 450 ? { c: f >= 440 ? (449 - f) / 10 : 1 } : {})
		});
		expect(flashFrames(program, sample(range(0, 900), covers))).toEqual([]);
	});

	it('warns about footage between a full-screen clip and a cut, and suggests the snap', () => {
		// "a" ends 3 frames before the cut at 2000: the old shot shows for 3 frames.
		const program: FlashProgram = {
			...RING,
			clips: [{ id: 'a', block: 'A.svelte', startFrame: 1900, frames: 97 }]
		};
		const covers = (f: number) => (f >= 1900 && f < 1997 ? { a: 1 } : {});
		const found = flashFrames(program, sample(range(1800, 2200), covers));
		expect(found).toHaveLength(1);
		expect(found[0].message).toMatch(
			/^Clip "a" \(A\.svelte\) is full-screen and ends 3 frames \(0\.12 s\) before the cut at 80\.00 s/
		);
		expect(found[0].message).toContain('"snap": "cut"');
	});

	it('warns about a full-screen clip edge just after a cut, and not about one on the cut', () => {
		const program: FlashProgram = {
			...RING,
			clips: [
				{ id: 'late', block: 'A.svelte', startFrame: 2004, frames: 50 },
				{ id: 'on', block: 'B.svelte', startFrame: 1900, frames: 100 }
			]
		};
		const covers = (f: number) => ({
			...(f >= 2004 && f < 2054 ? { late: 1 } : {}),
			...(f >= 1900 && f < 2000 ? { on: 1 } : {})
		});
		const found = flashFrames(program, sample(range(1800, 2200), covers));
		expect(found.map((w) => w.message)).toEqual([
			expect.stringMatching(
				/^Clip "late" \(A\.svelte\) is full-screen and starts 4 frames \(0\.16 s\) after the cut at 80\.00 s/
			)
		]);
	});

	it('also names a full-screen clip edge that covers a cut by a few frames', () => {
		const program: FlashProgram = {
			...RING,
			clips: [{ id: 'over', block: 'A.svelte', startFrame: 1900, frames: 103 }]
		};
		const covers = (f: number) => (f >= 1900 && f < 2003 ? { over: 1 } : {});
		const found = flashFrames(program, sample(range(1800, 2200), covers));
		expect(found.map((w) => w.message)).toEqual([
			expect.stringMatching(/^Clip "over" .* ends 3 frames \(0\.12 s\) after the cut at 80\.00 s/)
		]);
	});

	it('leaves frames inside transition windows out: a declared transition is meant', () => {
		const program: FlashProgram = {
			...RING,
			transitions: [{ startFrame: 988, frames: 16 }]
		};
		expect(flashFrames(program, sample(range(880, 1140), ringCovers(true)))).toEqual([]);
	});

	it('counts clips that never cover the frame as overlays, not as full-screen', () => {
		const program: FlashProgram = {
			...RING,
			clips: [
				{ id: 'title', block: 'T.svelte', startFrame: 100, frames: 10 },
				{ id: 'b', block: 'B.svelte', startFrame: 112, frames: 10 }
			]
		};
		// "title" never reaches FULL_COVER: no full-screen clip, so nothing flashes.
		const covers = (f: number) => (f >= 100 && f < 122 ? { title: 0.5, b: 0 } : {});
		expect(flashFrames(program, sample(range(0, 300), covers))).toEqual([]);
	});

	it('adds covers of clips on top of each other', () => {
		// Two half-opaque full-frame planes do not hide the footage; a full one over them does.
		const program: FlashProgram = {
			...RING,
			clips: [
				{ id: 'a', block: 'A.svelte', startFrame: 100, frames: 50 },
				{ id: 'b', block: 'B.svelte', startFrame: 150, frames: 50 },
				{ id: 'veil', block: 'V.svelte', startFrame: 145, frames: 10 }
			]
		};
		const covers = (f: number) => ({
			...(f >= 100 && f < 150 ? { a: f >= 145 ? 0.5 : 1 } : {}),
			...(f >= 150 && f < 200 ? { b: 1 } : {}),
			...(f >= 145 && f < 155 ? { veil: FULL_COVER } : {})
		});
		expect(flashFrames(program, sample(range(0, 300), covers))).toEqual([]);
	});
});

describe('planeCover', () => {
	const plane = { opacity: 1, visible: true, media: false, color: 0, image: 'none' };
	it('is the opacity of an opaque background colour, picture or opaque gradient', () => {
		expect(planeCover({ ...plane, color: 1 })).toBe(1);
		expect(planeCover({ ...plane, color: 1, opacity: 0.4 })).toBeCloseTo(0.4);
		expect(planeCover({ ...plane, media: true, opacity: 0.5 })).toBeCloseTo(0.5);
		expect(planeCover({ ...plane, image: 'linear-gradient(rgb(0, 0, 0), rgb(9, 9, 9))' })).toBe(1);
	});
	it('is 0 for hidden, transparent or see-through planes', () => {
		expect(planeCover({ ...plane, color: 1, visible: false })).toBe(0);
		expect(planeCover(plane)).toBe(0);
		expect(planeCover({ ...plane, image: 'linear-gradient(rgba(0, 0, 0, 0), rgb(0, 0, 0))' })).toBe(
			0
		);
		expect(planeCover({ ...plane, color: 0.3 })).toBeCloseTo(0.3);
	});
});

describe('coverable', () => {
	it('takes front clips, not clips behind the speaker or in a slot', () => {
		expect(coverable({})).toBe(true);
		expect(coverable({ layer: 'front' })).toBe(true);
		expect(coverable({ layer: 'behind' })).toBe(false);
		expect(coverable({ slot: 'panel' })).toBe(false);
	});
});

describe('cutEdges and offCut', () => {
	it('lists every cut start and the end of the last cut', () => {
		expect(cutEdges(RING.cuts)).toEqual([0, 2000, 2500]);
		expect(cutEdges([])).toEqual([]);
	});
	it('finds an edge a few frames off a cut, but not on it or far from it', () => {
		const edges = [0, 2000, 2500];
		expect(offCut(1997, edges, FPS)).toEqual({ cut: 2000, off: -3 });
		expect(offCut(2010, edges, FPS)).toEqual({ cut: 2000, off: 10 });
		expect(offCut(2000, edges, FPS)).toBeNull();
		expect(offCut(2011, edges, FPS)).toBeNull();
		expect(offCut(1000, edges, FPS)).toBeNull();
	});
});

describe('shotsOffCut', () => {
	it('warns about a shot edge a few frames off a cut, once per edge', () => {
		const shots = [
			{ id: 'cam', startFrame: 0, frames: 1997 },
			{ id: 'zoom', startFrame: 1997, frames: 503 }
		];
		expect(shotsOffCut(shots, [0, 2000, 2500], FPS)).toEqual([
			{
				level: 'warning',
				item: 'zoom',
				field: 'shots[1].from',
				message: expect.stringMatching(
					/^Shot "zoom" starts 3 frames \(0\.12 s\) before the cut at 80\.00 s \(where shot "cam" ends\): .*\{ "from": "cut" \} on "zoom"/
				)
			}
		]);
	});
	it('says nothing about shot edges a few frames inside the program start or end', () => {
		const shots = [{ id: 'win', startFrame: 9, frames: 2485 }];
		expect(shotsOffCut(shots, [0, 2500], FPS)).toEqual([]);
	});
	it('says nothing about shots on cuts', () => {
		const shots = [
			{ id: 'cam', startFrame: 0, frames: 2000 },
			{ id: 'zoom', startFrame: 2000, frames: 500 }
		];
		expect(shotsOffCut(shots, [0, 2000, 2500], FPS)).toEqual([]);
	});
});

describe('snapSpan', () => {
	const edges = [0, 2000, 2500];
	it('moves both edges onto the nearest cut with "cut"', () => {
		const notes: string[] = [];
		const span = snapSpan('cut', { start: 79.88, end: 100.1 }, edges, FPS, (_, m) => notes.push(m));
		expect(span).toEqual({ start: 80, end: 100 });
		expect(notes).toEqual([]);
	});
	it('moves one edge with { until: "cut" } and leaves the other', () => {
		const span = snapSpan({ until: 'cut' }, { start: 79.88, end: 100.1 }, edges, FPS, () => {});
		expect(span).toEqual({ start: 79.88, end: 100 });
	});
	it('leaves an edge with no cut within 0.4 s where it is, and says so', () => {
		const notes: [string, string][] = [];
		const span = snapSpan({ from: 'cut' }, { start: 50, end: 60 }, edges, FPS, (edge, m) =>
			notes.push([edge, m])
		);
		expect(span).toEqual({ start: 50, end: 60 });
		expect(notes).toEqual([
			[
				'from',
				expect.stringMatching(/^"snap": "cut" found no cut within 0\.4 s of "from" \(50\.00 s\)/)
			]
		]);
	});
	it('without a cut list, says snap needs one', () => {
		const notes: string[] = [];
		const span = snapSpan('cut', { start: 1, end: 2 }, null, FPS, (_, m) => notes.push(m));
		expect(span).toEqual({ start: 1, end: 2 });
		expect(notes).toEqual([expect.stringMatching(/needs a cut list/)]);
	});
	it('does nothing without snap', () => {
		const span = { start: 79.88, end: 100.1 };
		expect(snapSpan(undefined, span, edges, FPS, () => {})).toEqual(span);
	});
});

describe('nested3dMessage', () => {
	it('names the clip, the element and what to do', () => {
		const message = nested3dMessage({
			clip: 'dice',
			block: 'Dice.svelte',
			path: 'div.scene > div.die'
		});
		expect(message).toMatch(/^Clip "dice" \(Dice\.svelte\): nested CSS 3D/);
		expect(message).toContain('div.scene > div.die');
	});
});

describe('review round 1', () => {
	it('names both shots of a chained edge and the edge field to snap on each', () => {
		const shots = [
			{ id: 'cam', startFrame: 0, frames: 2003 },
			{ id: 'zoom', startFrame: 2003, frames: 497 }
		];
		const [w] = shotsOffCut(shots, [0, 2000, 2500], FPS);
		expect(w.message).toContain('where shot "cam" ends');
		expect(w.message).toContain('{ "until": "cut" } on "cam" and { "from": "cut" } on "zoom"');
	});

	it('leaves a full-screen clip edge off a cut alone inside a transition window', () => {
		// "card" starts 3 frames before the cut at 2000 inside a dissolve centred on its start.
		const program: FlashProgram = {
			...RING,
			clips: [{ id: 'card', block: 'A.svelte', startFrame: 1997, frames: 100 }],
			transitions: [{ startFrame: 1991, frames: 12 }]
		};
		const covers = (f: number) => (f >= 1997 && f < 2097 ? { card: f < 2003 ? 0.5 : 1 } : {});
		expect(flashFrames(program, sample(range(1900, 2200), covers))).toEqual([]);
	});

	it('leaves a full-screen clip edge off a cut alone when the clip has faded out before it', () => {
		// "card" fades out over 1 s (frames 1965–1995) and ends 5 frames before the cut.
		const program: FlashProgram = {
			...RING,
			clips: [{ id: 'card', block: 'A.svelte', startFrame: 1800, frames: 195 }]
		};
		const covers = (f: number) =>
			f >= 1800 && f < 1995 ? { card: f >= 1965 ? (1995 - f) / 30 : 1 } : {};
		expect(flashFrames(program, sample(range(1700, 2200), covers))).toEqual([]);
	});

	it('does not snap both edges of a short span onto one cut, and says why', () => {
		const notes: string[] = [];
		const span = snapSpan('cut', { start: 79.9, end: 80.2 }, [0, 2000, 2500], FPS, (_, m) =>
			notes.push(m)
		);
		expect(span).toEqual({ start: 79.9, end: 80.2 });
		expect(notes).toEqual([
			expect.stringMatching(/^"snap": "cut" would put both edges on the cut at 80\.00 s/)
		]);
	});

	it('names the clip of a nested 3D warning, for telling it once per clip', () => {
		const message = nested3dMessage({ clip: 'dice', block: 'Dice.svelte', path: 'div > div' });
		expect(nested3dClip(message)).toBe('dice');
		expect(nested3dClip('Clip "dice" (Dice.svelte): something else')).toBeNull();
	});

	it('counts a picture as opaque only when every sampled pixel is', () => {
		const pixels = (alphas: number[]) =>
			new Uint8ClampedArray(alphas.flatMap((a) => [10, 20, 30, a]));
		expect(opaquePixels(pixels([255, 255, 255, 251]))).toBe(true);
		expect(opaquePixels(pixels([255, 255, 0, 255]))).toBe(false);
		expect(opaquePixels(pixels([]))).toBe(false);
	});

	it('does not count a CSS background image as hiding the footage: its alpha is unknown', () => {
		const plane = { opacity: 1, visible: true, media: false, color: 0, image: 'url("a.png")' };
		expect(planeCover(plane)).toBe(0);
	});
});

describe('review round 2: alphaReader', () => {
	/** A context that reads `alpha` for every pixel, and throws once a "remote" picture is drawn. */
	const context = () => {
		let tainted = false;
		let alpha = 255;
		return {
			made: true,
			clearRect() {},
			drawImage(picture: { remote?: boolean; alpha: number }) {
				if (picture.remote) tainted = true;
				alpha = picture.alpha;
			},
			getImageData() {
				if (tainted) throw new Error('SecurityError: the canvas has been tainted');
				return { data: new Uint8ClampedArray([0, 0, 0, alpha, 0, 0, 0, alpha]) };
			}
		};
	};

	it('reads local pictures again after a cross-origin one tainted its canvas', () => {
		let made = 0;
		const read = alphaReader<{ remote?: boolean; alpha: number }>(() => {
			made++;
			return context();
		}, 2);
		expect(read({ alpha: 255 })).toBe(true);
		expect(read({ remote: true, alpha: 255 })).toBe(false);
		expect(read({ alpha: 255 })).toBe(true);
		expect(read({ alpha: 0 })).toBe(false);
		expect(made).toBe(2);
	});

	it('counts every picture as see-through without a canvas', () => {
		expect(alphaReader(() => null)({})).toBe(false);
	});
});
