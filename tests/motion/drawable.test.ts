import { describe, expect, it } from 'vitest';
import {
	DRAWABLE_CANVAS,
	PLAIN_CANVAS,
	optInCanvas,
	optInDrawing
} from '../../src/lib/motion/drawable.js';

const html = (markup: string) => {
	const root = document.createElement('div');
	root.innerHTML = markup;
	return root;
};

describe('HTML-in-Canvas opt-in on old and new Chromium', () => {
	it('opts the stage canvas in with both the old and the new attribute, and the stage as drawable', () => {
		const canvas = document.createElement('canvas');
		const stage = document.createElement('div');
		canvas.appendChild(stage);
		optInDrawing(canvas, stage);
		// Chromium before the rename reads `layoutsubtree`; from the rename on, `content="drawable"`
		// on the canvas and `drawable` on the element `drawElementImage` draws.
		expect(canvas.getAttribute('layoutsubtree')).toBe('');
		expect(canvas.getAttribute('content')).toBe('drawable');
		expect(stage.hasAttribute('drawable')).toBe(true);
	});

	it('finds a block canvas that opts in with either attribute, in any case', () => {
		const root = html(
			'<canvas id="old" layoutsubtree></canvas>' +
				'<canvas id="new" content="drawable"></canvas>' +
				'<canvas id="upper" content="DRAWABLE"></canvas>' +
				'<canvas id="both" layoutsubtree content="drawable"></canvas>' +
				'<canvas id="fallback" content="fallback"></canvas>' +
				'<canvas id="plain"></canvas>'
		);
		const ids = (sel: string) => [...root.querySelectorAll(sel)].map((el) => el.id);
		expect(ids(DRAWABLE_CANVAS)).toEqual(['old', 'new', 'upper', 'both']);
		expect(ids(PLAIN_CANVAS)).toEqual(['fallback', 'plain']);
	});

	it('gives a block canvas the attribute it lacks, so a block written for one Chromium runs on the other', () => {
		const root = html(
			'<canvas id="old" layoutsubtree></canvas><canvas id="new" content="drawable"></canvas>'
		);
		for (const canvas of root.querySelectorAll('canvas')) optInCanvas(canvas);
		for (const canvas of root.querySelectorAll('canvas')) {
			expect(canvas.getAttribute('layoutsubtree')).toBe('');
			expect(canvas.getAttribute('content')).toBe('drawable');
		}
	});

	it('leaves a canvas alone when it already has both attributes', () => {
		const canvas = html('<canvas layoutsubtree="" content="DRAWABLE"></canvas>').firstElementChild!;
		const before = canvas.outerHTML;
		optInCanvas(canvas);
		expect(canvas.outerHTML).toBe(before);
	});
});
