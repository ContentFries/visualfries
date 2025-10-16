import { z } from 'zod';
import type {
	HookType,
	IComponentContext,
	IComponentHook
} from '$lib';
import { StateManager } from '$lib/managers/StateManager.svelte.js';

export class MediaSeekingHook implements IComponentHook {
	types: HookType[] = ['setup', 'destroy', 'refresh', 'update'];
	priority: number = 1;

	#context!: IComponentContext;
	#mediaElement: HTMLVideoElement | HTMLAudioElement | undefined;

	state: StateManager;

	constructor(cradle: { stateManager: StateManager }) {
		this.state = cradle.stateManager;
	}

	async #handleSetup() {
		if (this.#mediaElement) {
			return;
		}
		if (this.#context.contextData.type !== 'VIDEO' && this.#context.contextData.type !== 'AUDIO')
			return;
		const mediaType = this.#context.type === 'VIDEO' ? 'video' : 'audio';
		const media = this.#context.getResource(
			mediaType === 'video' ? 'videoElement' : 'audioElement'
		);

		if (!media) {
			console.error('MediaSeekingHook: No media element found');
			return;
		}

		this.#mediaElement = media;

		if (media && this.#context.isActive) {
			const seekStatus = {
				start: null as number | null,
				end: null as number | null,
				isSeeking: false
			};
			let canPlayTime: number | null = null;
			let fullyReady = false;
			let needCheckState = false;

			const checkReadyState = async () => {
				if (!needCheckState) {
					return;
				}

				if (media.readyState < 3) {
					await new Promise((resolve) => setTimeout(resolve, 500));
					needCheckState = true;
					return checkReadyState();
				}

				this.state.removeLoadingComponent(this.#context.contextData.id);
				needCheckState = false;

				if (media.readyState === 4) {
					fullyReady = true;
				}
			};

			media.onseeking = () => {
				const mediaTime = parseFloat(media.currentTime.toFixed(1));
				if (!seekStatus.isSeeking && seekStatus.start != mediaTime) {
					seekStatus.start = mediaTime;
					seekStatus.end = null;
					seekStatus.isSeeking = true;
					this.state.addLoadingComponent(this.#context.contextData.id, 'seeking');
					needCheckState = true;
					checkReadyState();
				}
			};

			media.onseeked = () => {
				const mediaTime = parseFloat(media.currentTime.toFixed(1));
				if (seekStatus.isSeeking) {
					seekStatus.end = mediaTime;
					seekStatus.isSeeking = false;

					if (media.readyState === 4) {
						fullyReady = true;
					}
					needCheckState = false;
				}
			};

			// Loading states
			media.onwaiting = () => {
				if (!fullyReady) {
					this.state.addLoadingComponent(this.#context.contextData.id, 'waiting');
					needCheckState = true;
					checkReadyState();
				}
			};

			media.oncanplay = () => {
				const mediaTime = parseFloat(media.currentTime.toFixed(1));
				if (canPlayTime != mediaTime) {
					this.state.removeLoadingComponent(this.#context.contextData.id);
					canPlayTime = mediaTime;
					needCheckState = false;
				}

				if (media.readyState === 4) {
					fullyReady = true;
				}

				// Don't try to play here - let MediaHook handle play/pause logic
				// This prevents conflicts and race conditions, especially on Safari
			};

			// Add error event handling
			media.onerror = () => {
				console.error('Media error:', media.error);
			};
		}
	}

	async #handleRefresh() {
		await this.#handleDestroy();
		await this.#handleSetup();
	}

	async #handleDestroy() {
		this.#mediaElement = undefined;
	}

	async #handleUpdate() {
		// Only handle video components as requested
		if (this.#context.contextData.type !== 'VIDEO') return;

		// Get the HTMLVideoElement from resources or cached reference
		let media = this.#mediaElement as HTMLVideoElement | undefined;
		if (!media) {
			const res = this.#context.getResource('videoElement');
			media = res as HTMLVideoElement | undefined;
			this.#mediaElement = media; // cache for later
		}
		if (!media) return;

		const fps = this.state.data.settings.fps || 30;
		const targetTime = this.#context.currentComponentTime;
		const targetFrame = Math.round(targetTime * fps);
		const currentFrame = Math.round(media.currentTime * fps);

		const diff = Math.abs(currentFrame - targetFrame);

		const needReseek =
			this.state.environment === 'server' ? currentFrame !== targetFrame : diff > 30;

		if (this.state.environment !== 'server') {
			if (!media.paused && this.state.state !== 'playing') {
				media.pause();
			}
		}

		if (needReseek) {
			const seekTo = targetTime;
			try {
				// Prefer fastSeek when available for larger jumps
				const largeJump = Math.abs(media.currentTime - seekTo) > 2 / fps;
				if (typeof (media as any).fastSeek === 'function' && largeJump) {
					(media as any).fastSeek(seekTo);
				} else {
					media.currentTime = seekTo;
				}

				// Await seek completion using a robust multi-attempt strategy similar to Remotion
				await new Promise<void>((resolve) => {
					const anyMedia = media as any;
					let attempts = 0;
					const maxAttempts = 8;
					const check = () => {
						const fps = this.state.data.settings.fps || 30;
						const desiredFrame = Math.round(seekTo * fps);
						const currFrame = Math.round(media!.currentTime * fps);
						if (desiredFrame === currFrame && media!.readyState >= 2) {
							return resolve();
						}
						attempts++;
						if (attempts >= maxAttempts) return resolve();
						setTimeout(check, 20);
					};
					if (typeof anyMedia.requestVideoFrameCallback === 'function') {
						const timeout = setTimeout(check, 120);
						anyMedia.requestVideoFrameCallback(() => {
							clearTimeout(timeout);
							check();
						});
					} else {
						media!.addEventListener('seeked', check, { once: true });
						setTimeout(check, 60);
					}
				});

				// Force Pixi video texture to pull the updated frame if present
				try {
					const tex = this.#context.getResource('pixiTexture') as any;
					const baseTex = tex?.baseTexture;
					if (baseTex?.resource && typeof baseTex.resource.update === 'function') {
						baseTex.resource.update();
					} else if (typeof baseTex?.update === 'function') {
						baseTex.update();
					}
				} catch {}
			} catch (err) {
				// Swallow errors here; next update tick will retry if needed
			}
		}
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		if (this.#context.contextData.type !== 'VIDEO' && this.#context.contextData.type !== 'AUDIO')
			return;
		if (type === 'setup') {
			return await this.#handleSetup();
		} else if (type === 'destroy') {
			return await this.#handleDestroy();
		} else if (type === 'refresh') {
			return await this.#handleRefresh();
		} else if (type === 'update') {
			return await this.#handleUpdate();
		}
	}
}
