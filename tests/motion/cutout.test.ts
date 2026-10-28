import { describe, expect, it } from 'vitest';
import type { ShotSpan } from '$lib/motion/shots/index.js';
import {
	cutoutEdgeMessage,
	cutoutEdges,
	programFraming,
	shotTop,
	type FramingData
} from '$lib/motion/framing.js';
import { programFootageAt, type FootageMap } from '$lib/motion/footage-map.js';
import type { FootageFrames, SubjectBox } from '$lib/motion/resolve.js';
import type { ProgramTransition } from '$lib/motion/program.js';

/** A seated speaker in landscape footage: the matte runs into the recording's bottom edge. */
const SEATED: SubjectBox = {
	x: 0.3,
	y: 0.12,
	width: 0.4,
	height: 0.88,
	headX: 0.5,
	headY: 0.12,
	headHeight: 0.25
};

function source(boxes: (SubjectBox | null)[]): FootageFrames {
	const url = 'http://visualfries.local/footage/';
	return {
		url,
		first: 0,
		last: boxes.length - 1,
		ranges: [{ url, first: 0, last: boxes.length - 1, boxes }],
		total: boxes.length,
		width: 1920,
		height: 1080,
		startFrame: 0,
		subject: true
	};
}

const span = (params: Record<string, unknown>, extra: Partial<ShotSpan> = {}): ShotSpan => ({
	id: 'me',
	shot: 'cutout',
	startFrame: 0,
	frames: 60,
	params,
	morphFrames: 0,
	morphEase: 'none',
	...extra
});

const data = (
	shots: ShotSpan[],
	boxes: (SubjectBox | null)[]
): FramingData & { transitions: ProgramTransition[] } => {
	const map: FootageMap = {
		frames: boxes.length,
		totals: { talk: boxes.length },
		spans: [
			{ owner: 'c', kind: 'cut', source: 'talk', startFrame: 0, frames: boxes.length, srcIn: 0 }
		],
		windows: []
	};
	return {
		fps: 30,
		size: [1080, 1920],
		cls: 'portrait',
		format: {
			class: 'portrait',
			aspect: '9:16',
			width: 1080,
			height: 1920,
			zone: 'all',
			safe: { top: 288, right: 300, bottom: 672, left: 120, notchY: 840, rightUpper: 192 }
		},
		footage: { talk: source(boxes) },
		footageMap: map,
		shots,
		transitions: []
	};
};

const still = (n = 60) => Array.from({ length: n }, () => SEATED);

describe('shotTop', () => {
	it('takes a low percentile of the raw head tops over the shot', () => {
		const boxes = Array.from({ length: 100 }, (_, i) =>
			i === 50 ? null : { ...SEATED, headY: 0.1 + (i % 10) / 100 }
		);
		const d = data([span({})], boxes);
		expect(shotTop({ startFrame: 0, frames: 100 }, d.footageMap, d.footage, 'talk')).toBeCloseTo(
			0.11,
			5
		);
		expect(shotTop({ startFrame: 0, frames: 100 }, null, d.footage, 'talk')).toBeNull();
	});

	it('holds the cutout panel still while the head bobs', () => {
		const boxes = Array.from({ length: 90 }, (_, i) => ({
			...SEATED,
			headY: 0.12 + 0.04 * Math.sin(i / 5)
		}));
		const d = data([span({ anchor: 'bottom-left', size: 0.15 }, { frames: 90 })], boxes);
		const framing = programFraming(d);
		const at = (f: number) => framing.layoutFor(f, programFootageAt(d.footageMap!, f));
		const panel = at(0).slots.panel;
		expect(panel.height).toBeGreaterThan(200);
		for (let f = 1; f < 90; f++) expect(at(f).slots.panel, `frame ${f}`).toEqual(panel);
		// The body sits on the bottom edge throughout: the recording holds still, the head bobs
		// in it, under the panel.
		expect(at(10).camera).toEqual(at(0).camera);
		for (let f = 0; f < 90; f++)
			expect(at(f).camera.y + boxes[f].headY * at(f).camera.height).toBeGreaterThan(
				panel.y + panel.height
			);
	});
});

