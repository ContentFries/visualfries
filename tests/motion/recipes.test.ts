import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { arrowPath, cameraAt, extrude, fitRect, phraseWords, wallSlots } from '$lib/motion/recipes.js';

describe('motion recipes', () => {
	it('fits a rect and glides the camera between stops', () => {
		expect(fitRect([0, 0, 2000, 1000], 1000, 500)).toEqual({ s: 0.5, cx: 1000, cy: 500 });
		const whole = cameraAt([], 2000, 1000, 1000, 500);
		expect(whole).toEqual({ s: 0.5, tx: 0, ty: 0 });
		const card = cameraAt([{ e: 1, r: [500, 200, 500, 250] }], 2000, 1000, 1000, 500);
		expect(card.s).toBe(2);
		// the card's centre (750, 325) lands in the view's centre
		expect(750 * card.s + card.tx).toBeCloseTo(500);
		expect(325 * card.s + card.ty).toBeCloseTo(250);
		const half = cameraAt([{ e: 0.5, r: [500, 200, 500, 250] }], 2000, 1000, 1000, 500);
		expect(half.s).toBeCloseTo(1.25);
	});

	it('bends an arrow to the left of travel and measures it', () => {
		const straight = arrowPath([0, 0], [100, 0], 0);
		expect(straight.length).toBeCloseTo(100, 0);
		expect(straight.angle).toBeCloseTo(0);
		const bent = arrowPath([0, 0], [100, 0], 0.3);
		expect(bent.control[1]).toBeCloseTo(30); // SVG y grows downwards: "left" of +x travel is +y here
		expect(bent.length).toBeGreaterThan(100);
		expect(bent.d).toBe('M 0 0 Q 50 30 100 0');
	});

	it('groups words into phrases from a starting word', () => {
		const ws = ['slová.', 'Toto,', 'keby', 'som', 'mal', 'dať'].map((text) => ({ text }));
		expect(phraseWords(ws, [[0, 1], [2, 3]], 'Toto').map((p) => p.map((w) => w.text))).toEqual([
			['Toto,', 'keby'],
			['som', 'mal']
		]);
	});

	it('extrudes with darker layers and lays out a masonry wall', () => {
		expect(extrude('#c6f432', 3).split('), ').length).toBe(4);
		const slots = wallSlots(1920, 1080, 90);
		expect(slots).toHaveLength(8);
		expect(slots[3]).toEqual({ x: -2010, y: 0.32 * 1170 });
	});

	it('ships every recipe block and a valid demo project', async () => {
		for (const f of ['Kinetic', 'Arrows', 'Wall', 'Screen', 'ZoomThrough'])
			expect(fs.existsSync(`src/lib/motion/blocks/${f}.svelte`)).toBe(true);
		const { MotionProjectShape } = await import('$lib/motion/project.js');
		const demo = JSON.parse(fs.readFileSync('static/demo/motion-recipes/recipes.vf.json', 'utf8'));
		expect(MotionProjectShape.safeParse(demo).success).toBe(true);
	});
});
