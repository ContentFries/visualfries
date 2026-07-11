import { describe, expect, it } from 'vitest';
import {
	collectLocalDeterministicMediaComponents,
	normalizeDeterministicPublicBasePath,
	prepareLocalDeterministicMedia,
	resolveLocalDeterministicActiveWindow,
	resolveLocalPredecodedExtractionPlan,
	toLocalDeterministicFrameIndex
} from '$lib/agent';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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

	it('rejects deterministic public base paths that can escape the work directory', () => {
		expect(normalizeDeterministicPublicBasePath('/deterministic-media')).toBe(
			'/deterministic-media'
		);
		expect(() => normalizeDeterministicPublicBasePath('../escape')).toThrow(/publicBasePath/);
		expect(() => normalizeDeterministicPublicBasePath('/safe/../escape')).toThrow(/publicBasePath/);
	});

	it('skips deterministic media outside the requested frame window without probing sources', async () => {
		const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-det-media-'));
		try {
			const result = await prepareLocalDeterministicMedia({
				scene,
				workDir,
				fromFrame: 0,
				toFrame: 30
			});

			expect(result.media).toEqual([]);
			expect(result.payload.frameManifest).toEqual({});
		} finally {
			await fs.rm(workDir, { recursive: true, force: true });
		}
	});
});
