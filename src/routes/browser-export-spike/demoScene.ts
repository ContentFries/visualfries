import { SceneShape, type Scene } from '$lib';

const WIDTH = 1080;
const HEIGHT = 1920;
const DURATION = 10;

export const BROWSER_SPIKE = {
	width: WIDTH,
	height: HEIGHT,
	duration: DURATION,
	fps: 30,
	transitionStart: 4,
	transitionEnd: 5
} as const;

export function createBrowserSpikeScene(variant: 'from' | 'to'): Scene {
	const from = variant === 'from';
	const accent = from ? '#ffb703' : '#35d0ba';
	const background = from ? '#111827' : '#052e2b';
	const title = from ? 'FRAME-DRIVEN' : 'BROWSER-NATIVE';
	const caption = from ? 'Pixi composes every frame' : 'MediaBunny encodes + muxes';

	return SceneShape.parse({
		id: `browser-spike-${variant}`,
		version: '2.0',
		name: `Browser export spike ${variant}`,
		settings: {
			width: WIDTH,
			height: HEIGHT,
			duration: DURATION,
			fps: BROWSER_SPIKE.fps,
			backgroundColor: background
		},
		assets: [],
		layers: [
			{
				id: `${variant}-visuals`,
				name: 'Animated imagery',
				order: 0,
				visible: true,
				muted: false,
				components: [
					{
						id: `${variant}-background`,
						name: 'Opaque background',
						type: 'SHAPE',
						shape: { type: 'rectangle' },
						timeline: { startAt: 0, endAt: DURATION },
						visible: true,
						order: 0,
						appearance: {
							x: 0,
							y: 0,
							width: WIDTH,
							height: HEIGHT,
							color: background
						},
						animations: { enabled: true, list: [] },
						effects: { enabled: true, map: {} }
					},
					{
						id: `${variant}-orb`,
						name: 'Animated orb',
						type: 'SHAPE',
						shape: { type: from ? 'circle' : 'star' },
						timeline: { startAt: 0, endAt: DURATION },
						visible: true,
						order: 1,
						appearance: {
							x: from ? 190 : 240,
							y: from ? 420 : 390,
							width: from ? 700 : 600,
							height: from ? 700 : 600,
							color: accent,
							rotation: 0
						},
						animations: {
							enabled: true,
							list: [
								{
									id: `${variant}-orb-motion`,
									name: 'Deterministic motion',
									animation: {
										id: `${variant}-orb-motion-animation`,
										timeline: [
											{
												tweens: [
													{
														method: 'from',
														vars: { duration: 1, scale: 0.4, opacity: 0 }
													},
													{
														method: 'to',
														vars: { duration: 9, rotation: from ? 180 : 360, ease: 'none' }
													}
												]
											}
										]
									}
								}
							]
						},
						effects: { enabled: true, map: {} }
					}
				]
			},
			{
				id: `${variant}-text`,
				name: 'Text and captions',
				order: 10,
				visible: true,
				muted: false,
				components: [
					textComponent(`${variant}-title`, title, 1260, 120, 76, '#ffffff'),
					textComponent(`${variant}-caption`, caption, 1450, 150, 48, accent)
				]
			}
		],
		transitions: [],
		audioTracks: []
	});
}

function textComponent(
	id: string,
	text: string,
	y: number,
	height: number,
	fontSize: number,
	color: string
) {
	return {
		id,
		name: text,
		type: 'TEXT',
		text,
		timeline: { startAt: 0, endAt: DURATION },
		visible: true,
		order: 0,
		appearance: {
			x: 80,
			y,
			width: WIDTH - 160,
			height,
			horizontalAlign: 'center',
			verticalAlign: 'center',
			text: {
				fontFamily: 'Arial',
				fontSize,
				fontWeight: '900',
				fontSource: { source: 'custom', family: 'Arial' },
				lineHeight: { value: 1.1, unit: 'em' },
				color,
				textAlign: 'center',
				textTransform: 'uppercase'
			}
		},
		animations: {
			enabled: true,
			list: [
				{
					id: `${id}-reveal`,
					name: 'Caption reveal',
					animation: {
						id: `${id}-reveal-animation`,
						timeline: [
							{
								tweens: [
									{
										method: 'from',
										vars: { duration: 0.6, y: 40, opacity: 0 }
									}
								]
							}
						]
					}
				}
			]
		},
		effects: { enabled: true, map: {} }
	};
}
