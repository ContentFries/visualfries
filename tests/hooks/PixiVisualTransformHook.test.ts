import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js-legacy';

import { PixiVisualTransformHook } from '$lib/components/hooks/PixiVisualTransformHook.ts';

describe('PixiVisualTransformHook', () => {
	let resources: Map<string, unknown>;
	let context: any;
	let markDirty: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		resources = new Map();
		markDirty = vi.fn();
		context = {
			data: {
				id: 'shape-1',
				type: 'SHAPE',
				visible: true,
				appearance: { x: 100, y: 200, width: 400, height: 200 }
			},
			isActive: true,
			getResource: (key: string) => resources.get(key),
			setResource: (key: string, value: unknown) => resources.set(key, value),
			removeResource: (key: string) => resources.delete(key)
		};
	});

	it('wraps renderer content and exposes relative deterministic transforms', async () => {
		const content = new Container();
		resources.set('pixiRenderObject', content);
		const hook = new PixiVisualTransformHook({ stateManager: { markDirty } as any });

		await hook.handle('setup', context);

		const outer = resources.get('pixiRenderObject') as Container;
		const target = resources.get('animationTarget') as any;
		expect(outer).not.toBe(content);
		expect(outer.children).toEqual([content]);
		expect(outer.pivot).toMatchObject({ x: 300, y: 300 });
		expect(outer.position).toMatchObject({ x: 300, y: 300 });
		expect(target).toMatchObject({ x: 0, y: 0, opacity: 1, rotation: 0 });

		target.x = 25;
		target.y = -15;
		target.opacity = 0.4;
		target.rotation = 8;
		target.scaleX = 1.2;
		target.scaleY = 0.8;

		expect(outer).toMatchObject({
			x: 325,
			y: 285,
			alpha: 0.4,
			angle: 8,
			scale: { x: 1.2, y: 0.8 }
		});
		expect(target).toMatchObject({ x: 25, y: -15 });

		context.data.appearance = { x: 200, y: 300, width: 600, height: 400 };
		await hook.handle('update', context);
		expect(outer.pivot).toMatchObject({ x: 500, y: 500 });
		expect(outer.position).toMatchObject({ x: 525, y: 485 });
		expect(target).toMatchObject({ x: 25, y: -15 });
	});

	it('keeps the outer target stable across content swaps and honors visible false', async () => {
		const first = new Container();
		resources.set('pixiRenderObject', first);
		const hook = new PixiVisualTransformHook({ stateManager: { markDirty } as any });
		await hook.handle('setup', context);
		const outer = resources.get('pixiRenderObject') as Container;
		const target = resources.get('animationTarget');

		const replacement = new Container();
		resources.set('pixiRenderObject', replacement);
		context.data.visible = false;
		await hook.handle('update', context);

		expect(resources.get('pixiRenderObject')).toBe(outer);
		expect(resources.get('animationTarget')).toBe(target);
		expect(outer.children).toEqual([replacement]);
		expect(first.parent).toBeNull();
		expect(outer.visible).toBe(false);

		await hook.handle('destroy', context);
		expect(resources.has('animationTarget')).toBe(false);
		expect(resources.has('pixiRenderObject')).toBe(false);
		expect(outer.destroyed).toBe(true);
	});
});
