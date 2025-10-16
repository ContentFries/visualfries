import type { AnimationPreset } from '$lib';

/**
 * Words highlighter animation preset
 * Highlights words within text
 */
export const wordsHighlighter: AnimationPreset = {
	id: 'words-highlight',
	presetId: 'words-highlight',
	description: 'Highlights individual words with a custom color',
	data: {},
	setup: [{ type: 'splitText', by: 'words' }],
	timeline: [
		{
			target: 'words',
			tweens: [
				{
					method: 'to',
					vars: {
						color: 'yellow', // Default color that can be overridden
						duration: 0.15,
						stagger: {
							type: 'fromData',
							dataKey: 'wordStartTimes'
						}
					}
				}
			]
		}
	]
};

/**
 * Words animation preset 1
 * Brings words in with a scale animation
 */
export const words1: AnimationPreset = {
	id: 'words-1',
	description: 'Scales and fades in words with a nice bounce effect, then fades them out',
	data: {},
	setup: [
		{ type: 'style', properties: { flexDirection: 'column' } },
		{ type: 'splitText', by: 'words' }
	],
	timeline: [
		{
			target: 'words',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
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
						stagger: 0.15
					}
				}
			]
		},
		{
			target: 'words',
			position: '>+=2', // 2 seconds after the first animation completes
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						scale: 0,
						y: '50%',
						ease: 'power4.out',
						stagger: 0.05
					}
				}
			]
		}
	]
};

/**
 * Words animation preset with no overflow
 * Text animates from below with a sliding effect
 */
export const words2: AnimationPreset = {
	id: 'words-no-overflow',
	description: 'Fades in words sliding up from below without overflow',
	data: {},
	setup: [
		{ type: 'style', properties: { flexDirection: 'column' } },
		{ type: 'splitText', by: 'words' }
	],
	timeline: [
		{
			target: 'words',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							opacity: 0,
							y: '50%',
							yPercent: 150
						},
						opacity: 1,
						y: '50%',
						yPercent: -50,
						ease: 'power3.out',
						stagger: 0.1
					}
				}
			]
		},
		{
			target: 'words',
			position: '>+=2',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						y: '50%',
						yPercent: -200,
						ease: 'power3.in',
						stagger: 0.05
					}
				}
			]
		}
	]
};

/**
 * Subtitles rising back animation
 * Words fade in with a nice back ease
 */
export const subtitlesRisingBack: AnimationPreset = {
	id: 'subtitles-rising-back',
	description: 'Words rise from bottom with a nice bounce effect',
	data: {
		// This preset can work with word timings provided by the consumer
		wordStartTimes: [0, 0.1, 0.2, 0.3, 0.4]
	},
	setup: [
		{ type: 'splitText', by: 'words' }
		// { type: 'style', properties: { opacity: 0 } }
	],
	timeline: [
		{
			target: 'words',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							opacity: 0,
							scale: 0
						},
						opacity: 1,
						scale: 1,
						ease: 'back.out',
						stagger: {
							type: 'fromData',
							dataKey: 'wordStartTimes'
						}
					}
				}
			]
		}
	]
};

/**
 * Words highlight animation preset
 * Gradually highlights words one by one
 */
export const words3: AnimationPreset = {
	id: 'words-highlight',
	description: 'Gradually highlights words by increasing opacity',
	data: {},
	setup: [
		{ type: 'style', properties: { flexDirection: 'column' } },
		{ type: 'splitText', by: 'words' }
	],
	timeline: [
		{
			target: 'words',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							opacity: 0.4,
							y: '50%',
							yPercent: -50
						},
						opacity: 1,
						ease: 'power3.out',
						stagger: 0.4
					}
				}
			]
		},
		{
			target: 'words',
			position: '>+=2',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						y: '50%',
						ease: 'power4.out',
						stagger: 0.1
					}
				}
			]
		}
	]
};

/**
 * Words active color animation preset
 * Reveals words one by one with individual highlighting
 */
export const words4: AnimationPreset = {
	id: 'words-active-color',
	description: 'Reveals and highlights words one by one with color changes',
	data: {},
	setup: [
		{ type: 'style', properties: { flexDirection: 'column' } },
		{ type: 'splitText', by: 'words' }
	],
	timeline: [
		{
			target: 'words',
			tweens: [
				{
					method: 'fromTo',
					vars: {
						from: {
							opacity: 0,
							y: '50%',
							yPercent: -50
						},
						opacity: 1,
						ease: 'power3.out',
						stagger: 0.4
					}
				}
			]
		},
		{
			target: 'words',
			position: '>+=2',
			tweens: [
				{
					method: 'to',
					vars: {
						opacity: 0,
						y: '50%',
						ease: 'power4.out',
						stagger: 0.1
					}
				}
			]
		}
	]
};
