import { describe, expect, it } from 'vitest';
import { parseGradient } from '../../src/lib/motion/interpolate.js';

const radial = (prelude: string) => parseGradient(`radial-gradient(${prelude}, red, blue)`) as any;
const geometry = (prelude: string) => {
	const g = radial(prelude);
	return { shape: g.shape, size: g.size, position: g.position };
};
const fail = (why: string, prelude: string) =>
	`Gradient "radial-gradient(${prelude}, red, blue)": ${why}. Use e.g. "circle farthest-corner at 50% 50%".`;
const at = (p: string) => geometry(`at ${p}`).position.map((l: any) => l.value);

describe('radial gradient prelude', () => {
	it('defaults to an ellipse reaching the farthest corner, centred', () => {
		expect(geometry('at center')).toEqual({
			shape: 'ellipse',
			size: { keyword: 'farthest-corner' },
			position: [
				{ value: 50, unit: '%' },
				{ value: 50, unit: '%' }
			]
		});
	});

	it('reads shape, size keyword and position', () => {
		expect(geometry('closest-side circle at 20% 80%')).toEqual({
			shape: 'circle',
			size: { keyword: 'closest-side' },
			position: [
				{ value: 20, unit: '%' },
				{ value: 80, unit: '%' }
			]
		});
	});

	it('infers the shape from the number of lengths', () => {
		expect(geometry('30px at 0% 0%').shape).toBe('circle');
		expect(geometry('30px 10px at 0% 0%')).toMatchObject({
			shape: 'ellipse',
			size: {
				lengths: [
					{ value: 30, unit: 'px' },
					{ value: 10, unit: 'px' }
				]
			}
		});
	});

	it('places a single keyword on its own axis', () => {
		expect(at('top')).toEqual([50, 0]);
		expect(at('bottom')).toEqual([50, 100]);
		expect(at('left')).toEqual([0, 50]);
		expect(at('right')).toEqual([100, 50]);
	});

	it('swaps a vertical-first or reversed pair of position terms', () => {
		expect(at('top left')).toEqual([0, 0]);
		expect(at('bottom right')).toEqual([100, 100]);
		expect(at('center left')).toEqual([0, 50]);
		expect(at('20px bottom')).toEqual([20, 100]);
		expect(at('left 30%')).toEqual([0, 30]);
	});

	it('refuses terms it does not know', () => {
		expect(() => radial('circle at')).toThrow(fail('"at" takes one or two values', 'circle at'));
		expect(() => radial('at 1px 2px 3px')).toThrow(
			fail('"at" takes one or two values', 'at 1px 2px 3px')
		);
		expect(() => radial('circle nonsense')).toThrow(
			fail('unknown radial gradient term "nonsense"', 'circle nonsense')
		);
		expect(() => radial('at nonsense')).toThrow(fail('unknown position "nonsense"', 'at nonsense'));
	});

	it('refuses a repeated or conflicting size', () => {
		expect(() => radial('circle ellipse')).toThrow(
			fail('the shape is given twice', 'circle ellipse')
		);
		expect(() => radial('closest-side farthest-side')).toThrow(
			fail('the size is given twice', 'closest-side farthest-side')
		);
		expect(() => radial('closest-side 10px')).toThrow(
			fail('size is either a keyword or lengths', 'closest-side 10px')
		);
		expect(() => radial('1px 2px 3px')).toThrow(
			fail('a radial size has at most two lengths', '1px 2px 3px')
		);
	});

	it('refuses lengths that do not fit the shape', () => {
		expect(() => radial('circle 1px 2px')).toThrow(
			fail('a circle takes one radius', 'circle 1px 2px')
		);
		expect(() => radial('ellipse 1px')).toThrow(fail('an ellipse takes two radii', 'ellipse 1px'));
		expect(() => radial('circle 10%')).toThrow(
			fail('a circle radius cannot be a percentage', 'circle 10%')
		);
	});
});
