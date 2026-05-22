import { describe, expect, it } from 'vitest';
import {
	collectLocalDeterministicMediaComponents,
	resolveLocalDeterministicActiveWindow,
	resolveLocalPredecodedExtractionPlan,
	toLocalDeterministicFrameIndex
} from '$lib/agent';

const scene = {
	id: 'det-media-test',
	settings: {
		width: 1080,
		height: 1920,
		duration: 10,
		fps: 30,
		backgroundColor: '#000000'
	},
	assets: [{ id: 'source-video', type: 'VIDEO', url: 'file:///tmp/source.mp4' }],
	layers: [
		{
			id: 'video-layer',
			components: [
				{
					id: 'clip',
					type: 'VIDEO',
					source: { assetId: 'source-video', startAt: 4, endAt: 12 },
					timeline: { startAt: 2, endAt: 8 },
					appearance: { x: 0, y: 0, width: 1080, height: 1920 },
					muted: true
				}
			]
		}
	]
};

describe('agent deterministic media helpers', () => {
	it('collects VIDEO components through asset references', () => {
		const media = collectLocalDeterministicMediaComponents(scene);

		expect(media).toEqual([
			expect.objectContaining({
				id: 'clip',
				type: 'VIDEO',
				sourceUrl: 'file:///tmp/source.mp4',
				sourceStartAt: 4,
				sourceEndAt: 12,
				timelineStartAt: 2,
				timelineEndAt: 8
			})
		]);
	});

	it('resolves the active render window and deterministic frame index space', () => {
		const [media] = collectLocalDeterministicMediaComponents(scene);
		const activeWindow = resolveLocalDeterministicActiveWindow(media, 90, 180, 30);

		expect(activeWindow).toEqual({
			activeStartSec: 3,
			activeEndSec: 6,
			activeStartFrame: 90,
			activeEndFrame: 180,
			sourceStartSec: 5
		});
		expect(toLocalDeterministicFrameIndex(media, 90, 30)).toBe(150);
		expect(toLocalDeterministicFrameIndex(media, 179, 30)).toBe(239);
	});

	it('limits extraction when a source end cuts the requested output short', () => {
		const plan = resolveLocalPredecodedExtractionPlan(10, 10.1, 10, 30);

		expect(plan).toEqual({
			sourceStartSec: 10,
			extractFrameCount: 3,
			outputFrameCount: 10,
			sourceEndLimited: true
		});
	});
});
