import { getFirstEncodableAudioCodec, getFirstEncodableVideoCodec, type StreamTargetChunk } from 'mediabunny';
export declare const BROWSER_EXPORT_FALLBACK: "deterministic-local-ffmpeg";
export type BrowserExportCapabilityRequest = {
    width: number;
    height: number;
    fps: number;
    videoBitrate?: number;
    audio?: boolean;
    audioBitrate?: number;
    sampleRate?: number;
    numberOfChannels?: number;
};
export type BrowserExportCapabilityReport = {
    supported: boolean;
    container: 'mp4';
    videoCodec: 'avc' | null;
    audioCodec: 'aac' | null;
    reasons: string[];
    fallback: typeof BROWSER_EXPORT_FALLBACK;
};
type CapabilityDependencies = {
    getVideoCodec: typeof getFirstEncodableVideoCodec;
    getAudioCodec: typeof getFirstEncodableAudioCodec;
};
/** Probe exact MVP codecs. A different codec is not silently substituted into an MP4. */
export declare function probeBrowserExportCapabilities(request: BrowserExportCapabilityRequest, dependencies?: CapabilityDependencies): Promise<BrowserExportCapabilityReport>;
export type BrowserExportFrame = {
    frameIndex: number;
    timestamp: number;
    duration: number;
    progress: number;
};
export type BrowserExportOptions = Omit<BrowserExportCapabilityRequest, 'audio'> & {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    duration: number;
    renderFrame: (frame: BrowserExportFrame) => void | Promise<void>;
    audioBuffer?: AudioBuffer;
    /** Positional stream: its sink must honor each StreamTargetChunk.position (not append blindly). */
    writable?: WritableStream<StreamTargetChunk>;
    onProgress?: (progress: number, frameIndex: number) => void;
};
export type BrowserExportResult = {
    buffer: ArrayBuffer | null;
    mimeType: 'video/mp4';
    frameCount: number;
    duration: number;
    capabilities: BrowserExportCapabilityReport;
};
export declare class BrowserExportUnsupportedError extends Error {
    readonly capabilities: BrowserExportCapabilityReport;
    constructor(capabilities: BrowserExportCapabilityReport);
}
/**
 * Deterministic canvas-to-MP4 path. Every await on source.add() propagates encoder/writer
 * backpressure; no image serialization or frame queue exists between compositor and encoder.
 */
export declare function exportCanvasToMp4(options: BrowserExportOptions): Promise<BrowserExportResult>;
export type BrowserAudioTone = {
    start: number;
    end: number;
    frequency: number;
    gain?: number;
    pan?: number;
};
/** Minimal deterministic in-browser MVP mix. First sample begins at t=0. */
export declare function mixBrowserAudio(options: {
    duration: number;
    tone?: BrowserAudioTone[];
    source?: AudioBuffer;
    sourceGain?: number;
    sampleRate?: number;
}): Promise<AudioBuffer>;
export {};
