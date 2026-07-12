import { afterEach, describe, expect, it, vi } from 'vitest';

import { CanvasFillHook } from '$lib/components/hooks/CanvasFillHook.ts';

function harness(data: any) {
	const linearGradient = { addColorStop: vi.fn() };
	const radialGradient = { addColorStop: vi.fn() };
	const ctx = {
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		createLinearGradient: vi.fn(() => linearGradient),
		createRadialGradient: vi.fn(() => radialGradient),
		fillStyle: '' as unknown
	};
	const canvas = { width: 0, height: 0, getContext: vi.fn(() => ctx), remove: vi.fn() };
	vi.spyOn(document, 'createElement').mockReturnValue(canvas as any);
	const resources = new Map<string, any>();
	const context = {
		data,
		getResource: (key: string) => resources.get(key),
		setResource: (key: string, value: unknown) => resources.set(key, value),
		removeResource: (key: string) => resources.delete(key)
	};
	return { canvas, ctx, linearGradient, radialGradient, resources, context };
}

afterEach(() => vi.restoreAllMocks());

describe('CanvasFillHook', () => {
	it('renders COLOR with alpha-preserving CSS fill', async () => {
		const h = harness({
			type: 'COLOR',
			appearance: { x: 0, y: 0, width: 320, height: 180, background: 'rgba(1,2,3,0.4)' }
		});
		const hook = new CanvasFillHook({ stateManager: { markDirty: vi.fn() } as any });
		await hook.handle('setup', h.context as any);

		expect(h.canvas).toMatchObject({ width: 320, height: 180 });
		expect(h.ctx.fillStyle).toBe('rgba(1,2,3,0.4)');
		expect(h.ctx.fillRect).toHaveBeenCalledWith(0, 0, 320, 180);
		expect(h.resources.get('pixiResource')).toBe(h.canvas);
	});

	it('renders explicit GRADIENT stops', async () => {
		const h = harness({
			type: 'GRADIENT',
			appearance: {
				x: 0,
				y: 0,
				width: 300,
				height: 200,
				background: {
					type: 'linear',
					angle: 90,
					colors: ['#000000', '#FFFFFF'],
					stops: [10, 90]
				}
			}
		});
		const hook = new CanvasFillHook({ stateManager: { markDirty: vi.fn() } as any });
		await hook.handle('setup', h.context as any);

		expect(h.ctx.createLinearGradient).toHaveBeenCalledTimes(1);
		expect(h.linearGradient.addColorStop).toHaveBeenNthCalledWith(1, 0.1, '#000000');
		expect(h.linearGradient.addColorStop).toHaveBeenNthCalledWith(2, 0.9, '#FFFFFF');
		expect(h.ctx.fillStyle).toBe(h.linearGradient);
	});
});
