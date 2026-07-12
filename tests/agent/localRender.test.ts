import { describe, expect, it } from 'vitest';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { eventEmitter3ShimSource, localPathFromUrl, normalizeImageQuality } from '$lib/agent';

describe('agent local render helpers', () => {
	it('accepts image quality as 0..1 or 0..100 percent', () => {
		expect(normalizeImageQuality(undefined)).toBe(0.92);
		expect(normalizeImageQuality(0.88)).toBe(0.88);
		expect(normalizeImageQuality(88)).toBe(0.88);
	});

	it('rejects invalid image quality values before browser render starts', () => {
		expect(() => normalizeImageQuality(Number.NaN)).toThrow('finite');
		expect(() => normalizeImageQuality(-1)).toThrow('>= 0');
		expect(() => normalizeImageQuality(101)).toThrow('0..1 or 0..100');
	});

	it('recognizes file URLs and existing absolute filesystem media paths', () => {
		const localFile = fileURLToPath(import.meta.url);
		expect(localPathFromUrl(localFile)).toBe(localFile);
		expect(localPathFromUrl(pathToFileURL(localFile).href)).toBe(localFile);
		expect(localPathFromUrl('/definitely/not/a/visualfries/media-file.png')).toBeUndefined();
	});

	it('preserves EventEmitter3 listener context and once/remove semantics for Pixi', async () => {
		const encoded = Buffer.from(eventEmitter3ShimSource).toString('base64');
		const { default: EventEmitter } = await import(`data:text/javascript;base64,${encoded}`);
		const emitter = new EventEmitter();
		const context = { calls: 0 };
		function listener(this: typeof context, amount: number) {
			this.calls += amount;
		}

		emitter.on('render', listener, context);
		emitter.emit('render', 2);
		expect(context.calls).toBe(2);

		emitter.once('render', listener, context);
		emitter.emit('render', 3);
		emitter.emit('render', 4);
		expect(context.calls).toBe(12);

		emitter.removeListener('render', listener, context);
		expect(emitter.emit('render', 1)).toBe(false);
	});
});
