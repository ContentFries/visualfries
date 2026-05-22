import { describe, expect, it } from 'vitest';
import { normalizeImageQuality } from '$lib/agent';

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
});
