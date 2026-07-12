import type { DeterministicFrameProvider } from '../schemas/runtime/deterministic.js';
export type MediabunnyVideoFrameProviderOptions = {
    url: string;
    componentId: string;
    sourceStart?: number;
    fps: number;
    frameCount?: number;
    /** Alias for frameCount, useful when callers derive a bounded component window. */
    maxFrames?: number;
};
export type MediabunnyAudioTrack = {
    url: string;
    startAt: number;
    endAt?: number;
    volume?: number;
    muted?: boolean;
};
export type MixMediabunnyAudioTracksOptions = {
    tracks: MediabunnyAudioTrack[];
    duration: number;
    sampleRate?: number;
    channels?: number;
};
/**
 * Opens one video input and exposes its decoded frames to deterministic composition.
 * Requests must be sequential so MediaBunny can decode each packet at most once. Only
 * one sample and its temporary VideoFrame are held by this adapter at any time.
 */
export declare function createMediabunnyVideoFrameProvider(options: MediabunnyVideoFrameProviderOptions): Promise<DeterministicFrameProvider>;
/** Decode staged media tracks, align each track's first decoded timestamp to startAt, then mix. */
export declare function mixMediabunnyAudioTracks(options: MixMediabunnyAudioTracksOptions): Promise<AudioBuffer>;
