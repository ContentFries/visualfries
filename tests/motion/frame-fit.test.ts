import { describe, expect, it } from 'vitest';
import {
	addReach,
	contentReach,
	cutShare,
	emptyPart,
	frameFitKey,
	frameFitMessage,
	newReach,
	outsideSafe,
	reachBox,
	safeBoxes
} from '$lib/motion/frame-fit.js';
import { resolveFormat } from '$lib/motion/format.js';
import { textOverFaceMessage } from '$lib/motion/text-over-face.js';
import type { Rect } from '$lib/motion/shots/index.js';

const PORTRAIT: Rect = { x: 0, y: 0, width: 1080, height: 1920 };

describe('cutShare', () => {
	it('counts the part of the content that reaches into the frame and lies past its edge', () => {
		// A 1680 px panel laid out for 1920 × 1080, from x 120 in a 1080 px wide frame.
		const panel = { x: 120, y: 112, width: 1680, height: 896 };
		const { share, edges } = cutShare([panel], PORTRAIT);
		expect(share).toBeCloseTo(720 / 1680);
		expect(edges).toEqual(['right']);
	});

	it('leaves out content parked off the frame and names the edges, most cut first', () => {
		const inside = { x: 20, y: 100, width: 1000, height: 800 };
		const parked = { x: 2200, y: 100, width: 1000, height: 800 };
		expect(cutShare([inside, parked], PORTRAIT).share).toBe(0);
		const both = cutShare(
			[
				{ x: -100, y: 0, width: 400, height: 100 },
				{ x: 900, y: 1800, width: 100, height: 400 }
			],
			PORTRAIT
		);
		expect(both.edges).toEqual(['bottom', 'left']);
		expect(both.share).toBeCloseTo((100 * 100 + 280 * 100) / (400 * 100 + 100 * 400));
		expect(cutShare([], PORTRAIT)).toEqual({ share: 0, edges: [] });
	});
});

describe('safe zone', () => {
	const format = resolveFormat([1080, 1920]);

	it('turns the insets into the boxes above and below the notch', () => {
		const boxes = safeBoxes([1080, 1920], format.safe);
		const s = format.safe;
		expect(boxes).toEqual([
			{ x: s.left, y: s.top, width: 1080 - s.left - s.rightUpper, height: s.notchY - s.top },
			{
				x: s.left,
				y: s.notchY,
				width: 1080 - s.left - s.right,
				height: 1920 - s.bottom - s.notchY
			}
		]);
	});

	it('measures the share of the text inside the frame that lies outside it', () => {
		const boxes = safeBoxes([1080, 1920], format.safe);
		const s = format.safe;
		// Captions low on the chest, at y 0.78 of the frame: under the platforms' captions.
		const low = { x: 100, y: 1460, width: 880, height: 80 };
		expect(outsideSafe([low], PORTRAIT, boxes)).toBe(1);
		const mid = { x: s.left + 10, y: 900, width: 300, height: 80 };
		expect(outsideSafe([mid], PORTRAIT, boxes)).toBe(0);
		// Text outside the frame is not the safe zone's: half of this line is off the frame.
		const half = { x: -150, y: 900, width: 300, height: 80 };
		expect(outsideSafe([half], PORTRAIT, boxes)).toBeCloseTo(s.left / 150);
	});
});

