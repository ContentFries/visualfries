import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();
	class Container {
		children: any[] = [];
		visible = true;
		x = 0;
		y = 0;
		mask: any;
		addChild(...children: any[]) {
			this.children.push(...children);
			return children[0];
		}
		removeChildren() {
			this.children = [];
		}
	}

	class Sprite {
		texture: any;
		x = 0;
		y = 0;
		width = 0;
		height = 0;
		filters?: any[];
		constructor(texture: any) {
			this.texture = texture;
		}
	}

	class Graphics {
		beginFill() {
			return this;
		}
		drawRect() {
			return this;
		}
		endFill() {
			return this;
		}
	}

	class BlurFilter {
		constructor(_strength: number) {}
	}

	class ImageBitmapResource {
		bitmap: any;
		constructor(bitmap: any) {
			this.bitmap = bitmap;
		}
		destroy() {}
	}

	const Texture = {
		from: vi.fn((resource: any) => ({
			resource,
			width: resource?.width ?? 1920,
			height: resource?.height ?? 1080,
			destroy: vi.fn()
		}))
	};

	return {
		...actual,
		Container,
		Sprite,
		Graphics,
		BlurFilter,
		ImageBitmapResource,
		Texture
	};
});

import { DeterministicMediaFrameHook } from '$lib/components/hooks/DeterministicMediaFrameHook.ts';
import { PixiTextureHook } from '$lib/components/hooks/PixiTextureHook.ts';
import { PixiSplitScreenDisplayObjectHook } from '$lib/components/hooks/PixiSplitScreenDisplayObjectHook.ts';
import { DeterministicMediaManager } from '$lib/managers/DeterministicMediaManager.ts';
import type { DeterministicFrameProvider } from '$lib';

const createSceneData = () =>
	({
		id: 'scene-int',
		settings: {
			width: 1080,
			height: 1920,
			duration: 12,
			fps: 30,
			backgroundColor: '#000000'
		},
		assets: [],
		layers: [{ id: 'layer-1', name: 'Layer 1', order: 0, visible: true, muted: false, components: [] }],
		transitions: [],
		audioTracks: []
	}) as any;

const createContext = (args: {
	componentId: string;
	startAt: number;
	endAt: number;
	state: any;
	effects?: Record<string, unknown>;
}) => {
	const resources = new Map<string, unknown>();
	const data = {
		id: args.componentId,
		type: 'VIDEO',
		source: { url: 'https://example.com/video.mp4' },
		timeline: { startAt: args.startAt, endAt: args.endAt },
		appearance: { x: 0, y: 0, width: 1080, height: 1920 },
		animations: {},
		effects: { enabled: true, map: args.effects ?? {} },
		visible: true,
		order: 0
	};

	return {
		contextData: data,
		data,
		sceneState: args.state,
		get isActive() {
			return args.state.currentTime >= args.startAt && args.state.currentTime <= args.endAt;
		},
		get currentComponentTime() {
			return Math.max(0, args.state.currentTime - args.startAt);
		},
		getResource: (key: string) => resources.get(key),
		setResource: (key: string, value: unknown) => resources.set(key, value),
		removeResource: (key: string) => resources.delete(key)
	} as any;
};

const createSplitEffect = () => ({
	layoutSplit: {
		type: 'layoutSplit',
		enabled: true,
		pieces: 2,
		sceneWidth: 1080,
		sceneHeight: 1920,
		chunks: [
			{
				group: { x: 0, y: 0, width: 1080, height: 960 },
				component: { x: 0, y: 0, width: 1080, height: 1920 }
			},
			{
				group: { x: 0, y: 960, width: 1080, height: 960 },
				component: { x: 0, y: 0, width: 1080, height: 1920 }
			}
		]
	}
});

