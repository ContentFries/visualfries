import { describe, expect, it, vi } from 'vitest';

import { RenderManager } from '$lib/managers/RenderManager.ts';

const createComponent = (id: string, data: any, updateImpl?: () => Promise<void>) =>
	({
		id,
		type: data.type,
	props: {
			visible: data.visible,
			timeline: data.timeline,
			sourceUrl: data.source?.url,
			getData: () => data
		},
		update: vi.fn(updateImpl ?? (async () => {}))
	}) as any;

describe('RenderManager', () => {
	it('updates near-start media components without reviving distant clips', async () => {
		const nearVideo = createComponent('near-video', {
			type: 'VIDEO',
			visible: true,
			timeline: { startAt: 10, endAt: 20 },
			source: { url: 'https://example.com/video.mp4' }
		});
		const farVideo = createComponent('far-video', {
			type: 'VIDEO',
			visible: true,
			timeline: { startAt: 30, endAt: 40 },
			source: { url: 'https://example.com/video.mp4' }
		});
		const text = createComponent('text', {
			type: 'TEXT',
			visible: true,
			timeline: { startAt: 30, endAt: 40 }
		});

		const renderManager = new RenderManager({
			stateManager: {
				currentTime: 9.5,
				duration: 60,
				markDirty: vi.fn()
			} as any,
			componentsManager: {
				getAll: () => [nearVideo, farVideo, text]
			} as any,
			eventManager: {
				on: vi.fn(),
				removeEventListener: vi.fn()
			} as any,
			appManager: {
				render: vi.fn()
			} as any,
			layersManager: {
				getAll: () => []
			} as any
		});

		await renderManager.render();

		expect(nearVideo.update).toHaveBeenCalledTimes(1);
		expect(farVideo.update).not.toHaveBeenCalled();
		expect(text.update).not.toHaveBeenCalled();
	});

	it('does not require getData() for media warm-window checks', async () => {
		const video = {
			id: 'video',
			type: 'VIDEO',
			props: {
				visible: true,
				timeline: { startAt: 10, endAt: 20 },
				sourceUrl: 'https://example.com/video.mp4',
				getData: vi.fn(() => {
					throw new Error('getData should not be used in render hot path');
				})
			},
			update: vi.fn(async () => {})
		} as any;

		const renderManager = new RenderManager({
			stateManager: {
				currentTime: 9.5,
				duration: 60,
				markDirty: vi.fn()
			} as any,
			componentsManager: {
				getAll: () => [video]
			} as any,
			eventManager: {
				on: vi.fn(),
				removeEventListener: vi.fn()
			} as any,
			appManager: {
				render: vi.fn()
			} as any,
			layersManager: {
				getAll: () => []
			} as any
		});

		await expect(renderManager.render()).resolves.toBeUndefined();
		expect(video.update).toHaveBeenCalledTimes(1);
		expect(video.props.getData).not.toHaveBeenCalled();
	});

	it('treats endAt as exclusive so adjacent clips do not overlap at the cut', async () => {
		const outgoing = createComponent('outgoing', {
			type: 'TEXT',
			visible: true,
			timeline: { startAt: 0, endAt: 10 }
		});
		const incoming = createComponent('incoming', {
			type: 'TEXT',
			visible: true,
			timeline: { startAt: 10, endAt: 20 }
		});

		const renderManager = new RenderManager({
			stateManager: {
				currentTime: 10,
				duration: 60,
				markDirty: vi.fn()
			} as any,
			componentsManager: {
				getAll: () => [outgoing, incoming]
			} as any,
			eventManager: {
				on: vi.fn(),
				removeEventListener: vi.fn()
			} as any,
			appManager: {
				render: vi.fn()
			} as any,
			layersManager: {
				getAll: () => []
			} as any
		});

		await renderManager.render();

		expect(outgoing.update).toHaveBeenCalledTimes(0);
		expect(incoming.update).toHaveBeenCalledTimes(1);
	});

	it('serializes async renders and drains one queued rerender after completion', async () => {
		let resolveUpdate: (() => void) | undefined;
		let updateCalls = 0;
		const component = createComponent(
			'video',
			{
				type: 'VIDEO',
				visible: true,
				timeline: { startAt: 0, endAt: 20 },
				source: { url: 'https://example.com/video.mp4' }
			},
			() => {
				updateCalls += 1;
				if (updateCalls === 1) {
					return new Promise<void>((resolve) => {
						resolveUpdate = resolve;
					});
				}
				return Promise.resolve();
			}
		);

		const renderManager = new RenderManager({
			stateManager: {
				currentTime: 1,
				duration: 60,
				markDirty: vi.fn()
			} as any,
			componentsManager: {
				getAll: () => [component]
			} as any,
			eventManager: {
				on: vi.fn(),
				removeEventListener: vi.fn()
			} as any,
			appManager: {
				render: vi.fn()
			} as any,
			layersManager: {
				getAll: () => []
			} as any
		});

		const firstRender = renderManager.render();
		const secondRender = renderManager.render();

		expect(component.update).toHaveBeenCalledTimes(1);

		resolveUpdate?.();
		await Promise.all([firstRender, secondRender]);

		expect(component.update).toHaveBeenCalledTimes(2);
	});

	it('keeps media components in the update set for one final tick after warm window exit', async () => {
		const component = createComponent('video', {
			type: 'VIDEO',
			visible: true,
			timeline: { startAt: 10, endAt: 20 },
			source: { url: 'https://example.com/video.mp4' }
		});

		const stateManager = {
			currentTime: 20.1,
			duration: 60,
			markDirty: vi.fn()
		} as any;

		const renderManager = new RenderManager({
			stateManager,
			componentsManager: {
				getAll: () => [component]
			} as any,
			eventManager: {
				on: vi.fn(),
				removeEventListener: vi.fn()
			} as any,
			appManager: {
				render: vi.fn()
			} as any,
			layersManager: {
				getAll: () => []
			} as any
		});

		await renderManager.render();
		stateManager.currentTime = 20.5;
		await renderManager.render();

		expect(component.update).toHaveBeenCalledTimes(2);
	});
});
