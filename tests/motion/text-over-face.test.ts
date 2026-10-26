import { describe, expect, it } from 'vitest';
import {
	FACE_TEXT_SHARE,
	clearOfSpeaker,
	faceCovered,
	freeSide,
	headOnStage,
	textBehindClip,
	textBehindMessage,
	textOverFaceClip,
	textOverFaceMessage,
	type SpeakerMask
} from '$lib/motion/text-over-face.js';
import type { SubjectBox } from '$lib/motion/resolve.js';
import type { Rect } from '$lib/motion/shots/index.js';

const STAGE: Rect = { x: 0, y: 0, width: 1920, height: 1080 };
/** A speaker left of centre: head top at 10 %, 0.42 of the footage tall. */
const SPEAKER: SubjectBox = {
	x: 0.3,
	y: 0.1,
	width: 0.4,
	height: 0.9,
	headX: 0.45,
	headY: 0.1,
	headHeight: 0.42
};

describe('headOnStage', () => {
	it('puts the head where a full-frame camera shows it, a head width around its column', () => {
		const head = headOnStage(SPEAKER, { camera: STAGE, clip: STAGE })!;
		expect(head.y).toBeCloseTo(108);
		expect(head.height).toBeCloseTo(0.42 * 1080);
		expect(head.width).toBeCloseTo((0.42 * 1080) / 1.4);
		expect(head.x + head.width / 2).toBeCloseTo(0.45 * 1920);
	});

	it('follows a punched-in camera, whole, and is null outside the camera window', () => {
		// The footage scaled 1.5× about the frame centre: the head grows and moves up and left.
		const camera = { x: -480, y: -270, width: 2880, height: 1620 };
		const head = headOnStage(SPEAKER, { camera, clip: STAGE })!;
		expect(head.height).toBeCloseTo(0.42 * 1620);
		expect(head.y).toBeCloseTo(-270 + 0.1 * 1620);
		// A window on the right half shows none of it.
		const right = { x: 1200, y: 0, width: 720, height: 1080 };
		expect(headOnStage(SPEAKER, { camera, clip: right })).toBeNull();
	});

	it('turns the head about the pivot of a rotation key', () => {
		const pivot = { x: 960, y: 540 };
		const head = headOnStage(SPEAKER, {
			camera: STAGE,
			clip: STAGE,
			turn: { rotation: 180, pivot }
		})!;
		// Turned half round the frame centre: the head's middle lands mirrored below and right.
		const cx = head.x + head.width / 2;
		const cy = head.y + head.height / 2;
		expect(cx).toBeCloseTo(1920 - 0.45 * 1920);
		expect(cy).toBeCloseTo(1080 - (108 + (0.42 * 1080) / 2));
	});

	it('guesses a head size when the matte measured none', () => {
		const { headHeight: _, ...old } = SPEAKER;
		expect(headOnStage(old, { camera: STAGE, clip: STAGE })!.height).toBeCloseTo(0.22 * 1080);
	});
});

describe('faceCovered', () => {
	const head: Rect = { x: 100, y: 100, width: 200, height: 280 };

	it('is 0 without text on the head and 1 under a box over all of it', () => {
		expect(faceCovered(head, [])).toBe(0);
		expect(faceCovered(head, [{ x: 400, y: 100, width: 300, height: 100 }])).toBe(0);
		expect(faceCovered(head, [{ x: 0, y: 0, width: 600, height: 600 }])).toBe(1);
	});

	it('measures the share of the face, counting overlapping boxes once', () => {
		const left = { x: 0, y: 0, width: 200, height: 600 };
		expect(faceCovered(head, [left])).toBeCloseTo(0.5, 1);
		expect(faceCovered(head, [left, left, { ...left, width: 150 }])).toBeCloseTo(0.5, 1);
		// A line of text across the middle third of the head.
		const line = { x: 0, y: 100 + 280 / 3, width: 600, height: 280 / 3 };
		expect(faceCovered(head, [line])).toBeGreaterThan(0.35);
	});

	it('covers only the face inside the camera window', () => {
		const all = [{ x: 0, y: 0, width: 600, height: 600 }];
		// A window that keeps the left tenth of the head: text over that sliver covers little.
		const sliver = { x: 0, y: 0, width: 120, height: 600 };
		expect(faceCovered(head, all, sliver)).toBeLessThan(FACE_TEXT_SHARE);
		expect(faceCovered(head, all, { x: 0, y: 0, width: 200, height: 600 })).toBeCloseTo(0.5, 1);
	});

	it('leaves a box over a corner of the head (hair, the room beside the chin) under the threshold', () => {
		const corner = { x: 0, y: 0, width: 140, height: 160 };
		const share = faceCovered(head, [corner]);
		expect(share).toBeGreaterThan(0);
		expect(share).toBeLessThan(FACE_TEXT_SHARE);
	});
});

