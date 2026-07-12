import { describe, expect, it, vi } from 'vitest';
import { createPixiAnimationTarget } from '../../src/lib/animations/PixiAnimationTarget.js';

describe('createPixiAnimationTarget', () => {
	it('maps VisualFries numeric animation properties to Pixi transforms', () => {
		const changed = vi.fn();
		const container = {
			x: 0,
			y: 0,
			alpha: 1,
			angle: 0,
			scale: { x: 1, y: 1, set(value: number) { this.x = value; this.y = value; } }
		};
		const target = createPixiAnimationTarget(container, changed);

		target.x = -540;
		target.y = 120;
		target.opacity = 0.25;
		target.scale = 0.9;
		target.scaleX = 0.8;
		target.scaleY = 0.85;
		target.rotation = -9;

		expect(container).toMatchObject({
			x: -540,
			y: 120,
			alpha: 0.25,
			angle: -9,
			scale: { x: 0.8, y: 0.85 }
		});
		expect(changed).toHaveBeenCalledTimes(7);
	});

	it('maps x/y as offsets from a component origin', () => {
		const container = {
			x: 540,
			y: 960,
			alpha: 1,
			angle: 0,
			scale: { x: 1, y: 1 }
		};
		const target = createPixiAnimationTarget(container, undefined, { x: 540, y: 960 });

		expect(target.x).toBe(0);
		expect(target.y).toBe(0);
		target.x = -50;
		target.y = 120;

		expect(container.x).toBe(490);
		expect(container.y).toBe(1080);
	});
});
