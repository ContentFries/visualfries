import { StateManager } from '../../managers/StateManager.svelte.js';
export class MediaSeekingHook {
    types = ['setup', 'destroy', 'refresh', 'update'];
    priority = 1;
    #context;
    #mediaElement;
    #detachMediaEventHandlers;
    state;
    constructor(cradle) {
        this.state = cradle.stateManager;
    }
    #attachMediaEventHandlers(media) {
        const seekStatus = {
            start: null,
            end: null,
            isSeeking: false
        };
        let canPlayTime = null;
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
            if (detached)
                return;
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
        const onseeked = () => {
            if (detached)
                return;
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
        const onwaiting = () => {
            if (detached)
                return;
            if (!fullyReady) {
                this.state.addLoadingComponent(this.#context.contextData.id, 'waiting');
                needCheckState = true;
                checkReadyState();
            }
        };
        const oncanplay = () => {
            if (detached)
                return;
            const mediaTime = parseFloat(media.currentTime.toFixed(1));
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
            if (detached)
                return;
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
        const media = this.#context.getResource(mediaType === 'video' ? 'videoElement' : 'audioElement');
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
        if (this.#context.contextData.type !== 'VIDEO')
            return;
        const resource = this.#context.getResource('videoElement');
        if (!resource) {
            this.#clearMediaEventHandlers();
            this.#mediaElement = undefined;
            return;
        }
        if (resource !== this.#mediaElement) {
            await this.#handleSetup();
        }
        const media = this.#mediaElement;
        if (!media)
            return;
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
        const needReseek = this.state.environment === 'server' ? currentFrame !== targetFrame : diff > 30;
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
                if (typeof media.fastSeek === 'function' && largeJump) {
                    media.fastSeek(seekTo);
                }
                else {
                    media.currentTime = seekTo;
                }
                // Await seek completion using a robust multi-attempt strategy similar to Remotion
                await new Promise((resolve) => {
                    const anyMedia = media;
                    let attempts = 0;
                    const maxAttempts = 8;
                    const check = () => {
                        const fps = this.state.data.settings.fps || 30;
                        const desiredFrame = Math.round(seekTo * fps);
                        const currFrame = Math.round(media.currentTime * fps);
                        if (desiredFrame === currFrame && media.readyState >= 2) {
                            return resolve();
                        }
                        attempts++;
                        if (attempts >= maxAttempts)
                            return resolve();
                        setTimeout(check, 20);
                    };
                    if (typeof anyMedia.requestVideoFrameCallback === 'function') {
                        const timeout = setTimeout(check, 120);
                        anyMedia.requestVideoFrameCallback(() => {
                            clearTimeout(timeout);
                            check();
                        });
                    }
                    else {
                        media.addEventListener('seeked', check, { once: true });
                        setTimeout(check, 60);
                    }
                });
                // Force Pixi video texture to pull the updated frame if present
                try {
                    const tex = this.#context.getResource('pixiTexture');
                    const baseTex = tex?.baseTexture;
                    if (baseTex?.resource && typeof baseTex.resource.update === 'function') {
                        baseTex.resource.update();
                    }
                    else if (typeof baseTex?.update === 'function') {
                        baseTex.update();
                    }
                }
                catch { }
            }
            catch (err) {
                // Swallow errors here; next update tick will retry if needed
            }
        }
    }
    async handle(type, context) {
        this.#context = context;
        if (this.#context.contextData.type !== 'VIDEO' && this.#context.contextData.type !== 'AUDIO')
            return;
        if (type === 'setup') {
            return await this.#handleSetup();
        }
        else if (type === 'destroy') {
            return await this.#handleDestroy();
        }
        else if (type === 'refresh') {
            return await this.#handleRefresh();
        }
        else if (type === 'update') {
            return await this.#handleUpdate();
        }
    }
}