describe('freeSide', () => {
	it('names the wider side of the frame beside the head', () => {
		expect(freeSide({ x: 700, y: 0, width: 300, height: 400 }, [1920, 1080])).toEqual({
			side: 'right',
			from: 1000,
			to: 1920
		});
		expect(freeSide({ x: 1300, y: 0, width: 300, height: 400 }, [1920, 1080])).toEqual({
			side: 'left',
			from: 0,
			to: 1300
		});
	});
});

describe('textOverFaceMessage', () => {
	const found = {
		clip: 'k-habit',
		block: 'blocks/Callout.svelte',
		frame: 9306,
		share: 0.384,
		head: { x: 700, y: 100, width: 320, height: 450 }
	};

	it('names the clip, the time, the share and the free side, and leaves the decision to the agent', () => {
		const message = textOverFaceMessage(found, [1920, 1080], 30);
		expect(message).toBe(
			`Clip "k-habit" (blocks/Callout.svelte): its text covers the speaker's face from 310.20 s (program time) on, up to 38 % of the face in the frames checked. The right side of the frame (x 1020–1920 of 1920 px) is clear of the head. If the text is not meant to sit on the face, try: move it to the right side (a smaller size if it must fit there); "layer": "behind" to put it behind the speaker; a shot that frees a slot beside the speaker ("strip" or "window") for it. Look at a still at 310.20 s before deciding.`
		);
		expect(textOverFaceClip(message)).toBe('k-habit');
	});

	it('suggests above or below when the head spans the frame', () => {
		const wide = { ...found, head: { x: 0, y: 0, width: 1080, height: 1500 } };
		const message = textOverFaceMessage(wide, [1080, 1920], 30);
		expect(message).toContain('The head spans the whole width of the frame there.');
		expect(message).toContain('move it above or below the face');
	});

	it('finds no clip in other warnings', () => {
		expect(textOverFaceClip('Clip "x": its region holds none of the speaker from 1 s')).toBeNull();
	});
});

/** A mask of a 1080 × 1920 frame, 20 px a cell, where `inside(x, y)` holds the speaker. */
function mask(inside: (x: number, y: number) => boolean): SpeakerMask {
	const step = 20;
	const cols = 54;
	const rows = 96;
	const hit: boolean[] = [];
	for (let r = 0; r < rows; r++)
		for (let c = 0; c < cols; c++) hit.push(inside((c + 0.5) * step, (r + 0.5) * step));
	return { step, cols, rows, hit };
}

describe('clearOfSpeaker', () => {
	// A face filling the width of a portrait frame from y 400, its body below.
	const close = mask((x, y) => y >= 400 && x >= 60 && x < 1020);

	it("gives the band above the speaker and the sides at the text's height", () => {
		const text = { x: 200, y: 700, width: 680, height: 200 };
		expect(clearOfSpeaker(close, text, [1080, 1920])).toEqual({
			above: 400,
			left: 60,
			right: 1020
		});
	});

	it('leaves out bands too narrow to use; without a speaker the whole frame is clear', () => {
		const wide = mask((x, y) => y >= 20 && x >= 10);
		expect(clearOfSpeaker(wide, { x: 0, y: 700, width: 100, height: 50 }, [1080, 1920])).toEqual({
			above: null,
			left: null,
			right: null
		});
		const empty = mask(() => false);
		expect(clearOfSpeaker(empty, { x: 0, y: 0, width: 1, height: 1 }, [1080, 1920])).toEqual({
			above: 1920,
			left: null,
			right: null
		});
	});
});

describe('textBehindMessage', () => {
	it('names the clip, the share and the clear parts, and leaves the decision to the agent', () => {
		const message = textBehindMessage(
			{
				clip: 'hook',
				block: 'blocks/StackWords.svelte',
				frame: 10,
				share: 0.74,
				clear: { above: 400, left: null, right: null }
			},
			[1080, 1920],
			25
		);
		expect(message).toBe(
			`Clip "hook" (blocks/StackWords.svelte): the speaker covers its text behind them from 0.40 s (program time) on, up to 74 % of it in the frames checked (more than half for 0.5 s or more). Clear of the speaker there: the top 400 px of the frame, above the speaker. If the words are meant to be read, try: move them into a clear part (aligned to the top, or a smaller size if they must fit); bring them in front of the speaker. Look at a still at 0.40 s before deciding.`
		);
		expect(textBehindClip(message)).toBe('hook');
		expect(textOverFaceClip(message)).toBeNull();
	});

	it('says so when the speaker fills the frame around the text', () => {
		const clear = { above: null, left: null, right: null };
		const message = textBehindMessage(
			{ clip: 'w', block: 'b', frame: 0, share: 0.9, clear },
			[1080, 1920],
			25
		);
		expect(message).toContain('The speaker fills the frame around the text there.');
	});
});