describe('emptyPart', () => {
	it('finds a 16:9 layout in the top half of a 9:16 frame', () => {
		const reach = contentReach(
			[
				{ x: 120, y: 34, width: 900, height: 80 },
				{ x: 120, y: 112, width: 1680, height: 896 }
			],
			PORTRAIT
		);
		expect(reach).toEqual({ x: 120, y: 34, width: 960, height: 974 });
		expect(emptyPart(reach, [1080, 1920])).toEqual({
			axis: 'y',
			from: 34,
			to: 1008,
			empty: 1 - 1008 / 1920
		});
	});

	it('sums content over frames and leaves a small label in a corner out of its reach', () => {
		const reach = newReach();
		// The panel of a 16:9 layout on two frames, and a small label at the bottom left.
		for (let i = 0; i < 2; i++)
			addReach(reach, [{ x: 120, y: 112, width: 900, height: 896 }], PORTRAIT);
		addReach(reach, [{ x: 20, y: 1860, width: 120, height: 24 }], PORTRAIT);
		const box = reachBox(reach, PORTRAIT)!;
		expect(box.y).toBeGreaterThan(112);
		expect(box.y + box.height).toBeLessThan(1008);
		expect(emptyPart(box, [1080, 1920])).toMatchObject({ axis: 'y' });
		expect(contentReach([{ x: 20, y: 1860, width: 120, height: 24 }], PORTRAIT)!.y).toBe(1860);
		expect(reachBox(newReach(), PORTRAIT)).toBeNull();
	});

	it('says nothing for content that reaches far enough, starts lower, or is not there', () => {
		const size: [number, number] = [1080, 1920];
		expect(emptyPart({ x: 0, y: 40, width: 1080, height: 1400 }, size)).toBeNull();
		// A title card centred in the frame does not start at an edge.
		expect(emptyPart({ x: 200, y: 700, width: 680, height: 300 }, size)).toBeNull();
		expect(emptyPart(null, size)).toBeNull();
		// A portrait layout in a landscape frame fills the left part.
		expect(emptyPart({ x: 0, y: 0, width: 1080, height: 1080 }, [1920, 1080])).toMatchObject({
			axis: 'x',
			to: 1080
		});
	});
});

describe('frameFitMessage', () => {
	const format = {
		size: [1080, 1920] as [number, number],
		class: 'portrait',
		safe: resolveFormat([1080, 1920]).safe
	};

	it('names the clip, the share, the edge and the time, and leaves the decision to the agent', () => {
		const message = frameFitMessage(
			{
				clip: 'hook',
				block: 'blocks/HookCards.svelte',
				frame: 310,
				finding: { kind: 'cut', share: 0.613, edges: ['right'] }
			},
			format,
			25
		);
		expect(message).toBe(
			`Clip "hook" (blocks/HookCards.svelte): 61 % of its content lies outside the frame (past the right edge of the 1080×1920 frame) from 12.40 s (program time) on, for 1 s or more in the frames checked. Content that only reaches into the frame is cut by its edge; it looks laid out for another frame size. Lay it out from the clip's size instead of fixed pixels (percentages or container units, the --safe-* insets, or its own layout for clip.format.class "portrait"). Look at a still at 12.40 s before deciding.`
		);
		expect(frameFitKey(message)).toBe('hook\u0000of its content lies outside the frame');
	});

	it('words the empty frame and the safe zone, each with its own key', () => {
		const empty = frameFitMessage(
			{
				clip: 'hook',
				block: 'blocks/HookCards.svelte',
				frame: 310,
				finding: { kind: 'empty', axis: 'y', from: 34, to: 1008, empty: 0.475 }
			},
			format,
			25
		);
		expect(empty).toContain(
			'it covers the whole frame but leaves the bottom 48 % of it empty: its content only reaches y 34–1008 of 1920 px from 12.40 s'
		);
		const safe = frameFitMessage(
			{
				clip: 'cap',
				block: '@visualfries/captions',
				frame: 0,
				finding: { kind: 'safe', share: 1 }
			},
			format,
			25
		);
		expect(safe).toMatch(
			/^Clip "cap" \(@visualfries\/captions\): 100 % of its text lies outside the safe zone of the 1080×1920 format \(insets: top \d+, right \d+, bottom \d+, left \d+ px, \d+ px on the right above y \d+\)/
		);
		const keys = new Set([empty, safe].map(frameFitKey));
		expect(keys.size).toBe(2);
		expect(keys.has(null)).toBe(false);
	});

	it('finds no key in other warnings', () => {
		const face = textOverFaceMessage(
			{ clip: 'k', block: 'b', frame: 0, share: 0.3, head: { x: 0, y: 0, width: 10, height: 10 } },
			[1920, 1080],
			30
		);
		expect(frameFitKey(face)).toBeNull();
	});
});
