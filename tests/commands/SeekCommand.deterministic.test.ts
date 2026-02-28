import { describe, expect, it, vi } from 'vitest';

import { SeekCommand } from '$lib/commands/SeekCommand.ts';

type MockComponent = {
	id: string;
	type: 'VIDEO' | 'GIF';
	props: { timeline: { startAt: number; endAt: number } };
	context: {
		data: { effects: { map: Record<string, unknown> } };
		isActive: boolean;
		getResource: (key: 'pixiTexture' | 'pixiRenderObject' | 'videoElement' | 'imageElement') => unknown;
		setResource: (key: string, value: unknown) => void;
	};
};

const createComponent = (args: {
	id: string;
	startAt: number;
	endAt: number;
	state: { currentTime: number };
	effects?: Record<string, unknown>;
}): MockComponent => {
	const resources = new Map<string, unknown>();
	return {
		id: args.id,
		type: 'VIDEO',
		props: { timeline: { startAt: args.startAt, endAt: args.endAt } },
		context: {
			data: { effects: { map: args.effects ?? {} } },
			get isActive() {
				return args.state.currentTime >= args.startAt && args.state.currentTime <= args.endAt;
			},
			getResource: (key) => resources.get(key),
			setResource: (key, value) => resources.set(key, value)
		}
	};
};

