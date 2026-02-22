import { describe, expect, it } from 'vitest';

import { DeterministicMediaConfigShape } from '$lib/schemas/runtime/deterministic.ts';

describe('Deterministic runtime schema', () => {
	it('applies default deterministic media config values', () => {
		const parsed = DeterministicMediaConfigShape.parse(undefined);

		expect(parsed.enabled).toBe(false);
		expect(parsed.strict).toBe(false);
		expect(parsed.diagnostics).toBe(false);
		expect(parsed.seekMaxAttempts).toBe(4);
		expect(parsed.loadingMaxAttempts).toBe(2);
		expect(parsed.readyYieldMs).toBe(0);
		expect(parsed.blurDownscale).toBe(0.33);
	});
});
