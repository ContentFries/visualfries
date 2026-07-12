import { describe, expect, it } from 'vitest';

import { resolveGifFrameIndexAtTime } from '$lib/components/AnimatedGIF.ts';

describe('AnimatedGIF authored-time seeking', () => {
	const frames = [
		{ start: 0, end: 40 },
		{ start: 40, end: 140 },
		{ start: 140, end: 200 }
	];

	it('uses GIF frame delays instead of fixed scene-frame modulo', () => {
		expect(resolveGifFrameIndexAtTime(frames, 200, 39, true)).toBe(0);
		expect(resolveGifFrameIndexAtTime(frames, 200, 40, true)).toBe(1);
		expect(resolveGifFrameIndexAtTime(frames, 200, 139, true)).toBe(1);
		expect(resolveGifFrameIndexAtTime(frames, 200, 140, true)).toBe(2);
	});

	it('loops or clamps using the authored playback contract', () => {
		expect(resolveGifFrameIndexAtTime(frames, 200, 240, true)).toBe(1);
		expect(resolveGifFrameIndexAtTime(frames, 200, 240, false)).toBe(2);
	});
});
