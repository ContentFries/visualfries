import type { AnimationPreset } from '$lib';

export const linesHighlighter: AnimationPreset = {
	id: 'lined-highlight',
	presetId: 'lines-highlight',
	description: 'Highlights individual lines with a custom color',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'to',
					vars: {
						color: 'yellow', // Default color that can be overridden
						stagger: {
							type: 'fromData',
							dataKey: 'lineStartTimes'
						}
					}
				}
			]
		}
	]
};

/**
 * Lines reveal and fade preset
 * Reveals lines one by one with a scale effect
 */
export const linesRevealAndFade: AnimationPreset = {
	id: 'lines-reveal-and-fade',
	description: 'Reveals and fades lines one by one with a nice scale effect',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							scale: 0.3,
							y: '50%',
							yPercent: -50
						},
						opacity: 1,
						scale: 1,
						y: '50%',
						yPercent: -50,
						ease: 'back.out(5)',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1', // 1 second after the first animation completes
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						scale: 3,
						ease: 'power4.out',
						stagger: 1
					}
				}
			]
		}
	]
};

/**
 * Lines elastic preset
 * Reveals lines with an elastic bounce effect
 */
export const linesElastic: AnimationPreset = {
	id: 'lines-elastic',
	description: 'Reveals lines with an elastic bounce effect',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							scale: 2.2,
							y: '50%',
							yPercent: -50
						},
						opacity: 1,
						scale: 1,
						y: '50%',
						yPercent: -50,
						ease: 'elastic.out',
						stagger: 1,
						duration: 1.5
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						scale: 0,
						ease: 'power3.out',
						stagger: 1,
						duration: 0.5
					}
				}
			]
		}
	]
};

/**
 * Lines swipe left preset
 * Lines slide in from right and out to left
 */
export const linesSwipeLeft: AnimationPreset = {
	id: 'lines-swipe-left',
	description: 'Lines slide in from right and out to left',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							y: '50%',
							yPercent: -50,
							x: 100
						},
						opacity: 1,
						y: '50%',
						yPercent: -50,
						x: 0,
						ease: 'elastic.out',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						x: -100,
						ease: 'power3.out',
						stagger: 1
					}
				}
			]
		}
	]
};

/**
 * Lines exchange preset
 * Lines scale in and out with a smooth transition
 */
export const linesExchange: AnimationPreset = {
	id: 'lines-exchange',
	description: 'Lines scale in and out with a smooth transition',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							y: '50%',
							yPercent: -50,
							scale: 0.5
						},
						opacity: 1,
						y: '50%',
						yPercent: -50,
						scale: 1,
						ease: 'back.out',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						scale: 1.5,
						ease: 'power2.out',
						stagger: 1
					}
				}
			]
		}
	]
};

/**
 * Lines rolling preset
 * Lines roll in with 3D rotation effect
 */
export const linesRolling: AnimationPreset = {
	id: 'lines-rolling',
	description: 'Lines roll in with 3D rotation effect',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							y: '50%',
							yPercent: 100,
							rotateX: 360,
							scale: 0
						},
						opacity: 1,
						y: '50%',
						yPercent: -50,
						scale: 1,
						rotateX: 0,
						ease: 'power2.out',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1',
			tweens: [
				{
					method: 'to',
					vars: {
						y: '50%',
						yPercent: -100,
						rotateX: 180,
						scale: 0,
						ease: 'sine.out',
						stagger: 1
					}
				}
			]
		}
	]
};

/**
 * Lines spiral preset
 * Lines spiral in with 3D rotation effect
 */
export const linesDna: AnimationPreset = {
	id: 'lines-spiral',
	description: 'Lines spiral in with 3D rotation effect',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							y: '50%',
							yPercent: -300,
							rotateY: 360,
							scale: 1.5,
							opacity: 0
						},
						opacity: 1,
						y: '50%',
						yPercent: -50,
						rotateY: 0,
						scale: 1,
						ease: 'power2.out',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1',
			tweens: [
				{
					method: 'to',
					vars: {
						y: '50%',
						yPercent: 300,
						rotateY: 360,
						scale: 1.5,
						opacity: 0,
						ease: 'sine.out',
						stagger: 1
					}
				}
			]
		}
	]
};

/**
 * Lines bounce preset
 * Lines bounce in from the top
 */
export const linesBounce: AnimationPreset = {
	id: 'lines-bounce',
	description: 'Lines bounce in from the top',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							y: '-100%'
						},
						opacity: 1,
						y: '0%',
						ease: 'bounce.out',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						y: '50%',
						ease: 'back.in',
						stagger: 1
					}
				}
			]
		}
	]
};

/**
 * Lines glitch preset
 * Lines appear with glitchy rough animation
 */
export const linesJiggle: AnimationPreset = {
	id: 'lines-glitch',
	description: 'Lines appear with glitchy rough animation',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							y: '-50%',
							rotation: -40,
							scale: 0.5
						},
						opacity: 1,
						y: '0%',
						rotation: 0,
						scale: 1,
						ease: 'rough({ strength: 2, points: 50, template: none.out, taper: none, randomize: true, clamp: false })',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						rotation: -40,
						scale: 1.5,
						y: '50%',
						ease: 'rough({ strength: 2, points: 50, template: none.out, taper: none, randomize: true, clamp: false })',
						stagger: 1
					}
				}
			]
		}
	]
};

/**
 * Lines rotate preset
 * Lines rotate in with scale effect
 */
export const rotatingWarpText: AnimationPreset = {
	id: 'lines-rotate',
	description: 'Lines rotate in with scale effect',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							scale: 0,
							rotation: -720
						},
						opacity: 1,
						scale: 1,
						rotation: 0,
						ease: 'power3.out',
						stagger: 2
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>1.5',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						scale: 3,
						rotation: 360,
						ease: 'power3.in',
						stagger: 2
					}
				}
			]
		}
	]
};

/**
 * Lines lift up preset
 * Lines lift up with alternating rotation
 */
export const coolLinesAnimation: AnimationPreset = {
	id: 'lines-lift-up',
	description: 'Lines lift up with alternating rotation',
	data: {},
	setup: [{ type: 'splitText', by: 'lines' }],
	timeline: [
		{
			target: 'lines',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							position: 'absolute',
							width: '100%',
							opacity: 0,
							scale: 0.5,
							rotation: -180,
							y: '100%'
						},
						opacity: 1,
						scale: 1,
						rotation: 0,
						y: '50%',
						yPercent: -50,
						ease: 'power2.out',
						stagger: 1
					}
				}
			]
		},
		{
			target: 'lines',
			position: '>0.5',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						scale: 0.5,
						// Note: The alternate rotation per line is approximated here
						// V2 would need another way to handle dynamic per-element functions
						rotation: 270,
						y: '-30%',
						ease: 'power2.in',
						stagger: 1,
						delay: 0.3
					}
				}
			]
		}
	]
};