describe('cutout edge check', () => {
	it('is quiet for a speaker sitting on the bottom edge inside the frame', () => {
		for (const anchor of ['bottom-left', 'bottom', 'bottom-right'])
			expect(cutoutEdges(data([span({ anchor })], still())), anchor).toEqual([]);
	});

	it('finds the speaker cut by an edge it is not anchored to, and lets the anchored one be', () => {
		// A head 30 % of the frame: the shoulders run past the right edge (and the left one,
		// which the speaker sits against).
		const edges = cutoutEdges(data([span({ anchor: 'bottom-left', size: 0.3 })], still()));
		expect(edges).toHaveLength(1);
		expect(edges[0]).toMatchObject({ shot: 'me', kind: 'frame', edge: 'right', from: 0, to: 59 });
		expect(edges[0].pixels).toBeGreaterThan(150);
		const message = cutoutEdgeMessage(edges[0], span({ anchor: 'bottom-left', size: 0.3 }), 30);
		expect(message).toContain(`Shot "me" (cutout) cuts the speaker off at the frame's right edge`);
		expect(message).toContain('a smaller "size"');
	});

	it('finds a body cut by the recording ending in the middle of the frame', () => {
		const edges = cutoutEdges(data([span({ anchor: 'left' })], still()));
		expect(edges).toHaveLength(1);
		expect(edges[0]).toMatchObject({ kind: 'recording', edge: 'bottom', from: 0, to: 59 });
		const message = cutoutEdgeMessage(edges[0], span({ anchor: 'left' }), 30);
		expect(message).toContain("the recording's bottom edge");
		expect(message).toContain('"bottom-left"');
		// A key lifting a bottom-anchored speaker shows the same line.
		const keys: ShotSpan['keys'] = [{ frame: 0, values: { y: -200 }, ease: 'none', mix: 'oklab' }];
		const lifted = cutoutEdges(data([span({ anchor: 'bottom' }, { keys })], still()));
		expect(lifted.map((e) => [e.kind, e.edge])).toEqual([['recording', 'bottom']]);
		expect(cutoutEdgeMessage(lifted[0], span({ anchor: 'bottom' }, { keys }), 30)).toContain(
			'a "y" key closer to 0'
		);
	});

	it('turns the speaker with a rotation key before it looks at the edges', () => {
		// Turned a quarter about the face, the seated torso lies across the frame to the left,
		// past its left edge, which the bottom anchor does not sit the speaker against.
		const keys: ShotSpan['keys'] = [
			{ frame: 0, values: { rotation: 90 }, ease: 'none', mix: 'oklab' }
		];
		const edges = cutoutEdges(data([span({ anchor: 'bottom' }, { keys })], still()));
		const left = edges.find((e) => e.kind === 'frame' && e.edge === 'left');
		expect(left).toMatchObject({ from: 0, to: 59 });
		expect(left!.pixels).toBeGreaterThan(100);
		expect(cutoutEdgeMessage(left!, span({ anchor: 'bottom' }, { keys }), 30)).toContain(
			'a "rotation" key closer to 0'
		);
		// The recording's bottom edge, where the body is cut, turns off the frame on the left.
		expect(edges.map((e) => e.kind)).toEqual(['frame']);
		// Turned a twelfth, it runs slanted across the frame's bottom left corner instead.
		const tilt: ShotSpan['keys'] = [
			{ frame: 0, values: { rotation: 30 }, ease: 'none', mix: 'oklab' }
		];
		const slant = cutoutEdges(data([span({ anchor: 'bottom' }, { keys: tilt })], still()));
		expect(slant.find((e) => e.kind === 'recording' && e.edge === 'bottom')).toMatchObject({
			from: 0,
			to: 59
		});
		// Unturned, the same shot is quiet.
		expect(cutoutEdges(data([span({ anchor: 'bottom' })], still()))).toEqual([]);
	});

	it('ignores a blink of a cut and a speaker wholly off the frame', () => {
		const wide = still().map((b, i) => (i >= 20 && i < 23 ? { ...b, x: 0.05, width: 0.9 } : b));
		expect(cutoutEdges(data([span({ anchor: 'bottom' })], wide))).toEqual([]);
		// Moved out of the frame by a key (a speaker sent away): nothing of it is cut.
		const keys: ShotSpan['keys'] = [{ frame: 0, values: { x: 3000 }, ease: 'none', mix: 'oklab' }];
		expect(cutoutEdges(data([span({ anchor: 'bottom' }, { keys })], still()))).toEqual([]);
	});

	it('looks only at cutout shots after their morph', () => {
		const edges = cutoutEdges(data([span({ anchor: 'left' }, { morphFrames: 20 })], still()), {
			startFrame: 0,
			frames: 40
		});
		expect(edges[0]).toMatchObject({ from: 20, to: 39 });
		expect(cutoutEdges(data([{ ...span({}), shot: 'full' }], still()))).toEqual([]);
	});
});
