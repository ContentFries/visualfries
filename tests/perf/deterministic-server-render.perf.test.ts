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
		removeChildren() {
			for (const child of this.children) {
				if (child && typeof child === 'object') {
					(child as any).parent = undefined;
				}
			}
			this.children = [];
		}
		getChildIndex(child: any) {
			return this.children.indexOf(child);
		}
		setChildIndex(child: any, index: number) {
			const current = this.children.indexOf(child);
			if (current < 0) return;
			this.children.splice(current, 1);
			this.children.splice(index, 0, child);
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
			baseTexture: {
				update: vi.fn()
			},
			update: vi.fn()
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
		id: 'scene-perf',
		settings: {
			width: 1080,
			height: 1920,
			duration: 3,
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
	sourceStartAt?: number;
}) => {
	const resources = new Map<string, unknown>();
	const sourceStartAt = args.sourceStartAt ?? 0;
	const data = {
		id: args.componentId,
		type: 'VIDEO',
		source: { url: 'https://example.com/video.mp4', startAt: sourceStartAt },
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
			return sourceStartAt + Math.max(0, args.state.currentTime - args.startAt);
		},
		getResource: (key: string) => resources.get(key),
		setResource: (key: string, value: unknown) => resources.set(key, value),
		removeResource: (key: string) => resources.delete(key)
	} as any;
};

const splitEffect = () => ({
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

const installSyntheticCanvas = () => {
	const originalCreateElement = document.createElement.bind(document);
	const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
		if (tag !== 'canvas') {
			return originalCreateElement(tag);
		}

		const canvas = {
			width: 0,
			height: 0,
			getContext: () => ({
				filter: '',
				clearRect: () => undefined,
				drawImage: () => {
					const pixels = Math.max(1, canvas.width * canvas.height);
					// Deterministic synthetic work proportional to blur canvas area.
					let acc = 0;
					const loops = Math.max(200, Math.floor(pixels / 16));
					for (let i = 0; i < loops; i += 1) {
						acc += i % 7;
					}
					return acc;
				}
			})
		} as any;
		return canvas;
	}) as any);

	return () => {
		createElementSpy.mockRestore();
	};
};

const runRunner = async (frames: number, blurDownscale: number): Promise<{ diagnostics: any }> => {
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
		deterministicMediaConfig: {
			enabled: true,
			strict: true,
			diagnostics: true,
			blurDownscale,
			provider
		}
	});

	const contexts = [
		createContext({ componentId: 'video-normal', startAt: 0, endAt: 1, state, effects: {} }),
		createContext({ componentId: 'video-split', startAt: 1, endAt: 2, state, effects: splitEffect() }),
		createContext({
			componentId: 'video-blur',
			startAt: 2,
			endAt: 3,
			state,
			effects: { fillBackgroundBlur: { type: 'fillBackgroundBlur', enabled: true, blurAmount: 40 } }
		})
	];

	for (let frame = 0; frame < frames; frame += 1) {
		state.currentTime = (frame % 90) / 30;
		for (const context of contexts) {
			const deterministicHook = new DeterministicMediaFrameHook({
				stateManager: state as any,
				deterministicMediaManager: manager
			});
			const textureHook = new PixiTextureHook();
			const splitHook = new PixiSplitScreenDisplayObjectHook({
				stateManager: state as any,
				deterministicMediaManager: manager
			});
			await deterministicHook.handle('update', context);
			await textureHook.handle('update', context);
			await splitHook.handle('update', context);
		}
	}

	return { diagnostics: manager.getDiagnosticsReport() };
};

const runScenario = async (args: { frames: number; concurrency: number; blurDownscale: number }) => {
	const started = performance.now();
	const runs = await Promise.all(
		Array.from({ length: args.concurrency }, () => runRunner(args.frames, args.blurDownscale))
	);
	const elapsedMs = performance.now() - started;
	const totalFrames = args.frames * args.concurrency;
	const fps = totalFrames / (elapsedMs / 1000);

	const blurRedraws = runs.reduce((sum, run) => sum + (run.diagnostics?.blurRedraws ?? 0), 0);
	return {
		totalFrames,
		elapsedMs,
		fps,
		msPerFrame: elapsedMs / totalFrames,
		blurRedraws
	};
};

describe('Deterministic server render benchmark', () => {
	it('reports single and parallel throughput with deterministic blur optimization', async () => {
		const restoreCanvas = installSyntheticCanvas();
		try {
			const baselineSingle = await runScenario({ frames: 120, concurrency: 1, blurDownscale: 1 });
			const optimizedSingle = await runScenario({ frames: 120, concurrency: 1, blurDownscale: 0.33 });
			const baselineParallel = await runScenario({ frames: 90, concurrency: 4, blurDownscale: 1 });
			const optimizedParallel = await runScenario({ frames: 90, concurrency: 4, blurDownscale: 0.33 });

			console.table({
				baseline_single: baselineSingle,
				optimized_single: optimizedSingle,
				baseline_parallel4: baselineParallel,
				optimized_parallel4: optimizedParallel
			});

			expect(baselineSingle.totalFrames).toBe(120);
			expect(optimizedSingle.totalFrames).toBe(120);
			expect(baselineParallel.totalFrames).toBe(360);
			expect(optimizedParallel.totalFrames).toBe(360);
			expect(optimizedSingle.fps).toBeGreaterThan(baselineSingle.fps);
			expect(optimizedParallel.fps).toBeGreaterThan(baselineParallel.fps);
			expect(optimizedSingle.blurRedraws).toBeGreaterThan(0);
		} finally {
			restoreCanvas();
		}
	});
});

