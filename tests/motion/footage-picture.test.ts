import { describe, expect, it, vi } from 'vitest';
import { footagePicture } from '../../src/lib/motion/subject-canvas.js';
import type { FootageFrames } from '../../src/lib/motion/resolve.js';

const frames = (over: Partial<FootageFrames> = {}): FootageFrames => ({
	url: '',
	first: 0,
	last: 50,
	total: 300,
	width: 1920,
	height: 1080,
	startFrame: 0,
	subject: true,
	...over
});

describe('footagePicture', () => {
	it('draws from the live player when it supplies the frames (no extracted files)', async () => {
		const canvas = {} as HTMLCanvasElement;
		const picture = vi.fn(async () => canvas);
		expect(await footagePicture(frames({ picture }), 10, 'subject')).toBe(canvas);
		expect(picture).toHaveBeenCalledWith(10, 'subject');
	});

	it('still refuses a frame extraction would not have', () => {
		const picture = vi.fn();
		expect(() => footagePicture(frames({ picture }), 80, 'plate')).toThrow(/not extracted/);
		expect(picture).not.toHaveBeenCalled();
	});
});
