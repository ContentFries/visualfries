import type { HookType, IComponentContext, IComponentHook } from '$lib';
import { StateManager } from '$lib/managers/StateManager.svelte.js';

export class MediaSeekingHook implements IComponentHook {
	types: HookType[] = ['setup', 'destroy', 'refresh', 'update'];
	priority: number = 1;

	#context!: IComponentContext;
	#mediaElement: HTMLVideoElement | HTMLAudioElement | undefined;
	#detachMediaEventHandlers: (() => void) | undefined;

	state: StateManager;

	constructor(cradle: { stateManager: StateManager }) {
		this.state = cradle.stateManager;
	}

	#attachMediaEventHandlers(media: HTMLVideoElement | HTMLAudioElement): () => void {
		const seekStatus = {
			start: null as number | null,
			end: null as number | null,
			isSeeking: false
		};
		let canPlayTime: number | null = null;
		let fullyReady = false;
		let needCheckState = false;
		let detached = false;

		const checkReadyState = async () => {
			if (detached || !needCheckState) {
				return;
			}

			if (media.readyState < 3) {
				await new Promise((resolve) => setTimeout(resolve, 500));
				if (detached) {
					return;
				}
				needCheckState = true;
				return checkReadyState();
			}

			this.state.removeLoadingComponent(this.#context.contextData.id);
			needCheckState = false;

			if (media.readyState === 4) {
				fullyReady = true;
			}
		};

		const onseeking = () => {
			if (detached) return;
			const mediaTime = parseFloat(media.currentTime.toFixed(3));
			console.log('seeking', mediaTime);
			if (!seekStatus.isSeeking && seekStatus.start != mediaTime) {
				seekStatus.start = mediaTime;
				seekStatus.end = null;
				seekStatus.isSeeking = true;
				this.state.addLoadingComponent(this.#context.contextData.id, 'seeking');
				needCheckState = true;
				checkReadyState();
			}
		};

		const onseeked = () => {
			if (detached) return;
			const mediaTime = parseFloat(media.currentTime.toFixed(3));
			if (seekStatus.isSeeking) {
				seekStatus.end = mediaTime;
				seekStatus.isSeeking = false;

				if (media.readyState === 4) {
					fullyReady = true;
				}
				needCheckState = false;
			}
		};

		const onwaiting = () => {
			if (detached) return;
			if (!fullyReady) {
				this.state.addLoadingComponent(this.#context.contextData.id, 'waiting');
				needCheckState = true;
				checkReadyState();
			}
		};

		const oncanplay = () => {
			if (detached) return;
			const mediaTime = parseFloat(media.currentTime.toFixed(3));
			if (canPlayTime != mediaTime) {
				this.state.removeLoadingComponent(this.#context.contextData.id);
				canPlayTime = mediaTime;
				needCheckState = false;
			}

			if (media.readyState === 4) {
				fullyReady = true;
			}
		};

		const onerror = () => {
			if (detached) return;
			if (media.error && media.error.code !== 4) {
				console.error('Media error:', media.src, media.error);
			}
		};

		media.onseeking = onseeking;
		media.onseeked = onseeked;
		media.onwaiting = onwaiting;
		media.oncanplay = oncanplay;
		media.onerror = onerror;

		return () => {
			detached = true;
			needCheckState = false;
			if (media.onseeking === onseeking) {
				media.onseeking = null;
			}
			if (media.onseeked === onseeked) {
				media.onseeked = null;
			}
			if (media.onwaiting === onwaiting) {
				media.onwaiting = null;
			}
			if (media.oncanplay === oncanplay) {
				media.oncanplay = null;
			}
			if (media.onerror === onerror) {
				media.onerror = null;
			}
		};
	}

	#clearMediaEventHandlers() {
		this.#detachMediaEventHandlers?.();
		this.#detachMediaEventHandlers = undefined;
		this.state.removeLoadingComponent(this.#context.contextData.id);
	}

	async #handleSetup() {
		if (this.#context.contextData.type !== 'VIDEO' && this.#context.contextData.type !== 'AUDIO')
			return;
		const mediaType = this.#context.type === 'VIDEO' ? 'video' : 'audio';
		const media = this.#context.getResource(
			mediaType === 'video' ? 'videoElement' : 'audioElement'
		);

		if (!media) {
			return;
		}

		if (this.#mediaElement === media) {
			return;
		}

		this.#clearMediaEventHandlers();
		this.#mediaElement = media;
	}

	async #handleRefresh() {
		await this.#handleDestroy();
		await this.#handleSetup();
	}

	async #handleDestroy() {
		this.#clearMediaEventHandlers();
		// Clear media element reference - MediaHook will handle releaseMediaElement
		this.#mediaElement = undefined;
	}

	async #handleUpdate() {
		// Only handle video components as requested
		if (this.#context.contextData.type !== 'VIDEO') return;

		const resource = this.#context.getResource('videoElement') as HTMLVideoElement | undefined;
		if (!resource) {
			this.#clearMediaEventHandlers();
			this.#mediaElement = undefined;
			return;
		}

		if (resource !== this.#mediaElement) {
			await this.#handleSetup();
		}

		const media = this.#mediaElement as HTMLVideoElement | undefined;
		if (!media) return;

		if (!this.#context.isActive) {
			this.#clearMediaEventHandlers();
			return;
		}

		if (!this.#detachMediaEventHandlers) {
			this.#detachMediaEventHandlers = this.#attachMediaEventHandlers(media);
		}

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
					console.log('fastseek', seekTo);
				} else {
					media.currentTime = seekTo;
					console.log('currentTime', seekTo);
				}

				// Await seek completion using a robust multi-attempt strategy similar to Remotion
				await new Promise<void>((resolve) => {
					const anyMedia = media as any;
					let attempts = 0;
					const maxAttempts = 8;
					const check = () => {
						const fps = this.state.data.settings.fps || 30;
						const desiredFrame = Math.round(seekTo * fps);
						console.log('desiredFrame', desiredFrame);
						const currFrame = Math.round(media!.currentTime * fps);

						console.log('currFrame', currFrame);
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
						console.log('pixiTexture updated');
					} else if (typeof baseTex?.update === 'function') {
						baseTex.update();
						console.log('pixiTexture updated 2');
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
