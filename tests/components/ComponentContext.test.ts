import { describe, expect, it, vi } from 'vitest';

import { ComponentContext } from '$lib/components/ComponentContext.svelte.ts';
import { DeterministicRenderError } from '$lib/schemas/runtime/deterministic.ts';

const createContext = () => {
	const eventManager = {
		emit: vi.fn()
	};
	const context = new ComponentContext({
		stateManager: {
			currentTime: 0,
			transformTime: (value: number) => value
		} as any,
		eventManager: eventManager as any
	});
	context.setComponentProps({
		duration: 10,
		getData: () =>
			({
				id: 'component-1',
				type: 'VIDEO',
				timeline: { startAt: 0, endAt: 10 },
				source: { url: 'https://example.com/video.mp4', startAt: 0 },
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				animations: {},
				effects: {},
				visible: true,
				order: 0
			}) as any
	} as any);
	return { context, eventManager };
};

describe('ComponentContext.runHooks', () => {
	it('continues after non-fatal hook errors and emits hookerror', async () => {
		const { context, eventManager } = createContext();
		const secondHook = { handle: vi.fn(async () => undefined), priority: 2 };

		await expect(
			context.runHooks(
				[
					{
						handle: vi.fn(async () => {
							throw new Error('non-fatal');
						}),
						priority: 1
					},
					secondHook as any
				] as any,
				'update'
			)
		).resolves.toBeUndefined();

		expect(eventManager.emit).toHaveBeenCalledWith(
			'hookerror',
			expect.objectContaining({
				hookType: 'update',
				componentId: 'component-1',
				error: expect.any(Error)
			})
		);
		expect(secondHook.handle).toHaveBeenCalledTimes(1);
	});

	it('rethrows DeterministicRenderError after emitting hookerror', async () => {
		const { context, eventManager } = createContext();
		const fatalError = new DeterministicRenderError('fatal', {
			componentId: 'component-1',
			frameIndex: 1,
			sceneTime: 0
		});
		const trailingHook = { handle: vi.fn(async () => undefined), priority: 2 };

		await expect(
			context.runHooks(
				[
					{
						handle: vi.fn(async () => {
							throw fatalError;
						}),
						priority: 1
					},
					trailingHook as any
				] as any,
				'update'
			)
		).rejects.toBe(fatalError);

		expect(eventManager.emit).toHaveBeenCalledWith(
			'hookerror',
			expect.objectContaining({
				error: fatalError
			})
		);
		expect(trailingHook.handle).not.toHaveBeenCalled();
	});
});

describe('ComponentContext timeline activity', () => {
	it('treats endAt as exclusive for back-to-back clips', () => {
		const eventManager = {
			emit: vi.fn()
		};
		const stateManager = {
			currentTime: 10,
			transformTime: (value: number) => value
		} as any;

		const outgoing = new ComponentContext({
			stateManager,
			eventManager: eventManager as any
		});
		outgoing.setComponentProps({
			id: 'outgoing',
			type: 'VIDEO',
			duration: 10,
			timeline: { startAt: 0, endAt: 10 },
			getData: () =>
				({
					id: 'outgoing',
					type: 'VIDEO',
					timeline: { startAt: 0, endAt: 10 },
					source: { url: 'https://example.com/video.mp4', startAt: 0 },
					appearance: {},
					animations: {},
					effects: {},
					visible: true,
					order: 0
				}) as any
		} as any);

		const incoming = new ComponentContext({
			stateManager,
			eventManager: eventManager as any
		});
		incoming.setComponentProps({
			id: 'incoming',
			type: 'VIDEO',
			duration: 10,
			timeline: { startAt: 10, endAt: 20 },
			getData: () =>
				({
					id: 'incoming',
					type: 'VIDEO',
					timeline: { startAt: 10, endAt: 20 },
					source: { url: 'https://example.com/video.mp4', startAt: 10 },
					appearance: {},
					animations: {},
					effects: {},
					visible: true,
					order: 0
				}) as any
		} as any);

		expect(outgoing.isActive).toBe(false);
		expect(incoming.isActive).toBe(true);
	});

	it('keeps source.startAt offset for trimmed audio clips', () => {
		const eventManager = {
			emit: vi.fn()
		};
		const stateManager = {
			currentTime: 12,
			transformTime: (value: number, inverse?: boolean) => value
		} as any;

		const audio = new ComponentContext({
			stateManager,
			eventManager: eventManager as any
		});
		audio.setComponentProps({
			id: 'audio',
			type: 'AUDIO',
			duration: 10,
			timeline: { startAt: 10, endAt: 20 },
			getData: () =>
				({
					id: 'audio',
					type: 'AUDIO',
					timeline: { startAt: 10, endAt: 20 },
					source: { url: 'https://example.com/audio.mp3', startAt: 30 },
					appearance: {},
					animations: {},
					effects: {},
					visible: true,
					order: 0
				}) as any
		} as any);

		expect(audio.currentComponentTime).toBe(32);
	});

	it('falls back to the base source.startAt when an override omits it', () => {
		const { context } = createContext();
		(context as any).state.currentTime = 2;

		context.updateContextData({
			id: 'component-1',
			type: 'VIDEO',
			timeline: { startAt: 0, endAt: 10 },
			source: { url: 'https://example.com/video.mp4' },
			appearance: { x: 0, y: 0, width: 1920, height: 1080 },
			animations: {},
			effects: {},
			visible: true,
			order: 0
		} as any);

		expect(context.currentComponentTime).toBe(2);
	});

	it('keeps componentTimelineTime aligned with exclusive end boundaries', () => {
		const { context } = createContext();
		(context as any).state.currentTime = 10;

		expect(context.isActive).toBe(false);
		expect(context.componentTimelineTime).toBeUndefined();
	});

	it('snapshots the hook list before awaiting handlers', async () => {
		const { context } = createContext();
		const hooks: any[] = [];
		const callOrder: string[] = [];

		hooks.push(
			{
				priority: 1,
				handle: vi.fn(async () => {
					callOrder.push('first');
					hooks.push({
						priority: 0,
						handle: vi.fn(async () => {
							callOrder.push('inserted');
						})
					});
				})
			},
			{
				priority: 2,
				handle: vi.fn(async () => {
					callOrder.push('second');
				})
			}
		);

		await context.runHooks(hooks as any, 'update');

		expect(callOrder).toEqual(['first', 'second']);
		expect(hooks).toHaveLength(3);
	});
});
