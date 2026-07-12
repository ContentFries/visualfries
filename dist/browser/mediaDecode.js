import { ALL_FORMATS, AudioBufferSink, Input, UrlSource, VideoSampleSink } from 'mediabunny';
const assertPositiveFinite = (value, label) => {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${label} must be a positive finite number`);
    }
};
const openInput = (url) => new Input({ formats: ALL_FORMATS, source: new UrlSource(url) });
/**
 * Opens one video input and exposes its decoded frames to deterministic composition.
 * Requests must be sequential so MediaBunny can decode each packet at most once. Only
 * one sample and its temporary VideoFrame are held by this adapter at any time.
 */
export async function createMediabunnyVideoFrameProvider(options) {
    assertPositiveFinite(options.fps, 'Video provider FPS');
    const sourceStart = options.sourceStart ?? 0;
    if (!Number.isFinite(sourceStart) || sourceStart < 0) {
        throw new Error('Video provider sourceStart must be a non-negative finite number');
    }
    const maxFrames = options.frameCount ?? options.maxFrames;
    if (!Number.isInteger(maxFrames) || maxFrames <= 0) {
        throw new Error('Video provider frameCount/maxFrames must be a positive integer');
    }
    const input = openInput(options.url);
    try {
        const track = await input.getPrimaryVideoTrack();
        if (!track)
            throw new Error(`No video track found at ${options.url}`);
        if (!(await track.canDecode())) {
            throw new Error(`Primary video track cannot be decoded by this browser: ${options.url}`);
        }
        const sink = new VideoSampleSink(track);
        const timestamps = (function* () {
            for (let frameIndex = 0; frameIndex < maxFrames; frameIndex += 1) {
                yield sourceStart + frameIndex / options.fps;
            }
        })();
        const samples = sink.samplesAtTimestamps(timestamps)[Symbol.asyncIterator]();
        let nextFrameIndex = 0;
        let disposed = false;
        const dispose = async () => {
            if (disposed)
                return;
            disposed = true;
            try {
                await samples.return?.();
            }
            finally {
                input.dispose();
            }
        };
        return {
            async getFrame(request) {
                if (disposed)
                    throw new Error('MediaBunny video frame provider is disposed');
                if (request.componentId !== options.componentId)
                    return null;
                if (request.fps !== options.fps) {
                    throw new Error(`Video provider FPS mismatch: expected ${options.fps}, received ${request.fps}`);
                }
                if (request.frameIndex !== nextFrameIndex) {
                    throw new Error(`MediaBunny video frames must be requested sequentially; expected ${nextFrameIndex}, ` +
                        `received ${request.frameIndex}`);
                }
                if (nextFrameIndex >= maxFrames)
                    return null;
                const frameIndex = nextFrameIndex;
                nextFrameIndex += 1;
                const result = await samples.next();
                const sample = result.done ? null : result.value;
                if (!sample)
                    return null;
                let videoFrame;
                try {
                    videoFrame = sample.toVideoFrame();
                    const imageBitmap = await createImageBitmap(videoFrame);
                    return {
                        kind: 'imageBitmap',
                        cacheKey: `${options.componentId}:mediabunny:${frameIndex}`,
                        imageBitmap
                    };
                }
                finally {
                    videoFrame?.close();
                    sample.close();
                }
            },
            async releaseComponent(componentId) {
                if (componentId === options.componentId)
                    await dispose();
            },
            destroy: dispose
        };
    }
    catch (error) {
        input.dispose();
        throw error;
    }
}
/** Decode staged media tracks, align each track's first decoded timestamp to startAt, then mix. */
export async function mixMediabunnyAudioTracks(options) {
    assertPositiveFinite(options.duration, 'Audio mix duration');
    const sampleRate = options.sampleRate ?? 48_000;
    const channels = options.channels ?? 2;
    assertPositiveFinite(sampleRate, 'Audio mix sampleRate');
    if (!Number.isInteger(channels) || channels <= 0) {
        throw new Error('Audio mix channels must be a positive integer');
    }
    const context = new OfflineAudioContext(channels, Math.ceil(options.duration * sampleRate), sampleRate);
    for (const trackOptions of options.tracks) {
        if (trackOptions.muted || (trackOptions.volume ?? 1) <= 0)
            continue;
        if (!Number.isFinite(trackOptions.startAt) || trackOptions.startAt < 0) {
            throw new Error('Audio track startAt must be a non-negative finite number');
        }
        const endAt = Math.min(trackOptions.endAt ?? options.duration, options.duration);
        if (!Number.isFinite(endAt) || endAt <= trackOptions.startAt)
            continue;
        const input = openInput(trackOptions.url);
        try {
            const track = await input.getPrimaryAudioTrack();
            if (!track)
                throw new Error(`No audio track found at ${trackOptions.url}`);
            if (!(await track.canDecode())) {
                throw new Error(`Primary audio track cannot be decoded by this browser: ${trackOptions.url}`);
            }
            const sink = new AudioBufferSink(track);
            const gain = context.createGain();
            gain.gain.value = trackOptions.volume ?? 1;
            gain.connect(context.destination);
            let firstTimestamp;
            const activeDuration = endAt - trackOptions.startAt;
            for await (const wrapped of sink.buffers()) {
                firstTimestamp ??= wrapped.timestamp;
                const relativeTimestamp = wrapped.timestamp - firstTimestamp;
                if (relativeTimestamp >= activeDuration)
                    break;
                const remaining = activeDuration - relativeTimestamp;
                const playDuration = Math.min(wrapped.duration, wrapped.buffer.duration, remaining);
                if (playDuration <= 0)
                    continue;
                const source = context.createBufferSource();
                source.buffer = wrapped.buffer;
                source.connect(gain);
                source.start(trackOptions.startAt + relativeTimestamp, 0, playDuration);
            }
        }
        finally {
            input.dispose();
        }
    }
    return await context.startRendering();
}
