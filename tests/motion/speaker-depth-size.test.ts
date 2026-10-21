import { describe, expect, it } from 'vitest';
import {
	HOLD_SCALE,
	OUTLINE_EM,
	wordSize
} from '../../src/lib/motion/blocks/speaker-depth-size.js';

const W = 1080;
// A wide heading font: every capital is as wide as the font size.
const wide = (text: string, px: number) => text.length * px;
// A condensed font that always fits.
const narrow = (text: string, px: number) => text.length * px * 0.3;

describe('speaker-depth word size', () => {
	it('keeps an explicit size even when the word would not fit', () => {
		const opts = { size: 400, width: W, outlined: false };
		expect(wordSize('ENORMOUS', { ...opts, measure: wide })).toBe(400);
		expect(wordSize('ENORMOUS', { ...opts, outlined: true, measure: wide })).toBe(400);
		expect(wordSize('ENORMOUS', { ...opts, measure: null })).toBe(400);
	});

	it('gives the default size unchanged when the word fits or nothing can measure', () => {
		const guess = Math.round(Math.min(W * 0.9, (W * 0.92) / (0.53 * 8)));
		expect(wordSize('ENORMOUS', { width: W, outlined: false, measure: narrow })).toBe(guess);
		expect(wordSize('ENORMOUS', { width: W, outlined: false, measure: null })).toBe(guess);
	});

	it('shrinks a default-sized word to the frame width, outline included', () => {
		const fitWidth = (W * 0.92) / HOLD_SCALE;
		const px = wordSize('ENORMOUS', { width: W, outlined: false, measure: wide });
		expect(wide('ENORMOUS', px)).toBeLessThanOrEqual(fitWidth);
		const hollow = wordSize('ENORMOUS', { width: W, outlined: true, measure: wide });
		expect(wide('ENORMOUS', hollow) + 2 * OUTLINE_EM * hollow).toBeLessThanOrEqual(fitWidth + 1);
		expect(hollow).toBeLessThanOrEqual(px);
	});
});
