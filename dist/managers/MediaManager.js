import Hls from 'hls.js';
export class MediaManager {
    videoElements = new Map();
    audioElements = new Map();
    imageElements = new Map();
    mediaUsageCount = new Map();
    videoControllers = new Map();
    audioControllers = new Map();
    async getMediaElement(mediaPath, type, options) {
        const key = this.getKey(mediaPath, type);
        this.incrementUsageCount(key);
        if (type === 'image') {
            return this.getImageElement(mediaPath);
        }
        else if (type === 'audio') {
            return this.getAudioElement(mediaPath, options);
        }
        return this.getVideoElement(mediaPath, options);
    }
    getKey(mediaPath, type) {
        return `${mediaPath}-${type}`;
    }
    incrementUsageCount(key) {
        const count = this.mediaUsageCount.get(key) || 0;
        this.mediaUsageCount.set(key, count + 1);
    }
    setVideoController(videoPath, componentId) {
        this.videoControllers.set(videoPath, componentId);
    }
    getVideoController(videoPath) {
        return this.videoControllers.get(videoPath);
    }
    setMediaController(mediaPath, componentId, type) {
        if (type === 'video') {
            this.videoControllers.set(mediaPath, componentId);
            return;
        }
        this.audioControllers.set(mediaPath, componentId);
    }
    getMediaController(videoPath, type) {
        if (type === 'video') {
            return this.videoControllers.get(videoPath);
        }
        return this.audioControllers.get(videoPath);
    }
    async getImageElement(mediaPath) {
        if (!this.imageElements.has(mediaPath)) {
            const img = document.createElement('img');
            img.src = mediaPath;
            // Check if image is already loaded/cached
            if (img.complete && img.naturalWidth > 0) {
                this.imageElements.set(mediaPath, img);
                return img;
            }
            // Check if image failed to load
            if (img.complete && img.naturalWidth === 0) {
                throw new Error(`Failed to load image: ${mediaPath}`);
            }
            // Image is still loading, attach handlers
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error(`Failed to load image: ${mediaPath}`));
            });
            this.imageElements.set(mediaPath, img);
        }
        return this.imageElements.get(mediaPath);
    }
    async getVideoElement(mediaPath, options) {
        if (!this.videoElements.has(mediaPath)) {
            const video = document.createElement('video');
            // video.src = mediaPath;
            video.crossOrigin = 'anonymous';
            video.muted = options?.muted ?? true;
            video.playsInline = true;
            video.loop = false;
            video.autoplay = false;
            if (options?.startAt !== undefined) {
                video.currentTime = options.startAt;
            }
            if (mediaPath.includes('.m3u8')) {
                if (Hls.isSupported()) {
                    const hlsConfig = {
                        startPosition: options?.startAt ?? -1
                    };
                    video.preload = 'none';
                    const hls = new Hls(hlsConfig);
                    hls.loadSource(mediaPath);
                    hls.attachMedia(video);
                    if (mediaPath.includes('mux.com')) {
                        // this.muxMonitorHlsVideo(video);
                    }
                }
                else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.preload = 'none';
                    video.src = mediaPath;
                    //
                    // If no native HLS support, check if HLS.js is supported
                    //
                }
            }
            else {
                video.preload = 'auto';
                video.src = mediaPath;
            }
            await new Promise((resolve, reject) => {
                video.oncanplay = resolve;
                video.onerror = () => reject(new Error(`Failed to load video: ${mediaPath}`));
            });
            this.videoElements.set(mediaPath, video);
        }
        return this.videoElements.get(mediaPath);
    }
    async getAudioElement(mediaPath, options) {
        if (!this.audioElements.has(mediaPath)) {
            const audio = document.createElement('audio');
            audio.src = mediaPath;
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
            audio.loop = false;
            audio.autoplay = false;
            if (options?.startAt !== undefined) {
                audio.currentTime = options.startAt;
            }
            await new Promise((resolve) => {
                audio.onloadedmetadata = resolve;
            });
            this.audioElements.set(mediaPath, audio);
        }
        return this.audioElements.get(mediaPath);
    }
    stopMediaElements() {
        // Stop all videos
        for (const video of this.videoElements.values()) {
            if (!video.paused) {
                video.pause();
                video.currentTime = 0;
            }
        }
        // Stop all audio
        for (const audio of this.audioElements.values()) {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
    }
    cloneVideoElement(originalVideo) {
        const clonedVideo = document.createElement('video');
        // Copy attributes
        clonedVideo.muted = originalVideo.muted;
        clonedVideo.playsInline = originalVideo.playsInline;
        clonedVideo.loop = originalVideo.loop;
        clonedVideo.autoplay = originalVideo.autoplay;
        clonedVideo.crossOrigin = originalVideo.crossOrigin;
        // Instead of setting src, we'll use srcObject to reference the original media source
        if (originalVideo.srcObject) {
            clonedVideo.srcObject = originalVideo.srcObject;
        }
        else {
            // If srcObject is not available, fall back to src
            clonedVideo.src = originalVideo.src;
        }
        // Copy current state
        clonedVideo.currentTime = originalVideo.currentTime;
        clonedVideo.playbackRate = originalVideo.playbackRate;
        clonedVideo.volume = originalVideo.volume;
        // If the original was playing, start playing the clone
        if (!originalVideo.paused) {
            clonedVideo.play().catch((e) => console.error('Error playing cloned video:', e));
        }
        return clonedVideo;
    }
    releaseMediaElement(mediaPath, type) {
        const key = this.getKey(mediaPath, type);
        const count = this.mediaUsageCount.get(key);
        if (count > 1) {
            this.mediaUsageCount.set(key, count - 1);
        }
        else {
            this.mediaUsageCount.delete(key);
            if (type === 'video') {
                const videoElement = this.videoElements.get(mediaPath);
                if (videoElement) {
                    videoElement.src = '';
                    videoElement.load(); // This frees up memory
                    this.videoElements.delete(mediaPath);
                }
            }
            else if (type === 'audio') {
                const audioElement = this.audioElements.get(mediaPath);
                if (audioElement) {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    audioElement.src = '';
                    audioElement.load(); // This frees up memory
                    this.audioElements.delete(mediaPath);
                }
            }
            else if (type === 'image') {
                this.imageElements.delete(mediaPath);
            }
        }
    }
    async seekVideo(mediaPath, time) {
        const videoElement = this.videoElements.get(mediaPath);
        if (videoElement) {
            return new Promise((resolve) => {
                const onSeeked = () => {
                    videoElement.removeEventListener('seeked', onSeeked);
                    resolve();
                };
                videoElement.addEventListener('seeked', onSeeked);
                videoElement.currentTime = time;
            });
        }
        return Promise.resolve();
    }
    updateVideoElement(mediaPath) {
        return this.videoElements.get(mediaPath);
    }
    destroy() {
        // Release all video elements
        for (const videoElement of this.videoElements.values()) {
            videoElement.pause();
            videoElement.src = '';
            videoElement.load();
        }
        this.videoElements.clear();
        // Release all audio elements
        for (const audioElement of this.audioElements.values()) {
            audioElement.pause();
            audioElement.src = '';
            audioElement.load();
        }
        this.audioElements.clear();
        // Clear image elements
        this.imageElements.clear();
        // Clear usage counts
        this.mediaUsageCount.clear();
        // Clear video controllers
        this.videoControllers.clear();
    }
}
