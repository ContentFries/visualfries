import { describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { createPixiAnimationTarget } from '../../src/lib/animations/PixiAnimationTarget.js';

function createContainer() {
	return {
		x: 540,
		y: 960,
		alpha: 1,
		angle: 0,
		scale: {
			x: 1,
			y: 1,
			set(value: number) {
				this.x = value;
				this.y = value;
			}
		}
	};
}

describe('createPixiAnimationTarget', () => {
	it('maps all supported VisualFries numeric properties to Pixi transforms', () => {
		const changed = vi.fn();
		const container = createContainer();
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

	it('evaluates and reseeks a GSAP IMAGE entrance deterministically', () => {
		const container = createContainer();
		const target = createPixiAnimationTarget(container);
		const timeline = gsap.timeline({ paused: true }).from(target, {
			duration: 1,
			x: 0,
			opacity: 0,
			scale: 0.5,
			rotation: -10,
			ease: 'none'
		});

		timeline.seek(0.5, false);
		const midpoint = { ...container, scale: { x: container.scale.x, y: container.scale.y } };
		timeline.seek(1, false);
		timeline.seek(0.5, false);

		expect(container.x).toBeCloseTo(midpoint.x, 6);
		expect(container.alpha).toBeCloseTo(midpoint.alpha, 6);
		expect(container.angle).toBeCloseTo(midpoint.angle, 6);
		expect(container.scale.x).toBeCloseTo(midpoint.scale.x, 6);
		expect(container.scale.y).toBeCloseTo(midpoint.scale.y, 6);

		timeline.revert();
		timeline.kill();
		expect(container).toMatchObject({
			x: 540,
			y: 960,
			alpha: 1,
			angle: 0,
			scale: { x: 1, y: 1 }
		});
	});

	it('can expose x/y as component-relative offsets around a fixed origin', () => {
		const container = createContainer();
		const target = createPixiAnimationTarget(container, undefined, { x: 540, y: 960 });

		expect(target).toMatchObject({ x: 0, y: 0 });
		target.x = -40;
		target.y = 25;
		expect(container).toMatchObject({ x: 500, y: 985 });
		expect(target).toMatchObject({ x: -40, y: 25 });
	});
});
