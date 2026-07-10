import {
	ComponentShape,
	SceneShape,
	type AnimationInput,
	type ComponentInput,
	type Scene,
	type SceneInput,
	type SceneLayerInput
} from '../schemas/scene/index.js';

export type AgentTransitionStyle =
	| 'dip-to-black'
	| 'flash'
	| 'swipe-left'
	| 'swipe-up'
	| 'focus-pull';

export type AgentTransitionCue = {
	id?: string;
	time: number;
	duration?: number;
	style?: AgentTransitionStyle;
	color?: string;
	layerOrder?: number;
	animated?: boolean;
};

export type AddAgentTransitionsInput = {
	scene: Scene | SceneInput;
	transitions: AgentTransitionCue[];
	layerId?: string;
	layerName?: string;
	layerOrder?: number;
};

function transitionAnimation(id: string, cue: AgentTransitionCue, scene: Scene): AnimationInput {
	const style = cue.style ?? 'dip-to-black';
	const duration = cue.duration ?? 0.26;
	const half = Math.max(0.04, duration / 2);

	if (style === 'focus-pull') {
		return {
			id: `${id}-focus-pull`,
			name: 'Agent transition focus pull',
			animation: {
				id: `${id}-focus-pull-preset`,
				timeline: [
					{
						tweens: [
							{
								method: 'fromTo',
								vars: {
									from: { opacity: 0, scale: 0.82 },
									duration: half,
									opacity: 0.82,
									scale: 1.08,
									ease: 'power2.in'
								}
							}
						]
					},
					{
						tweens: [
							{
								method: 'to',
								vars: { duration: half, opacity: 0, scale: 1.22, ease: 'power2.out' }
							}
						]
					}
				]
			}
		};
	}

	if (style === 'swipe-left') {
		return {
			id: `${id}-swipe-left`,
			name: 'Agent transition swipe left',
			animation: {
				id: `${id}-swipe-left-preset`,
				timeline: [
					{
						tweens: [
							{
								method: 'fromTo',
								vars: {
									from: { x: scene.settings.width },
									duration,
									x: -scene.settings.width,
									ease: 'power2.inOut'
								}
							}
						]
					}
				]
			}
		};
	}

	if (style === 'swipe-up') {
		return {
			id: `${id}-swipe-up`,
			name: 'Agent transition swipe up',
			animation: {
				id: `${id}-swipe-up-preset`,
				timeline: [
					{
						tweens: [
							{
								method: 'fromTo',
								vars: {
									from: { y: scene.settings.height },
									duration,
									y: -scene.settings.height,
									ease: 'power2.inOut'
								}
							}
						]
					}
				]
			}
		};
	}

	return {
		id: `${id}-fade`,
		name: style === 'flash' ? 'Agent transition flash' : 'Agent transition dip',
		animation: {
			id: `${id}-fade-preset`,
			timeline: [
				{
					tweens: [
						{
							method: 'fromTo',
							vars: {
								from: { opacity: 0 },
								duration: half,
								opacity: style === 'flash' ? 0.85 : 1,
								ease: 'power1.out'
							}
						}
					]
				},
				{
					tweens: [
						{
							method: 'to',
							vars: {
								duration: half,
								opacity: 0,
								ease: 'power1.in'
							}
						}
					]
				}
			]
		}
	};
}

export function createAgentTransitionComponent(
	cue: AgentTransitionCue,
	scene: Scene | SceneInput,
	index = 0
): ComponentInput {
	const parsedScene = SceneShape.parse(scene);
	const id = cue.id ?? `agent-transition-${index + 1}`;
	const style = cue.style ?? 'dip-to-black';
	const duration = cue.duration ?? 0.26;
	const component: ComponentInput = {
		id,
		name: `Agent Transition: ${style}`,
		type: 'SHAPE',
		shape: {
			type: 'rectangle',
			cornerRadius: 0
		},
		timeline: {
			startAt: Math.max(0, cue.time - duration / 2),
			endAt: cue.time + duration / 2
		},
		order: index,
		appearance: {
			x: 0,
			y: 0,
			width: parsedScene.settings.width,
			height: parsedScene.settings.height,
			opacity: style === 'flash' ? 0 : 1,
			color: cue.color ?? (style === 'flash' || style === 'focus-pull' ? '#FFFFFF' : '#000000')
		},
		animations: {
			enabled: cue.animated !== false,
			list: cue.animated === false ? [] : [transitionAnimation(id, cue, parsedScene)]
		}
	};

	return ComponentShape.parse(component) as ComponentInput;
}

export function addAgentTransitions(input: AddAgentTransitionsInput): Scene {
	const scene = SceneShape.parse(input.scene);
	const layer: SceneLayerInput = {
		id: input.layerId ?? 'layer-agent-transitions',
		name: input.layerName ?? 'Agent Transitions',
		order: input.layerOrder ?? 95,
		components: input.transitions.map((cue, index) =>
			createAgentTransitionComponent(cue, scene, index)
		)
	};

	return SceneShape.parse({
		...scene,
		layers: [...scene.layers, layer]
	});
}
