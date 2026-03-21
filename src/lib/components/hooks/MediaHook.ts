import { MediaManager } from '$lib/managers/MediaManager.js';
import type { IComponentContext, IComponentHook, HookType } from '$lib';
import { StateManager } from '$lib/managers/StateManager.svelte.js';
import { shouldPrepareMediaAtTime } from '$lib/utils/mediaWindow.js';

export class MediaHook implements IComponentHook {
	types: HookType[] = ['setup', 'update', 'destroy', 'refresh'];
	priority: number = 1;
	#context!: IComponentContext;
	#mediaElement: HTMLMediaElement | undefined;
	#MAX_LAG_TIME = 1;
	#lastSyncCheck = 0;
	#lastTargetTime: number | null = null;
	private mediaManager: MediaManager;
	private state: StateManager;
	#destroyed = false;
	#playRequested = false;
	#lastControllerCheck = 0;
	#CONTROLLER_CHECK_INTERVAL = 100; // ms
	#seekVersion = 0;
	#cleanupPendingSeek: (() => void) | undefined;

	constructor(cradle: { mediaManager: MediaManager; stateManager: StateManager }) {
		this.mediaManager = cradle.mediaManager;
		this.state = cradle.stateManager;
	}

	#shouldPrepareMedia(): boolean {
		return shouldPrepareMediaAtTime(
			this.#context.contextData,
			this.#context.sceneState.currentTime
		);
	}

	async #releaseMediaElement(markDestroyed = false): Promise<void> {
		this.#seekVersion += 1;
		this.#cleanupPendingSeek?.();
		this.#cleanupPendingSeek = undefined;

		const source = (this.#context.contextData as any).source;
		const mediaType = this.#context.type === 'VIDEO' ? 'video' : 'audio';

		if (source?.url) {
			const isController =
				this.mediaManager.getMediaController(source.url, mediaType) ===
				this.#context.contextData.id;
			if (isController) {
				await this.#pause('releasing media element');
				this.mediaManager.setMediaController(source.url, undefined, mediaType);
			}
		}

		if (this.#mediaElement) {
			if (source?.url) {
				this.mediaManager.releaseMediaElement(source.url, mediaType);
			}

			this.#context.removeResource(mediaType === 'video' ? 'videoElement' : 'audioElement');
		}

		this.#mediaElement = undefined;
		this.#lastTargetTime = null;
		this.#destroyed = markDestroyed;
	}

	async #handleSetup(force = false) {
		if (this.#mediaElement && !this.#destroyed) {
			this.#context.setResource(
				this.#context.type === 'VIDEO' ? 'videoElement' : 'audioElement',
				this.#mediaElement
			);
			return;
		}
		if (this.#context.contextData.type !== 'VIDEO' && this.#context.contextData.type !== 'AUDIO')
			return;
		if (!force && !this.#shouldPrepareMedia()) {
			return;
		}
		const mediaType = this.#context.type === 'VIDEO' ? 'video' : 'audio';
		const source = (this.#context.contextData as any).source; // TODO: remove as any
		if (!source || !source.url) {
			console.error('No media source found');
			return;
		}
		const startAt = source.startAt as number | undefined;
		try {
			const media = await this.mediaManager.getMediaElement(source.url, mediaType, {
				muted: true,
				startAt
			});

			if (!media) {
				console.error('Failed to get media element');
				return;
			}

			this.#mediaElement = media as HTMLMediaElement;

			this.#context.setResource(
				mediaType === 'video' ? 'videoElement' : 'audioElement',
				media as HTMLMediaElement
			);
			this.#destroyed = false;
		} catch (error) {
			console.error('Error in media setup:', error);
		}
	}

	async #autoSeek() {
		if (!this.#mediaElement) {
			return;
		}

		const target = this.#context.currentComponentTime;
		const frameDuration = 1 / (this.state.data.settings.fps || 30);
		if (
			this.#lastTargetTime !== null &&
			Math.abs(this.#lastTargetTime - target) < frameDuration * 0.5
		) {
			return;
		}
		this.#lastTargetTime = target;
		await this.#seek(target);
	}

	#refreshPixiTexture() {
		try {
			const texture = this.#context.getResource('pixiTexture') as any;
			const baseTexture = texture?.baseTexture;
			if (baseTexture?.resource && typeof baseTexture.resource.update === 'function') {
				baseTexture.resource.update();
			} else if (typeof baseTexture?.update === 'function') {
				baseTexture.update();
			} else if (typeof texture?.update === 'function') {
				texture.update();
			}
		} catch {}
	}

	async #seek(time: number) {
		if (!this.#mediaElement) {
			return;
		}

		this.#cleanupPendingSeek?.();
		this.#cleanupPendingSeek = undefined;

		const element = this.#mediaElement;
		const frameDuration = 1 / (this.state.data.settings.fps || 30);

		// Use fastSeek for larger jumps when supported
		try {
			if (
				typeof (element as any).fastSeek === 'function' &&
				Math.abs(element.currentTime - time) > frameDuration * 2
			) {
				(element as any).fastSeek(time);
			} else {
				element.currentTime = time;
			}
		} catch {
			element.currentTime = time;
		}

		const seekVersion = ++this.#seekVersion;
		const shouldRerenderWhenReady =
			this.state.environment !== 'server' &&
			this.#context.sceneState.state !== 'playing' &&
			this.#context.sceneState.state !== 'loading';
		let settleSeek: (() => void) | undefined;
		let settleResolved = false;
		let settleTimeout: ReturnType<typeof setTimeout> | undefined;
		let onSeeked: (() => void) | undefined;
		let frameCallbackId: number | undefined;
		const anyElement = element as any;
		let readinessCleanup = () => {};

		const resolveSettled = () => {
			if (settleResolved) return;
			settleResolved = true;
			settleSeek?.();
		};

		const cleanupPendingSeek = () => {
			readinessCleanup();
			if (settleTimeout !== undefined) {
				clearTimeout(settleTimeout);
				settleTimeout = undefined;
			}
			if (onSeeked) {
				element.removeEventListener('seeked', onSeeked);
				onSeeked = undefined;
			}
			if (
				frameCallbackId !== undefined &&
				typeof anyElement.cancelVideoFrameCallback === 'function'
			) {
				anyElement.cancelVideoFrameCallback(frameCallbackId);
				frameCallbackId = undefined;
			}
			resolveSettled();
		};
		this.#cleanupPendingSeek = cleanupPendingSeek;

		if (shouldRerenderWhenReady) {
			let cleanedUp = false;
			readinessCleanup = () => {
				if (cleanedUp) return;
				cleanedUp = true;
				element.removeEventListener('seeked', handleReady);
				element.removeEventListener('canplay', handleReady);
			};
			const handleReady = () => {
				if (seekVersion !== this.#seekVersion) {
					readinessCleanup();
					return;
				}
				this.#refreshPixiTexture();
				this.#context.eventManager.emit('rerender');
				readinessCleanup();
			};
			element.addEventListener('seeked', handleReady);
			element.addEventListener('canplay', handleReady);
		}

		let settled: Promise<unknown>;

		// Prefer requestVideoFrameCallback when available (videos only)
		if (typeof anyElement.requestVideoFrameCallback === 'function') {
			settled = new Promise((resolve) => {
				settleSeek = () => resolve(true);
				settleTimeout = setTimeout(() => resolveSettled(), 120);
				frameCallbackId = anyElement.requestVideoFrameCallback(
					(_now: number, _metadata: { mediaTime: number }) => {
						if (settleTimeout !== undefined) {
							clearTimeout(settleTimeout);
							settleTimeout = undefined;
						}
						frameCallbackId = undefined;
						resolveSettled();
					}
				);
			});
		} else {
			// Fallback to seeked event
			settled = new Promise((resolve) => {
				settleSeek = () => resolve(true);
				onSeeked = () => {
					element.removeEventListener('seeked', onSeeked!);
					onSeeked = undefined;
					resolveSettled();
				};
				element.addEventListener('seeked', onSeeked);
			});
		}

		await settled;
		if (this.#cleanupPendingSeek === cleanupPendingSeek) {
			this.#cleanupPendingSeek = undefined;
		}
		if (seekVersion !== this.#seekVersion || this.#mediaElement !== element) {
			return;
		}
		this.#refreshPixiTexture();
	}

	#isOutOfSync() {
		if (!this.#mediaElement) {
			return false;
		}

		// run only once per MAX_LAG_TIME
		const now = performance.now() / 1000; // convert to seconds
		if (now - this.#lastSyncCheck < this.#MAX_LAG_TIME) {
			return false;
		}

		this.#lastSyncCheck = now;
		const lagTime = Math.abs(this.#mediaElement.currentTime - this.#context.currentComponentTime);
		return lagTime >= this.#MAX_LAG_TIME;
	}

	async #pause(reason?: string): Promise<void> {
		if (!this.#mediaElement) {
			return;
		}

		if (!this.#mediaElement.paused && !this.#playRequested) {
			this.#mediaElement.pause();
		}
	}

	async #play(): Promise<void> {
		if (!this.#mediaElement) {
			return;
		}

		if (this.#mediaElement.paused) {
			this.#playRequested = true;
			try {
				// Safari-specific: Ensure audio state is correct before playing
				const isMuted = (this.#context.contextData as any).muted ?? false;
				const componentVolume = (this.#context.contextData as any).volume ?? 1;
				if (!isMuted) {
					this.#mediaElement.muted = false;
					this.#mediaElement.volume = componentVolume;
				}

				const playPromise = this.#mediaElement.play();
				if (playPromise !== undefined) {
					await playPromise;
				}
			} catch (err: unknown) {
				// If autoplay was prevented, try again with muted
				if (err instanceof Error && err.name === 'NotAllowedError') {
					this.#mediaElement.muted = true;
					try {
						await this.#mediaElement.play();
					} catch (mutedErr) {
						console.error('Failed to play even when muted:', mutedErr);
					}
				}
			} finally {
				this.#playRequested = false;
			}
		}
	}

	async #handleUpdate(): Promise<void> {
		if (this.#context.contextData.type !== 'VIDEO' && this.#context.contextData.type !== 'AUDIO')
			return;
		const isActive = this.#context.isActive;
		const mediaType = this.#context.type === 'VIDEO' ? 'video' : 'audio';
		const isMuted = (this.#context.contextData as any).muted ?? false;
		const componentVolume = (this.#context.contextData as any).volume ?? 1;
		const source = (this.#context.contextData as any).source;
		if (!source || !source.url) return;
		// Debounce controller checks to prevent Safari issues with rapid controller changes
		const now = performance.now();
		const shouldCheckController = now - this.#lastControllerCheck > this.#CONTROLLER_CHECK_INTERVAL;

		const isController =
			this.mediaManager.getMediaController(source.url, mediaType) === this.#context.contextData.id;

		const shouldPrepareMedia = this.#shouldPrepareMedia();
		if (!shouldPrepareMedia) {
			await this.#releaseMediaElement();
			return;
		}

		if (!this.#mediaElement) {
			await this.#handleSetup(true);
		}

		if (!isActive) {
			if (isController) {
				await this.#pause('!isActive isController');
				this.mediaManager.setMediaController(source.url, undefined, mediaType);
			}
			return;
		}

		if (!this.#mediaElement) {
			return;
		}

		// On server, seeking is handled by MediaSeekingHook. Avoid duplicate logic/races.
		if (this.state.environment === 'server') return;

		// Make sure we're still marked as the controller. If nobody owns the shared media,
		// claim it immediately; otherwise keep the debounce to avoid controller thrash.
		if (!isController) {
			const currentController = this.mediaManager.getMediaController(source.url, mediaType);
			if (!currentController || shouldCheckController) {
				if (!currentController) {
					this.mediaManager.setMediaController(source.url, this.#context.contextData.id, mediaType);
					await this.#autoSeek();
					this.#lastControllerCheck = now;

					// Safari-specific: Ensure audio is properly restored when taking control
					if (this.#mediaElement && !isMuted) {
						this.#mediaElement.muted = false;
						this.#mediaElement.volume = componentVolume;
					}
				}
			}
		}

		// Check if component is loading using the StateManager
		if (this.state.isLoadingComponent(this.#context.contextData.id)) {
			if (this.#mediaElement && this.#mediaElement.readyState < 2) {
				await this.#pause('readyState < 2');
				return;
			} else {
				this.state.removeLoadingComponent(this.#context.contextData.id);
			}
		}

		// Ensure the media element matches the component's mute and volume state
		if (this.#mediaElement && this.#mediaElement.muted != isMuted) {
			this.#mediaElement.muted = isMuted;
		}
		if (this.#mediaElement && this.#mediaElement.volume != componentVolume) {
			this.#mediaElement.volume = componentVolume;
		}

		const isScenePlaying =
			this.#context.sceneState.state === 'playing' || this.#context.sceneState.state === 'loading';

		try {
			if (!isScenePlaying) {
				// When scene is not playing, pause media and seek to current position
				await this.#pause('isScenePlaying is false, it is ' + this.#context.sceneState.state);
				return await this.#autoSeek();
			} else {
				// When scene is playing and media is paused, play media
				if (this.#mediaElement && this.#mediaElement.paused) {
					await this.#play();
				}
			}
		} catch (err) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return this.#handleUpdate();
		}

		// sync with timeline
		if (this.#isOutOfSync()) {
			await this.#autoSeek();
		}
	}

	async #handleRefresh() {
		await this.#handleDestroy();
		await this.#handleSetup(true);
	}

	async #handleDestroy() {
		await this.#releaseMediaElement(true);
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		if (this.#context.contextData.type !== 'VIDEO' && this.#context.contextData.type !== 'AUDIO')
			return;
		const source = (this.#context.contextData as any).source;
		if (!source || !source.url) {
			return;
		}

		if (type === 'setup') {
			return await this.#handleSetup();
		} else if (type === 'destroy') {
			return await this.#handleDestroy();
		} else if (type === 'refresh') {
			return await this.#handleRefresh();
		}

		await this.#handleUpdate();
	}
}
