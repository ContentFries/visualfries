import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	ComponentShape,
	SceneShape,
	type AnimationInput,
	type ComponentInput,
	type Scene,
	type SceneAssetInput,
	type SceneInput,
	type SceneLayerInput
} from '../schemas/scene/index.js';

export type AgentBrollCue = {
	id?: string;
	url: string;
	type?: 'VIDEO' | 'IMAGE' | 'GIF';
	motion?: 'none' | 'slow-zoom-in' | 'slow-zoom-out' | 'drift-up';
	start: number;
	end: number;
	assetId?: string;
	name?: string;
	order?: number;
	muted?: boolean;
	volume?: number;
	fade?: number;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	sourceStart?: number;
	sourceEnd?: number;
	playbackRate?: number;
	loop?: boolean;
};

export type AddAgentBrollSequenceInput = {
	scene: Scene | SceneInput;
	cues: AgentBrollCue[];
	layerId?: string;
	layerName?: string;
	layerOrder?: number;
};

function inferAssetType(cue: AgentBrollCue): 'VIDEO' | 'IMAGE' | 'GIF' {
	if (cue.type) return cue.type;
	const cleanUrl = cue.url.split('?')[0]?.toLowerCase() ?? cue.url.toLowerCase();
	if (cleanUrl.endsWith('.gif')) return 'GIF';
	if (/\.(png|jpe?g|webp|avif)$/i.test(cleanUrl)) return 'IMAGE';
	return 'VIDEO';
}

function normalizeAgentMediaUrl(url: string): string {
	if (/^[a-z]+:\/\//i.test(url) || url.startsWith('data:')) return url;
	return pathToFileURL(path.resolve(url)).toString();
}

function fadeAnimation(id: string, cue: AgentBrollCue): AnimationInput[] {
	const fade = cue.fade ?? 0.2;
	if (fade <= 0) return [];
	return [
		{
			id: `${id}-fade`,
			name: 'Agent b-roll fade',
			animation: {
				id: `${id}-fade-preset`,
				timeline: [
					{
						tweens: [
							{
								method: 'from',
								vars: {
									duration: fade,
									opacity: 0,
									ease: 'power1.out'
								}
							}
						]
					},
					{
						position: {
							anchor: 'componentEnd',
							alignTween: 'end',
							offset: '0s'
						},
						tweens: [
							{
								method: 'to',
								vars: {
									duration: fade,
									opacity: 0,
									ease: 'power1.in'
								}
							}
						]
					}
				]
			}
		}
	];
}

function motionAnimation(id: string, cue: AgentBrollCue): AnimationInput[] {
	const motion = cue.motion ?? (inferAssetType(cue) === 'IMAGE' ? 'slow-zoom-in' : 'none');
	const duration = Math.max(0.1, cue.end - cue.start);
	if (motion === 'none') return [];

	if (motion === 'slow-zoom-out') {
		return [
			{
				id: `${id}-motion`,
				name: 'Agent b-roll slow zoom out',
				animation: {
					id: `${id}-motion-preset`,
					timeline: [
						{
							tweens: [
								{
									method: 'fromTo',
									vars: {
										from: { scale: 1.08 },
										duration,
										scale: 1,
										ease: 'none'
									}
								}
							]
						}
					]
				}
			}
		];
	}

	if (motion === 'drift-up') {
		return [
			{
				id: `${id}-motion`,
				name: 'Agent b-roll drift up',
				animation: {
					id: `${id}-motion-preset`,
					timeline: [
						{
							tweens: [
								{
									method: 'fromTo',
									vars: {
										from: { y: cue.y ?? 0 },
										duration,
										y: (cue.y ?? 0) - 36,
										ease: 'none'
									}
								}
							]
						}
					]
				}
			}
		];
	}

	return [
		{
			id: `${id}-motion`,
			name: 'Agent b-roll slow zoom in',
			animation: {
				id: `${id}-motion-preset`,
				timeline: [
					{
						tweens: [
							{
								method: 'fromTo',
								vars: {
									from: { scale: 1 },
									duration,
									scale: 1.08,
									ease: 'none'
								}
							}
						]
					}
				]
			}
		}
	];
}

export function createAgentBrollComponent(
	cue: AgentBrollCue,
	scene: Scene | SceneInput,
	index = 0
): { asset: SceneAssetInput; component: ComponentInput } {
	const parsedScene = SceneShape.parse(scene);
	const type = inferAssetType(cue);
	const id = cue.id ?? `agent-broll-${index + 1}`;
	const assetId = cue.assetId ?? `${id}-asset`;
	const url = normalizeAgentMediaUrl(cue.url);
	const base = {
		id,
		name: cue.name ?? `Agent B-roll ${index + 1}`,
		type,
		timeline: { startAt: cue.start, endAt: cue.end },
		source: {
			url,
			assetId,
			startAt: cue.sourceStart,
			endAt: cue.sourceEnd
		},
		order: cue.order ?? index,
		appearance: {
			x: cue.x ?? 0,
			y: cue.y ?? 0,
			width: cue.width ?? parsedScene.settings.width,
			height: cue.height ?? parsedScene.settings.height,
			opacity: 1
		},
		animations: {
			enabled: true,
			list: [...fadeAnimation(id, cue), ...motionAnimation(id, cue)]
		}
	} satisfies Partial<ComponentInput>;

	const component =
		type === 'VIDEO'
			? ({
					...base,
					type: 'VIDEO',
					volume: cue.volume ?? 0,
					muted: cue.muted ?? true,
					playback: {
						autoplay: true,
						loop: cue.loop ?? false,
						playbackRate: cue.playbackRate ?? 1,
						startAt: cue.sourceStart ?? 0,
						endAt: cue.sourceEnd
					},
					crop: { x: 0, y: 0, width: 1, height: 1 }
				} satisfies ComponentInput)
			: type === 'GIF'
				? ({
						...base,
						type: 'GIF',
						playback: { loop: true, speed: 1 }
					} satisfies ComponentInput)
				: ({
						...base,
						type: 'IMAGE',
						crop: { xPercent: 0, yPercent: 0, widthPercent: 1, heightPercent: 1 }
					} satisfies ComponentInput);

	const asset: SceneAssetInput = {
		id: assetId,
		type,
		url
	};

	return {
		asset,
		component: ComponentShape.parse(component) as ComponentInput
	};
}

export function addAgentBrollSequence(input: AddAgentBrollSequenceInput): Scene {
	const scene = SceneShape.parse(input.scene);
	const created = input.cues.map((cue, index) => createAgentBrollComponent(cue, scene, index));
	const layer: SceneLayerInput = {
		id: input.layerId ?? 'layer-agent-broll',
		name: input.layerName ?? 'Agent B-roll',
		order: input.layerOrder ?? 5,
		components: created.map((item) => item.component)
	};

	return SceneShape.parse({
		...scene,
		assets: [...scene.assets, ...created.map((item) => item.asset)],
		layers: [...scene.layers, layer]
	});
}
