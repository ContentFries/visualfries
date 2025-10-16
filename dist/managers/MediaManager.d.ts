type MediaType = 'video' | 'image' | 'audio';
interface VideoOptions {
    muted: boolean;
    fps?: number;
    startAt?: number;
    endAt?: number;
}
export declare class MediaManager {
    private videoElements;
    private audioElements;
    private imageElements;
    private mediaUsageCount;
    private videoControllers;
    private audioControllers;
    getMediaElement(mediaPath: string, type: MediaType, options?: VideoOptions): Promise<HTMLImageElement | HTMLVideoElement | HTMLAudioElement>;
    private getKey;
    private incrementUsageCount;
    setVideoController(videoPath: string, componentId: string | undefined): void;
    getVideoController(videoPath: string): string | undefined;
    setMediaController(mediaPath: string, componentId: string | undefined, type: 'audio' | 'video'): void;
    getMediaController(videoPath: string, type: 'audio' | 'video'): string | undefined;
    private getImageElement;
    private getVideoElement;
    private getAudioElement;
    stopMediaElements(): void;
    cloneVideoElement(originalVideo: HTMLVideoElement): HTMLVideoElement;
    releaseMediaElement(mediaPath: string, type: MediaType): void;
    seekVideo(mediaPath: string, time: number): Promise<void>;
    updateVideoElement(mediaPath: string): HTMLVideoElement | undefined;
    destroy(): void;
}
export {};
