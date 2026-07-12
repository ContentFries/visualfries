import { beforeEach, describe, expect, it, vi } from 'vitest';

const media = vi.hoisted(() => ({
	inputs: [] as Array<{ url: string; dispose: ReturnType<typeof vi.fn> }>,
	videoTimestamps: [] as number[],
	videoSamples: [] as Array<{
		toVideoFrame: ReturnType<typeof vi.fn>;
		close: ReturnType<typeof vi.fn>;
	}>,
	audioByUrl: new Map<
		string,
		Array<{ timestamp: number; duration: number; buffer: AudioBuffer }>
	>()
}));

vi.mock('mediabunny', () => {
	class UrlSource {
		constructor(public url: string) {}
	}

	class Input {
		public url: string;
		public dispose = vi.fn();

		constructor(options: { source: UrlSource }) {
			this.url = options.source.url;
			media.inputs.push(this);
		}

		async getPrimaryVideoTrack() {
			return { url: this.url, canDecode: vi.fn(async () => true) };
		}

		async getPrimaryAudioTrack() {
			return { url: this.url, canDecode: vi.fn(async () => true) };
		}
	}

	class VideoSampleSink {
		async *samplesAtTimestamps(timestamps: Iterable<number>) {
			for (const timestamp of timestamps) {
				media.videoTimestamps.push(timestamp);
				yield media.videoSamples.shift() ?? null;
			}
		}
	}

	class AudioBufferSink {
		private url: string;

		constructor(track: { url: string }) {
			this.url = track.url;
		}

		async *buffers() {
			for (const wrapped of media.audioByUrl.get(this.url) ?? []) yield wrapped;
		}
	}

	return { ALL_FORMATS: [{}], AudioBufferSink, Input, UrlSource, VideoSampleSink };
});

import {
	createMediabunnyVideoFrameProvider,
	mixMediabunnyAudioTracks
} from '../../src/lib/browser/mediaDecode.js';

type StartedSource = {
	buffer: AudioBuffer | null;
	connect: ReturnType<typeof vi.fn>;
	start: ReturnType<typeof vi.fn>;
};

class FakeOfflineAudioContext {
	static instances: FakeOfflineAudioContext[] = [];
	readonly destination = {};
	readonly gains: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn> }> = [];
	readonly sources: StartedSource[] = [];
	readonly rendered = { duration: 4, sampleRate: 48_000 } as AudioBuffer;

	constructor(
		public numberOfChannels: number,
		public length: number,
		public sampleRate: number
	) {
		FakeOfflineAudioContext.instances.push(this);
	}

	createGain() {
		const gain = { gain: { value: 1 }, connect: vi.fn() };
		this.gains.push(gain);
		return gain;
	}

	createBufferSource(): StartedSource {
		const source = { buffer: null, connect: vi.fn(), start: vi.fn() };
		this.sources.push(source);
		return source;
	}

	async startRendering() {
		return this.rendered;
	}
}

beforeEach(() => {
	media.inputs.length = 0;
	media.videoTimestamps.length = 0;
	media.videoSamples.length = 0;
	media.audioByUrl.clear();
	FakeOfflineAudioContext.instances.length = 0;
	vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
});

describe('createMediabunnyVideoFrameProvider', () => {
	it('decodes exact sequential timestamps one sample at a time and closes temporary resources', async () => {
		const frames = [
			{ close: vi.fn() },
			{ close: vi.fn() }
		] as unknown as VideoFrame[];
		const samples = frames.map((frame) => ({
			toVideoFrame: vi.fn(() => frame),
			close: vi.fn()
		}));
		media.videoSamples.push(...samples);
		const bitmaps = [{ close: vi.fn() }, { close: vi.fn() }] as unknown as ImageBitmap[];
		const createBitmap = vi
			.fn()
			.mockResolvedValueOnce(bitmaps[0])
			.mockResolvedValueOnce(bitmaps[1]);
		vi.stubGlobal('createImageBitmap', createBitmap);

		const provider = await createMediabunnyVideoFrameProvider({
			url: '/assets/video.mp4',
			componentId: 'video-1',
			sourceStart: 1.25,
			fps: 30,
			frameCount: 2
		});
		const request = {
			componentId: 'video-1',
			componentType: 'VIDEO' as const,
			fps: 30,
			width: 1080,
			height: 1920
		};

		const first = await provider.getFrame({ ...request, frameIndex: 0 });
		const second = await provider.getFrame({ ...request, frameIndex: 1 });

		expect(media.videoTimestamps).toEqual([1.25, 1.25 + 1 / 30]);
		expect(first).toMatchObject({
			kind: 'imageBitmap',
			cacheKey: 'video-1:mediabunny:0',
			imageBitmap: bitmaps[0]
		});
		expect(second).toMatchObject({ imageBitmap: bitmaps[1] });
		expect(createBitmap).toHaveBeenNthCalledWith(1, frames[0]);
		expect(frames[0].close).toHaveBeenCalledOnce();
		expect(frames[1].close).toHaveBeenCalledOnce();
		expect(samples[0].close).toHaveBeenCalledOnce();
		expect(samples[1].close).toHaveBeenCalledOnce();
		expect(bitmaps[0].close).not.toHaveBeenCalled();

		await provider.destroy?.();
		expect(media.inputs[0].dispose).toHaveBeenCalledOnce();
	});

	it('rejects out-of-order requests instead of seeking or buffering', async () => {
		const provider = await createMediabunnyVideoFrameProvider({
			url: '/assets/video.mp4',
			componentId: 'video-1',
			fps: 30,
			maxFrames: 3
		});

		await expect(
			provider.getFrame({
				componentId: 'video-1',
				componentType: 'VIDEO',
				frameIndex: 1,
				fps: 30,
				width: 1,
				height: 1
			})
		).rejects.toThrow('expected 0, received 1');
		await provider.destroy?.();
	});
});

describe('mixMediabunnyAudioTracks', () => {
	it('normalizes first sample timestamps, clips endAt, applies gain, and skips muted tracks', async () => {
		const buffer = (duration: number) => ({ duration }) as AudioBuffer;
		media.audioByUrl.set('/voice.mp3', [
			{ timestamp: 2.5, duration: 1, buffer: buffer(1) },
			{ timestamp: 3.5, duration: 1, buffer: buffer(1) },
			{ timestamp: 4.5, duration: 1, buffer: buffer(1) }
		]);

		const result = await mixMediabunnyAudioTracks({
			duration: 4,
			sampleRate: 48_000,
			channels: 2,
			tracks: [
				{ url: '/voice.mp3', startAt: 0.5, endAt: 2.75, volume: 0.4 },
				{ url: '/muted.mp3', startAt: 0, muted: true }
			]
		});

		const context = FakeOfflineAudioContext.instances[0];
		expect(context.numberOfChannels).toBe(2);
		expect(context.length).toBe(192_000);
		expect(context.gains[0].gain.value).toBe(0.4);
		expect(context.sources.map((source) => source.start.mock.calls[0])).toEqual([
			[0.5, 0, 1],
			[1.5, 0, 1],
			[2.5, 0, 0.25]
		]);
		expect(media.inputs).toHaveLength(1);
		expect(media.inputs[0].dispose).toHaveBeenCalledOnce();
		expect(result).toBe(context.rendered);
	});
});
