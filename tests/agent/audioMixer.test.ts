import { describe, expect, it } from 'vitest';
import {
	collectAudioSourcesForRanges,
	createMixAudioArgs,
	createPrepareSourceAudioArgs,
	resolveAudioMixRanges
} from '$lib/agent';

const scene = {
	id: 'audio-test',
	settings: {
		width: 1080,
		height: 1920,
		duration: 10,
		fps: 30,
		backgroundColor: '#000000'
	},
	assets: [{ id: 'voice', type: 'VIDEO', url: 'file:///tmp/voice.mp4' }],
	audioTracks: [
		{
			id: 'music',
			url: 'file:///tmp/music.wav',
			startAt: 1,
			endAt: 5,
			volume: 0.25
		}
	],
	layers: [
		{
			id: 'main',
			components: [
				{
					id: 'voice-video',
					type: 'VIDEO',
					source: { assetId: 'voice', startAt: 4 },
					timeline: { startAt: 2, endAt: 8 },
					appearance: { x: 0, y: 0, width: 1080, height: 1920 },
					volume: 0.8,
					muted: false
				}
			]
		}
	]
};

describe('agent audio mixer helpers', () => {
	it('resolves audio ranges with scene trim zones', () => {
		const ranges = resolveAudioMixRanges(
			{
				...scene,
				settings: {
					...scene.settings,
					trimZones: [{ start: 2, end: 3 }]
				}
			},
			1,
			4
		);

		expect(ranges).toEqual([
			{ start: 1, end: 2 },
			{ start: 3, end: 4 }
		]);
	});

	it('collects component and track audio with timeline offsets', () => {
		const plans = collectAudioSourcesForRanges(scene, [{ start: 3, end: 4 }]);

		expect(plans).toEqual([
			expect.objectContaining({
				id: 'voice-video',
				kind: 'component',
				url: 'file:///tmp/voice.mp4',
				startInChunkSec: 0,
				durationSec: 1,
				sourceOffsetSec: 5,
				volume: 0.8
			}),
			expect.objectContaining({
				id: 'music',
				kind: 'track',
				url: 'file:///tmp/music.wav',
				startInChunkSec: 0,
				durationSec: 1,
				sourceOffsetSec: 2,
				volume: 0.25
			})
		]);
	});

	it('builds ffmpeg args for preparing and mixing sources', () => {
		const [source] = collectAudioSourcesForRanges(scene, [{ start: 3, end: 4 }]);
		const prepareArgs = createPrepareSourceAudioArgs(source, '/tmp/prepared.flac');
		const mixArgs = createMixAudioArgs([{ plan: source, path: '/tmp/prepared.flac' }], '/tmp/mixed.flac', 1);

		expect(prepareArgs).toContain('-ss');
		expect(prepareArgs).toContain('5.000');
		expect(prepareArgs).toContain('/tmp/prepared.flac');
		expect(mixArgs).toContain('-filter_complex');
		expect(mixArgs.join(' ')).toContain('amix=inputs=1');
		expect(mixArgs).toContain('/tmp/mixed.flac');
	});
});