describe('Deterministic media pipeline integration', () => {
	it('renders split VIDEO first active frame at non-zero start without preroll', async () => {
		const requests: Array<{ componentId: string; frameIndex: number }> = [];
		const provider: DeterministicFrameProvider = {
			getFrame: vi.fn(async (request) => {
				requests.push({ componentId: request.componentId, frameIndex: request.frameIndex });
				return {
					kind: 'imageBitmap',
					cacheKey: `${request.componentId}-${request.frameIndex}`,
					imageBitmap: { width: 1080, height: 1920, close: vi.fn() } as any
				};
			})
		};

		const state = {
			environment: 'server',
			currentTime: 3,
			width: 1080,
			height: 1920,
			data: { settings: { fps: 30 } },
			markDirty: vi.fn()
		};
		const manager = new DeterministicMediaManager({
			sceneData: createSceneData(),
			deterministicMediaConfig: { enabled: true, strict: true, diagnostics: false, provider }
		});
		const context = createContext({
			componentId: 'video-split',
			startAt: 3,
			endAt: 6,
			state,
			effects: createSplitEffect()
		});

		const deterministicHook = new DeterministicMediaFrameHook({
			stateManager: state as any,
			deterministicMediaManager: manager
		});
		const textureHook = new PixiTextureHook();
		const splitHook = new PixiSplitScreenDisplayObjectHook({ stateManager: state as any });

		await deterministicHook.handle('update', context);
		await textureHook.handle('update', context);
		await splitHook.handle('update', context);

		expect(context.getResource('pixiTexture')).toBeTruthy();
		const renderObject = context.getResource('pixiRenderObject') as { children?: unknown[] } | undefined;
		expect(renderObject).toBeTruthy();
		expect(renderObject?.children?.length ?? 0).toBeGreaterThan(0);
		expect(requests).toContainEqual({ componentId: 'video-split', frameIndex: 0 });
	});

	it('renders blur VIDEO first active frame with deterministic image source', async () => {
		const provider: DeterministicFrameProvider = {
			getFrame: vi.fn(async (request) => ({
				kind: 'imageBitmap',
				cacheKey: `${request.componentId}-${request.frameIndex}`,
				imageBitmap: { width: 1080, height: 1920, close: vi.fn() } as any
			}))
		};

		const state = {
			environment: 'server',
			currentTime: 5,
			width: 1080,
			height: 1920,
			data: { settings: { fps: 30 } },
			markDirty: vi.fn()
		};
		const manager = new DeterministicMediaManager({
			sceneData: createSceneData(),
			deterministicMediaConfig: { enabled: true, strict: true, diagnostics: false, provider }
		});
		const context = createContext({
			componentId: 'video-blur',
			startAt: 5,
			endAt: 8,
			state,
			effects: { fillBackgroundBlur: { type: 'fillBackgroundBlur', enabled: true, blurAmount: 40 } }
		});

		const deterministicHook = new DeterministicMediaFrameHook({
			stateManager: state as any,
			deterministicMediaManager: manager
		});
		const textureHook = new PixiTextureHook();
		const splitHook = new PixiSplitScreenDisplayObjectHook({ stateManager: state as any });

		await deterministicHook.handle('update', context);
		await textureHook.handle('update', context);
		await splitHook.handle('update', context);

		expect(context.getResource('imageElement')).toBeTruthy();
		expect(context.getResource('pixiTexture')).toBeTruthy();
		const renderObject = context.getResource('pixiRenderObject') as { children?: unknown[] } | undefined;
		expect(renderObject).toBeTruthy();
		expect(renderObject?.children?.length ?? 0).toBeGreaterThan(0);
	});

	it('handles normal/split/blur videos in sequence on each first active frame', async () => {
		const provider: DeterministicFrameProvider = {
			getFrame: vi.fn(async (request) => ({
				kind: 'imageBitmap',
				cacheKey: `${request.componentId}-${request.frameIndex}`,
				imageBitmap: { width: 1080, height: 1920, close: vi.fn() } as any
			}))
		};
		const state = {
			environment: 'server',
			currentTime: 0,
			width: 1080,
			height: 1920,
			data: { settings: { fps: 30 } },
			markDirty: vi.fn()
		};
		const manager = new DeterministicMediaManager({
			sceneData: createSceneData(),
			deterministicMediaConfig: { enabled: true, strict: true, diagnostics: false, provider }
		});

		const pipelines = [
			{
				time: 0,
				context: createContext({ componentId: 'video-normal', startAt: 0, endAt: 1, state, effects: {} })
			},
			{
				time: 2,
				context: createContext({
					componentId: 'video-split',
					startAt: 2,
					endAt: 3,
					state,
					effects: createSplitEffect()
				})
			},
			{
				time: 4,
				context: createContext({
					componentId: 'video-blur',
					startAt: 4,
					endAt: 5,
					state,
					effects: { fillBackgroundBlur: { type: 'fillBackgroundBlur', enabled: true, blurAmount: 36 } }
				})
			}
		];

		for (const pipeline of pipelines) {
			state.currentTime = pipeline.time;
			const deterministicHook = new DeterministicMediaFrameHook({
				stateManager: state as any,
				deterministicMediaManager: manager
			});
			const textureHook = new PixiTextureHook();
			const splitHook = new PixiSplitScreenDisplayObjectHook({ stateManager: state as any });

			await deterministicHook.handle('update', pipeline.context);
			await textureHook.handle('update', pipeline.context);
			await splitHook.handle('update', pipeline.context);

			expect(pipeline.context.getResource('pixiTexture')).toBeTruthy();
			expect(pipeline.context.getResource('pixiRenderObject')).toBeTruthy();
		}
	});
});