describe('SeekCommand deterministic readiness', () => {
	const createDeterministicManagerMock = (overrides?: Partial<any>) =>
		({
			isEnabled: () => true,
			config: {
				seekMaxAttempts: 4,
				loadingMaxAttempts: 2,
				readyYieldMs: 0
			},
			recordReadyAttempt: vi.fn(),
			recordExtraRenderPass: vi.fn(),
			...overrides
		}) as any;

	it('prepares first active split frame without external warmup loop', async () => {
		const state = { environment: 'server', duration: 10, state: 'paused', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-split',
			startAt: 2,
			endAt: 6,
			state,
			effects: { layoutSplit: { type: 'layoutSplit' } }
		});

		const timeline = {
			seek: vi.fn((time: number) => {
				state.currentTime = time;
			})
		} as any;

		let renderCalls = 0;
		const renderManager = {
			render: vi.fn(async () => {
				renderCalls += 1;
				if (state.currentTime === 2 && renderCalls >= 2) {
					component.context.setResource('pixiTexture', { id: 'tex-split' });
					component.context.setResource('pixiRenderObject', { id: 'obj-split' });
				}
			})
		} as any;

		const command = new SeekCommand({
			timelineManager: timeline,
			stateManager: state,
			renderManager,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager: createDeterministicManagerMock()
		});

		await expect(command.execute({ time: 2 })).resolves.toBeUndefined();
		expect(component.context.getResource('pixiTexture')).toBeTruthy();
		expect(component.context.getResource('pixiRenderObject')).toBeTruthy();
		expect(renderCalls).toBeGreaterThanOrEqual(2);
	});

	it('waits for blur source readiness on first active deterministic frame', async () => {
		const state = { environment: 'server', duration: 10, state: 'paused', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-blur',
			startAt: 3,
			endAt: 7,
			state,
			effects: { fillBackgroundBlur: { type: 'fillBackgroundBlur', blurAmount: 32 } }
		});

		const timeline = {
			seek: vi.fn((time: number) => {
				state.currentTime = time;
			})
		} as any;

		let renderCalls = 0;
		const renderManager = {
			render: vi.fn(async () => {
				renderCalls += 1;
				if (state.currentTime === 3 && renderCalls >= 2) {
					component.context.setResource('pixiTexture', { id: 'tex-blur' });
					component.context.setResource('pixiRenderObject', { id: 'obj-blur' });
				}
				if (state.currentTime === 3 && renderCalls >= 3) {
					component.context.setResource('imageElement', { id: 'img-blur' });
				}
			})
		} as any;

		const command = new SeekCommand({
			timelineManager: timeline,
			stateManager: state,
			renderManager,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager: createDeterministicManagerMock()
		});

		await expect(command.execute({ time: 3 })).resolves.toBeUndefined();
		expect(component.context.getResource('pixiTexture')).toBeTruthy();
		expect(component.context.getResource('pixiRenderObject')).toBeTruthy();
		expect(component.context.getResource('imageElement')).toBeTruthy();
		expect(renderCalls).toBeGreaterThanOrEqual(3);
	});

	it('handles three deterministic videos in sequence without consumer preroll', async () => {
		const state = { environment: 'server', duration: 12, state: 'paused', currentTime: 0 } as any;
		const normal = createComponent({ id: 'video-normal', startAt: 0, endAt: 1, state });
		const split = createComponent({
			id: 'video-split',
			startAt: 1,
			endAt: 2,
			state,
			effects: { layoutSplit: { type: 'layoutSplit' } }
		});
		const blur = createComponent({
			id: 'video-blur',
			startAt: 2,
			endAt: 3,
			state,
			effects: { fillBackgroundBlur: { type: 'fillBackgroundBlur', blurAmount: 24 } }
		});

		let activeSeekTime = 0;
		const timeline = {
			seek: vi.fn((time: number) => {
				activeSeekTime = time;
				state.currentTime = time;
			})
		} as any;

		const renderCountBySeek = new Map<number, number>();
		const renderManager = {
			render: vi.fn(async () => {
				const next = (renderCountBySeek.get(activeSeekTime) ?? 0) + 1;
				renderCountBySeek.set(activeSeekTime, next);

				if (activeSeekTime === 0 && next >= 2) {
					normal.context.setResource('pixiTexture', { id: 'tex-normal' });
					normal.context.setResource('pixiRenderObject', { id: 'obj-normal' });
				}
				if (activeSeekTime === 1 && next >= 2) {
					split.context.setResource('pixiTexture', { id: 'tex-split' });
					split.context.setResource('pixiRenderObject', { id: 'obj-split' });
				}
				if (activeSeekTime === 2 && next >= 2) {
					blur.context.setResource('pixiTexture', { id: 'tex-blur' });
					blur.context.setResource('pixiRenderObject', { id: 'obj-blur' });
				}
				if (activeSeekTime === 2 && next >= 3) {
					blur.context.setResource('imageElement', { id: 'img-blur' });
				}
			})
		} as any;

		const command = new SeekCommand({
			timelineManager: timeline,
			stateManager: state,
			renderManager,
			componentsManager: { getAll: () => [normal, split, blur] } as any,
			deterministicMediaManager: createDeterministicManagerMock()
		});

		await expect(command.execute({ time: 0 })).resolves.toBeUndefined();
		expect(normal.context.getResource('pixiTexture')).toBeTruthy();
		expect(normal.context.getResource('pixiRenderObject')).toBeTruthy();

		await expect(command.execute({ time: 1 })).resolves.toBeUndefined();
		expect(split.context.getResource('pixiTexture')).toBeTruthy();
		expect(split.context.getResource('pixiRenderObject')).toBeTruthy();

		await expect(command.execute({ time: 2 })).resolves.toBeUndefined();
		expect(blur.context.getResource('pixiTexture')).toBeTruthy();
		expect(blur.context.getResource('pixiRenderObject')).toBeTruthy();
		expect(blur.context.getResource('imageElement')).toBeTruthy();
	});

	it('respects configured deterministic seek attempt cap', async () => {
		const state = { environment: 'server', duration: 10, state: 'paused', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-pending',
			startAt: 1,
			endAt: 5,
			state
		});
		const timeline = {
			seek: vi.fn((time: number) => {
				state.currentTime = time;
			})
		} as any;
		const renderManager = {
			render: vi.fn(async () => {
				// Intentionally keep resources missing to force retries.
			})
		} as any;
		const deterministicMediaManager = createDeterministicManagerMock({
			config: { seekMaxAttempts: 2, loadingMaxAttempts: 0, readyYieldMs: 0 }
		});

		const command = new SeekCommand({
			timelineManager: timeline,
			stateManager: state,
			renderManager,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager
		});

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			await expect(command.execute({ time: 1 })).resolves.toBeUndefined();
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Deterministic media was not ready after seek for active components')
			);
		} finally {
			warnSpy.mockRestore();
		}
		expect(deterministicMediaManager.recordReadyAttempt).toHaveBeenCalledTimes(2);
	});

	it('throws after deterministic seek retries in strict mode', async () => {
		const state = { environment: 'server', duration: 10, state: 'paused', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-pending-strict',
			startAt: 1,
			endAt: 5,
			state
		});
		const command = new SeekCommand({
			timelineManager: {
				seek: vi.fn((time: number) => {
					state.currentTime = time;
				})
			} as any,
			stateManager: state,
			renderManager: { render: vi.fn(async () => undefined) } as any,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager: createDeterministicManagerMock({
				config: { seekMaxAttempts: 2, loadingMaxAttempts: 0, readyYieldMs: 0, strict: true }
			})
		});

		await expect(command.execute({ time: 1 })).rejects.toThrow(
			'Deterministic media was not ready after seek for active components'
		);
	});

	it('uses floor when computing the current scene frame index', async () => {
		const state = { environment: 'server', duration: 10, state: 'paused', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-floor',
			startAt: 1.9,
			endAt: 5,
			state
		});
		const deterministicMediaManager = createDeterministicManagerMock({
			config: { seekMaxAttempts: 1, loadingMaxAttempts: 0, readyYieldMs: 0 }
		});
		let renderCalls = 0;
		const command = new SeekCommand({
			timelineManager: {
				seek: vi.fn((time: number) => {
					state.currentTime = time;
				})
			} as any,
			stateManager: state,
			renderManager: {
				render: vi.fn(async () => {
					renderCalls += 1;
					if (renderCalls >= 2) {
						component.context.setResource('pixiTexture', { id: 'tex-floor' });
						component.context.setResource('pixiRenderObject', { id: 'obj-floor' });
					}
				})
			} as any,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager
		});

		await expect(command.execute({ time: 1.99 })).resolves.toBeUndefined();
		expect(deterministicMediaManager.recordReadyAttempt).toHaveBeenCalledWith(59);
	});

	it('awaits document.fonts.ready only once in deterministic server mode', async () => {
		const state = { environment: 'server', duration: 10, state: 'paused', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-fonts',
			startAt: 0,
			endAt: 10,
			state
		});
		const timeline = {
			seek: vi.fn((time: number) => {
				state.currentTime = time;
			})
		} as any;
		const renderManager = {
			render: vi.fn(async () => {
				component.context.setResource('pixiTexture', { id: 'tex-fonts' });
				component.context.setResource('pixiRenderObject', { id: 'obj-fonts' });
			})
		} as any;
		const deterministicMediaManager = createDeterministicManagerMock();
		const command = new SeekCommand({
			timelineManager: timeline,
			stateManager: state,
			renderManager,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager
		});

		let readyReads = 0;
		const originalDocument = globalThis.document;
		Object.defineProperty(globalThis, 'document', {
			value: {
				...originalDocument,
				fonts: {
					get ready() {
						readyReads += 1;
						return Promise.resolve();
					}
				}
			},
			configurable: true
		});

		try {
			await expect(command.execute({ time: 0 })).resolves.toBeUndefined();
			const readsAfterFirstSeek = readyReads;
			await expect(command.execute({ time: 0.2 })).resolves.toBeUndefined();
			expect(readyReads).toBe(readsAfterFirstSeek);
		} finally {
			Object.defineProperty(globalThis, 'document', {
				value: originalDocument,
				configurable: true
			});
		}

		expect(renderManager.render).toHaveBeenCalled();
		expect(readyReads).toBe(2);
	});

	it('uses loading retry loop only while state is loading', async () => {
		const state = { environment: 'server', duration: 10, state: 'loading', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-loading',
			startAt: 0,
			endAt: 10,
			state
		});
		const timeline = {
			seek: vi.fn((time: number) => {
				state.currentTime = time;
			})
		} as any;
		let renders = 0;
		const renderManager = {
			render: vi.fn(async () => {
				renders += 1;
				component.context.setResource('pixiTexture', { id: `tex-${renders}` });
				component.context.setResource('pixiRenderObject', { id: `obj-${renders}` });
				if (renders >= 2) {
					state.state = 'paused';
				}
			})
		} as any;
		const deterministicMediaManager = createDeterministicManagerMock({
			config: { seekMaxAttempts: 4, loadingMaxAttempts: 3, readyYieldMs: 0 }
		});
		const command = new SeekCommand({
			timelineManager: timeline,
			stateManager: state,
			renderManager,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager
		});

		await expect(command.execute({ time: 0 })).resolves.toBeUndefined();
		expect(renders).toBe(2);
		expect(deterministicMediaManager.recordExtraRenderPass).toHaveBeenCalledTimes(1);
	});

	it('uses setImmediate for zero-delay deterministic retries when available', async () => {
		const state = { environment: 'server', duration: 10, state: 'paused', currentTime: 0 } as any;
		const component = createComponent({
			id: 'video-set-immediate',
			startAt: 1,
			endAt: 5,
			state
		});
		const timeline = {
			seek: vi.fn((time: number) => {
				state.currentTime = time;
			})
		} as any;
		const renderManager = {
			render: vi.fn(async () => {
				// Keep resources missing to force retries.
			})
		} as any;
		const deterministicMediaManager = createDeterministicManagerMock({
			config: { seekMaxAttempts: 2, loadingMaxAttempts: 0, readyYieldMs: 0 }
		});
		const command = new SeekCommand({
			timelineManager: timeline,
			stateManager: state,
			renderManager,
			componentsManager: { getAll: () => [component] } as any,
			deterministicMediaManager
		});

		const originalSetImmediate = (globalThis as any).setImmediate;
		const setImmediateMock = vi.fn((cb: () => void) => {
			cb();
			return 0;
		});
		(globalThis as any).setImmediate = setImmediateMock;

		try {
			await expect(command.execute({ time: 1 })).resolves.toBeUndefined();
		} finally {
			(globalThis as any).setImmediate = originalSetImmediate;
		}

		expect(setImmediateMock).toHaveBeenCalled();
	});
});
