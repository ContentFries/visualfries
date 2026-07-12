import { describe, expect, it } from 'vitest';

import { LineHighlighterAnimationBuilder } from '$lib/animations/builders/LineHighlighterAnimationBuilder.ts';
import { WordHighlighterAnimationBuilder } from '$lib/animations/builders/WordHighlighterAnimationBuilder.ts';

function component(mode: 'word' | 'line') {
	return {
		id: `active-${mode}`,
		type: 'TEXT',
		text: '881 VIEWS',
		timeline: { startAt: 0, endAt: 2 },
		appearance: {
			x: 0,
			y: 0,
			width: 400,
			height: 100,
			text: {
				fontFamily: 'Inter',
				fontSize: { value: 60, unit: 'px' },
				color: '#111111',
				textAlign: 'center',
				highlightColors: ['#FF0000', '#00FF00'],
				activeWord: { enabled: mode === 'word', color: '#FFFFFF', scale: 1.15 },
				activeLine: { enabled: mode === 'line', color: '#FFFFFF', scale: 1.08 }
			}
		},
		animations: { enabled: true, list: [] },
		effects: { enabled: true, map: {} }
	} as any;
}

function vars(animation: any) {
	return animation.animation.timeline[0].tweens[0].vars;
}

describe('native TEXT active highlighting', () => {
	it('cycles a solid word palette and resets glyph scale deterministically', () => {
		const animationData = { wordStartTimes: [0, 1], wordUnhighlightTimes: [0.8, 1.8] };
		const animations = WordHighlighterAnimationBuilder.build(
			component('word'),
			document.createElement('div'),
			animationData,
			{ getSplitText: () => [] } as any
		);

		expect(vars(animations[0])).toMatchObject({
			color: { fromData: 'highlightColors', mode: 'cycle', fallbackValue: '#FF0000' },
			scale: 1.15,
			transformOrigin: '50% 50%'
		});
		expect(vars(animations[1])).toMatchObject({ color: 'rgb(17, 17, 17)', scale: 1 });
		expect(animationData).toMatchObject({ highlightColors: ['#FF0000', '#00FF00'] });
	});

	it('restores active-line glyph color and gives active-word deterministic precedence', () => {
		const lineData = { lineStartTimes: [0], lineUnhighlightTimes: [1] };
		const lineAnimations = LineHighlighterAnimationBuilder.build(
			component('line'),
			document.createElement('div'),
			lineData,
			{ getSplitText: () => [] } as any
		);
		expect(vars(lineAnimations[1])).toMatchObject({ color: 'rgb(17, 17, 17)', scale: 1 });
		expect(vars(lineAnimations[1])).not.toHaveProperty('backgroundColor');

		const conflicted = component('line');
		conflicted.appearance.text.activeWord.enabled = true;
		expect(
			LineHighlighterAnimationBuilder.build(conflicted, document.createElement('div'), lineData, {
				getSplitText: () => []
			} as any)
		).toEqual([]);
	});
});
