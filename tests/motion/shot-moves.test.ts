import { describe, expect, it } from 'vitest';
import {
	captionsInMoveClip,
	captionsInMoveMessage,
	moveAtStart,
	shotMoves
} from '$lib/motion/shot-moves.js';
import type { ProgramTransition, ResolvedKey } from '$lib/motion/program.js';
import type { ShotSpan } from '$lib/motion/shots/index.js';

const key = (frame: number, values: ResolvedKey['values']): ResolvedKey => ({
	frame,
	values,
	ease: 'sine.inOut',
	mix: 'oklab'
});

const shot = (s: Partial<ShotSpan> & Pick<ShotSpan, 'id' | 'shot' | 'startFrame' | 'frames'>) =>
	({ params: {}, morphFrames: 0, morphEase: 'expo.inOut', keys: [], ...s }) as ShotSpan;

const transition = (t: Partial<ProgramTransition>): ProgramTransition =>
	({
		id: 't',
		owner: 'b',
		kind: 'cut',
		outgoing: 'a',
		type: 'zoom-through',
		startFrame: 100,
		frames: 10,
		cutFrame: 105,
		align: 'center',
		direction: null,
		ease: null,
		params: {},
		sound: null,
		native: null,
		held: { in: 0, out: 0 },
		...t
	}) as ProgramTransition;

describe('shotMoves', () => {
	it('lists morphs, fast key moves and cut or shot transitions, in program order', () => {
		const moves = shotMoves({
			fps: 25,
			shots: [
				// A punch-in over 0.6 s, then a slow drift over the rest of the shot.
				shot({
					id: 'open',
					shot: 'behind',
					startFrame: 0,
					frames: 300,
					keys: [key(0, { scale: 1.2 }), key(15, { scale: 1 }), key(300, { scale: 1.07 })]
				}),
				shot({ id: 'auto', shot: 'strip', startFrame: 300, frames: 200, morphFrames: 18 }),
				// A fade of the footage only is not a move.
				shot({
					id: 'fade',
					shot: 'full',
					startFrame: 500,
					frames: 50,
					keys: [key(500, { opacity: 1 }), key(510, { opacity: 0 })]
				})
			],
			transitions: [transition({}), transition({ id: 'c', kind: 'clip', owner: 'card' })]
		});
		expect(moves).toEqual([
			{ what: 'the keys of shot "open"', from: 0, to: 15 },
			{ what: 'the zoom-through transition into "b"', from: 100, to: 110 },
			{ what: 'the strip shot "auto" morphing in', from: 300, to: 318 }
		]);
	});

	it('finds the move a clip starts inside, or up to two frames before', () => {
		const moves = [{ what: 'm', from: 300, to: 318 }];
		expect(moveAtStart(moves, 300)).toEqual(moves[0]);
		expect(moveAtStart(moves, 298)).toEqual(moves[0]);
		expect(moveAtStart(moves, 317)).toEqual(moves[0]);
		expect(moveAtStart(moves, 318)).toBeNull();
		expect(moveAtStart(moves, 290)).toBeNull();
	});

	it('joins the moves that overlap or follow on, so the end is clear of all of them', () => {
		const moves = [
			{ what: 'the strip shot "a" morphing in', from: 300, to: 318 },
			{ what: 'the keys of shot "a"', from: 310, to: 330 },
			{ what: 'the zoom-through transition into "b"', from: 330, to: 340 },
			{ what: 'later', from: 400, to: 410 }
		];
		expect(moveAtStart(moves, 300)).toEqual({
			what: 'the strip shot "a" morphing in and the keys of shot "a" and the zoom-through transition into "b"',
			from: 300,
			to: 340
		});
	});

	it('counts only keys that change the camera, as it stands at each key', () => {
		const moves = shotMoves({
			fps: 25,
			transitions: [],
			shots: [
				shot({
					id: 's',
					shot: 'full',
					startFrame: 0,
					frames: 200,
					keys: [
						// Same camera, written out; then a fade; then a real punch-in.
						key(0, { scale: 1 }),
						key(10, { scale: 1, x: 0 }),
						key(20, { opacity: 0 }),
						key(30, { scale: 1.15 }),
						// The scale holds while only the opacity changes.
						key(40, { opacity: 1 }),
						// "0%" and "0px" are where the camera already is.
						key(50, { x: '0%', y: '0px' })
					]
				})
			]
		});
		expect(moves).toEqual([{ what: 'the keys of shot "s"', from: 20, to: 30 }]);
	});
});

describe('captionsInMoveMessage', () => {
	it('names the captions, the move, what they cover and when the move ends', () => {
		const message = captionsInMoveMessage(
			{
				clip: 'cap-auto',
				start: 307,
				move: { what: 'the strip shot "auto" morphing in', from: 307, to: 325 },
				over: { panel: true, face: true },
				frame: 310
			},
			25
		);
		expect(message).toBe(
			`Captions "cap-auto": they start at 12.28 s (program time), inside the strip shot "auto" morphing in (12.28–13.00 s), and they are drawn over the moving panel and the speaker's face until it lands; once it has landed they are clear. Start them when the move ends, at 13.00 s (0.72 s later), or keep them out of the moving area. Look at stills from 12.28 to 13.00 s before deciding.`
		);
		expect(captionsInMoveClip(message)).toBe('cap-auto');
		expect(captionsInMoveClip('Captions "x": something else')).toBeNull();
		const early = captionsInMoveMessage(
			{
				clip: 'cap',
				start: 305,
				move: { what: 'the strip shot "auto" morphing in', from: 307, to: 325 },
				over: { panel: true, face: false },
				frame: 310
			},
			25
		);
		expect(early).toContain('they start at 12.20 s (program time), just before the strip shot');
		expect(captionsInMoveClip(early)).toBe('cap');
	});
});
