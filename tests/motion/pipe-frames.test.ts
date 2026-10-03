import { describe, expect, it } from 'vitest';
import { FramePipeError, pipeFrames } from '../../src/lib/motion/node.js';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fake pages: capture(f) returns the frame number as bytes after an optional delay. */
function pages(opts: { delay?: (f: number) => number; failAt?: number } = {}) {
	return async () => ({
		capture: async (f: number) => {
			await tick(opts.delay?.(f) ?? 0);
			if (f === opts.failAt) throw new Error(`block broke at ${f}`);
			return Buffer.from(String(f));
		},
		close: async () => {}
	});
}

function sink(opts: { failAfter?: number; slow?: number } = {}) {
	const got: number[] = [];
	return {
		got,
		ended: false,
		killed: false,
		async write(png: Buffer) {
			if (opts.failAfter !== undefined && got.length >= opts.failAfter)
				throw new FramePipeError('encoder died');
			await tick(opts.slow ?? 0);
			got.push(Number(png.toString()));
		},
		async end() {
			this.ended = true;
		},
		kill() {
			this.killed = true;
		}
	};
}

describe('pipeFrames', () => {
	it('hands frames to the encoder in order although pages finish out of order', async () => {
		const s = sink();
		// later frames of a page often finish before earlier frames of another page
		await pipeFrames(40, 4, pages({ delay: (f) => (f * 7) % 5 }), s);
		expect(s.got).toEqual(Array.from({ length: 40 }, (_, i) => i));
		expect(s.ended).toBe(true);
	});

	it('keeps pages only a few frames ahead of a slow encoder', async () => {
		const s = sink({ slow: 2 });
		let maxAhead = 0;
		const make = pages();
		const open = async () => {
			const page = await make();
			return {
				...page,
				capture: async (f: number) => {
					maxAhead = Math.max(maxAhead, f - s.got.length);
					return page.capture(f);
				}
			};
		};
		await pipeFrames(60, 3, open, s);
		expect(s.got).toHaveLength(60);
		expect(maxAhead).toBeLessThanOrEqual(3 * 2);
	});

	it('reports an encoder failure as FramePipeError, so the caller can fall back', async () => {
		const s = sink({ failAfter: 5 });
		await expect(pipeFrames(30, 3, pages(), s)).rejects.toBeInstanceOf(FramePipeError);
		expect(s.killed).toBe(true);
		expect(s.ended).toBe(false);
	});

	it('reports a broken frame as the block error, not as an encoder failure', async () => {
		const s = sink();
		const run = pipeFrames(30, 3, pages({ failAt: 11 }), s);
		await expect(run).rejects.toThrow('block broke at 11');
		await expect(run).rejects.not.toBeInstanceOf(FramePipeError);
		expect(s.killed).toBe(true);
	});
});
