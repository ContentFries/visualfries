import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
	registerPixi: vi.fn()
}));

vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();

	class Container {
		children: any[] = [];
		visible = true;
		x = 0;
		y = 0;
		addChild(...children: any[]) {
			for (const child of children) {
				if (child && typeof child === 'object') {
					(child as any).parent = this;
				}
			}
			this.children.push(...children);
			return children[0];
		}
		removeChild(child: any) {
			const index = this.children.indexOf(child);
			if (index >= 0) {
				this.children.splice(index, 1);
				if (child && typeof child === 'object') {
					(child as any).parent = undefined;
				}
			}
			return child;
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
		constructor(_bitmap: any) {}
		destroy() {}
	}

	class Application {
		renderer: any;
		stage: any;
		ticker: any;
		destroy: any;
		render: any;

		constructor(options: any) {
			this.renderer = options?.forceCanvas === false ? { gl: {}, type: 'webgl' } : { type: 'canvas' };
			this.stage = new Container();
			this.ticker = { stop: vi.fn() };
			this.destroy = vi.fn();
			this.render = vi.fn();
		}
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
		Application,
		Container,
		Sprite,
		Graphics,
		BlurFilter,
		ImageBitmapResource,
		Texture
	};
});

vi.mock('$lib/registers.js', () => ({
	registerGsapPlugins: vi.fn(async () => ({
		PixiPlugin: {
			registerPIXI: hoisted.registerPixi
		}
	}))
}));

import { AppManager } from '$lib/managers/AppManager.svelte.ts';
import { DeterministicMediaFrameHook } from '$lib/components/hooks/DeterministicMediaFrameHook.ts';
import { PixiTextureHook } from '$lib/components/hooks/PixiTextureHook.ts';
import { PixiSplitScreenDisplayObjectHook } from '$lib/components/hooks/PixiSplitScreenDisplayObjectHook.ts';
import { DeterministicMediaManager } from '$lib/managers/DeterministicMediaManager.ts';
import type { DeterministicFrameProvider } from '$lib';

const createSceneData = () =>
	({
		id: 'scene-webgl-int',
		settings: {
			width: 1080,
			height: 1920,
			duration: 12,
			fps: 30,
			backgroundColor: '#000000'
		},
		assets: [],
		layers: [],
		transitions: [],
		audioTracks: []
	}) as any;

const createContext = (args: {
	componentId: string;
	startAt: number;
	endAt: number;
	sourceStartAt?: number;
	state: any;
	effects?: Record<string, unknown>;
}) => {
	const resources = new Map<string, unknown>();
	const data = {
		id: args.componentId,
		type: 'VIDEO',
		source: { url: 'https://example.com/video.mp4', startAt: args.sourceStartAt ?? 0 },
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
			return (args.sourceStartAt ?? 0) + Math.max(0, args.state.currentTime - args.startAt);
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

describe('Deterministic server webgl integration', () => {
	it('renders deterministic normal/split/blur frames when serverRendererMode is webgl', async () => {
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
			scale: 1,
			data: { settings: { fps: 30 } },
			markDirty: vi.fn()
		};
		const deterministicManager = new DeterministicMediaManager({
			sceneData: createSceneData(),
			deterministicMediaConfig: { enabled: true, strict: true, diagnostics: true, provider }
		});
		const appManager = new AppManager({
			stateManager: state as any,
			domManager: {
				canvas: {
					getContext: vi.fn((type: string) => {
						if (type === 'webgl2') return {};
						if (type === '2d') return {};
						return null;
					})
				}
			} as any,
			forceCanvas: false,
			serverRendererMode: 'webgl',
			preferWebGL2: true,
			powerPreference: 'high-performance',
			deterministicMediaManager: deterministicManager
		});
		const originalCreateElement = document.createElement.bind(document);
		const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
			if (tag === 'canvas') {
				return {
					getContext: (type: string) => {
						if (type === 'webgl2') return {};
						if (type === '2d') return {};
						return null;
					}
				} as any;
			}
			return originalCreateElement(tag);
		}) as any);
		try {
			await appManager.initialize();
		} finally {
			createElementSpy.mockRestore();
		}

		expect(deterministicManager.getDiagnosticsReport()?.selectedRendererType).toBe('webgl');
		expect(deterministicManager.getDiagnosticsReport()?.rendererFallbackOccurred).toBe(false);

		const deterministicHook = new DeterministicMediaFrameHook({
			stateManager: state as any,
			deterministicMediaManager: deterministicManager
		});
		const textureHook = new PixiTextureHook();
		const splitHook = new PixiSplitScreenDisplayObjectHook({ stateManager: state as any });

		const pipelines = [
			{
				time: 0,
				context: createContext({
					componentId: 'video-normal',
					startAt: 0,
					endAt: 1,
					state,
					effects: {}
				})
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
			await deterministicHook.handle('update', pipeline.context);
			await textureHook.handle('update', pipeline.context);
			await splitHook.handle('update', pipeline.context);
			expect(pipeline.context.getResource('pixiTexture')).toBeTruthy();
			expect(pipeline.context.getResource('pixiRenderObject')).toBeTruthy();
		}
	});
});
