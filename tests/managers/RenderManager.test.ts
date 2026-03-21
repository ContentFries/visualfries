import { describe, expect, it, vi } from 'vitest';

import { RenderManager } from '$lib/managers/RenderManager.ts';

const createComponent = (id: string, data: any, updateImpl?: () => Promise<void>) =>
	({
		id,
		type: data.type,
		props: {
			visible: data.visible,
			timeline: data.timeline,
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
});
