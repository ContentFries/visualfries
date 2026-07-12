import { describe, expect, it } from 'vitest';

import { createAgentTransitionComponent } from '../../src/lib/agent/transitions.js';

const scene = {
	id: 'transition-test',
	name: 'Transition test',
	settings: {
		width: 1080,
		height: 1920,
		duration: 10,
		fps: 30,
		backgroundColor: '#000000'
	},
	assets: [],
	layers: [],
	audioTracks: [],
	transitions: []
};

describe('agent transitions', () => {
	it('uses native full-frame SHAPE geometry for animated covers', () => {
		const component = createAgentTransitionComponent(
			{ time: 5, duration: 0.3, style: 'dip-to-black' },
			scene
		);

		expect(component).toMatchObject({
			type: 'SHAPE',
			shape: { type: 'rectangle', cornerRadius: 0 },
			appearance: {
				x: 0,
				y: 0,
				width: 1080,
				height: 1920,
				color: '#000000'
			},
			animations: { enabled: true }
		});
		expect(component.animations?.list).toHaveLength(1);
	});

	it.each(['dip-to-black', 'flash', 'swipe-left', 'swipe-up', 'focus-pull'] as const)(
		'keeps disabled %s transitions invisible instead of rendering a solid frame',
		(style) => {
			const component = createAgentTransitionComponent(
				{ time: 5, duration: 0.34, style, animated: false },
				scene
			);

			expect(component.type).toBe('SHAPE');
			expect(component.appearance).toMatchObject({ color: 'transparent' });
			expect(component.animations).toEqual({ enabled: false, list: [] });
		}
	);

	it('uses a translucent peak for focus-pull instead of an opaque flash', () => {
		const component = createAgentTransitionComponent(
			{ time: 5, duration: 0.34, style: 'focus-pull' },
			scene
		);
		const animation = component.animations?.list[0]?.animation.timeline[0]?.tweens[0];

		expect(component.type).toBe('SHAPE');
		expect(component.appearance).toMatchObject({ color: '#FFFFFF' });
		expect(animation?.vars).toMatchObject({ from: { opacity: 0 }, opacity: 0.42 });
	});
});
