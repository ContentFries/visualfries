import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
	applicationCtor: vi.fn(),
	registerPixi: vi.fn(),
	throwOnWebGLInit: false
}));

vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();
	class MockApplication {
		renderer: any;
		stage: any;
		ticker: any;
		destroy: any;
		render: any;

		constructor(options: any) {
			hoisted.applicationCtor(options);
			if (hoisted.throwOnWebGLInit && options?.forceCanvas === false) {
				throw new Error('webgl init failed');
			}
			this.renderer = options?.forceCanvas === false ? { gl: {} } : { type: 'canvas' };
			this.stage = { scale: { set: vi.fn() } };
			this.ticker = { stop: vi.fn() };
			this.destroy = vi.fn();
			this.render = vi.fn();
		}
	}

	return {
		...actual,
		Application: MockApplication
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

const createCradle = (overrides?: Partial<any>) => {
	const canvas = {
		getContext: vi.fn((_type: string) => ({}))
	};
	return {
		stateManager: {
			width: 1080,
			height: 1920,
			environment: 'server',
			scale: 1
		},
		domManager: {
			canvas
		},
		forceCanvas: false,
		serverRendererMode: 'canvas',
		preferWebGL2: true,
		powerPreference: 'high-performance',
		deterministicMediaManager: {
			recordRendererSelection: vi.fn()
		},
		...overrides
	};
};

describe('AppManager server renderer mode', () => {
	beforeEach(() => {
		hoisted.applicationCtor.mockReset();
		hoisted.registerPixi.mockReset();
		hoisted.throwOnWebGLInit = false;
	});

	it('defaults server renderer mode to canvas', async () => {
		const cradle = createCradle({ serverRendererMode: undefined });
		const manager = new AppManager(cradle as any);
		await manager.initialize();

		expect(hoisted.applicationCtor).toHaveBeenCalledTimes(1);
		expect(hoisted.applicationCtor.mock.calls[0][0].forceCanvas).toBe(true);
		expect(cradle.deterministicMediaManager.recordRendererSelection).toHaveBeenCalledWith({
			rendererType: 'canvas',
			fallbackOccurred: false,
			fallbackReason: undefined
		});
	});

	it('uses webgl path when serverRendererMode is webgl and supported', async () => {
		const cradle = createCradle({ serverRendererMode: 'webgl', forceCanvas: false });
		const originalCreateElement = document.createElement.bind(document);
		const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
			if (tag === 'canvas') {
				return {
					getContext: (type: string) => {
						if (type === 'webgl2') return {};
						return null;
					}
				} as any;
			}
			return originalCreateElement(tag);
		}) as any);

		try {
			const manager = new AppManager(cradle as any);
			await manager.initialize();
		} finally {
			createElementSpy.mockRestore();
		}

		expect(hoisted.applicationCtor).toHaveBeenCalledTimes(1);
		expect(hoisted.applicationCtor.mock.calls[0][0].forceCanvas).toBe(false);
		expect(hoisted.applicationCtor.mock.calls[0][0].preference).toBe('webgl');
		expect(hoisted.applicationCtor.mock.calls[0][0].powerPreference).toBe('high-performance');
		expect(cradle.deterministicMediaManager.recordRendererSelection).toHaveBeenCalledWith({
			rendererType: 'webgl',
			fallbackOccurred: false,
			fallbackReason: undefined
		});
	});

	it('falls back to canvas when webgl initialization fails', async () => {
		hoisted.throwOnWebGLInit = true;
		const cradle = createCradle({ serverRendererMode: 'webgl', forceCanvas: false });
		const originalCreateElement = document.createElement.bind(document);
		const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
			if (tag === 'canvas') {
				return {
					getContext: (type: string) => {
						if (type === 'webgl2') return {};
						return null;
					}
				} as any;
			}
			return originalCreateElement(tag);
		}) as any);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		try {
			const manager = new AppManager(cradle as any);
			await manager.initialize();
		} finally {
			createElementSpy.mockRestore();
			warnSpy.mockRestore();
		}

		expect(hoisted.applicationCtor).toHaveBeenCalledTimes(2);
		expect(hoisted.applicationCtor.mock.calls[0][0].forceCanvas).toBe(false);
		expect(hoisted.applicationCtor.mock.calls[1][0].forceCanvas).toBe(true);
		expect(cradle.deterministicMediaManager.recordRendererSelection).toHaveBeenCalledWith(
			expect.objectContaining({
				rendererType: 'canvas',
				fallbackOccurred: true
			})
		);
	});
});
