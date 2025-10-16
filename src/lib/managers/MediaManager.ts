import Hls from 'hls.js';

type MediaType = 'video' | 'image' | 'audio';

interface VideoOptions {
	muted: boolean;
	fps?: number;
	startAt?: number;
	endAt?: number;
}

export class MediaManager {
	private videoElements: Map<string, HTMLVideoElement> = new Map();
	private audioElements: Map<string, HTMLAudioElement> = new Map();
	private imageElements: Map<string, HTMLImageElement> = new Map();
	private mediaUsageCount: Map<string, number> = new Map();
	private videoControllers: Map<string, string | undefined> = new Map();
	private audioControllers: Map<string, string | undefined> = new Map();

	async getMediaElement(
		mediaPath: string,
		type: MediaType,
		options?: VideoOptions
	): Promise<HTMLImageElement | HTMLVideoElement | HTMLAudioElement> {
		const key = this.getKey(mediaPath, type);
		this.incrementUsageCount(key);

		if (type === 'image') {
			return this.getImageElement(mediaPath);
		} else if (type === 'audio') {
			return this.getAudioElement(mediaPath, options);
		}
		return this.getVideoElement(mediaPath, options);
	}

	private getKey(mediaPath: string, type: MediaType): string {
		return `${mediaPath}-${type}`;
	}

	private incrementUsageCount(key: string) {
		const count = this.mediaUsageCount.get(key) || 0;
		this.mediaUsageCount.set(key, count + 1);
	}

	setVideoController(videoPath: string, componentId: string | undefined) {
		this.videoControllers.set(videoPath, componentId);
	}

	getVideoController(videoPath: string): string | undefined {
		return this.videoControllers.get(videoPath);
	}

	setMediaController(mediaPath: string, componentId: string | undefined, type: 'audio' | 'video') {
		if (type === 'video') {
			this.videoControllers.set(mediaPath, componentId);
			return;
		}
		this.audioControllers.set(mediaPath, componentId);
	}

	getMediaController(videoPath: string, type: 'audio' | 'video'): string | undefined {
		if (type === 'video') {
			return this.videoControllers.get(videoPath);
		}
		return this.audioControllers.get(videoPath);
	}

	private async getImageElement(mediaPath: string): Promise<HTMLImageElement> {
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
		return this.imageElements.get(mediaPath)!;
	}

	private async getVideoElement(
		mediaPath: string,
		options?: VideoOptions
	): Promise<HTMLVideoElement> {
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
				} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
					video.preload = 'none';
					video.src = mediaPath;
					//
					// If no native HLS support, check if HLS.js is supported
					//
				}
			} else {
				video.preload = 'auto';
				video.src = mediaPath;
			}

			await new Promise((resolve, reject) => {
				video.oncanplay = resolve;
				video.onerror = () => reject(new Error(`Failed to load video: ${mediaPath}`));
			});
			this.videoElements.set(mediaPath, video);
		}
		return this.videoElements.get(mediaPath)!;
	}

	private async getAudioElement(
		mediaPath: string,
		options?: VideoOptions
	): Promise<HTMLAudioElement> {
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
		return this.audioElements.get(mediaPath)!;
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

	cloneVideoElement(originalVideo: HTMLVideoElement): HTMLVideoElement {
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
		} else {
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

	releaseMediaElement(mediaPath: string, type: MediaType) {
		const key = this.getKey(mediaPath, type);
		const count = this.mediaUsageCount.get(key)!;
		if (count > 1) {
			this.mediaUsageCount.set(key, count - 1);
		} else {
			this.mediaUsageCount.delete(key);
			if (type === 'video') {
				const videoElement = this.videoElements.get(mediaPath);
				if (videoElement) {
					videoElement.src = '';
					videoElement.load(); // This frees up memory
					this.videoElements.delete(mediaPath);
				}
			} else if (type === 'audio') {
				const audioElement = this.audioElements.get(mediaPath);
				if (audioElement) {
					audioElement.pause();
					audioElement.currentTime = 0;
					audioElement.src = '';
					audioElement.load(); // This frees up memory
					this.audioElements.delete(mediaPath);
				}
			} else if (type === 'image') {
				this.imageElements.delete(mediaPath);
			}
		}
	}

	async seekVideo(mediaPath: string, time: number): Promise<void> {
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

	updateVideoElement(mediaPath: string): HTMLVideoElement | undefined {
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
