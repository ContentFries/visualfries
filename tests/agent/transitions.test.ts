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
	it.each(['dip-to-black', 'flash', 'swipe-left', 'swipe-up', 'focus-pull'] as const)(
		'keeps disabled %s transitions invisible instead of rendering a solid frame',
		(style) => {
			const component = createAgentTransitionComponent(
				{ time: 5, duration: 0.34, style, animated: false },
				scene
			);

			expect(component.type).toBe('TEXT');
			expect(component.appearance.background).toMatchObject({ color: 'transparent' });
			expect(component.animations).toEqual({ enabled: false, list: [] });
		}
	);

	it('uses a translucent peak for focus-pull instead of an opaque flash', () => {
		const component = createAgentTransitionComponent(
			{ time: 5, duration: 0.34, style: 'focus-pull' },
			scene
		);
		const animation = component.animations?.list[0]?.animation.timeline[0]?.tweens[0];

		expect(component.type).toBe('TEXT');
		expect(component.appearance.background).toMatchObject({ color: '#FFFFFF' });
		expect(animation?.vars).toMatchObject({ from: { opacity: 0 }, opacity: 0.42 });
	});
});
