import { describe, expect, it } from 'vitest';

import { collectAudioSourcesForRanges } from '$lib/agent';

const baseScene = (overrides: Record<string, any> = {}) => ({
	id: 'sources',
	settings: { width: 100, height: 100, duration: 10, fps: 30, backgroundColor: '#000000' },
	assets: [{ id: 'a1', type: 'AUDIO', url: 'https://example.com/a1.mp3' }],
	layers: [] as any[],
	...overrides
});

const audio = (extra: Record<string, any> = {}) => ({
	id: 'aud',
	type: 'AUDIO',
	source: { assetId: 'a1' },
	timeline: { startAt: 0, endAt: 10 },
	appearance: { x: 0, y: 0, width: 10, height: 10 },
	...extra
});

const plan = (scene: any, range = { start: 0, end: 10 }) =>
	collectAudioSourcesForRanges(scene, [range]);

describe('collectAudioSourcesForRanges per source kind', () => {
	it('skips muted layers, muted components and zero volume', () => {
		const scene = baseScene({
			layers: [
				{ id: 'l1', muted: true, components: [audio()] },
				{ id: 'l2', components: [audio({ muted: true })] },
				{ id: 'l3', components: [audio({ volume: 0 })] }
			]
		});
		expect(plan(scene)).toEqual([]);
	});

	it('skips non-media components and components without a url', () => {
		const scene = baseScene({
			layers: [
				{
					id: 'l1',
					components: [
						audio({ source: { assetId: 'missing' } }),
						{
							id: 'img',
							type: 'IMAGE',
							source: { url: 'https://example.com/i.png' },
							timeline: { startAt: 0, endAt: 10 },
							appearance: { x: 0, y: 0, width: 10, height: 10 }
						}
					]
				}
			]
		});
		expect(plan(scene)).toEqual([]);
	});

	it('prefers a direct url or stream url over the asset url', () => {
		const scene = baseScene({
			layers: [
				{
					id: 'l1',
					components: [
						audio({ id: 'direct', source: { url: 'https://example.com/d.mp3', assetId: 'a1' } }),
						audio({ id: 'stream', source: { streamUrl: 'https://example.com/s.mp3' } }),
						audio({ id: 'asset' })
					]
				}
			]
		});
		expect(plan(scene).map((p) => [p.id, p.url, p.volume])).toEqual([
			['direct', 'https://example.com/d.mp3', 1],
			['stream', 'https://example.com/s.mp3', 1],
			['asset', 'https://example.com/a1.mp3', 1]
		]);
	});

	it('skips components outside the range and clips the source end', () => {
		const scene = baseScene({
			layers: [
				{
					id: 'l1',
					components: [
						audio({ id: 'late', timeline: { startAt: 6, endAt: 8 } }),
						audio({ id: 'clipped', source: { assetId: 'a1', startAt: 1, endAt: 5 } }),
						audio({ id: 'exhausted', source: { assetId: 'a1', startAt: 0, endAt: 2 } })
					]
				}
			]
		});
		const plans = plan(scene, { start: 2, end: 5 });
		expect(plans.map((p) => p.id)).toEqual(['clipped']);
		expect(plans[0]).toMatchObject({ durationSec: 2, sourceOffsetSec: 3, startInChunkSec: 0 });
	});

	it('falls back to a generated id and offsets by output position', () => {
		const scene = baseScene({
			layers: [{ id: 'l1', components: [{ ...audio(), id: '' }] }]
		});
		const plans = collectAudioSourcesForRanges(scene, [
			{ start: 0, end: 1 },
			{ start: 4, end: 6 }
		]);
		expect(plans).toHaveLength(2);
		expect(plans[1]).toMatchObject({
			id: 'component-0',
			startInChunkSec: 1,
			durationSec: 2,
			sourceOffsetSec: 4
		});
	});

	it('plans audio tracks with defaults and skips unusable ones', () => {
		const scene = baseScene({
			audioTracks: [
				{ id: 'm', url: 'https://example.com/m.mp3', startAt: 0, muted: true },
				{ id: 'z', url: 'https://example.com/z.mp3', startAt: 0, volume: 0 },
				{ id: 'late', url: 'https://example.com/l.mp3', startAt: 20 },
				{ id: '', url: 'https://example.com/full.mp3', startAt: 1, endAt: 4, volume: 0.5 },
				{ id: 'open', url: 'https://example.com/o.mp3', startAt: 0 }
			]
		});
		const plans = plan(scene, { start: 2, end: 6 });
		expect(plans).toEqual([
			{
				id: 'track-0',
				kind: 'track',
				url: 'https://example.com/full.mp3',
				startInChunkSec: 0,
				durationSec: 2,
				sourceOffsetSec: 1,
				volume: 0.5
			},
			{
				id: 'open',
				kind: 'track',
				url: 'https://example.com/o.mp3',
				startInChunkSec: 0,
				durationSec: 4,
				sourceOffsetSec: 2,
				volume: 1
			}
		]);
	});

	it('plans scene audio unless muted or silent', () => {
		const withAudio = (audioSettings: Record<string, any>) =>
			baseScene({
				settings: { ...baseScene().settings, audio: audioSettings }
			});
		expect(
			plan(withAudio({ src: 'https://example.com/bg.mp3', volume: 0.3 }), { start: 1, end: 3 })
		).toEqual([
			{
				id: 'scene-audio',
				kind: 'scene',
				url: 'https://example.com/bg.mp3',
				startInChunkSec: 0,
				durationSec: 2,
				sourceOffsetSec: 1,
				volume: 0.3
			}
		]);
		expect(plan(withAudio({ src: 'https://example.com/bg.mp3', muted: true }))).toEqual([]);
		expect(plan(withAudio({ src: 'https://example.com/bg.mp3', volume: 0 }))).toEqual([]);
		expect(plan(withAudio({ volume: 1 }))).toEqual([]);
	});
});
