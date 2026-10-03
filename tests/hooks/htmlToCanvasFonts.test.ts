import { describe, expect, it } from 'vitest';
import { HtmlToCanvasHook } from '../../src/lib/components/hooks/HtmlToCanvasHook.js';

// Each scene's hook keeps its own font list; one scene must not change another's SVG inlining.
describe('HtmlToCanvasHook fonts', () => {
	const stateManager = {} as never;
	it('keeps the fonts of the container it was built in', () => {
		const a = new HtmlToCanvasHook({ stateManager, fonts: [{ alias: 'Montserrat', source: 'google' } as never] });
		const b = new HtmlToCanvasHook({ stateManager, fonts: [] });
		expect((a as unknown as { fonts: unknown[] }).fonts).toHaveLength(1);
		expect((b as unknown as { fonts: unknown[] }).fonts).toHaveLength(0);
	});

	it('works in containers without a fonts registration', () => {
		const cradle = new Proxy({ stateManager } as Record<string, unknown>, {
			get(target, key) {
				if (key in target) return target[key as string];
				throw new Error(`Could not resolve '${String(key)}'`);
			}
		});
		const hook = new HtmlToCanvasHook(cradle as never);
		expect((hook as unknown as { fonts: unknown[] }).fonts).toEqual([]);
	});
});
